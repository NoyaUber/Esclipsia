import { Scene } from './Scene.js';
import { MenuList } from '../ui/MenuList.js';
import { createSettingsMenu } from '../ui/SettingsPanel.js';
import { PALETTE, LOGICAL_WIDTH as W, LOGICAL_HEIGHT as H } from '../core/Renderer.js';
import { createTitleBackdrop } from '../render/PlaceholderArt.js';
import { mulberry32 } from '../utils/MathUtils.js';

const ASH_COUNT = 70;

const ABOUT_LINES = [
  'Generations after the Shattering, the sky still bleeds red.',
  'In Ashenveil, a young man named Kael carries a rare gift:',
  'Soul Resonance — the power to bond with Eidolon souls.',
  '',
  'Version 1.1.0 · Forgotten Chapel Dungeon',
  'Original work. All art is placeholder pixel art.',
];

export class MainMenuScene extends Scene {
  enter() {
    const g = this.game;
    this.time = 0;
    this.mode = 'main'; // 'main' | 'settings' | 'about'
    this.backdrop = g.assets.has('title_backdrop')
      ? g.assets.get('title_backdrop')
      : g.assets.register('title_backdrop', createTitleBackdrop(W, H));

    // Pre-allocated ash particles
    const rand = mulberry32(1337);
    this.ash = new Array(ASH_COUNT);
    for (let i = 0; i < ASH_COUNT; i++) {
      this.ash[i] = { x: rand() * W, y: rand() * H, vx: 4 + rand() * 10, vy: 6 + rand() * 10, phase: rand() * 6.28, bright: rand() > 0.75 };
    }

    this.menu = new MenuList({
      x: W / 2 - 52, y: 98, width: 104, itemHeight: 15,
      items: [
        ...(g.eidolons.worldSession?.playerPosition ? [{ id: 'continue', label: 'Continue', action: 'continue' }] : []),
        { id: 'new', label: 'New Game', action: 'new' },
        { id: 'settings', label: 'Settings', action: 'settings' },
        { id: 'about', label: 'About', action: 'about' },
      ],
    });
    this.settingsMenu = createSettingsMenu(g, { x: W / 2 - 80, y: 60, width: 160 });
    this.audio.playAmbient();
  }

  exit() {
    this.audio.stopAmbient();
  }

  update(dt) {
    this.time += dt;
    for (let i = 0; i < ASH_COUNT; i++) {
      const p = this.ash[i];
      p.x += (p.vx + Math.sin(this.time + p.phase) * 4) * dt;
      p.y += p.vy * dt;
      if (p.x > W + 2) p.x -= W + 4;
      if (p.y > H + 2) { p.y = -2; }
    }

    if (this.mode === 'main') {
      const res = this.menu.update(dt, this.input, this.audio);
      if (res?.type === 'confirm') this._select(res.item.action);
    } else if (this.mode === 'settings') {
      const res = this.settingsMenu.update(dt, this.input, this.audio);
      if (res?.type === 'cancel' || res?.item?.action === 'back') this.mode = 'main';
    } else if (this.mode === 'about') {
      if (this.input.wasPressed('confirm') || this.input.wasPressed('cancel') || this.input.tapTotal > 0) {
        this.audio.play('cancel');
        this.mode = 'main';
      }
    }
  }

  _select(action) {
    if (action === 'continue') {
      const saved = this.game.eidolons.worldSession;
      const allowedMaps = new Set(['ashenveil_village','ashenveil_forest','forgotten_chapel_entrance']);
      const isSavedDungeonRoom = this.game.dungeons?.isDungeonMap(saved?.currentMap) && this.game.dungeons?.getCurrentRoom()?.mapId === saved.currentMap;
      const mapId = allowedMaps.has(saved?.currentMap) || isSavedDungeonRoom ? saved.currentMap : 'ashenveil_village';
      if (this.game.dungeons?.getCurrentDungeon() && !isSavedDungeonRoom) this.game.dungeons.exitDungeon({ eventId: 'continue-session-reconcile' });
      const position = mapId === saved?.currentMap ? (saved?.playerPosition ?? null) : null;
      this.game.scenes.change('overworld', { mapId, position, showBanner: true }, { duration: 0.8 });
    } else if (action === 'new') {
      if (this.game.dungeons?.getCurrentDungeon()) this.game.dungeons.exitDungeon({ eventId: 'new-game-session-exit' });
      this.audio.play('start');
      const shouldPlayPrologue = !this.game.eidolons.storyFlags.has('prologue_completed');
      this.game.scenes.change('overworld', { mapId: 'ashenveil_village', spawn: 'village_start', showBanner: true }, { duration: 1.0 }).then((ok) => {
        if (ok && shouldPlayPrologue) this.game.scenes.push('prologue');
      });
    } else if (action === 'settings') {
      this.settingsMenu.index = 0;
      this.mode = 'settings';
    } else if (action === 'about') {
      this.mode = 'about';
    }
  }

