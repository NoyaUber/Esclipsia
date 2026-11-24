import { PALETTE, LOGICAL_WIDTH as W, LOGICAL_HEIGHT as H } from '../core/Renderer.js';

/**
 * DialogueBox — Phase 3 upgrade.
 *
 * Visual improvements:
 *   - Multi-layer dark-fantasy panel with inner parchment tint
 *   - Speaker name tab with maroon backing and gold text
 *   - Decorative corner runes (pixel dots)
 *   - Side accent line in speaker colour
 *   - Animated ellipsis while text reveals
 *   - Cleaner advance indicator
 *
 * Gameplay is unchanged from Phase 2.
 */
const CHARS_PER_SEC = 46;
const TEXT_SIZE = 7;
const LINE_H = 11;
// Keyboard: classic bottom box. Touch: top, so controls don't cover it.
const BOX_BOTTOM = { x: 8, y: H - 54, w: W - 16, h: 48 };
const BOX_TOP    = { x: 8, y: 22,     w: W - 16, h: 48 };

export class DialogueBox {
  constructor(renderer) {
    this.renderer = renderer;
    this.isOpen   = false;
    this.name     = '';
    this.lines    = [];
    this.index    = 0;
    this.wrapped  = [];
    this.shown    = 0;
    this.total    = 0;
    this.time     = 0;
    this.onClose  = null;
    this.portrait = null;
  }

  open(name, lines, onClose = null, portrait = null) {
    this.isOpen  = true;
    this.name    = name ?? '';
    this.lines   = lines;
    this.index   = 0;
    this.time    = 0;
    this.onClose = onClose;
    this.portrait = portrait;
    this._prepare();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen  = false;
    const cb     = this.onClose;
    this.onClose = null;
    cb?.();
  }

  _prepare() {
    const box    = this.portrait ? { ...BOX_BOTTOM, x: 62, w: W - 70 } : BOX_BOTTOM;
    this.wrapped = this._wrap(this.lines[this.index], box.w - 24);
    this.total   = this.wrapped.reduce((n, l) => n + l.length, 0);
    this.shown   = 0;
    this.time    = 0;
  }

