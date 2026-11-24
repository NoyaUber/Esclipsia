/**
 * InputManager — translates raw keyboard / pointer events into abstract actions.
 * Gameplay code only asks about actions ("confirm", "up"), never about keys.
 *
 * Multiple sources (keyboard key, touch pointer, d-pad) can hold the same action;
 * an action is "pressed" only on the transition from 0 → 1 sources, which prevents
 * accidental double activation when several inputs overlap.
 */
export const Action = Object.freeze({
  UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right',
  CONFIRM: 'confirm', CANCEL: 'cancel', MENU: 'menu',
});
export const ACTIONS = Object.freeze(Object.values(Action));
export const DIRECTIONS = Object.freeze(['up', 'down', 'left', 'right']);

/** A key may drive several actions (Escape = cancel in menus, menu in the overworld). */
const KEY_MAP = Object.freeze({
  ArrowUp: ['up'], KeyW: ['up'],
  ArrowDown: ['down'], KeyS: ['down'],
  ArrowLeft: ['left'], KeyA: ['left'],
  ArrowRight: ['right'], KeyD: ['right'],
  KeyZ: ['confirm'], Enter: ['confirm'], NumpadEnter: ['confirm'], Space: ['confirm'],
  KeyX: ['cancel'], Backspace: ['cancel'],
  Escape: ['cancel', 'menu'],
  Tab: ['menu'],
});

const REPEAT_DELAY = 0.38;
const REPEAT_RATE = 0.1;
const MAX_TAPS = 8;
const TAP_COOLDOWN_MS = 120;

