import { Direction, DIR_ROW, DIR_VEC, CharacterState, CHAR_W, CHAR_H, FRAME, WALK_SEQUENCE } from './CharacterConstants.js';

/**
 * Kael — the player entity.
 *
 * Sprite: 16×24 logical pixels. (x, y) is the sprite's top-left; the collision box covers
 * only the feet (bottom 6 px) so Kael can walk in front of walls, trees and roofs.
 * Movement is strictly 4-directional (the InputManager reports one direction at a time),
 * so diagonal speed can never exceed `speed`.
 */
export class Player {
  constructor({ x, y, direction = Direction.DOWN, sheet }) {
    this.id = 'kael';
    this.name = 'Kael';
    this.x = x;
    this.y = y;
    this.width = CHAR_W;
    this.height = CHAR_H;
    this.speed = 65; // logical px per second
    this.direction = direction;
    this.state = CharacterState.IDLE;
    this.animationFrame = FRAME.IDLE_A;
    this.animationTimer = 0;
    this.collisionBounds = { x: 3, y: 18, w: 10, h: 6 };
    this.blocked = false;
    this.sheet = sheet;
    this.frozen = false; // true while a dialogue / cut-in owns the input
  }

  // Camera + y-sort helpers
  get w() { return this.width; }
  get h() { return this.height; }
  get sortY() { return this.y + this.height; }
  get feetX() { return this.x + this.collisionBounds.x + this.collisionBounds.w / 2; }
  get feetY() { return this.y + this.collisionBounds.y + this.collisionBounds.h / 2; }

  /** Place the player so his feet stand in the middle of tile (tx, ty). */
  placeOnTile(tx, ty, tile = 16) {
    this.x = tx * tile + (tile - this.width) / 2;
    this.y = (ty + 1) * tile - this.height;
  }

  update(dt, input, collision) {
    const dir = this.frozen ? null : input.direction;
    if (dir) {
      if (this.state !== CharacterState.WALKING) {
        this.state = CharacterState.WALKING;
        this.animationTimer = 0;
      }
      this.direction = dir;
      const v = DIR_VEC[dir];
      const step = this.speed * dt;
      this.blocked = !collision.move(this, v[0] * step, v[1] * step);
      // Walk cycle at ~8 frames/s; slower "treading" when pushing against a wall.
      this.animationTimer += dt * (this.blocked ? 0.6 : 1);
      this.animationFrame = WALK_SEQUENCE[Math.floor(this.animationTimer * 8) % WALK_SEQUENCE.length];
    } else {
      if (this.state !== CharacterState.IDLE) {
        this.state = CharacterState.IDLE;
        this.animationTimer = 0;
      }
      this.blocked = false;
      // Directional idle: slow breathing between two frames.
      this.animationTimer += dt;
      this.animationFrame = Math.floor(this.animationTimer * 1.6) % 2 === 0 ? FRAME.IDLE_A : FRAME.IDLE_B;
    }
  }

  faceToward(x, y) {
    const dx = x - this.feetX, dy = y - this.feetY;
    this.direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? Direction.LEFT : Direction.RIGHT) : (dy < 0 ? Direction.UP : Direction.DOWN);
  }

  render(ctx, camera) {
    ctx.drawImage(
      this.sheet,
      this.animationFrame * CHAR_W, DIR_ROW[this.direction] * CHAR_H, CHAR_W, CHAR_H,
      Math.round(this.x) - camera.rx, Math.round(this.y) - camera.ry, CHAR_W, CHAR_H,
    );
  }
}
