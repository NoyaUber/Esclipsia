/**
 * VisualEffects — Phase 3
 *
 * Lightweight particle and atmosphere systems drawn on the Canvas back buffer.
 * All effects are budget-friendly: pre-computed tables, integer math, no DOM operations.
 *
 * Systems available:
 *   - Aether motes  (floating, pulsing dust/sparks)
 *   - Ground fog    (rolling low-lying fog ribbons)
 *   - Water shimmer (animated highlights on water tiles)
 *   - Leaf drift    (falling leaves / debris)
 *   - Screen flash  (brief full-screen tint)
 *   - Ambient pulse (subtle colour tint cycle)
 *   - Vignette      (radial darkness, pre-rendered)
 */

import { mulberry32 } from '../utils/MathUtils.js';

/* ------------------------------------------------------------------ */
/* Colour helpers                                                       */
/* ------------------------------------------------------------------ */
const rgba = (r, g, b, a) => `rgba(${r},${g},${b},${a.toFixed(3)})`;

/* ------------------------------------------------------------------ */
/* AetherMotes                                                          */
/* ------------------------------------------------------------------ */
export class AetherMotes {
  /**
   * @param {number} count
   * @param {number} w - logical canvas width
   * @param {number} h - logical canvas height
   * @param {number} [seed]
   */
  constructor(count, w, h, seed = 42) {
    this.w = w;
    this.h = h;
    this.particles = [];
    const rand = mulberry32(seed);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: rand() * w,
        y: rand() * h,
        vx: (rand() - 0.5) * 6,
        vy: -(3 + rand() * 8),
        phase: rand() * Math.PI * 2,
        life: rand(),           // 0-1 progress through lifetime
        maxLife: 4 + rand() * 8,
        // 0 = gold aether, 1 = ember red, 2 = soul-blue
        type: Math.floor(rand() * 3),
        size: rand() > 0.8 ? 2 : 1,
      });
    }
  }

  update(dt, time) {
    for (const p of this.particles) {
      p.x += (p.vx + Math.sin(time * 1.2 + p.phase) * 4) * dt;
      p.y += p.vy * dt;
      p.life += dt / p.maxLife;
      if (p.life >= 1 || p.y < -4) {
        // Respawn at the bottom edge
        p.x = Math.random() * this.w;
        p.y = this.h + 2;
        p.life = 0;
        p.phase = Math.random() * Math.PI * 2;
      }
      if (p.x < -2) p.x += this.w + 4;
      if (p.x > this.w + 2) p.x -= this.w + 4;
    }
  }

  render(ctx, time) {
    ctx.save();
    for (const p of this.particles) {
      // Fade in/out at life edges
      const fade = Math.min(p.life * 6, 1 - (p.life - 0.6) / 0.4);
      const a = Math.max(0, Math.min(1, fade)) * (0.3 + 0.4 * Math.sin(time * 2.5 + p.phase));
      if (a < 0.02) continue;
      switch (p.type) {
        case 0: ctx.fillStyle = rgba(224, 192, 112, a); break; // gold
        case 1: ctx.fillStyle = rgba(180, 60, 60, a); break;   // ember
        default: ctx.fillStyle = rgba(80, 120, 200, a); break; // soul-blue
      }
      ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* GroundFog                                                            */
/* ------------------------------------------------------------------ */
export class GroundFog {
  /**
   * @param {number} w
   * @param {number} h
   * @param {number} [layers] - number of fog ribbons
   */
  constructor(w, h, layers = 6) {
    this.w = w;
    this.h = h;
    const rand = mulberry32(99);
    this.ribbons = [];
    for (let i = 0; i < layers; i++) {
      this.ribbons.push({
        y: h * 0.45 + rand() * h * 0.5,  // lower half of screen
        scrollX: (rand() - 0.5) * 20,     // px/s drift
        phase: rand() * Math.PI * 2,
        height: 6 + rand() * 14,
        alpha: 0.03 + rand() * 0.07,
        speed: rand() > 0.5 ? 1 : -1,
      });
    }
    this._canvas = null;
    this._buildGradient(w);
  }

  _buildGradient(w) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = 1;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(220,210,195,0)');
    g.addColorStop(0.15, 'rgba(220,210,195,1)');
    g.addColorStop(0.85, 'rgba(220,210,195,1)');
    g.addColorStop(1, 'rgba(220,210,195,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, 1);
    this._canvas = c;
  }

  render(ctx, time) {
    ctx.save();
    for (const r of this.ribbons) {
      const wave = Math.sin(time * 0.4 + r.phase) * 3;
      const x = ((time * r.scrollX * r.speed) % this.w + this.w) % this.w;
      ctx.globalAlpha = r.alpha * (0.7 + 0.3 * Math.sin(time * 0.8 + r.phase));
      ctx.fillStyle = 'rgba(220,210,195,1)';
      // Draw ribbon with sinusoidal height variation
      for (let px = 0; px < this.w; px += 2) {
        const h = r.height * (0.6 + 0.4 * Math.sin((px / this.w) * Math.PI * 3 + time * 0.3 + r.phase));
        const ry = r.y + wave + Math.sin(px * 0.04 + time * 0.5) * 4;
        ctx.fillRect((px + x) % this.w, ry | 0, 2, h | 0);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* LeafDrift — debris / falling leaves                                 */
/* ------------------------------------------------------------------ */
export class LeafDrift {
  constructor(count, w, h, seed = 71) {
    this.w = w;
    this.h = h;
    const rand = mulberry32(seed);
    this.leaves = [];
    for (let i = 0; i < count; i++) {
      this.leaves.push({
        x: rand() * w,
        y: rand() * h,
        vy: 8 + rand() * 16,
        vx: (rand() - 0.4) * 12,
        rot: rand() * Math.PI * 2,
        rotV: (rand() - 0.5) * 4,
        // 0 = dark leaf, 1 = ash flake, 2 = ember spark
        type: rand() > 0.75 ? (rand() > 0.5 ? 1 : 2) : 0,
        alpha: 0.3 + rand() * 0.5,
        size: 1 + Math.floor(rand() * 2),
      });
    }
  }

  update(dt, time) {
    for (const l of this.leaves) {
      l.x += (l.vx + Math.sin(time + l.rot) * 5) * dt;
      l.y += l.vy * dt;
      l.rot += l.rotV * dt;
      if (l.y > this.h + 4) {
        l.y = -4;
        l.x = Math.random() * this.w;
      }
      if (l.x < -4) l.x += this.w + 8;
      if (l.x > this.w + 4) l.x -= this.w + 8;
    }
  }

  render(ctx, time) {
    ctx.save();
    for (const l of this.leaves) {
      ctx.globalAlpha = l.alpha;
      switch (l.type) {
        case 0: ctx.fillStyle = '#2f3c26'; break; // dark leaf
        case 1: ctx.fillStyle = '#9c8f7a'; break; // ash
        default: ctx.fillStyle = '#c05a28'; break; // ember
      }
      ctx.fillRect(l.x | 0, l.y | 0, l.size, l.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* ScreenFlash — single frame tint (interactions, damage, etc.)       */
/* ------------------------------------------------------------------ */
export class ScreenFlash {
  constructor() {
    this.alpha = 0;
    this.color = '#ffffff';
    this.decay = 4; // per second
  }

  /** Trigger a flash. alpha 0–1, duration in seconds. */
  trigger(color = '#ffffff', strength = 0.4, duration = 0.25) {
    this.color = color;
    this.alpha = strength;
    this.decay = strength / duration;
  }

  update(dt) {
    if (this.alpha > 0) this.alpha = Math.max(0, this.alpha - this.decay * dt);
  }

  render(ctx, w, h) {
    if (this.alpha < 0.01) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* WaterRipple — simple shimmer drawn on a pre-rendered water region  */
/* ------------------------------------------------------------------ */
export class WaterRipple {
  /**
   * @param {Array<{x:number, y:number}>} tiles - water tile positions in world px
   * @param {number} tileSize
   */
  constructor(tiles, tileSize) {
    this.tiles = tiles;
    this.sz = tileSize;
  }

  render(ctx, time, camX, camY) {
    if (this.tiles.length === 0) return;
    ctx.save();
    for (const t of this.tiles) {
      const sx = t.x - camX;
      const sy = t.y - camY;
      // 2–3 animated specular lines per tile
      for (let i = 0; i < 2; i++) {
        const wy = sy + 3 + i * 5 + Math.sin(time * 1.4 + t.x * 0.07 + i * 2) * 2;
        const wx = sx + 1 + Math.sin(time * 0.9 + t.y * 0.05 + i) * 3;
        const len = 4 + Math.round(Math.sin(time * 1.8 + i + t.x) * 2);
        ctx.globalAlpha = 0.18 + 0.12 * Math.sin(time * 2 + i + t.y);
        ctx.fillStyle = '#3b4a3c';
        ctx.fillRect(wx | 0, wy | 0, len, 1);
        ctx.fillStyle = '#5a7a8a';
        ctx.fillRect((wx + 1) | 0, wy | 0, Math.max(1, len - 2), 1);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* Vignette + eclipse atmosphere — pre-rendered, blitted per frame    */
/* ------------------------------------------------------------------ */
/**
 * Create an improved vignette with multi-layer eclipse tint.
 * @param {number} w
 * @param {number} h
 * @returns {HTMLCanvasElement}
 */
export function createEnhancedVignette(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Layer 1 — dark edge vignette
  const g1 = ctx.createRadialGradient(w / 2, h / 2, h * 0.28, w / 2, h / 2, w * 0.65);
  g1.addColorStop(0, 'rgba(10,4,6,0)');
  g1.addColorStop(0.6, 'rgba(10,4,6,0.08)');
  g1.addColorStop(1, 'rgba(10,4,6,0.72)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);

  // Layer 2 — maroon eclipse tint at the top
  const g2 = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  g2.addColorStop(0, 'rgba(90,20,24,0.18)');
  g2.addColorStop(1, 'rgba(90,20,24,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);

  // Layer 3 — subtle blue-shadow bottom
  const g3 = ctx.createLinearGradient(0, h * 0.6, 0, h);
  g3.addColorStop(0, 'rgba(10,15,30,0)');
  g3.addColorStop(1, 'rgba(10,15,30,0.28)');
  ctx.fillStyle = g3;
  ctx.fillRect(0, 0, w, h);

  return canvas;
}

/* ------------------------------------------------------------------ */
/* GrassWave — grass tuft animation                                   */
/* ------------------------------------------------------------------ */
export class GrassWave {
  /**
   * @param {Array<{x:number, y:number}>} positions - world px positions
   */
  constructor(positions) {
    const rand = mulberry32(55);
    this.blades = positions.map((p) => ({
      x: p.x,
      y: p.y,
      phase: rand() * Math.PI * 2,
      amp: 0.5 + rand() * 1.0,
    }));
  }

  render(ctx, time, camX, camY) {
    ctx.save();
    ctx.fillStyle = '#5a6e48';
    for (const b of this.blades) {
      const sx = (b.x - camX) | 0;
      const sy = (b.y - camY) | 0;
      const lean = Math.round(b.amp * Math.sin(time * 1.6 + b.phase));
      ctx.fillRect(sx + lean, sy, 1, 2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
