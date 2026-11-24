/**
 * TouchControls — binds the on-screen D-pad, A, B and MENU buttons (DOM) to the
 * shared InputManager actions. Keyboard and touch drive exactly the same actions,
 * so gameplay code has no mobile-specific logic.
 *
 * - Pointer Events with pointer capture; every pointer is tracked independently, so
 *   one finger can hold a direction while another presses A (multitouch).
 * - The D-pad is one capture surface with four visual buttons: sliding a finger from
 *   one arm to another switches direction without lifting.
 * - All touch state is reset on pointercancel, lostpointercapture, blur, tab hide,
 *   resize and rotation, so inputs can never get stuck.
 * Listeners are registered once in the constructor — never inside the game loop.
 */
const DEADZONE = 0.14; // fraction of the pad radius
const SRC = 'touch:';

export class TouchControls {
  constructor(input, root = document.getElementById('touch-controls')) {
    this.input = input;
    this.root = root;
    this.dpad = root?.querySelector('#dpad') ?? null;
    this.dpadPointer = null;
    this.dpadDir = null;
    this.buttons = []; // { el, action, pointers:Set }
    this.visible = false;
    this._cleanups = [];
    if (!root) return;

    this._bindDpad();
    root.querySelectorAll('[data-action]').forEach((el) => this._bindButton(el));
    this._bindFullscreen(root.querySelector('#btn-fullscreen'));

    // Block browser gestures (scroll, pinch-zoom, double-tap zoom, long-press menu)
    // while playing. The error screen keeps native scrolling.
    const block = (e) => {
      if (e.target instanceof Element && e.target.closest('#error-screen')) return;
      if (e.cancelable) e.preventDefault();
    };
    for (const type of ['touchmove', 'gesturestart', 'dblclick', 'contextmenu']) this._listen(document, type, block);

    // Anything that can interrupt touches resets them.
    const reset = () => this.resetAll();
    this._landscape = window.innerWidth >= window.innerHeight;
    this._listen(window, 'blur', reset);
    this._listen(window, 'orientationchange', reset);
    // Resize also fires for browser-bar changes; only an orientation flip resets touches.
    this._listen(window, 'resize', () => {
      const landscape = window.innerWidth >= window.innerHeight;
      if (landscape !== this._landscape) { this._landscape = landscape; this.resetAll(); }
    });
    this._listen(document, 'visibilitychange', reset);
  }

  _listen(el, type, fn) {
    el.addEventListener(type, fn, { passive: false });
    this._cleanups.push(() => el.removeEventListener(type, fn, { passive: false }));
  }

  _bindButton(el) {
    const btn = { el, action: el.dataset.action, pointers: new Set() };
    this.buttons.push(btn);
    const down = (e) => {
      e.preventDefault();
      this.input.setDevice('touch');
      try { el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      btn.pointers.add(e.pointerId);
      el.classList.add('is-pressed');
      this.input.press(btn.action, `${SRC}${btn.action}:${e.pointerId}`);
    };
    const up = (e) => {
      if (!btn.pointers.delete(e.pointerId)) return;
      if (btn.pointers.size === 0) el.classList.remove('is-pressed');
      this.input.release(btn.action, `${SRC}${btn.action}:${e.pointerId}`);
    };
    this._listen(el, 'pointerdown', down);
    this._listen(el, 'pointerup', up);
    this._listen(el, 'pointercancel', up);
    this._listen(el, 'lostpointercapture', up);
    this._listen(el, 'click', (e) => e.preventDefault());
  }

  _bindDpad() {
    const pad = this.dpad;
    if (!pad) return;
    const update = (e) => {
      const r = pad.getBoundingClientRect();
      const radius = r.width / 2;
      const dx = (e.clientX - (r.left + radius)) / radius;
      const dy = (e.clientY - (r.top + r.height / 2)) / radius;
      let dir = null;
      if (dx * dx + dy * dy > DEADZONE * DEADZONE) {
        dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      }
      this._setDpadDir(dir);
    };
    this._listen(pad, 'pointerdown', (e) => {
      e.preventDefault();
      if (this.dpadPointer !== null) return; // first finger owns the pad
      this.input.setDevice('touch');
      this.dpadPointer = e.pointerId;
      try { pad.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      update(e);
    });
    this._listen(pad, 'pointermove', (e) => {
      if (e.pointerId === this.dpadPointer) update(e);
    });
    const end = (e) => {
      if (e.pointerId !== this.dpadPointer) return;
      this.dpadPointer = null;
      this._setDpadDir(null);
    };
    this._listen(pad, 'pointerup', end);
    this._listen(pad, 'pointercancel', end);
    this._listen(pad, 'lostpointercapture', end);
  }

  _setDpadDir(dir) {
    if (dir === this.dpadDir) return;
    if (this.dpadDir) {
      this.input.release(this.dpadDir, `${SRC}dpad`);
      this.dpad.classList.remove(`active-${this.dpadDir}`);
    }
    this.dpadDir = dir;
    if (dir) {
      this.input.press(dir, `${SRC}dpad`);
      this.dpad.classList.add(`active-${dir}`);
    }
  }

  /** Release every touch input and clear all pressed visuals. */
  resetAll() {
    if (this.dpad && this.dpadPointer !== null) {
      try { this.dpad.releasePointerCapture(this.dpadPointer); } catch { /* ignore */ }
    }
    this.dpadPointer = null;
    this._setDpadDir(null);
    for (const btn of this.buttons) {
      btn.pointers.clear();
      btn.el.classList.remove('is-pressed');
    }
    this.input.releaseSources(SRC);
  }

  _bindFullscreen(btn) {
    if (!btn) return;
    const el = document.documentElement;
    if (!el.requestFullscreen && !el.webkitRequestFullscreen) {
      btn.hidden = true;
      return;
    }
    // Fullscreen is only ever requested from a user tap (browsers require it).
    this._listen(btn, 'pointerdown', (e) => { e.preventDefault(); btn.classList.add('is-pressed'); });
    this._listen(btn, 'pointerup', async (e) => {
      e.preventDefault();
      btn.classList.remove('is-pressed');
      try {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
        } else {
          await (el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.());
          // Orientation lock is best-effort only; the rotate overlay is the real fallback.
          await screen.orientation?.lock?.('landscape').catch(() => {});
        }
      } catch (err) {
        console.warn('Fullscreen unavailable:', err);
      }
    });
    this._listen(btn, 'pointercancel', () => btn.classList.remove('is-pressed'));
  }

  setVisible(visible) {
    if (this.visible === visible) return;
    this.visible = visible;
    document.body.classList.toggle('touch-mode', visible);
    if (!visible) this.resetAll();
  }

  destroy() {
    this.resetAll();
    for (const fn of this._cleanups) fn();
    this._cleanups.length = 0;
  }
}
