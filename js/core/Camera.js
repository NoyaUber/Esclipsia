import { clamp, damp } from '../utils/MathUtils.js';

/** Smooth-follow camera. Rendering uses integer offsets so pixel art never blurs. */
export class Camera {
  constructor(viewW, viewH) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.x = 0;
    this.y = 0;
    this.worldW = viewW;
    this.worldH = viewH;
    this.target = null;
    this.smoothing = 9;
  }

  setBounds(worldW, worldH) {
    this.worldW = worldW;
    this.worldH = worldH;
  }

  follow(target, snap = true) {
    this.target = target;
    if (snap) this.snap();
  }

  _desired(axis) {
    const t = this.target;
    if (axis === 'x') return t.x + (t.w ?? 0) / 2 - this.viewW / 2;
    return t.y + (t.h ?? 0) / 2 - this.viewH / 2;
  }

  _clampX(x) {
    return this.worldW <= this.viewW ? (this.worldW - this.viewW) / 2 : clamp(x, 0, this.worldW - this.viewW);
  }

  _clampY(y) {
    return this.worldH <= this.viewH ? (this.worldH - this.viewH) / 2 : clamp(y, 0, this.worldH - this.viewH);
  }

  snap() {
    if (!this.target) return;
    this.x = this._clampX(this._desired('x'));
    this.y = this._clampY(this._desired('y'));
  }

  update(dt) {
    if (!this.target) return;
    const k = damp(this.smoothing, dt);
    this.x = this._clampX(this.x + (this._desired('x') - this.x) * k);
    this.y = this._clampY(this.y + (this._desired('y') - this.y) * k);
  }

  /** Integer render offsets. */
  get rx() { return Math.round(this.x); }
  get ry() { return Math.round(this.y); }
}