export class InputManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.sources = new Map();
    this.hold = new Map();
    for (const a of ACTIONS) {
      this.sources.set(a, new Set());
      this.hold.set(a, 0);
    }
    this.pressed = new Set();
    this.released = new Set();
    this.repeated = new Set();
    this.rawKeyPressed = new Set();
    this.rawKeysDown = new Set();
    this.dirStack = []; // most recent direction first
    // Actions held while a scene/menu changed are ignored until physically released,
    // so a held direction or button never leaks into the next interface.
    this.latched = new Set();
    this.enabled = true;

    // Pointer taps on the canvas, in logical coordinates (pooled).
    this.taps = [];
    for (let i = 0; i < MAX_TAPS; i++) this.taps.push({ x: 0, y: 0 });
    this.tapCount = 0;
    this._lastTapTime = 0;
    this._tmpPoint = { x: 0, y: 0, inside: false };

    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    this.device = coarse ? 'touch' : 'keyboard';
    this.deviceListeners = new Set();

    this._onKeyDown = (e) => this._handleKey(e, true);
    this._onKeyUp = (e) => this._handleKey(e, false);
    this._onBlur = () => this.releaseAll();
    this._onCanvasPointer = (e) => this._handleCanvasPointer(e);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    document.addEventListener('visibilitychange', this._onBlur);
    renderer.canvas.addEventListener('pointerdown', this._onCanvasPointer);
  }

  /* ---------- Raw event handling ---------- */

  _handleKey(e, down) {
    const actions = KEY_MAP[e.code] ?? [];
    if (down) {
      this.rawKeysDown.add(e.code);
      if (!e.repeat) this.rawKeyPressed.add(e.code);
      this.setDevice('keyboard');
      if (actions.length) e.preventDefault();
      if (!e.repeat) for (const a of actions) this.press(a, `key:${e.code}`);
    } else {
      this.rawKeysDown.delete(e.code);
      for (const a of actions) this.release(a, `key:${e.code}`);
    }
  }

  _handleCanvasPointer(e) {
    e.preventDefault();
    this.setDevice(e.pointerType === 'mouse' ? 'keyboard' : 'touch');
    const now = performance.now();
    if (now - this._lastTapTime < TAP_COOLDOWN_MS) return;
    this._lastTapTime = now;
    const p = this.renderer.clientToLogical(e.clientX, e.clientY, this._tmpPoint);
    if (!p.inside || this.tapCount >= MAX_TAPS) return;
    const t = this.taps[this.tapCount++];
    t.x = p.x;
    t.y = p.y;
  }

  /* ---------- Source management (used by keyboard + TouchControls) ---------- */

  press(action, source) {
    const set = this.sources.get(action);
    if (!set || set.has(source)) return;
    const wasDown = set.size > 0;
    set.add(source);
    if (!wasDown) {
      this.pressed.add(action);
      this.hold.set(action, 0);
      if (DIRECTIONS.includes(action)) {
        const i = this.dirStack.indexOf(action);
        if (i >= 0) this.dirStack.splice(i, 1);
        this.dirStack.unshift(action);
      }
    }
  }

  release(action, source) {
    const set = this.sources.get(action);
    if (!set || !set.has(source)) return;
    set.delete(source);
    if (set.size === 0) {
      this.released.add(action);
      this.latched.delete(action);
      const i = this.dirStack.indexOf(action);
      if (i >= 0) this.dirStack.splice(i, 1);
    }
  }

  releaseAll() {
    for (const [action, set] of this.sources) {
      if (set.size > 0) this.released.add(action);
      set.clear();
    }
    this.dirStack.length = 0;
    this.rawKeysDown.clear();
    this.latched.clear();
  }

  /** Ignore everything currently held until it is released (used on scene/menu changes). */
  latchHeld() {
    for (const [action, set] of this.sources) if (set.size > 0) this.latched.add(action);
    this.pressed.clear();
    this.repeated.clear();
  }

  /** Release every input coming from a given source prefix (e.g. all touch pointers). */
  releaseSources(prefix) {
    for (const [action, set] of this.sources) {
      for (const src of set) if (src.startsWith(prefix)) this.release(action, src);
    }
  }

  setDevice(device) {
    if (this.device === device) return;
    this.device = device;
    for (const fn of this.deviceListeners) fn(device);
  }

  onDeviceChange(fn) {
    this.deviceListeners.add(fn);
    return () => this.deviceListeners.delete(fn);
  }

  /* ---------- Queries (call during update) ---------- */

  _active(action) { return this.enabled && !this.latched.has(action); }
  isDown(action) { return this._active(action) && this.sources.get(action).size > 0; }
  wasPressed(action) { return this._active(action) && this.pressed.has(action); }
  wasReleased(action) { return this.enabled && this.released.has(action); }
  wasKeyPressed(code) { return this.enabled && this.rawKeyPressed.has(code); }
  isKeyDown(code) { return this.enabled && this.rawKeysDown.has(code); }

  /** True on press and then at a steady rate while held — for menu navigation. */
  repeat(action) { return this._active(action) && (this.pressed.has(action) || this.repeated.has(action)); }

  /** The most recently pressed direction that is still held (4-directional, never diagonal). */
  get direction() {
    if (!this.enabled) return null;
    for (let i = 0; i < this.dirStack.length; i++) {
      if (!this.latched.has(this.dirStack[i])) return this.dirStack[i];
    }
    return null;
  }

  /** Iterate canvas taps for this step. */
  getTap(i) { return this.enabled && i < this.tapCount ? this.taps[i] : null; }
  get tapTotal() { return this.enabled ? this.tapCount : 0; }

  /* ---------- Per-step lifecycle ---------- */

  update(dt) {
    this.repeated.clear();
    for (const [action, set] of this.sources) {
      if (set.size === 0) continue;
      const prev = this.hold.get(action);
      const next = prev + dt;
      this.hold.set(action, next);
      if (next >= REPEAT_DELAY) {
        const before = prev < REPEAT_DELAY ? -1 : Math.floor((prev - REPEAT_DELAY) / REPEAT_RATE);
        const after = Math.floor((next - REPEAT_DELAY) / REPEAT_RATE);
        if (after > before) this.repeated.add(action);
      }
    }
  }

  /** Clear edge-triggered state after a simulation step consumed it. */
  endStep() {
    this.pressed.clear();
    this.released.clear();
    this.rawKeyPressed.clear();
    this.tapCount = 0;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    document.removeEventListener('visibilitychange', this._onBlur);
    this.renderer.canvas.removeEventListener('pointerdown', this._onCanvasPointer);
  }
}
