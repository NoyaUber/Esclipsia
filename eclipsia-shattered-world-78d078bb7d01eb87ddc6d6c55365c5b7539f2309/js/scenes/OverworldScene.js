import { Scene } from './Scene.js';
import { Camera } from '../core/Camera.js';
import { Player } from '../entities/Player.js';
import { NPC } from '../entities/NPC.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';
import { InteractionIndicator } from '../ui/InteractionIndicator.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { PALETTE, LOGICAL_WIDTH as W, LOGICAL_HEIGHT as H } from '../core/Renderer.js';
import {
  TILE, renderMapCanvas, createCharacterSheet, createObjectSprites, createVignette,
} from '../render/PlaceholderArt.js';
import { validateMap, validateObjectTypes } from '../utils/DataUtils.js';
import { mulberry32 } from '../utils/MathUtils.js';

const MOTE_COUNT = 36;
const CULL_MARGIN = 48;

/**
 * Top-down overworld.
 *
 * Render order (back → front):
 *   background fill → ground tiles + ground decorations (pre-rendered canvas)
 *   → static objects, NPCs and the player, y-sorted by their feet line
 *   → foreground objects (canopies) → atmosphere → screen-space UI.
 */
export class OverworldScene extends Scene {
  async enter({ mapId = 'ashenveil_village', spawn = 'village_start', showBanner = false } = {}) {
    const g = this.game;
    this.objectTypes = await g.assets.loadJSON('data/objects.json', validateObjectTypes);
    this.map = await g.assets.loadJSON(`data/maps/${mapId}.json`, (m, src) => validateMap(m, src, this.objectTypes));

    this.mapKey = `map:${this.map.id}`;
    this.mapCanvas = g.assets.has(this.mapKey) ? g.assets.get(this.mapKey) : g.assets.register(this.mapKey, renderMapCanvas(this.map));
    if (!g.assets.has('object_sprites')) g.assets.register('object_sprites', createObjectSprites(this.objectTypes));
    if (!g.assets.has('vignette')) g.assets.register('vignette', createVignette(W, H));
    this.sprites = g.assets.get('object_sprites');
    this.vignette = g.assets.get('vignette');

    // Static objects → render records with a precomputed depth line.
    this.worldObjects = [];
    this.foreground = [];
    for (const o of this.map.objects) {
      const def = this.objectTypes.types[o.type];
      const rec = {
        kind: 'object', type: o.type, x: o.x, y: o.y, w: def.w, h: def.h,
        sortY: o.y + (def.sortY ?? def.h), image: this.sprites.get(`${o.type}:${o.variant ?? 0}`),
      };
      (def.layer === 'foreground' ? this.foreground : this.worldObjects).push(rec);
    }

    this.collision = new CollisionSystem(this.map, this.objectTypes);

    this.npcs = this.map.npcs.map((def) => new NPC(def, this._sheet(def.look ?? 'villager'), TILE));
    for (const n of this.npcs) this.collision.addBody(n);

    const sp = this.map.spawns[spawn] ?? Object.values(this.map.spawns)[0];
    this.player = new Player({ x: 0, y: 0, direction: sp.facing ?? 'down', sheet: this._sheet('kael') });
    this.player.placeOnTile(sp.x, sp.y, TILE);
    this.bounds = { w: this.map.width * TILE, h: this.map.height * TILE };

    this.interaction = new InteractionSystem(this.map, this.npcs);
    this.indicator = new InteractionIndicator();
    this.dialogue = new DialogueBox(g.renderer);

    this.camera = new Camera(W, H);
    this.camera.setBounds(this.bounds.w, this.bounds.h);
    this.camera.follow(this.player, true);

    this.drawList = [];
    this.time = 0;
    this.bannerTime = showBanner ? 0 : 99;
    const rand = mulberry32(77);
    this.motes = new Array(MOTE_COUNT);
    for (let i = 0; i < MOTE_COUNT; i++) {
      this.motes[i] = { x: rand() * W, y: rand() * H, s: 3 + rand() * 6, p: rand() * 6.28 };
    }
    g.state.currentMap = this.map.id;
  }

  _sheet(look) {
    const key = `char:${look}`;
    const a = this.game.assets;
    return a.has(key) ? a.get(key) : a.register(key, createCharacterSheet(look));
  }

