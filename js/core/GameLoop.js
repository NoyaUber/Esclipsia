/**
 * Fixed-timestep game loop (60 Hz simulation) driven by requestAnimationFrame.
 * Rendering happens once per animation frame; simulation catches up in fixed steps.
 */
export class GameLoop {
  constructor({ update, render, step = 1 / 60, maxSteps = 5 }) {
    this.update = update;
    this.render = render;
    this.step = step;
    this.maxSteps = maxSteps;
    this.running = false;
    this.accumulator = 0;
    this.last = 0;
    this.rafId = 0;
    this.fps = 0;
    this._fpsFrames = 0;
    this._fpsTime = 0;
    this._frame = this._frame.bind(this);
    this._onVisibility = () => {
      // Avoid a huge delta (and simulation spiral) after the tab was hidden.
      if (!document.hidden) { this.last = performance.now(); this.accumulator = 0; }
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    document.addEventListener('visibilitychange', this._onVisibility);
    this.rafId = requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    document.removeEventListener('visibilitychange', this._onVisibility);
  }

  _frame(now) {
    if (!this.running) return;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt < 0) dt = 0;
    if (dt > 0.25) dt = 0.25;

    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= this.step && steps < this.maxSteps) {
      this.update(this.step);
      this.accumulator -= this.step;
      steps++;
    }
    if (steps >= this.maxSteps) this.accumulator = 0;

    this.render(this.accumulator / this.step);

    this._fpsFrames++;
    this._fpsTime += dt;
    if (this._fpsTime >= 0.5) {
      this.fps = Math.round(this._fpsFrames / this._fpsTime);
      this._fpsFrames = 0;
      this._fpsTime = 0;
    }
    this.rafId = requestAnimationFrame(this._frame);
  }
}
