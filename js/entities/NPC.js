import { CharacterState, CHAR_W, CHAR_H, DIR_ROW, FRAME } from './CharacterConstants.js';

/**
 * NPC — data-driven villager placed from a map's `npcs` array.
 *
 * Phase 2 scope: NPCs stand on their tile, breathe (idle animation), block movement,
 * turn to face Kael when spoken to and expose their placeholder `lines`. Walking
 * routines, schedules, quests and branching dialogue are planned for later phases;
 * `dialogueId` is reserved so Phase 3 can point to real dialogue data.
 */
export class NPC {
  constructor(def, sheet, tile = 16) {
    this.id = def.id;
    this.name = def.name;
    this.look = def.look ?? 'villager';
    this.baseLines = def.lines.slice();
    this.lines = this.baseLines.slice();
    this.worldState = 'DEFAULT';
    this.dialogueId = def.dialogueId ?? null;
    this.kind = 'npc';
    this.width = CHAR_W;
    this.height = CHAR_H;
    this.x = def.x * tile + (tile - CHAR_W) / 2;
    this.y = (def.y + 1) * tile - CHAR_H;
    this.homeDirection = def.facing ?? 'down';
    this.direction = this.homeDirection;
    this.state = CharacterState.IDLE;
    this.animationFrame = FRAME.IDLE_A;
    // Offset each villager's breathing so they don't move in lockstep.
    this.animationTimer = (def.x * 7 + def.y * 3) % 10 / 10;
    this.collisionBounds = { x: 1, y: 15, w: 14, h: 9 };
    this.sheet = sheet;
    this.talking = false;
  }

  get sortY() { return this.y + this.height; }
  get centerX() { return this.x + this.width / 2; }
  get feetY() { return this.y + this.collisionBounds.y + this.collisionBounds.h / 2; }

  /** Interaction area = feet box grown by `pad` px. */
  interactRect(pad = 4, out = {}) {
    const c = this.collisionBounds;
    out.x = this.x + c.x - pad;
    out.y = this.y + c.y - pad;
    out.w = c.w + pad * 2;
    out.h = c.h + pad * 2;
    return out;
  }

  faceToward(x, y) {
    const dx = x - this.centerX, dy = y - this.feetY;
    this.direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  }

  setWorldState(state, lines = null) { this.worldState = state ?? this.worldState; this.lines = Array.isArray(lines) && lines.length ? lines.slice() : this.baseLines.slice(); }

  endTalk() {
    this.talking = false;
    this.direction = this.homeDirection;
  }

  update(dt) {
    this.animationTimer += dt;
    this.animationFrame = Math.floor(this.animationTimer * 1.3) % 2 === 0 ? FRAME.IDLE_A : FRAME.IDLE_B;
  }

  render(ctx, camera) {
    ctx.drawImage(
      this.sheet,
      this.animationFrame * CHAR_W, DIR_ROW[this.direction] * CHAR_H, CHAR_W, CHAR_H,
      Math.round(this.x) - camera.rx, Math.round(this.y) - camera.ry, CHAR_W, CHAR_H,
    );
  }
}
