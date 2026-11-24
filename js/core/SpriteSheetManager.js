/**
 * SpriteSheetManager — Phase 3
 *
 * Loads, caches, and draws sprite sheets.
 * Supports named animation sequences with per-frame durations,
 * one-shot animations, looping, and graceful fallback for missing assets.
 *
 * Usage:
 *   const ssm = new SpriteSheetManager();
 *   await ssm.load('kael', 'assets/characters/kael.png', { frameW: 16, frameH: 24 });
 *   ssm.define('kael', 'walk_down', { row: 0, frames: [0,1,2,3], fps: 8 });
 *   ssm.update('kael', 'walk_down', dt);
 *   ssm.draw('kael', 'walk_down', ctx, x, y);
 */
export class SpriteSheetManager {
  constructor() {
    /** @type {Map<string, SheetEntry>} */
    this._sheets = new Map();
    /** @type {Map<string, AnimState>} */
    this._states = new Map();
  }

  /**
   * Load a sprite sheet image and register it under `key`.
   * Returns the same promise if called again for the same key.
   * @param {string} key
   * @param {string} src
   * @param {{ frameW: number, frameH: number }} opts
   */
  load(key, src, { frameW, frameH }) {
    if (this._sheets.has(key)) return Promise.resolve(this._sheets.get(key).image);
    const entry = {
      image: null,
      frameW,
      frameH,
      anims: new Map(),
      ready: false,
      promise: null,
    };
    this._sheets.set(key, entry);
    entry.promise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        entry.image = img;
        entry.ready = true;
        resolve(img);
      };
      img.onerror = () => {
        // Graceful fallback: generate a coloured placeholder at runtime.
        entry.image = _makeFallback(frameW, frameH);
        entry.ready = true;
        resolve(entry.image);
      };
      img.src = src;
    });
    return entry.promise;
  }

  /**
   * Register an animation sequence for a sheet.
   * @param {string} key - sheet key
   * @param {string} animName
   * @param {{ frames: number[], fps?: number, row?: number, loop?: boolean, onFinish?: () => void }} opts
   */
  define(key, animName, opts) {
    const entry = this._sheets.get(key);
    if (!entry) {
      console.warn(`[SSM] Sheet "${key}" not registered. Call load() first.`);
      return;
    }
    entry.anims.set(animName, {
      frames: opts.frames ?? [0],
      fps: opts.fps ?? 8,
      row: opts.row ?? 0,
      loop: opts.loop !== false,
      onFinish: opts.onFinish ?? null,
    });
  }

  /**
   * Advance the timer for a running animation.
   * Returns true if a one-shot animation just finished.
   * @param {string} stateKey - unique key per entity instance
   * @param {string} sheetKey
   * @param {string} animName
   * @param {number} dt
   */
  update(stateKey, sheetKey, animName, dt) {
    const sheet = this._sheets.get(sheetKey);
    if (!sheet) return false;
    const anim = sheet.anims.get(animName);
    if (!anim) return false;

    let st = this._states.get(stateKey);
    if (!st || st.anim !== animName || st.sheet !== sheetKey) {
      st = { sheet: sheetKey, anim: animName, t: 0, fi: 0, done: false };
      this._states.set(stateKey, st);
    }
    if (st.done) return true;

    st.t += dt;
    const duration = 1 / anim.fps;
    while (st.t >= duration) {
      st.t -= duration;
      st.fi++;
      if (st.fi >= anim.frames.length) {
        if (anim.loop) {
          st.fi = 0;
        } else {
          st.fi = anim.frames.length - 1;
          st.done = true;
          anim.onFinish?.();
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Draw the current frame of an animation.
   * @param {string} stateKey
   * @param {string} sheetKey
   * @param {string} animName
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} dx - destination x
   * @param {number} dy - destination y
   * @param {number} [dw] - destination width (defaults to frameW)
   * @param {number} [dh] - destination height (defaults to frameH)
   */
  draw(stateKey, sheetKey, animName, ctx, dx, dy, dw, dh) {
    const sheet = this._sheets.get(sheetKey);
    if (!sheet?.ready) return;
    const anim = sheet.anims.get(animName);
    if (!anim) return;
    const st = this._states.get(stateKey);
    const fi = st ? anim.frames[st.fi] : anim.frames[0];
    const sx = fi * sheet.frameW;
    const sy = anim.row * sheet.frameH;
    ctx.drawImage(
      sheet.image,
      sx, sy, sheet.frameW, sheet.frameH,
      Math.round(dx), Math.round(dy),
      dw ?? sheet.frameW, dh ?? sheet.frameH,
    );
  }

  /**
   * Convenience: draw a specific column+row frame with no animation state.
   */
  drawFrame(sheetKey, col, row, ctx, dx, dy, dw, dh) {
    const sheet = this._sheets.get(sheetKey);
    if (!sheet?.ready) return;
    const sx = col * sheet.frameW;
    const sy = row * sheet.frameH;
    ctx.drawImage(
      sheet.image,
      sx, sy, sheet.frameW, sheet.frameH,
      Math.round(dx), Math.round(dy),
      dw ?? sheet.frameW, dh ?? sheet.frameH,
    );
  }

  /** True if the sheet image has been loaded (or the fallback generated). */
  isReady(key) {
    return this._sheets.get(key)?.ready ?? false;
  }

  /** Free the animation state for an entity (call when it leaves the scene). */
  releaseState(stateKey) {
    this._states.delete(stateKey);
  }

  /** Reset a one-shot animation so it can play again. */
  reset(stateKey) {
    const st = this._states.get(stateKey);
    if (st) { st.t = 0; st.fi = 0; st.done = false; }
  }

  /**
   * Raw access to a loaded image, for compatibility with legacy draw calls.
   * Returns null if the sheet hasn't loaded yet.
   */
  getImage(key) {
    return this._sheets.get(key)?.image ?? null;
  }
}

/** Generate a checkerboard placeholder at the given frame dimensions. */
function _makeFallback(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w * 4;
  canvas.height = h * 4;
  const ctx = canvas.getContext('2d');
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#5e2328' : '#8a3438';
      ctx.fillRect(col * w, row * h, w, h);
    }
  }
  return canvas;
}
