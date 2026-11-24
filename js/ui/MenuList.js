import { PALETTE } from '../core/Renderer.js';
import { pointInRect } from '../utils/MathUtils.js';

/**
 * Reusable vertical menu drawn on the canvas. Works with keyboard (up/down/confirm/
 * cancel, left/right for value items) and touch (tap an item to activate it).
 *
 * item: { id, label, enabled?: bool|fn, value?: fn -> string, onLeft?, onRight?, onTap? }
 */
export class MenuList {
  constructor({ items, x, y, width, itemHeight = 14, title = null, textSize = 8, padding = 6 }) {
    this.items = items;
    this.x = x;
    this.y = y;
    this.width = width;
    this.itemHeight = itemHeight;
    this.title = title;
    this.textSize = textSize;
    this.padding = padding;
    this.index = 0;
    this.time = 0;
    this._ensureEnabled(1);
  }

  get titleHeight() { return this.title ? 16 : 0; }
  get height() { return this.padding * 2 + this.titleHeight + this.items.length * this.itemHeight; }

  isEnabled(item) {
    return typeof item.enabled === 'function' ? item.enabled() : item.enabled !== false;
  }

  _ensureEnabled(dir) {
    for (let i = 0; i < this.items.length; i++) {
      if (this.isEnabled(this.items[this.index])) return;
      this.index = (this.index + dir + this.items.length) % this.items.length;
    }
  }

  _move(dir, audio) {
    const n = this.items.length;
    let i = this.index;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (this.isEnabled(this.items[i])) break;
    }
    if (i !== this.index) {
      this.index = i;
      audio?.play('move');
    }
  }

  itemRect(i) {
    return {
      x: this.x + 3,
      y: this.y + this.padding + this.titleHeight + i * this.itemHeight,
      w: this.width - 6,
      h: this.itemHeight,
    };
  }

  /** Returns { type: 'confirm', item } | { type: 'cancel' } | null */
  update(dt, input, audio) {
    this.time += dt;
    if (input.repeat('up')) this._move(-1, audio);
    if (input.repeat('down')) this._move(1, audio);

    const item = this.items[this.index];
    if (item && this.isEnabled(item)) {
      if (input.repeat('left') && item.onLeft) { item.onLeft(); audio?.play('move'); }
      if (input.repeat('right') && item.onRight) { item.onRight(); audio?.play('move'); }
    }

    for (let t = 0; t < input.tapTotal; t++) {
      const tap = input.getTap(t);
      for (let i = 0; i < this.items.length; i++) {
        const r = this.itemRect(i);
        if (!pointInRect(tap.x, tap.y, r.x, r.y, r.w, r.h)) continue;
        const it = this.items[i];
        if (!this.isEnabled(it)) { audio?.play('blocked'); break; }
        this.index = i;
        if (it.onTap) { it.onTap(tap.x - r.x < r.w / 2 ? -1 : 1); audio?.play('move'); return null; }
        audio?.play('confirm');
        return { type: 'confirm', item: it };
      }
    }

    if (input.wasPressed('confirm') && item) {
      if (!this.isEnabled(item)) { audio?.play('blocked'); return null; }
      if (item.onRight && !item.action) { item.onRight(); audio?.play('move'); return null; }
      audio?.play('confirm');
      return { type: 'confirm', item };
    }
    if (input.wasPressed('cancel')) {
      audio?.play('cancel');
      return { type: 'cancel' };
    }
    return null;
  }

  render(r) {
    r.panel(this.x, this.y, this.width, this.height);
    if (this.title) {
      r.text(this.title, this.x + this.width / 2, this.y + this.padding + 1, { align: 'center', size: 8, color: PALETTE.goldHi, font: 'title', weight: 'bold' });
      r.rect(this.x + 8, this.y + this.padding + 12, this.width - 16, 1, PALETTE.charcoal2);
    }
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const rc = this.itemRect(i);
      const selected = i === this.index;
      const enabled = this.isEnabled(it);
      if (selected) {
        r.rect(rc.x, rc.y + 1, rc.w, rc.h - 2, PALETTE.maroon);
        r.rect(rc.x, rc.y + 1, 1, rc.h - 2, PALETTE.goldHi);
        // pulsing arrow cursor
        const off = Math.round(Math.sin(this.time * 6) * 1);
        r.rect(rc.x + 3 + off, rc.y + rc.h / 2 - 2, 1, 5, PALETTE.goldHi);
        r.rect(rc.x + 4 + off, rc.y + rc.h / 2 - 1, 1, 3, PALETTE.goldHi);
        r.rect(rc.x + 5 + off, rc.y + rc.h / 2, 1, 1, PALETTE.goldHi);
      }
      const color = !enabled ? PALETTE.textDim : selected ? PALETTE.goldHi : PALETTE.text;
      const ty = rc.y + rc.h / 2;
      if (it.value) {
        r.text(it.label, rc.x + 10, ty, { baseline: 'middle', size: this.textSize, color });
        const v = it.value();
        r.text(it.onLeft ? `< ${v} >` : v, rc.x + rc.w - 5, ty, { baseline: 'middle', align: 'right', size: this.textSize, color: selected ? PALETTE.goldHi : PALETTE.textDim });
      } else {
        r.text(it.label, this.x + this.width / 2, ty, { baseline: 'middle', align: 'center', size: this.textSize, color });
      }
    }
  }
}
