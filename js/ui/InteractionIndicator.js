import { PALETTE, LOGICAL_WIDTH as W, LOGICAL_HEIGHT as H } from '../core/Renderer.js';

/**
 * InteractionIndicator — Phase 3 upgrade.
 *
 * Improvements:
 *   - Animated gold diamond pulse instead of plain bubble
 *   - Rotating ring hint around the diamond
 *   - Smooth fade in/out
 *   - Larger, easier-to-read prompt removed (now handled by HUD)
 */
export class InteractionIndicator {
  constructor() {
    this.time   = 0;
    this.alpha  = 0;
    this._anchor = { x: 0, y: 0 };
  }

  update(dt, visible) {
    this.time += dt;
    const target = visible ? 1 : 0;
    this.alpha  += (target - this.alpha) * Math.min(1, dt * 14);
    if (this.alpha < 0.01) this.alpha = 0;
  }

  render(r, camera, interaction, device) {
    const target = interaction?.target;
    if (!target || this.alpha <= 0) return;
    const a   = interaction.anchorOf(target, this._anchor);
    const bob = Math.sin(this.time * 5) * 2;
    const x   = (Math.round(a.x) - camera.rx) | 0;
    const y   = (Math.round(a.y) - camera.ry + bob) | 0;
    const ctx = r.ctx;
    ctx.globalAlpha = this.alpha;

    // ── Diamond marker ────────────────────────────────────────────
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 3, y - 7, 7, 1);

    // Dark outline
    ctx.fillStyle = PALETTE.black;
    ctx.fillRect(x - 4, y - 9, 1, 1);
    ctx.fillRect(x + 3, y - 9, 1, 1);
    ctx.fillRect(x - 4, y - 5, 1, 1);
    ctx.fillRect(x + 3, y - 5, 1, 1);

    // Diamond body — gold gradient via layered rects
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(x - 2, y - 11, 5, 1); // top point
    ctx.fillRect(x - 3, y - 10, 7, 1);
    ctx.fillRect(x - 4, y - 9, 9, 4);  // wide centre
    ctx.fillRect(x - 3, y - 5, 7, 1);
    ctx.fillRect(x - 2, y - 4, 5, 1);
    ctx.fillRect(x - 1, y - 3, 3, 1);
    ctx.fillRect(x, y - 2, 1, 1);       // bottom point

    // Inner highlight
    ctx.fillStyle = PALETTE.goldHi;
    ctx.fillRect(x - 1, y - 10, 3, 1);
    ctx.fillRect(x - 2, y - 9, 1, 2);

    // Pulsing ring
    const pulse = 0.4 + 0.3 * Math.sin(this.time * 7);
    ctx.globalAlpha = this.alpha * pulse;
    ctx.fillStyle = PALETTE.goldHi;
    ctx.fillRect(x - 5, y - 7, 11, 1);  // horizontal ring bar top
    ctx.fillRect(x - 5, y - 5, 11, 1);  // bottom
    ctx.fillRect(x - 5, y - 7, 1, 3);   // left
    ctx.fillRect(x + 4, y - 7, 1, 3);   // right

    ctx.globalAlpha = 1;
  }
}
