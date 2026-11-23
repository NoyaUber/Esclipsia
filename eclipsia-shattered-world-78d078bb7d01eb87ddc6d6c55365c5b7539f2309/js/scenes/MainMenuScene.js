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
  'Version 0.2.0 · Phase 2: Player & Exploration',
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
    if (action === 'new') {
      this.audio.play('start');
      this.game.scenes.change('overworld', { mapId: 'ashenveil_village', spawn: 'village_start', showBanner: true }, { duration: 1.0 });
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

    // Slowly pulsing corona glow
    ctx.globalAlpha = 0.12 + Math.sin(this.time * 0.8) * 0.06;
    ctx.fillStyle = '#e0a050';
    ctx.fillRect(224, 38, 28, 28);
    ctx.globalAlpha = 1;

    for (let i = 0; i < ASH_COUNT; i++) {
      const p = this.ash[i];
      ctx.fillStyle = p.bright ? '#d9a65a' : '#7a5a50';
      ctx.fillRect(p.x | 0, p.y | 0, 1, 1);
    }

    const titleY = this.mode === 'main' ? 30 : 14;
    r.text('ECLIPSIA', W / 2, titleY, { align: 'center', size: 26, font: 'title', color: PALETTE.goldHi, weight: 'bold' });
    r.text('SHATTERED  WORLD', W / 2, titleY + 30, { align: 'center', size: 8, font: 'title', color: PALETTE.text });
    r.rect(W / 2 - 48, titleY + 41, 96, 1, PALETTE.maroonHi);

    if (this.mode === 'main') this.menu.render(r);
    else if (this.mode === 'settings') this.settingsMenu.render(r);
    else this._renderAbout(r);

    const touch = this.input.device === 'touch';
    r.text('v0.2.0', 4, H - 4, { baseline: 'bottom', size: 6, color: PALETTE.textDim });
    r.text(touch ? 'Tap to choose' : 'Z / Enter: Select   X / Esc: Back', W - 4, H - 4, { baseline: 'bottom', align: 'right', size: 6, color: PALETTE.textDim });
  }

  _renderAbout(r) {
    const x = 30, y = 66, w = W - 60, h = 92;
    r.panel(x, y, w, h);
    r.text('THE SHATTERED WORLD', W / 2, y + 7, { align: 'center', size: 8, font: 'title', color: PALETTE.goldHi, weight: 'bold' });
    ABOUT_LINES.forEach((line, i) => {
      r.text(line, W / 2, y + 22 + i * 10, { align: 'center', size: 6.5, color: i >= 4 ? PALETTE.textDim : PALETTE.text });
    });
  }
}
