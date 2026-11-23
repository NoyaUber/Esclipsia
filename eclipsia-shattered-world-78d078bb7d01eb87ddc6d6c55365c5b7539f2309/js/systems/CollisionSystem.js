/**
 * CollisionSystem — overworld collision, kept separate from rendering.
 *
 * Solids come from three sources:
 *   1. Ground tiles whose legend entry is `solid: true` (water, …), optionally with a
 *      tile-local `hitbox: [x, y, w, h]`.
 *   2. Static world objects (trees, houses, rocks, fences, …) whose type in
 *      data/objects.json defines a `hitbox` relative to the sprite's top-left.
 *   3. Dynamic bodies registered with addBody() (NPCs). Bodies expose x, y and
 *      collisionBounds {x, y, w, h}.
 *
 * Static rects are bucketed per tile once at load time so queries only test the few
 * rects around the mover. Entities collide using a small "feet" box so characters can
 * walk in front of tall sprites (tree crowns, roofs) the way top-down RPGs look.
 *
 * Movement is resolved one axis at a time; when a straight move is blocked by a corner
 * the entity is nudged sideways a few pixels so it slides into narrow gaps instead of
 * sticking.
 */
const MAX_NUDGE = 6;

export class CollisionSystem {
  constructor(map, objectTypes) {
    const ts = map.tileSize;
    this.tileSize = ts;
    this.width = map.width;
    this.height = map.height;
    this.worldW = map.width * ts;
    this.worldH = map.height * ts;
    this.buckets = new Array(map.width * map.height);
    for (let i = 0; i < this.buckets.length; i++) this.buckets[i] = null;
    this.rects = [];
    this.bodies = [];

    const ground = map.layers.ground;
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        const def = map.legend.ground[ground[ty][tx]];
        if (!def.solid) continue;
        const hb = def.hitbox ?? [0, 0, ts, ts];
        this._addRect(tx * ts + hb[0], ty * ts + hb[1], hb[2], hb[3], 'tile');
      }
    }
    for (const o of map.objects) {
      const def = objectTypes.types[o.type];
      if (!def?.hitbox || def.layer === 'foreground') continue;
      const hb = def.hitbox;
      this._addRect(o.x + hb[0], o.y + hb[1], hb[2], hb[3], o.type);
    }
  }

  _addRect(x, y, w, h, kind) {
    const r = { x, y, w, h, kind };
    this.rects.push(r);
    const ts = this.tileSize;
    const x0 = Math.max(0, Math.floor(x / ts)), y0 = Math.max(0, Math.floor(y / ts));
    const x1 = Math.min(this.width - 1, Math.floor((x + w - 0.001) / ts));
    const y1 = Math.min(this.height - 1, Math.floor((y + h - 0.001) / ts));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const i = ty * this.width + tx;
        (this.buckets[i] ??= []).push(r);
      }
    }
  }

  /** Register a moving/standing body (NPC) that blocks other entities. */
  addBody(entity) { this.bodies.push(entity); }
  clearBodies() { this.bodies.length = 0; }

  /** True if any static solid exists in this tile (used by tests and AI). */
  isTileBlocked(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return true;
    return this.buckets[ty * this.width + tx] !== null;
  }

  /** True if the rect overlaps any solid or leaves the world. `ignore` skips one body. */
  overlaps(x, y, w, h, ignore = null) {
    if (x < 0 || y < 0 || x + w > this.worldW || y + h > this.worldH) return true;
    const ts = this.tileSize;
    const x0 = Math.floor(x / ts), y0 = Math.floor(y / ts);
    const x1 = Math.floor((x + w - 0.001) / ts), y1 = Math.floor((y + h - 0.001) / ts);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const list = this.buckets[ty * this.width + tx];
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const s = list[i];
          if (x < s.x + s.w && x + w > s.x && y < s.y + s.h && y + h > s.y) return true;
        }
      }
    }
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      if (b === ignore) continue;
      const c = b.collisionBounds;
      const bx = b.x + c.x, by = b.y + c.y;
      if (x < bx + c.w && x + w > bx && y < by + c.h && y + h > by) return true;
    }
    return false;
  }

  /** Does the entity's feet box currently overlap something? */
  entityOverlaps(entity) {
    const c = entity.collisionBounds;
    return this.overlaps(entity.x + c.x, entity.y + c.y, c.w, c.h, entity);
  }

  /**
   * Move an entity by (dx, dy). The entity exposes x, y and collisionBounds {x, y, w, h}
   * (offset from its position). Returns true if it moved.
   */
  move(entity, dx, dy) {
    const c = entity.collisionBounds;
    const startX = entity.x, startY = entity.y;

    if (dx !== 0) {
      const nx = entity.x + dx;
      if (!this.overlaps(nx + c.x, entity.y + c.y, c.w, c.h, entity)) entity.x = nx;
      else {
        this._snapTo(entity, dx, 0);
        if (dy === 0) this._nudge(entity, dx, 0);
      }
    }
    if (dy !== 0) {
      const ny = entity.y + dy;
      if (!this.overlaps(entity.x + c.x, ny + c.y, c.w, c.h, entity)) entity.y = ny;
      else {
        this._snapTo(entity, 0, dy);
        if (dx === 0) this._nudge(entity, 0, dy);
      }
    }
    return entity.x !== startX || entity.y !== startY;
  }

  /** Close the sub-pixel gap to an obstacle so the entity rests flush against it. */
  _snapTo(entity, dx, dy) {
    const c = entity.collisionBounds;
    const step = 0.25;
    const total = Math.abs(dx || dy);
    const sx = Math.sign(dx) * step, sy = Math.sign(dy) * step;
    for (let moved = step; moved < total; moved += step) {
      if (this.overlaps(entity.x + sx + c.x, entity.y + sy + c.y, c.w, c.h, entity)) return;
      entity.x += sx;
      entity.y += sy;
    }
  }

  /** Corner sliding: try shifting perpendicular so the move becomes possible. */
  _nudge(entity, dx, dy) {
    const c = entity.collisionBounds;
    for (let i = 1; i <= MAX_NUDGE; i++) {
      for (const sign of [-1, 1]) {
        const ox = dy !== 0 ? sign * i : 0;
        const oy = dx !== 0 ? sign * i : 0;
        const probeX = entity.x + ox + Math.sign(dx) + c.x;
        const probeY = entity.y + oy + Math.sign(dy) + c.y;
        if (!this.overlaps(probeX, probeY, c.w, c.h, entity) && this._clearPath(entity, ox, oy)) {
          // Slide toward the opening at normal speed rather than teleporting.
          const step = Math.min(Math.abs(dx || dy), 1);
          const sx = entity.x + Math.sign(ox) * step;
          const sy = entity.y + Math.sign(oy) * step;
          if (!this.overlaps(sx + c.x, sy + c.y, c.w, c.h, entity)) {
            entity.x = sx;
            entity.y = sy;
          }
          return;
        }
      }
    }
  }

  /** The perpendicular slide itself must be unobstructed. */
  _clearPath(entity, ox, oy) {
    const c = entity.collisionBounds;
    return !this.overlaps(entity.x + ox + c.x, entity.y + oy + c.y, c.w, c.h, entity);
  }
}
