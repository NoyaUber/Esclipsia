/**
 * EidolonArt — Phase 3
 *
 * Procedural pixel-art sprites for the initial Eidolon roster.
 * Each Eidolon has:
 *   - A 32×32 battle sprite canvas (front-facing)
 *   - A 16×16 overworld sprite canvas
 *   - Idle animation via offsets in a 32×(32*2) sheet (frames 0 & 1 stacked vertically)
 *
 * Art style: dark fantasy, muted palette, clear elemental silhouette.
 *
 * Initial designs:
 *   1. Grimfang  — Shadow element
 *   2. Emberling — Fire element
 *   3. Crysturtle — Earth element
 *   4. Wraithling — Shadow element
 */

function px(ctx, x, y, color, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

/* ------------------------------------------------------------------ */
/* Colour tables                                                       */
/* ------------------------------------------------------------------ */
const E = {
  // Shadow palette
  shadowBase: '#1a1420',
  shadowMid: '#2e2440',
  shadowHi: '#5a3a7a',
  shadowGlow: '#a06ae0',
  shadowEye: '#e040ff',

  // Fire palette
  fireBase: '#3a1208',
  fireMid: '#8a2810',
  fireOrange: '#d86020',
  fireYellow: '#f0b040',
  fireCore: '#fff0a0',
  fireEye: '#ff4020',

  // Earth palette
  earthBase: '#1e1a10',
  earthMid: '#3c3420',
  earthHi: '#5a4e30',
  earthShell: '#7a6a40',
  earthMoss: '#3a4a28',
  earthGem: '#a0d040',
  earthEye: '#60c020',

  // Shared
  darkEdge: '#080608',
  rimLight: '#c0a060',
};

/* ------------------------------------------------------------------ */
/* Grimfang — Shadow wolf-spirit, 32×32                               */
/* ------------------------------------------------------------------ */
function drawGrimfang(ctx, frame = 0) {
  const bob = frame === 1 ? 1 : 0;

  // Shadow body
  px(ctx, 8, 14 + bob, E.shadowBase, 16, 14);
  px(ctx, 10, 12 + bob, E.shadowMid, 12, 4);
  px(ctx, 12, 10 + bob, E.shadowMid, 8, 4);

  // Fur texture (shadow patches)
  px(ctx, 9, 15 + bob, E.shadowMid, 2, 3);
  px(ctx, 20, 16 + bob, E.shadowMid, 2, 3);
  px(ctx, 14, 13 + bob, E.shadowHi, 4, 2);

  // Legs
  px(ctx, 10, 26 + bob, E.shadowBase, 3, 5);
  px(ctx, 15, 27 + bob, E.shadowBase, 3, 4);
  px(ctx, 20, 26 + bob, E.shadowBase, 3, 5);
  px(ctx, 25, 27 + bob, E.shadowBase, 3, 4);
  // Claws
  px(ctx, 10, 30 + bob, E.shadowHi, 2, 1);
  px(ctx, 20, 30 + bob, E.shadowHi, 2, 1);

  // Head
  px(ctx, 10, 6 + bob, E.shadowMid, 12, 8);
  px(ctx, 9, 8 + bob, E.shadowBase, 2, 4);
  px(ctx, 21, 8 + bob, E.shadowBase, 2, 4);
  // Snout
  px(ctx, 12, 12 + bob, E.shadowBase, 8, 4);
  px(ctx, 13, 13 + bob, E.shadowMid, 6, 2);

  // Ears
  px(ctx, 10, 3 + bob, E.shadowHi, 3, 4);
  px(ctx, 19, 3 + bob, E.shadowHi, 3, 4);
  px(ctx, 11, 2 + bob, E.shadowGlow, 1, 2);
  px(ctx, 20, 2 + bob, E.shadowGlow, 1, 2);

  // Eyes — purple glow
  px(ctx, 13, 8 + bob, E.shadowEye, 3, 2);
  px(ctx, 20, 8 + bob, E.shadowEye, 3, 2);
  px(ctx, 14, 8 + bob, '#ffffff', 1, 1);
  px(ctx, 21, 8 + bob, '#ffffff', 1, 1);

  // Shadow aura
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = E.shadowGlow;
  ctx.fillRect(6, 10 + bob, 20, 16);
  ctx.globalAlpha = 1;

  // Tail
  px(ctx, 22, 18 + bob, E.shadowHi, 6, 2);
  px(ctx, 24, 16 + bob, E.shadowHi, 4, 2);
  px(ctx, 26, 14 + bob, E.shadowGlow, 2, 2);
}

/* ------------------------------------------------------------------ */
/* Emberling — Fire elemental pup, 32×32                              */
/* ------------------------------------------------------------------ */
function drawEmberling(ctx, frame = 0) {
  const bob = frame === 1 ? 1 : 0;

  // Core body — round fire creature
  px(ctx, 10, 14 + bob, E.fireBase, 12, 10);
  px(ctx, 9, 16 + bob, E.fireMid, 14, 8);
  px(ctx, 11, 14 + bob, E.fireMid, 10, 10);
  px(ctx, 12, 13 + bob, E.fireOrange, 8, 10);
  px(ctx, 13, 12 + bob, E.fireOrange, 6, 8);
  px(ctx, 14, 11 + bob, E.fireYellow, 4, 6);

  // Fire texture
  px(ctx, 15, 10 + bob, E.fireCore, 2, 2);
  px(ctx, 13, 15 + bob, E.fireYellow, 2, 2);
  px(ctx, 17, 16 + bob, E.fireYellow, 2, 2);

  // Stubby legs
  px(ctx, 11, 24 + bob, E.fireBase, 4, 4);
  px(ctx, 17, 24 + bob, E.fireBase, 4, 4);
  px(ctx, 12, 27 + bob, E.fireMid, 2, 2);
  px(ctx, 18, 27 + bob, E.fireMid, 2, 2);

  // Arms / wing-stubs
  px(ctx, 7, 16 + bob, E.fireMid, 4, 5);
  px(ctx, 21, 16 + bob, E.fireMid, 4, 5);
  px(ctx, 7, 20 + bob, E.fireOrange, 3, 2);
  px(ctx, 22, 20 + bob, E.fireOrange, 3, 2);

  // Eyes
  px(ctx, 13, 15 + bob, E.fireEye, 3, 3);
  px(ctx, 18, 15 + bob, E.fireEye, 3, 3);
  px(ctx, 14, 15 + bob, E.fireCore, 1, 2);
  px(ctx, 19, 15 + bob, E.fireCore, 1, 2);

  // Flame crown
  px(ctx, 14, 8 + bob, E.fireOrange, 4, 4);
  px(ctx, 15, 6 + bob, E.fireYellow, 2, 3);
  px(ctx, 15, 4 + bob, E.fireCore, 2, 2);
  px(ctx, 12, 9 + bob, E.fireMid, 2, 3);
  px(ctx, 18, 9 + bob, E.fireMid, 2, 3);

  // Glow
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = E.fireOrange;
  ctx.fillRect(8, 10 + bob, 16, 18);
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------ */
/* Crysturtle — Earth tortoise with crystal shell, 32×32              */
/* ------------------------------------------------------------------ */
function drawCrysturtle(ctx, frame = 0) {
  const bob = frame === 1 ? 0 : 0; // earth turtle barely bobs

  // Shadow
  ctx.globalAlpha = 0.28;
  px(ctx, 7, 29, '#000000', 18, 3);
  ctx.globalAlpha = 1;

  // Shell base
  px(ctx, 8, 10 + bob, E.earthBase, 16, 14);
  px(ctx, 7, 12 + bob, E.earthMid, 18, 10);
  px(ctx, 8, 12 + bob, E.earthHi, 16, 8);

  // Shell pattern — hexagonal plates
  px(ctx, 10, 12 + bob, E.earthShell, 5, 4);
  px(ctx, 17, 12 + bob, E.earthShell, 5, 4);
  px(ctx, 13, 16 + bob, E.earthShell, 6, 4);
  px(ctx, 10, 20 + bob, E.earthShell, 5, 3);
  px(ctx, 17, 20 + bob, E.earthShell, 5, 3);

  // Moss trim
  px(ctx, 8, 11 + bob, E.earthMoss, 16, 1);
  px(ctx, 7, 12 + bob, E.earthMoss, 1, 10);
  px(ctx, 24, 12 + bob, E.earthMoss, 1, 10);

  // Crystal spikes on shell
  px(ctx, 11, 7 + bob, E.earthGem, 2, 5);
  px(ctx, 15, 5 + bob, E.earthGem, 2, 7);
  px(ctx, 19, 7 + bob, E.earthGem, 2, 5);
  px(ctx, 13, 6 + bob, '#c0f060', 1, 4);
  px(ctx, 17, 4 + bob, '#c0f060', 1, 5);
  px(ctx, 21, 6 + bob, '#c0f060', 1, 4);

  // Head
  px(ctx, 13, 20 + bob, E.earthMid, 6, 6);
  px(ctx, 14, 19 + bob, E.earthHi, 4, 2);
  px(ctx, 13, 24 + bob, E.earthBase, 6, 2);

  // Eyes — green gems
  px(ctx, 14, 21 + bob, E.earthEye, 2, 2);
  px(ctx, 18, 21 + bob, E.earthEye, 2, 2);
  px(ctx, 14, 21 + bob, '#d0ffa0', 1, 1);
  px(ctx, 18, 21 + bob, '#d0ffa0', 1, 1);

  // Legs
  px(ctx, 7, 22 + bob, E.earthBase, 4, 5);
  px(ctx, 21, 22 + bob, E.earthBase, 4, 5);
  px(ctx, 7, 26 + bob, E.earthMid, 4, 2);
  px(ctx, 21, 26 + bob, E.earthMid, 4, 2);
  // Tail stub
  px(ctx, 21, 20 + bob, E.earthBase, 3, 3);
}

/* ------------------------------------------------------------------ */
/* Wraithling — Shadow ghost-child, 32×32                             */
/* ------------------------------------------------------------------ */
function drawWraithling(ctx, frame = 0) {
  // Wraiths hover — bob is vertical float
  const bob = frame === 1 ? -2 : 0;

  // Wispy tail / lower body
  ctx.globalAlpha = 0.55;
  px(ctx, 12, 24 + bob, E.shadowMid, 8, 6);
  px(ctx, 10, 26 + bob, E.shadowBase, 12, 4);
  px(ctx, 13, 28 + bob, E.shadowBase, 6, 3);
  ctx.globalAlpha = 1;

  // Robe body
  px(ctx, 10, 14 + bob, E.shadowMid, 12, 12);
  px(ctx, 11, 13 + bob, E.shadowHi, 10, 12);
  px(ctx, 12, 12 + bob, '#3e3058', 8, 10);

  // Arms — flowing wisps
  px(ctx, 7, 16 + bob, E.shadowMid, 4, 6);
  px(ctx, 5, 18 + bob, E.shadowBase, 3, 4);
  px(ctx, 21, 16 + bob, E.shadowMid, 4, 6);
  px(ctx, 22, 18 + bob, E.shadowBase, 3, 4);
  // Wispy finger tips
  px(ctx, 5, 21 + bob, E.shadowGlow, 2, 1);
  px(ctx, 23, 21 + bob, E.shadowGlow, 2, 1);

  // Head — round, pale
  px(ctx, 10, 6 + bob, '#c8bcd4', 12, 10);
  px(ctx, 9, 8 + bob, '#d8cce4', 14, 7);
  px(ctx, 11, 6 + bob, '#ded0ea', 10, 4);

  // Eye sockets — hollow
  px(ctx, 12, 9 + bob, E.shadowEye, 3, 3);
  px(ctx, 17, 9 + bob, E.shadowEye, 3, 3);
  px(ctx, 13, 9 + bob, '#220038', 1, 2);
  px(ctx, 18, 9 + bob, '#220038', 1, 2);

  // Mouth — grim line
  px(ctx, 13, 13 + bob, E.shadowBase, 6, 1);
  px(ctx, 14, 14 + bob, E.shadowHi, 4, 1);

  // Crown wisps
  ctx.globalAlpha = 0.7;
  px(ctx, 11, 3 + bob, E.shadowGlow, 2, 4);
  px(ctx, 15, 1 + bob, E.shadowGlow, 2, 5);
  px(ctx, 19, 3 + bob, E.shadowGlow, 2, 4);
  ctx.globalAlpha = 1;

  // Glow aura
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = E.shadowGlow;
  ctx.fillRect(8, 6 + bob, 16, 24);
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------ */
/* Overworld sprites — 16×16                                           */
/* ------------------------------------------------------------------ */
function drawGrimfangOW(ctx) {
  px(ctx, 4, 8, E.shadowMid, 8, 5);
  px(ctx, 5, 6, E.shadowMid, 6, 3);
  px(ctx, 5, 5, E.shadowHi, 1, 2); px(ctx, 10, 5, E.shadowHi, 1, 2);
  px(ctx, 6, 7, E.shadowEye, 2, 1); px(ctx, 9, 7, E.shadowEye, 2, 1);
  px(ctx, 5, 12, E.shadowBase, 2, 3); px(ctx, 9, 12, E.shadowBase, 2, 3);
  px(ctx, 11, 10, E.shadowHi, 3, 2);
}

function drawEmberlingOW(ctx) {
  px(ctx, 5, 7, E.fireMid, 6, 7);
  px(ctx, 6, 6, E.fireOrange, 4, 7);
  px(ctx, 7, 5, E.fireYellow, 2, 4);
  px(ctx, 7, 4, E.fireCore, 2, 2);
  px(ctx, 6, 9, E.fireEye, 2, 2); px(ctx, 9, 9, E.fireEye, 2, 2);
  px(ctx, 5, 14, E.fireBase, 2, 2); px(ctx, 9, 14, E.fireBase, 2, 2);
}

function drawCrysturtleOW(ctx) {
  px(ctx, 4, 8, E.earthMid, 8, 6);
  px(ctx, 5, 7, E.earthHi, 6, 6);
  px(ctx, 6, 7, E.earthShell, 4, 4);
  px(ctx, 6, 4, E.earthGem, 1, 4); px(ctx, 8, 3, E.earthGem, 1, 5); px(ctx, 10, 4, E.earthGem, 1, 4);
  px(ctx, 6, 12, E.earthMid, 4, 3);
  px(ctx, 7, 12, E.earthEye, 1, 1); px(ctx, 9, 12, E.earthEye, 1, 1);
  px(ctx, 3, 10, E.earthBase, 2, 3); px(ctx, 11, 10, E.earthBase, 2, 3);
}

function drawWraithlingOW(ctx) {
  px(ctx, 5, 5, '#c8bcd4', 6, 5);
  px(ctx, 5, 9, E.shadowMid, 6, 5);
  px(ctx, 6, 9, '#3e3058', 4, 5);
  px(ctx, 6, 7, E.shadowEye, 2, 2); px(ctx, 9, 7, E.shadowEye, 2, 2);
  ctx.globalAlpha = 0.6;
  px(ctx, 5, 13, E.shadowBase, 6, 3);
  ctx.globalAlpha = 1;
  px(ctx, 5, 2, E.shadowGlow, 1, 3); px(ctx, 7, 1, E.shadowGlow, 2, 3); px(ctx, 10, 2, E.shadowGlow, 1, 3);
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

const BATTLE_SIZE = 32;
const OW_SIZE = 16;

const DRAWERS = {
  grimfang:  { battle: drawGrimfang,  ow: drawGrimfangOW },
  emberling: { battle: drawEmberling, ow: drawEmberlingOW },
  crysturtle:{ battle: drawCrysturtle, ow: drawCrysturtleOW },
  wraithling:{ battle: drawWraithling, ow: drawWraithlingOW },
};

/**
 * Create a battle sprite sheet (32×64: frame0 top, frame1 bottom) for an Eidolon.
 * @param {string} id - eidolon id
 * @returns {HTMLCanvasElement}
 */
export function createEidolonBattleSheet(id) {
  const drawer = DRAWERS[id];
  if (!drawer) {
    const c = document.createElement('canvas');
    c.width = BATTLE_SIZE; c.height = BATTLE_SIZE * 2;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(0, 0, BATTLE_SIZE, BATTLE_SIZE * 2);
    return c;
  }
  const c = document.createElement('canvas');
  c.width = BATTLE_SIZE;
  c.height = BATTLE_SIZE * 2;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawer.battle(ctx, 0);           // frame 0 at top
  ctx.save();
  ctx.translate(0, BATTLE_SIZE);
  drawer.battle(ctx, 1);           // frame 1 at bottom
  ctx.restore();
  return c;
}

/**
 * Create a 16×16 overworld sprite for an Eidolon.
 * @param {string} id
 * @returns {HTMLCanvasElement}
 */
export function createEidolonOverworldSprite(id) {
  const drawer = DRAWERS[id];
  const c = document.createElement('canvas');
  c.width = OW_SIZE; c.height = OW_SIZE;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (drawer) drawer.ow(ctx);
  else { ctx.fillStyle = '#ff00ff'; ctx.fillRect(0, 0, OW_SIZE, OW_SIZE); }
  return c;
}

/** All available Eidolon IDs in Phase 3. */
export const EIDOLON_IDS = Object.keys(DRAWERS);

/** Element info for each Eidolon. */
export const EIDOLON_INFO = {
  grimfang:   { name: 'Grimfang',   element: 'Shadow', color: '#a06ae0' },
  emberling:  { name: 'Emberling',  element: 'Fire',   color: '#d86020' },
  crysturtle: { name: 'Crysturtle', element: 'Earth',  color: '#a0d040' },
  wraithling: { name: 'Wraithling', element: 'Shadow', color: '#c060ff' },
};