  render(r) {
    const ctx = r.ctx;
    ctx.drawImage(this.backdrop, 0, 0);

    // Phase 3 — richer corona glow (layered radial-ish rects)
    const pulse = 0.10 + Math.sin(this.time * 0.75) * 0.055;
    ctx.globalAlpha = pulse * 1.4;
    ctx.fillStyle = '#e0a050';
    ctx.fillRect(214, 28, 48, 48);
    ctx.globalAlpha = pulse * 0.7;
    ctx.fillStyle = '#ff6020';
    ctx.fillRect(222, 36, 32, 32);
    ctx.globalAlpha = 1;

    // Ash / ember particles — phase 3: two-pixel brights
    for (let i = 0; i < ASH_COUNT; i++) {
      const p = this.ash[i];
      if (p.bright) {
        ctx.fillStyle = '#e0b06a';
        ctx.fillRect(p.x | 0, p.y | 0, 2, 1);
        ctx.fillStyle = '#ffe090';
        ctx.fillRect(p.x | 0, p.y | 0, 1, 1);
      } else {
        ctx.fillStyle = '#6a4a40';
        ctx.fillRect(p.x | 0, p.y | 0, 1, 1);
      }
    }

    // Phase 3 — title treatment
    const titleY = this.mode === 'main' ? 28 : 12;

    // Underline bar behind title
    ctx.fillStyle = 'rgba(10,4,6,0.6)';
    ctx.fillRect(0, titleY - 4, W, 50);

    // Eclipse-red thin accent above title
    ctx.fillStyle = PALETTE.maroon;
    ctx.fillRect(W / 2 - 60, titleY - 3, 120, 1);
    ctx.fillStyle = PALETTE.maroonHi;
    ctx.fillRect(W / 2 - 30, titleY - 3, 60, 1);

    r.text('ECLIPSIA', W / 2, titleY, {
      align: 'center', size: 26, font: 'title', color: PALETTE.goldHi, weight: 'bold',
    });
    r.text('SHATTERED  WORLD', W / 2, titleY + 30, {
      align: 'center', size: 8, font: 'title', color: PALETTE.text,
    });

    // Decorative rule with end caps
    ctx.fillStyle = PALETTE.maroonHi;
    ctx.fillRect(W / 2 - 50, titleY + 42, 100, 1);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(W / 2 - 50, titleY + 42, 3, 1);
    ctx.fillRect(W / 2 + 47, titleY + 42, 3, 1);

    if (this.mode === 'main') this.menu.render(r);
    else if (this.mode === 'settings') this.settingsMenu.render(r);
    else this._renderAbout(r);

    const touch = this.input.device === 'touch';
    r.text('v0.6.0', 4, H - 4, { baseline: 'bottom', size: 6, color: PALETTE.textDim });
    r.text(
      touch ? 'Tap to choose' : 'Z/Enter: Select   X/Esc: Back',
      W - 4, H - 4,
      { baseline: 'bottom', align: 'right', size: 6, color: PALETTE.textDim },
    );
  }

  _renderAbout(r) {
    const x = 28, y = 60, w = W - 56, h = 98;
    r.panel(x, y, w, h, { alpha: 0.94 });
    // Gold top rule inside panel
    r.rect(x + 8, y + 16, w - 16, 1, PALETTE.gold);
    r.text('THE SHATTERED WORLD', W / 2, y + 8, {
      align: 'center', size: 8, font: 'title', color: PALETTE.goldHi, weight: 'bold',
    });
    ABOUT_LINES.forEach((line, i) => {
      r.text(line, W / 2, y + 24 + i * 10, {
        align: 'center', size: 6.5,
        color: i >= 4 ? PALETTE.textDim : PALETTE.text,
      });
    });
    r.text('Z / A: Back', W / 2, y + h - 7, {
      align: 'center', baseline: 'bottom', size: 6, color: PALETTE.textDim,
    });
  }
}