  update(dt) {
    this.time += dt;
    this.bannerTime += dt;
    const input = this.input;

    for (const n of this.npcs) n.update(dt);

    let consumed = false;
    if (this.dialogue.isOpen) {
      // The dialogue owns CONFIRM / CANCEL; movement and the menu are suspended.
      consumed = this.dialogue.update(dt, input, this.audio);
      this.player.frozen = true;
    } else {
      this.player.frozen = false;
      if (input.wasPressed('menu')) {
        this.audio.play('confirm');
        this.game.scenes.push('ui', { mode: 'pause' });
        return;
      }
    }

    this.player.update(dt, input, this.collision);
    const target = this.dialogue.isOpen ? null : this.interaction.update(this.player);
    if (target && !consumed && input.wasPressed('confirm')) this._interact(target);
    this.indicator.update(dt, !!target && !this.dialogue.isOpen);

    this.camera.update(dt);
    this.game.state.playerPosition.x = Math.round(this.player.x);
    this.game.state.playerPosition.y = Math.round(this.player.y);

    for (let i = 0; i < MOTE_COUNT; i++) {
      const m = this.motes[i];
      m.y -= m.s * dt;
      m.x += Math.sin(this.time + m.p) * 3 * dt;
      if (m.y < -2) m.y = H + 2;
    }
  }

  _interact(target) {
    this.audio.play('confirm');
    this.interaction.target = null;
    if (target.kind === 'npc') {
      target.talking = true;
      target.faceToward(this.player.feetX, this.player.feetY);
      this.player.faceToward(target.centerX, target.feetY);
      this.dialogue.open(target.name, target.lines, () => target.endTalk());
    } else {
      this.dialogue.open(target.name, target.lines);
    }
  }

  render(r) {
    const ctx = r.ctx;
    const cam = this.camera;
    const cx = cam.rx, cy = cam.ry;

    // Background + ground layers
    ctx.fillStyle = '#0d0a0b';
    ctx.fillRect(0, 0, W, H);
    const sx = Math.max(0, cx), sy = Math.max(0, cy);
    const sw = Math.min(W, this.mapCanvas.width - sx), sh = Math.min(H, this.mapCanvas.height - sy);
    ctx.drawImage(this.mapCanvas, sx, sy, sw, sh, sx - cx, sy - cy, sw, sh);

    // Y-sorted world: visible static objects + NPCs + player
    const list = this.drawList;
    list.length = 0;
    const left = cx - CULL_MARGIN, right = cx + W + CULL_MARGIN;
    const top = cy - CULL_MARGIN, bottom = cy + H + CULL_MARGIN;
    for (const o of this.worldObjects) {
      if (o.x + o.w < left || o.x > right || o.y + o.h < top || o.y > bottom) continue;
      list.push(o);
    }
    for (const n of this.npcs) list.push(n);
    list.push(this.player);
    list.sort(bySortY);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.kind === 'object') ctx.drawImage(e.image, e.x - cx, e.y - cy);
      else e.render(ctx, cam);
    }

    // Foreground layer (always above characters)
    for (const o of this.foreground) {
      if (o.x + o.w < left || o.x > right || o.y + o.h < top || o.y > bottom) continue;
      ctx.drawImage(o.image, o.x - cx, o.y - cy);
    }

    // Atmosphere: drifting Aether motes + eclipse vignette
    for (let i = 0; i < MOTE_COUNT; i++) {
      const m = this.motes[i];
      ctx.fillStyle = i % 5 === 0 ? '#e0c070' : '#8a5a4a';
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(this.time * 2 + m.p);
      ctx.fillRect(m.x | 0, m.y | 0, 1, 1);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(this.vignette, 0, 0);

    // Screen-space UI
    this.indicator.render(r, cam, this.interaction, this.input.device);
    this._renderHUD(r);
    this.dialogue.render(r, this.input.device);
  }

  _renderHUD(r) {
    if (this.dialogue.isOpen) return;
    const label = this.map.name;
    const w = Math.ceil(r.measure(label, 7)) + 14;
    r.panel(4, 4, w, 14, { alpha: 0.8 });
    r.text(label, 11, 11, { baseline: 'middle', size: 7, color: PALETTE.text });

    if (this.bannerTime < 4) {
      const t = this.bannerTime;
      const a = t < 0.6 ? t / 0.6 : t > 3.2 ? Math.max(0, (4 - t) / 0.8) : 1;
      r.ctx.globalAlpha = a * 0.85;
      r.rect(0, 64, W, 40, PALETTE.black);
      r.ctx.globalAlpha = a;
      r.rect(60, 66, W - 120, 1, PALETTE.gold);
      r.rect(60, 101, W - 120, 1, PALETTE.gold);
      r.ctx.globalAlpha = 1;
      r.text(this.map.regionName.toUpperCase(), W / 2, 72, { align: 'center', size: 14, font: 'title', color: PALETTE.goldHi, alpha: a, weight: 'bold' });
      r.text(this.map.regionTitle, W / 2, 90, { align: 'center', size: 7, font: 'title', color: PALETTE.text, alpha: a });
    }

    if (this.input.device !== 'touch' && !this.dialogue.isOpen && !this.interaction.target) {
      r.text('WASD/Arrows: Move   Z: Interact   Tab/Esc: Menu', W - 4, H - 4, { baseline: 'bottom', align: 'right', size: 6, color: PALETTE.textDim });
    }
  }
}

function bySortY(a, b) { return a.sortY - b.sortY; }
