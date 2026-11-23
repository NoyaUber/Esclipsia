/** Shared constants for 16×24 overworld characters (player and NPCs). */
export const Direction = Object.freeze({ UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right' });
export const CharacterState = Object.freeze({ IDLE: 'IDLE', WALKING: 'WALKING' });

export const CHAR_W = 16;
export const CHAR_H = 24;

/** Sprite sheet layout: rows = direction, columns = frame. */
export const DIR_ROW = Object.freeze({ down: 0, left: 1, right: 2, up: 3 });
export const DIR_VEC = Object.freeze({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] });
export const FRAME = Object.freeze({ IDLE_A: 0, IDLE_B: 1, STEP_A: 2, STEP_B: 3 });
export const FRAME_COUNT = 4;
/** step A → idle → step B → idle */
export const WALK_SEQUENCE = Object.freeze([FRAME.STEP_A, FRAME.IDLE_A, FRAME.STEP_B, FRAME.IDLE_A]);