  _wrap(text, maxW) {
    const words = text.split(/\s+/);
    const out   = [];
    let line    = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (line && this.renderer.measure(next, TEXT_SIZE) > maxW) { out.push(line); line = w; }
      else line = next;
    }
    if (line) out.push(line);
    return out.slice(0, 3);
  }

  get lineComplete() { return this.shown >= this.total; }

  update(dt, input, audio) {
    if (!this.isOpen) return false;
    this.time += dt;
    if (!this.lineComplete) this.shown = Math.min(this.total, this.shown + CHARS_PER_SEC * dt);
    if (input.wasPressed('cancel')) { audio?.play('cancel'); this.close(); return true; }
    if (input.wasPressed('confirm')) {
      if (!this.lineComplete) { this.shown = this.total; return true; }
      audio?.play('move');
      if (this.index < this.lines.length - 1) { this.index++; this._prepare(); }
      else this.close();
    }
    return true;
  }

  render(r, device) {
    if (!this.isOpen) return;
    const base = device === 'touch' ? BOX_TOP : BOX_BOTTOM;
    const BOX = this.portrait ? { ...base, x: 62, w: W - 70 } : base;
    const ctx  = r.ctx;
    if (this.portrait) {
      const iw = this.portrait.width || 1, ih = this.portrait.height || 1;
      const scale = Math.min(50 / iw, 78 / ih);
      const dw = iw * scale, dh = ih * scale;
      const px = 8, py = Math.max(4, H - dh - 4);
      ctx.fillStyle = 'rgba(8,10,17,.94)'; ctx.fillRect(px-2, py-2, dw+4, dh+4);
      ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 1; ctx.strokeRect(px-2, py-2, dw+4, dh+4);
      ctx.drawImage(this.portrait, px, py, dw, dh);
    }

    // ── Background panel ──────────────────────────────────────────
    // Outer dark frame
    ctx.fillStyle = 'rgba(10,8,9,0.95)';
    ctx.fillRect(BOX.x, BOX.y, BOX.w, BOX.h);

    // Inner parchment tint — subtle warmth
    ctx.fillStyle = 'rgba(40,32,22,0.5)';
    ctx.fillRect(BOX.x + 2, BOX.y + 2, BOX.w - 4, BOX.h - 4);

    // Gold border (using renderer panel helper for consistency)
    r.panel(BOX.x, BOX.y, BOX.w, BOX.h, { alpha: 0, border: PALETTE.gold });

    // Inner border line — dim
    ctx.fillStyle = PALETTE.charcoal2;
    ctx.fillRect(BOX.x + 3, BOX.y + 3, BOX.w - 6, 1);
    ctx.fillRect(BOX.x + 3, BOX.y + BOX.h - 4, BOX.w - 6, 1);

    // Corner rune dots (decorative)
    ctx.fillStyle = PALETTE.goldHi;
    ctx.fillRect(BOX.x + 4, BOX.y + 4, 2, 2);
    ctx.fillRect(BOX.x + BOX.w - 6, BOX.y + 4, 2, 2);
    ctx.fillRect(BOX.x + 4, BOX.y + BOX.h - 6, 2, 2);
    ctx.fillRect(BOX.x + BOX.w - 6, BOX.y + BOX.h - 6, 2, 2);

    // ── Speaker name tab ──────────────────────────────────────────
    if (this.name) {
      const nw = Math.ceil(r.measure(this.name, 7, 'ui', 'bold')) + 16;
      // Maroon backing
      ctx.fillStyle = PALETTE.maroon;
      ctx.fillRect(BOX.x + 6, BOX.y - 11, nw, 13);
      // Gold top border
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(BOX.x + 6, BOX.y - 12, nw, 1);
      ctx.fillRect(BOX.x + 6, BOX.y - 12, 1, 13);
      ctx.fillRect(BOX.x + 6 + nw - 1, BOX.y - 12, 1, 13);
      // Name text
      r.text(this.name, BOX.x + 14, BOX.y - 5, {
        baseline: 'middle', size: 7, weight: 'bold', color: PALETTE.goldHi,
      });

      // Side accent line — coloured strip left edge of text area
      ctx.fillStyle = PALETTE.maroon;
      ctx.fillRect(BOX.x + 2, BOX.y + 2, 2, BOX.h - 4);
      ctx.fillStyle = PALETTE.maroonHi;
      ctx.fillRect(BOX.x + 3, BOX.y + 2, 1, BOX.h - 4);
    }

    // ── Dialogue text ─────────────────────────────────────────────
    const textX = BOX.x + (this.name ? 12 : 10);
    let remaining = Math.floor(this.shown);
    for (let i = 0; i < this.wrapped.length && remaining > 0; i++) {
      const l    = this.wrapped[i];
      const line = remaining >= l.length ? l : l.slice(0, remaining);
      r.text(line, textX, BOX.y + 10 + i * LINE_H, { size: TEXT_SIZE, color: PALETTE.text });
      remaining -= l.length;
    }

    // Animated ellipsis while text is revealing
    if (!this.lineComplete) {
      const dots = '.'.repeat(1 + Math.floor(this.time * 3) % 3);
      r.text(dots, BOX.x + BOX.w - 10, BOX.y + BOX.h - 8, {
        baseline: 'bottom', align: 'right', size: 7, color: PALETTE.textDim,
      });
    }

    // ── Advance indicator (chevron) ───────────────────────────────
    if (this.lineComplete) {
      const bob = Math.sin(this.time * 7) > 0 ? 1 : 0;
      const ax  = BOX.x + BOX.w - 10;
      const ay  = BOX.y + BOX.h - 7 + bob;
      ctx.fillStyle = PALETTE.goldHi;
      ctx.fillRect(ax, ay, 4, 1);
      ctx.fillRect(ax + 1, ay + 1, 2, 1);
      ctx.fillRect(ax + 2, ay + 2, 1, 1); // chevron

      const isLast = this.index >= this.lines.length - 1;
      const hint   = device === 'touch'
        ? (isLast ? 'A: close' : 'A: next  B: close')
        : (isLast ? 'Z: close' : 'Z: next  X: close');
      r.text(hint, ax - 3, BOX.y + BOX.h - 5, {
        align: 'right', baseline: 'bottom', size: 5, color: PALETTE.textDim,
      });
    }
  }
}
