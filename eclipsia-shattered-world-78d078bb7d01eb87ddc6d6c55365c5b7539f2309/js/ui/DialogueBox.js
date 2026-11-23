import { PALETTE, LOGICAL_WIDTH as W, LOGICAL_HEIGHT as H } from '../core/Renderer.js';

/**
 * DialogueBox — Phase 2 placeholder message box.
 *
 * Shows a speaker name and a sequence of plain lines with a typewriter reveal.
 * CONFIRM completes the current line or advances; CANCEL closes immediately.
 * Deliberately minimal: branching, choices, portraits, quest hooks and scripted
 * events belong to the Phase 3 dialogue system, which will replace `open(lines)`
 * with dialogue data lookups.
 */
const CHARS_PER_SEC = 48;
const TEXT_SIZE = 7;
// Keyboard: classic bottom box. Touch: top box, so the D-pad / A / B never cover it.
const BOX_BOTTOM = { x: 8, y: H - 52, w: W - 16, h: 46 };
const BOX_TOP = { x: 8, y: 24, w: W - 16, h: 46 };

export class DialogueBox {
  constructor(renderer) {
    this.renderer = renderer;
    this.isOpen = false;
    this.name = '';
    this.lines = [];
    this.index = 0;
    this.wrapped = [];
    this.shown = 0;
    this.time = 0;
    this.onClose = null;
  }

  open(name, lines, onClose = null) {
    this.isOpen = true;
    this.name = name ?? '';
    this.lines = lines;
    this.index = 0;
    this.onClose = onClose;
    this._prepare();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  _prepare() {
    this.wrapped = this._wrap(this.lines[this.index], BOX_BOTTOM.w - 20);
    this.total = this.wrapped.reduce((n, l) => n + l.length, 0);
    this.shown = 0;
  }

  _wrap(text, maxW) {
    const words = text.split(/\s+/);
    const out = [];
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (line && this.renderer.measure(next, TEXT_SIZE) > maxW) { out.push(line); line = w; }
      else line = next;
    }
    if (line) out.push(line);
    return out.slice(0, 3);
  }

  get lineComplete() { return this.shown >= this.total; }

  /** Returns true while the box consumes input. */
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
    const BOX = device === 'touch' ? BOX_TOP : BOX_BOTTOM;
    r.panel(BOX.x, BOX.y, BOX.w, BOX.h, { alpha: 0.92 });
    if (this.name) {
      const nw = Math.ceil(r.measure(this.name, 7, 'ui', 'bold')) + 12;
      r.panel(BOX.x + 6, BOX.y - 9, nw, 12, { alpha: 0.96, fill: PALETTE.maroon });
      r.text(this.name, BOX.x + 12, BOX.y - 3, { baseline: 'middle', size: 7, weight: 'bold', color: PALETTE.goldHi });
    }
    let remaining = Math.floor(this.shown);
    for (let i = 0; i < this.wrapped.length && remaining > 0; i++) {
      const l = this.wrapped[i];
      r.text(remaining >= l.length ? l : l.slice(0, remaining), BOX.x + 10, BOX.y + 8 + i * 11, { size: TEXT_SIZE, color: PALETTE.text });
      remaining -= l.length;
    }
    if (this.lineComplete) {
      const bob = Math.round(Math.sin(this.time * 7));
      const ax = BOX.x + BOX.w - 12, ay = BOX.y + BOX.h - 8 + bob;
      r.rect(ax, ay, 5, 1, PALETTE.goldHi);
      r.rect(ax + 1, ay + 1, 3, 1, PALETTE.goldHi);
      r.rect(ax + 2, ay + 2, 1, 1, PALETTE.goldHi);
      const hint = device === 'touch' ? 'A next  B close' : 'Z next  X close';
      r.text(hint, ax - 4, BOX.y + BOX.h - 6, { align: 'right', baseline: 'middle', size: 5, color: PALETTE.textDim });
    }
  }
}
