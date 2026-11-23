import { PALETTE, LOGICAL_WIDTH as W, LOGICAL_HEIGHT as H } from '../core/Renderer.js';

/**
 * InteractionIndicator — small bouncing marker above the current interaction target,
 * plus a screen-space prompt ("A Talk" on touch, "Z Talk" on keyboard).
 */
export class InteractionIndicator {
  constructor() {
    this.time = 0;
    this.alpha = 0;
    this._anchor = { x: 0, y: 0 };
  }

  update(dt, visible) {
    this.time += dt;
    const target = visible ? 1 : 0;
    this.alpha += (target - this.alpha) * Math.min(1, dt * 14);
    if (this.alpha < 0.01) this.alpha = 0;
  }

  render(r, camera, interaction, device) {
    const target = interaction.target;
    if (!target || this.alpha <= 0) return;
    const a = interaction.anchorOf(target, this._anchor);
    const bob = Math.round(Math.sin(this.time * 6) * 1.5);
    const x = Math.round(a.x) - camera.rx;
    const y = Math.round(a.y) - camera.ry + bob;
    const ctx = r.ctx;
    ctx.globalAlpha = this.alpha;
    // Speech-bubble marker: dark outline, gold fill, tail pointing down
    r.rect(x - 4, y - 10, 9, 8, PALETTE.black);
    r.rect(x - 3, y - 9, 7, 6, PALETTE.gold);
    r.rect(x - 1, y - 2, 3, 1, PALETTE.black);
    r.rect(x, y - 1, 1, 1, PALETTE.black);
    r.rect(x, y - 2, 1, 1, PALETTE.gold);
    // "!" glyph in pixels
    r.rect(x, y - 8, 1, 3, PALETTE.black);
    r.rect(x, y - 4, 1, 1, PALETTE.black);
    ctx.globalAlpha = 1;

    // Prompt chip (bottom centre, screen space)
    const verb = target.kind === 'npc' ? 'Talk' : 'Check';
    const key = device === 'touch' ? 'A' : 'Z';
    const label = `${key}  ${verb}`;
    const w = Math.ceil(r.measure(label, 7)) + 16;
    const px = Math.round(W / 2 - w / 2);
    const py = H - 20;
    r.panel(px, py, w, 14, { alpha: 0.82 * this.alpha });
    r.text(label, W / 2, py + 7, { align: 'center', baseline: 'middle', size: 7, color: PALETTE.goldHi, alpha: this.alpha });
  }
}
