/**
 * Renderer
 * - All world/UI pixel art is drawn to a 320x180 back buffer (`ctx`).
 * - The back buffer is blitted to the display canvas with nearest-neighbour scaling.
 * - Text is queued and drawn on the display canvas at native resolution so it stays
 *   readable on small phones, while positions remain in logical pixels.
 */
export const LOGICAL_WIDTH = 320;
export const LOGICAL_HEIGHT = 180;

export const FONTS = {
  ui: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif',
  title: 'Georgia, "Times New Roman", serif',
};

export const PALETTE = {
  black: '#0d0a0b',
  charcoal: '#24211f',
  charcoal2: '#35302d',
  maroon: '#5e2328',
  maroonHi: '#8a3438',
  blue: '#1c2638',
  gold: '#b5913f',
  goldHi: '#e0c070',
  green: '#4f5e45',
  text: '#e8dcc4',
  textDim: '#9c8f7a',
};

const MAX_TEXT = 256;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.display = canvas.getContext('2d', { alpha: false });
    this.width = LOGICAL_WIDTH;
    this.height = LOGICAL_HEIGHT;

    this.buffer = document.createElement('canvas');
    this.buffer.width = LOGICAL_WIDTH;
    this.buffer.height = LOGICAL_HEIGHT;
    this.ctx = this.buffer.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.scale = 1; // device pixels per logical pixel
    this.resizeListeners = new Set();

    // Pre-allocated text command pool (avoids per-frame allocations).
    this.textPool = new Array(MAX_TEXT);
    for (let i = 0; i < MAX_TEXT; i++) {
      this.textPool[i] = { str: '', x: 0, y: 0, size: 8, color: '#fff', align: 'left', baseline: 'top', font: 'ui', shadow: true, alpha: 1, weight: 'normal' };
    }
    this.textCount = 0;
    this.fontCache = new Map();

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this._onResize);
    this.resize();
  }

  /** Fit the 16:9 logical screen into the window without distortion. */
  resize() {
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const deviceScale = Math.min((vw * dpr) / LOGICAL_WIDTH, (vh * dpr) / LOGICAL_HEIGHT);

    // Prefer an integer scale (perfectly even pixels) unless it wastes too much screen.
    let scale = Math.floor(deviceScale);
    if (scale < 1 || scale / deviceScale < 0.85) scale = deviceScale;
    this.scale = scale;

    const pw = Math.max(1, Math.round(LOGICAL_WIDTH * scale));
    const ph = Math.max(1, Math.round(LOGICAL_HEIGHT * scale));
    if (this.canvas.width !== pw) this.canvas.width = pw;
    if (this.canvas.height !== ph) this.canvas.height = ph;
    this.canvas.style.width = `${pw / dpr}px`;
    this.canvas.style.height = `${ph / dpr}px`;
    this.display.imageSmoothingEnabled = false;
    this.fontCache.clear();
    for (const fn of this.resizeListeners) fn(this);
  }

  onResize(fn) {
    this.resizeListeners.add(fn);
    return () => this.resizeListeners.delete(fn);
  }

  /** Convert a client (CSS) coordinate to logical game pixels. */
  clientToLogical(clientX, clientY, out) {
    const rect = this.canvas.getBoundingClientRect();
    out.x = ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    out.y = ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
    out.inside = out.x >= 0 && out.y >= 0 && out.x < LOGICAL_WIDTH && out.y < LOGICAL_HEIGHT;
    return out;
  }

  beginFrame() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = PALETTE.black;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    this.textCount = 0;
    const d = this.display;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalAlpha = 1;
    d.fillStyle = PALETTE.black;
    d.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Composite the current layer (pixels + queued text) onto the display and start a
   * fresh transparent layer. Used between stacked scenes so an overlay covers the
   * text of the scene beneath it.
   */
  flushLayer() {
    this._composite();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  }

  /**
   * Queue text. Coordinates and size are in logical pixels.
   * opts: { color, size, align, baseline, font: 'ui'|'title', shadow, alpha, weight }
   */
  text(str, x, y, opts) {
    if (this.textCount >= MAX_TEXT) return;
    const t = this.textPool[this.textCount++];
    t.str = str;
    t.x = x;
    t.y = y;
    t.size = opts?.size ?? 8;
    t.color = opts?.color ?? PALETTE.text;
    t.align = opts?.align ?? 'left';
    t.baseline = opts?.baseline ?? 'top';
    t.font = opts?.font ?? 'ui';
    t.shadow = opts?.shadow ?? true;
    t.alpha = opts?.alpha ?? 1;
    t.weight = opts?.weight ?? 'normal';
  }

  _font(size, family, weight) {
    const key = `${weight}|${size}|${family}`;
    let f = this.fontCache.get(key);
    if (!f) {
      f = `${weight} ${Math.max(1, Math.round(size * this.scale))}px ${FONTS[family] ?? FONTS.ui}`;
      this.fontCache.set(key, f);
    }
    return f;
  }

  /** Measure text width in logical pixels. */
  measure(str, size = 8, family = 'ui', weight = 'normal') {
    this.display.font = this._font(size, family, weight);
    return this.display.measureText(str).width / this.scale;
  }

  /** Composite the final layer, then the scene-transition fade overlay. */
  endFrame(fadeAlpha = 0) {
    this._composite();
    const d = this.display;
    if (fadeAlpha > 0) {
      d.globalAlpha = Math.min(1, fadeAlpha);
      d.fillStyle = PALETTE.black;
      d.fillRect(0, 0, this.canvas.width, this.canvas.height);
      d.globalAlpha = 1;
    }
  }

  _composite() {
    const d = this.display;
    const s = this.scale;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.imageSmoothingEnabled = false;
    d.drawImage(this.buffer, 0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.textCount; i++) {
      const t = this.textPool[i];
      d.font = this._font(t.size, t.font, t.weight);
      d.textAlign = t.align;
      d.textBaseline = t.baseline;
      d.globalAlpha = t.alpha;
      const px = Math.round(t.x * s);
      const py = Math.round(t.y * s);
      if (t.shadow) {
        d.fillStyle = 'rgba(0,0,0,0.85)';
        const o = Math.max(1, Math.round(s * 0.6));
        d.fillText(t.str, px + o, py + o);
      }
      d.fillStyle = t.color;
      d.fillText(t.str, px, py);
    }
    d.globalAlpha = 1;
    this.textCount = 0;
  }

  /* ---------- Pixel-art drawing helpers (back buffer) ---------- */

  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  /** Framed dark-fantasy panel with antique-gold border. */
  panel(x, y, w, h, opts) {
    const ctx = this.ctx;
    x |= 0; y |= 0; w |= 0; h |= 0;
    ctx.globalAlpha = opts?.alpha ?? 0.94;
    ctx.fillStyle = opts?.fill ?? PALETTE.black;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = opts?.border ?? PALETTE.gold;
    ctx.fillRect(x + 2, y, w - 4, 1);
    ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
    ctx.fillRect(x, y + 2, 1, h - 4);
    ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
    ctx.fillRect(x + 1, y + 1, 1, 1);
    ctx.fillRect(x + w - 2, y + 1, 1, 1);
    ctx.fillRect(x + 1, y + h - 2, 1, 1);
    ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
    ctx.fillStyle = PALETTE.charcoal2;
    ctx.fillRect(x + 2, y + 2, w - 4, 1);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', this._onResize);
  }
}
