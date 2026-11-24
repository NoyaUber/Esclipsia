/**
 * SceneManager
 * - `change(name)`  replaces the whole scene stack with a fade-to-black transition.
 * - `push(name)`    adds an overlay scene (pause menu, dialogue, etc.).
 * - `pop()`         removes the top overlay.
 * Only the top scene receives update(); all scenes in the stack render bottom→top.
 * Input is locked while a transition is running.
 */
export class SceneManager {
  constructor(game) {
    this.game = game;
    this.registry = new Map();
    this.stack = [];
    this.busy = false;
    this.fadeAlpha = 0;
    this._fade = null; // { from, to, duration, time, resolve }
  }

  register(name, SceneClass) {
    this.registry.set(name, SceneClass);
  }

  get top() { return this.stack[this.stack.length - 1] ?? null; }
  get base() { return this.stack[0] ?? null; }
  get inputLocked() { return this.busy || this._fade !== null; }

  _create(name) {
    const SceneClass = this.registry.get(name);
    if (!SceneClass) throw new Error(`Scene "${name}" is not registered`);
    const scene = new SceneClass(this.game);
    scene.name = name;
    return scene;
  }

  _fadeTo(to, duration) {
    return new Promise((resolve) => {
      this._fade = { from: this.fadeAlpha, to, duration: Math.max(0.001, duration), time: 0, resolve };
    });
  }

  async change(name, params = {}, { fade = true, duration = 0.5 } = {}) {
    if (this.busy) return false;
    this.busy = true;
    try {
      if (fade && this.stack.length) await this._fadeTo(1, duration / 2);
      else if (fade) this.fadeAlpha = 1;

      while (this.stack.length) {
        const old = this.stack.pop();
        try { old.exit?.(); } catch (err) { console.error(`Error exiting "${old.name}"`, err); }
      }
      this.game.input.latchHeld();

      const scene = this._create(name);
      await scene.enter?.(params);
      this.stack.push(scene);

      if (fade) await this._fadeTo(0, duration / 2);
      else this.fadeAlpha = 0;
      return true;
    } catch (err) {
      this.fadeAlpha = 0;
      this._fade = null;
      this.game.fatal(err);
      return false;
    } finally {
      this.busy = false;
    }
  }

  async push(name, params = {}) {
    if (this.busy) return null;
    const scene = this._create(name);
    scene.isOverlay = true;
    await scene.enter?.(params);
    this.top?.pause?.();
    this.stack.push(scene);
    this.game.input.latchHeld();
    return scene;
  }

  pop() {
    if (this.stack.length <= 1) return;
    const scene = this.stack.pop();
    try { scene.exit?.(); } catch (err) { console.error(err); }
    this.top?.resume?.();
    this.game.input.latchHeld();
  }

  update(dt) {
    if (this._fade) {
      const f = this._fade;
      f.time += dt;
      const t = Math.min(1, f.time / f.duration);
      this.fadeAlpha = f.from + (f.to - f.from) * t;
      if (t >= 1) {
        this._fade = null;
        f.resolve();
      }
    }
    const top = this.top;
    if (!top) return;
    const input = this.game.input;
    input.enabled = !this.inputLocked;
    top.update(dt);
    input.enabled = true;
  }

  render(r) {
    for (let i = 0; i < this.stack.length; i++) {
      if (i > 0) r.flushLayer();
      this.stack[i].render(r);
    }
  }

  onResize() {
    for (const s of this.stack) s.onResize?.();
  }
}
