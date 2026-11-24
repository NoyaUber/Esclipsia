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
  TILE, renderMapCanvas, createObjectSprites,
  createEnhancedKaelSheet, createCharacterSheet,
  collectWaterTiles, collectGrassTiles,
} from '../render/PlaceholderArt.js';
import {
  AetherMotes, GroundFog, LeafDrift, WaterRipple, GrassWave,
  ScreenFlash, createEnhancedVignette,
} from '../render/VisualEffects.js';
import { validateMap, validateObjectTypes } from '../utils/DataUtils.js';
import { mulberry32 } from '../utils/MathUtils.js';

const MOTE_COUNT = 28;   // Phase 3: AetherMotes handles particles now; keep legacy motes low
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
  async enter({ mapId = 'ashenveil_village', spawn = 'village_start', position = null, showBanner = false } = {}) {
    const g = this.game;
    this.objectTypes = await g.assets.loadJSON('data/objects.json', validateObjectTypes);
    this.map = await g.assets.loadJSON(`data/maps/${mapId}.json`, (m, src) => validateMap(m, src, this.objectTypes));
    if (g.dungeons?.isDungeonMap(this.map.id) && !g.dungeons.onRoomLoaded(this.map.id)) throw new Error(`Dungeon session does not match room map: ${this.map.id}`);

    this.mapKey = `map:${this.map.id}`;
    this.mapCanvas = g.assets.has(this.mapKey) ? g.assets.get(this.mapKey) : g.assets.register(this.mapKey, renderMapCanvas(this.map));
    const portraitPromise = g.assets.loadImage('kael_dialogue_portrait', 'assets/characters/kael-dialogue.png');
    const monumentPromise = g.assets.loadImage('lost_swordsman_original', 'assets/easter-eggs/lost-swordsman-original.jpg');
    await Promise.all([portraitPromise, monumentPromise]);
    if (!g.assets.has('object_sprites')) g.assets.register('object_sprites', createObjectSprites(this.objectTypes));
    if (!g.assets.has('vignette_p3')) g.assets.register('vignette_p3', createEnhancedVignette(W, H));
    this.sprites = g.assets.get('object_sprites');
    this.vignette = g.assets.get('vignette_p3');

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
    if (this.map.id === 'ashenveil_village') {
      const portrait = g.assets.get('lost_swordsman_original');
      const monument = document.createElement('canvas'); monument.width = 54; monument.height = 76;
      const mctx = monument.getContext('2d');
      mctx.fillStyle = '#292a35'; mctx.fillRect(2, 0, 50, 76);
      mctx.fillStyle = '#8b7549'; mctx.fillRect(5, 3, 44, 58);
      mctx.fillStyle = '#171820'; mctx.fillRect(8, 6, 38, 52);
      const scale = Math.min(34 / portrait.width, 48 / portrait.height);
      const iw = portrait.width * scale, ih = portrait.height * scale;
      mctx.drawImage(portrait, 27 - iw/2, 32 - ih/2, iw, ih);
      mctx.fillStyle = '#b59a5e'; mctx.fillRect(1, 62, 52, 4);
      mctx.fillStyle = '#4b4650'; mctx.fillRect(6, 66, 42, 9);
      this.worldObjects.push({ kind: 'object', type: 'monument', x: 312, y: 48, w: 54, h: 76, sortY: 124, image: monument });
    }

    this.collision = new CollisionSystem(this.map, this.objectTypes);

    this.npcs = this.map.npcs.map((def) => new NPC(def, this._sheet(def.look ?? 'villager'), TILE));
    this._syncNpcWorldStates();
    this._offWorldState?.();
    this._offWorldState = g.world?.subscribe?.(() => this._syncNpcWorldStates()) ?? null;
    for (const n of this.npcs) this.collision.addBody(n);

    const sp = this.map.spawns[spawn] ?? Object.values(this.map.spawns)[0];
    this.player = new Player({ x: 0, y: 0, direction: sp.facing ?? 'down', sheet: this._sheet('kael') });
    this.player.placeOnTile(sp.x, sp.y, TILE);
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
      const c = this.player.collisionBounds;
      const px = Math.max(0, Math.min(this.map.width * TILE - this.player.width, position.x));
      const py = Math.max(0, Math.min(this.map.height * TILE - this.player.height, position.y));
      if (!this.collision.overlaps(px + c.x, py + c.y, c.w, c.h, this.player)) { this.player.x = px; this.player.y = py; }
    }
    this.bounds = { w: this.map.width * TILE, h: this.map.height * TILE };

    if (this.map.id === 'ashenveil_village' && !this.map.interactables.some(x => x.id === 'lost_swordsman_monument')) {
      this.map.interactables.push({ id: 'lost_swordsman_monument', name: 'Forgotten Monument', x: 20, y: 7, w: 2, h: 1, lines: ['Pendekar yang telah kehilangan jati dirinya.'] });
    }
    this.interaction = new InteractionSystem(this.map, this.npcs);
    this.indicator = new InteractionIndicator();
    this.dialogue = new DialogueBox(g.renderer);

    this.camera = new Camera(W, H);
    this.camera.setBounds(this.bounds.w, this.bounds.h);
    this.camera.follow(this.player, true);

    this.drawList = [];
    this.time = 0;
    this.saveTimer = 0;
    this.encounterDistance = 0;
    this.encounterPending = false;
    this.transitioning = false;
    this.interactionSerial = 0;
    this.bannerTime = showBanner ? 0 : 99;
    const rand = mulberry32(77);
    this.motes = new Array(MOTE_COUNT);
    for (let i = 0; i < MOTE_COUNT; i++) {
      this.motes[i] = { x: rand() * W, y: rand() * H, s: 3 + rand() * 6, p: rand() * 6.28 };
    }

    // Phase 3 — Visual effect systems
    this.aetherMotes = new AetherMotes(40, W, H, 42);
    this.groundFog   = new GroundFog(W, H, 5);
    this.leafDrift   = new LeafDrift(18, W, H, 71);
    this.screenFlash = new ScreenFlash();

    const waterTiles = collectWaterTiles(this.map, TILE);
    const grassTiles = collectGrassTiles(this.map, TILE, 4);
    this.waterRipple = new WaterRipple(waterTiles, TILE);
    this.grassWave   = new GrassWave(grassTiles);

    g.state.currentMap = this.map.id;
    g.state.playerPosition.x = Math.round(this.player.x);
    g.state.playerPosition.y = Math.round(this.player.y);
    g.eidolons.worldSession = { currentMap: this.map.id, playerPosition: { x: this.player.x, y: this.player.y } };
    g.eidolons.save();
    g.events?.emit?.('LOCATION_VISITED', { targetId: this.map.id, eventId: `map-entry:${this.map.id}:${Date.now()}` });
  }

  exit() {
    this._offWorldState?.();
    if (this.player && this.map && !this.transitioning) this._saveWorldSession();
  }

  _saveWorldSession() {
    const g = this.game;
    g.eidolons.worldSession = { currentMap: this.map.id, playerPosition: { x: this.player.x, y: this.player.y } };
    g.state.currentMap = this.map.id;
    g.state.playerPosition.x = Math.round(this.player.x);
    g.state.playerPosition.y = Math.round(this.player.y);
    return g.eidolons.save();
  }

  _syncNpcWorldStates() {
    for (const npc of this.npcs ?? []) {
      const state = this.game.world?.getState(npc.id) ?? 'DEFAULT';
      npc.setWorldState(state, this.game.world?.getDialogue(npc.id, npc.baseLines));
    }
  }

  _sheet(look) {
    const key = `char:${look}`;
    const a = this.game.assets;
    if (a.has(key)) return a.get(key);
    // Phase 3: use the enhanced Kael sprite for the protagonist.
    const sheet = look === 'kael' ? createEnhancedKaelSheet() : createCharacterSheet(look);
    return a.register(key, sheet);
  }

  update(dt) {
    this.time += dt;
    if (this.encounterPending && this.game.scenes.top === this) this.encounterPending = false;
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
        this._saveWorldSession();
        this.audio.play('confirm');
        this.game.scenes.push('ui', { mode: 'pause' });
        return;
      }
    }

    const beforeX = this.player.x, beforeY = this.player.y;
    this.player.update(dt, input, this.collision);
    const moved = Math.hypot(this.player.x - beforeX, this.player.y - beforeY);
    const playerTileX = Math.floor(this.player.feetX / TILE), playerTileY = Math.floor(this.player.feetY / TILE);
    const encounterZone = (this.map.encounterZones ?? []).find(z => playerTileX >= z.x && playerTileY >= z.y && playerTileX < z.x + z.width && playerTileY < z.y + z.height);
    if (encounterZone && moved > 0 && !this.dialogue.isOpen && !this.encounterPending) {
      this.encounterDistance += moved;
      if (this.encounterDistance >= 48) {
        this.encounterDistance %= 48;
        const encounter = this.game.eidolons.encounters.roll(encounterZone.encounterTable, { now: Date.now() });
        if (encounter) {
          const full = this.game.eidolons.startEncounterFromRoll(encounter);
          if (full) { this._saveWorldSession(); this.encounterPending = true; this.game.scenes.push('battle', { encounter: full }); return; }
        }
      }
    }
    this.saveTimer += dt;
    if (this.saveTimer >= 4) { this.saveTimer = 0; this._saveWorldSession(); }
    const target = this.dialogue.isOpen ? null : this.interaction.update(this.player);
    if (target && !consumed && input.wasPressed('confirm')) this._interact(target);
    this.indicator.update(dt, !!target && !this.dialogue.isOpen);

    this.camera.update(dt);
    this.game.state.playerPosition.x = Math.round(this.player.x);
    this.game.state.playerPosition.y = Math.round(this.player.y);

    // Legacy motes (kept for minimal overhead)
    for (let i = 0; i < MOTE_COUNT; i++) {
      const m = this.motes[i];
      m.y -= m.s * dt;
      m.x += Math.sin(this.time + m.p) * 3 * dt;
      if (m.y < -2) m.y = H + 2;
    }

    // Phase 3 effect updates
    this.aetherMotes.update(dt, this.time);
    this.leafDrift.update(dt, this.time);
    this.screenFlash.update(dt);
  }

  _interact(target) {
    if (this.transitioning) return;
    this.audio.play('confirm');
    this.screenFlash.trigger('#e0c070', 0.18, 0.2);
    this.interaction.target = null;

    const worldId = target.worldObjectId ?? target.id;
    if (target.kind === 'object' && (target.worldObjectId === 'forest_hidden_chest' || target.collectItem)) {
      const state = this.game.world?.getState(worldId);
      if (state === 'OPENED') {
        const token = `chest-claim:${worldId}`;
        const itemId = target.collectItem?.id ?? 'potion';
        const amount = target.collectItem?.amount ?? 2;
        const result = this.game.world.claimChest(worldId, {
          eventId: token,
          grant: () => { this.game.eidolons.inventory[itemId] = Math.max(0, Number(this.game.eidolons.inventory[itemId]) || 0) + amount; return true; },
          rollback: () => { this.game.eidolons.inventory[itemId] = Math.max(0, (this.game.eidolons.inventory[itemId] ?? 0) - amount); },
        });
        if (result.ok) this.game.events?.emit?.('ITEM_ACQUIRED', { targetId: itemId, amount, eventId: token });
        const lines = result.ok ? [`You collected ${amount} ${itemId}.`] : ['This has already been collected.'];
        this.dialogue.open(target.name, lines);
        return;
      }
      if (state === 'CLAIMED') { this.dialogue.open(target.name, ['This has already been collected.']); return; }
    }

    if (target.requires && !this.game.world?.canInteract(target.worldObjectId ?? target.id, target.requires)) {
      this.dialogue.open(target.name, target.lockedLines?.length ? target.lockedLines : ['The way is sealed.']);
      return;
    }

    if (target.transition) {
      this._transitionTo(target.transition);
      return;
    }

    if (target.kind === 'npc') {
      target.talking = true;
      target.faceToward(this.player.feetX, this.player.feetY);
      this.player.faceToward(target.centerX, target.feetY);
      this.dialogue.open(target.name, this.game.world?.getDialogue(target.id, target.lines) ?? target.lines, () => {
        target.endTalk();
        this.game.events?.emit?.('NPC_TALKED', { targetId: target.id, eventId: `talk:${target.id}:${Date.now()}:${++this.interactionSerial}` });
        this.game.events?.emit?.('WORLD_INTERACTION', { targetId: target.id, eventId: `talk-world:${target.id}:${Date.now()}:${this.interactionSerial}` });
      });
    } else {
      const lines = this.game.world?.getDialogue(target.worldObjectId ?? target.id, target.lines) ?? target.lines;
      const portrait = target.id === 'lost_swordsman_monument' ? this.game.assets.get('lost_swordsman_original') : (target.name === 'Kael' ? this.game.assets.get('kael_dialogue_portrait') : null);
      this.dialogue.open(target.name, lines, () => {
        this.game.events?.emit?.('OBJECT_FOUND', { targetId: target.id, eventId: `found:${target.id}:${Date.now()}:${++this.interactionSerial}` });
        this.game.events?.emit?.('WORLD_INTERACTION', { targetId: target.worldObjectId ?? target.id, eventId: `world-interact:${target.worldObjectId ?? target.id}:${Date.now()}:${this.interactionSerial}` });
      }, portrait);
    }
  }

  async _transitionTo(destination) {
    if (this.transitioning) return;
    const targetMap = destination?.mapId, targetSpawn = destination?.spawn;
    if (typeof targetMap !== 'string' || typeof targetSpawn !== 'string') return;
    this.transitioning = true;
    this._saveWorldSession();
    const dungeonManager = this.game.dungeons;
    const dungeonSnapshot = dungeonManager?.getState?.() ?? null;
    let dungeonResult = null;
    if (destination.enterDungeon) {
      dungeonResult = dungeonManager?.enterDungeon(destination.dungeonId, destination.roomId);
      if (!dungeonResult?.ok) { this.transitioning = false; this.dialogue.open('Sealed Passage', ['The dungeon entrance cannot be reached yet.']); return; }
    } else if (destination.dungeonId && destination.roomId) {
      dungeonResult = dungeonManager?.transitionRoom(destination.dungeonId, destination.roomId, destination.connectionId);
      if (!dungeonResult?.ok) { this.transitioning = false; this.dialogue.open('Blocked Passage', ['The route is inaccessible.']); return; }
      if (dungeonResult.spawn !== targetSpawn) { dungeonManager.restoreSnapshot(dungeonSnapshot); this.transitioning = false; return; }
    } else if (destination.exitDungeon) {
      dungeonResult = dungeonManager?.exitDungeon();
      if (!dungeonResult?.ok) { this.transitioning = false; return; }
    }
    this.game.input.releaseAll();
    const changed = await this.game.scenes.change('overworld', { mapId: targetMap, spawn: targetSpawn, showBanner: true }, { duration: 0.45 });
    if (!changed) { if (dungeonSnapshot) dungeonManager?.restoreSnapshot?.(dungeonSnapshot); this.transitioning = false; }
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

    // Phase 3 — Water shimmer (world-space, before vignette)
    this.waterRipple.render(ctx, this.time, cx, cy);

    // Phase 3 — Animated grass wave (subtle, world-space)
    this.grassWave.render(ctx, this.time, cx, cy);

    // Phase 3 — Ground fog ribbons
    this.groundFog.render(ctx, this.time);

    // Legacy motes (minimal, kept for atmosphere continuity)
    for (let i = 0; i < MOTE_COUNT; i++) {
      const m = this.motes[i];
      ctx.fillStyle = i % 5 === 0 ? '#e0c070' : '#8a5a4a';
      ctx.globalAlpha = 0.28 + 0.28 * Math.sin(this.time * 2 + m.p);
      ctx.fillRect(m.x | 0, m.y | 0, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Phase 3 — Aether motes (richer, typed particles)
    this.aetherMotes.render(ctx, this.time);

    // Phase 3 — Leaf / ash drift
    this.leafDrift.render(ctx, this.time);

    // Phase 3 — Screen flash (interactions, damage)
    this.screenFlash.render(ctx, W, H);

    // Enhanced vignette
    ctx.drawImage(this.vignette, 0, 0);

    // Screen-space UI
    this.indicator.render(r, cam, this.interaction, this.input.device);
    this._renderHUD(r);
    this.dialogue.render(r, this.input.device);
  }

  _renderHUD(r) {
    if (this.dialogue.isOpen) return;
    const ctx = r.ctx;

    // Phase 3 — Map name panel: parchment-style with rune decoration
    const label = this.map.name;
    const tw = Math.ceil(r.measure(label, 7));
    const pw = tw + 22;
    r.panel(4, 4, pw, 15, { alpha: 0.88, fill: PALETTE.charcoal });
    // Decorative dot left of text
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(9, 11, 2, 2);
    r.text(label, 14, 11, { baseline: 'middle', size: 7, color: PALETTE.text });

    // Phase 3 — Region banner (enter region)
    if (this.bannerTime < 4) {
      const t = this.bannerTime;
      const a = t < 0.6 ? t / 0.6 : t > 3.2 ? Math.max(0, (4 - t) / 0.8) : 1;

      // Dark bar
      ctx.globalAlpha = a * 0.88;
      ctx.fillStyle = PALETTE.black;
      ctx.fillRect(0, 60, W, 50);
      ctx.globalAlpha = a;

      // Gold decorative lines — left and right halves, meeting at center
      const lineY1 = 63, lineY2 = 108;
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(50, lineY1, W - 100, 1);
      ctx.fillRect(50, lineY2, W - 100, 1);

      // Accent dots at corners
      ctx.fillStyle = PALETTE.goldHi;
      ctx.fillRect(50, lineY1 - 1, 2, 3);
      ctx.fillRect(W - 52, lineY1 - 1, 2, 3);
      ctx.fillRect(50, lineY2 - 1, 2, 3);
      ctx.fillRect(W - 52, lineY2 - 1, 2, 3);
      ctx.globalAlpha = 1;

      r.text(this.map.regionName.toUpperCase(), W / 2, 70, {
        align: 'center', size: 15, font: 'title',
        color: PALETTE.goldHi, alpha: a, weight: 'bold',
      });
      r.text(this.map.regionTitle, W / 2, 92, {
        align: 'center', size: 7, font: 'title',
        color: PALETTE.text, alpha: a * 0.9,
      });
      // Sub-flavor text
      r.text('~ The Shattered Realm ~', W / 2, 102, {
        align: 'center', size: 6, font: 'title',
        color: PALETTE.textDim, alpha: a * 0.7,
      });
    }

    // Interaction prompt — Phase 3 styled
    if (this.interaction.target && !this.dialogue.isOpen) {
      const prompt = this.input.device === 'touch' ? 'Tap A' : 'Z — Talk';
      const pW = Math.ceil(r.measure(prompt, 6)) + 12;
      r.panel(W / 2 - pW / 2, H - 22, pW, 11, { alpha: 0.82 });
      r.text(prompt, W / 2, H - 16, { align: 'center', baseline: 'middle', size: 6, color: PALETTE.goldHi });
    }

    if (this.input.device !== 'touch' && !this.dialogue.isOpen && !this.interaction.target) {
      r.text('WASD · Move   Z · Talk   Tab · Menu', W - 4, H - 4, {
        baseline: 'bottom', align: 'right', size: 6, color: PALETTE.textDim,
      });
    }
  }
}

function bySortY(a, b) { return a.sortY - b.sortY; }
