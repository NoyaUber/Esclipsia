import { DIR_VEC } from '../entities/CharacterConstants.js';

/**
 * InteractionSystem — finds what Kael can interact with.
 *
 * A probe point is projected a short distance in front of Kael's feet in the direction
 * he faces. The nearest NPC or interactable whose area contains the probe (or lies
 * within REACH of it) becomes the current target. Phase 3 will route targets to the
 * dialogue / quest systems; Phase 2 only returns placeholder lines.
 */
const PROBE_DIST = 9;
const REACH = 6;

export class InteractionSystem {
  constructor(map, npcs) {
    const ts = map.tileSize;
    this.npcs = npcs;
    // Interactables are tile-based in data; convert once to pixel rects.
    this.objects = map.interactables.map((it) => ({
      kind: 'object',
      id: it.id,
      name: it.name ?? '',
      lines: it.lines.slice(),
      transition: it.transition ?? null,
      requires: it.requires ?? null,
      lockedLines: it.lockedLines ?? null,
      worldObjectId: it.worldObjectId ?? (it.collectItem ? it.id : null),
      collectItem: it.collectItem ?? null,
      x: it.x * ts,
      y: it.y * ts,
      w: (it.w ?? 1) * ts,
      h: (it.h ?? 1) * ts,
      // Where the indicator floats (above the tile, centred).
      anchorX: it.x * ts + ((it.w ?? 1) * ts) / 2,
      anchorY: it.y * ts - 6,
    }));
    this.target = null;
    this._rect = { x: 0, y: 0, w: 0, h: 0 };
    this.probe = { x: 0, y: 0 };
  }

  _score(px, py, x, y, w, h) {
    const dx = px < x ? x - px : px > x + w ? px - (x + w) : 0;
    const dy = py < y ? y - py : py > y + h ? py - (y + h) : 0;
    return dx * dx + dy * dy;
  }

  /** Recompute the current target. Returns the target or null. */
  update(player) {
    const v = DIR_VEC[player.direction];
    const px = player.feetX + v[0] * PROBE_DIST;
    const py = player.feetY + v[1] * PROBE_DIST;
    this.probe.x = px;
    this.probe.y = py;
    let best = null;
    let bestScore = REACH * REACH;
    for (const n of this.npcs) {
      const r = n.interactRect(3, this._rect);
      const s = this._score(px, py, r.x, r.y, r.w, r.h);
      if (s <= bestScore) { bestScore = s; best = n; }
    }
    for (const o of this.objects) {
      const s = this._score(px, py, o.x, o.y, o.w, o.h);
      if (s < bestScore) { bestScore = s; best = o; }
    }
    this.target = best;
    return best;
  }

  /** Screen anchor (world coords) for the indicator above the current target. */
  anchorOf(target, out) {
    if (target.kind === 'npc') {
      out.x = target.x + target.width / 2;
      out.y = target.y - 3;
    } else {
      out.x = target.anchorX;
      out.y = target.anchorY;
    }
    return out;
  }
}
