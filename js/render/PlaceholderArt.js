/**
 * PlaceholderArt — original procedurally generated pixel art used until final
 * hand-drawn assets exist in /assets. Everything is drawn once into off-screen
 * canvases at load time (never per frame).
 */
import { hash2 } from '../utils/MathUtils.js';

export const TILE = 16;

const C = {
  grassA: '#2c3a28', grassB: '#34442f', grassC: '#25311f', grassTuft: '#4a5c3c',
  dirtA: '#4a3e31', dirtB: '#57493a', dirtC: '#3a3027',
  waterA: '#16243a', waterB: '#1f3450', waterC: '#2f4d6e', waterEdge: '#3b4a3c',
  leafDark: '#18241a', leafMid: '#213224', leafHi: '#2f4630', trunk: '#3a2a20',
  rockA: '#4a4950', rockB: '#5f5e67', rockC: '#333238',
  roofA: '#5a2228', roofB: '#6e2c32', roofC: '#3f171b',
  wallA: '#3b3532', wallB: '#4a433e', wallC: '#2a2522',
  door: '#22170f', gold: '#b5913f', goldDim: '#7a6230', glow: '#d9a64a',
  stoneA: '#38363a', stoneB: '#444147', stoneC: '#2a282c',
  wood: '#5a4130', woodDark: '#3d2c20',
  flowerR: '#8a3438', flowerG: '#c4a35a', flowerB: '#6c7fa8',
};

function px(ctx, x, y, color, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function speckle(ctx, ox, oy, tx, ty, seed, colors, density) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const h = hash2(tx * TILE + x, ty * TILE + y, seed);
      if (h < density) px(ctx, ox + x, oy + y, colors[Math.floor((h / density) * colors.length) % colors.length]);
    }
  }
}

/* ---------- Ground tile painters: (ctx, ox, oy, tx, ty, map) ---------- */

function grass(ctx, ox, oy, tx, ty) {
  px(ctx, ox, oy, C.grassA, TILE, TILE);
  speckle(ctx, ox, oy, tx, ty, 1, [C.grassB, C.grassC], 0.18);
}

function grassDark(ctx, ox, oy, tx, ty) {
  px(ctx, ox, oy, '#212d1e', TILE, TILE);
  speckle(ctx, ox, oy, tx, ty, 5, ['#2a3826', '#1a2418', '#33422c'], 0.2);
}

function dirt(ctx, ox, oy, tx, ty) {
  px(ctx, ox, oy, C.dirtA, TILE, TILE);
  speckle(ctx, ox, oy, tx, ty, 2, [C.dirtB, C.dirtC, C.dirtC], 0.2);
}

function stonePath(ctx, ox, oy, tx, ty) {
  px(ctx, ox, oy, '#2f2d31', TILE, TILE);
  // Irregular flagstones (2×2 per tile, jittered) with cracks and moss
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const jx = Math.floor(hash2(tx * 2 + i, ty * 2 + j, 11) * 2);
      const jy = Math.floor(hash2(tx * 2 + i, ty * 2 + j, 12) * 2);
      const x = ox + i * 8 + 1, y = oy + j * 8 + 1;
      px(ctx, x, y, C.stoneB, 6 + jx, 6 + jy);
      px(ctx, x, y, '#524e55', 6 + jx, 1);
      if (hash2(tx * 2 + i, ty * 2 + j, 13) > 0.7) px(ctx, x + 2, y + 2, C.stoneC, 1, 3);
      if (hash2(tx * 2 + i, ty * 2 + j, 14) > 0.8) px(ctx, x + 4, y + 4, '#3c4a34', 2, 1);
    }
  }
}

function plaza(ctx, ox, oy, tx, ty) {
  px(ctx, ox, oy, C.stoneA, TILE, TILE);
  const off = (ty % 2) * 4;
  for (let y = 0; y < TILE; y += 8) px(ctx, ox, oy + y, C.stoneC, TILE, 1);
  for (let x = off; x < TILE; x += 8) px(ctx, ox + x, oy + 1, C.stoneC, 1, 7);
  for (let x = (off + 4) % 8; x < TILE; x += 8) px(ctx, ox + x, oy + 9, C.stoneC, 1, 7);
  speckle(ctx, ox, oy, tx, ty, 3, [C.stoneB], 0.08);
}

function darkSoil(ctx, ox, oy, tx, ty) {
  px(ctx, ox, oy, '#241c18', TILE, TILE);
  speckle(ctx, ox, oy, tx, ty, 6, ['#2f2520', '#1a1411', '#3a2d24'], 0.22);
}

function tilledSoil(ctx, ox, oy, tx, ty) {
  px(ctx, ox, oy, '#2e2219', TILE, TILE);
  for (let y = 2; y < TILE; y += 5) {
    px(ctx, ox, oy + y, '#46342a', TILE, 2);
    px(ctx, ox, oy + y + 2, '#1c1410', TILE, 1);
  }
  // Ash-grey turnip sprouts
  if (hash2(tx, ty, 15) > 0.35) {
    const x = ox + 3 + Math.floor(hash2(tx, ty, 16) * 9);
    px(ctx, x, oy + 4, '#5c6b4a', 1, 2); px(ctx, x + 1, oy + 3, '#6e7d58', 1, 3); px(ctx, x + 2, oy + 4, '#5c6b4a', 1, 2);
    px(ctx, x, oy + 6, '#8f8a80', 3, 1);
  }
}

function water(ctx, ox, oy, tx, ty, map) {
  px(ctx, ox, oy, C.waterA, TILE, TILE);
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(hash2(tx, ty, 50 + i) * 10);
    const y = Math.floor(hash2(tx, ty, 60 + i) * 14) + 1;
    px(ctx, ox + x, oy + y, C.waterB, 5, 1);
    px(ctx, ox + x + 1, oy + y, C.waterC, 2, 1);
  }
  // Shoreline: muddy rim + foam where the neighbour is land
  const land = (x, y) => {
    const ch = map.layers.ground[y]?.[x];
    if (ch === undefined) return false;
    const t = map.legend.ground[ch].tile;
    return t !== 'water' && t !== 'bridge';
  };
  if (land(tx - 1, ty)) { px(ctx, ox, oy, C.waterEdge, 2, TILE); px(ctx, ox + 2, oy, C.waterC, 1, TILE); }
  if (land(tx + 1, ty)) { px(ctx, ox + TILE - 2, oy, C.waterEdge, 2, TILE); px(ctx, ox + TILE - 3, oy, C.waterC, 1, TILE); }
  if (land(tx, ty - 1)) { px(ctx, ox, oy, C.waterEdge, TILE, 2); px(ctx, ox, oy + 2, C.waterC, TILE, 1); }
  if (land(tx, ty + 1)) { px(ctx, ox, oy + TILE - 2, C.waterEdge, TILE, 2); }
}

function bridge(ctx, ox, oy, tx, ty, map) {
  water(ctx, ox, oy, tx, ty, map);
  px(ctx, ox, oy + 1, C.woodDark, TILE, 14);
  for (let x = 0; x < TILE; x += 4) { px(ctx, ox + x, oy + 2, C.wood, 3, 12); px(ctx, ox + x, oy + 2, '#6b4e3a', 3, 1); }
  // Rails only on the outer edges of the bridge
  const above = map.legend.ground[map.layers.ground[ty - 1]?.[tx]]?.tile;
  const below = map.legend.ground[map.layers.ground[ty + 1]?.[tx]]?.tile;
  if (above !== 'bridge') { px(ctx, ox, oy, '#2a1e16', TILE, 2); px(ctx, ox + 1, oy - 0, '#6b4e3a', TILE - 2, 1); }
  if (below !== 'bridge') { px(ctx, ox, oy + 14, '#2a1e16', TILE, 2); px(ctx, ox + 1, oy + 14, '#6b4e3a', TILE - 2, 1); }
}

const GROUND_PAINTERS = {
  grass, grass_dark: grassDark, dirt, stone_path: stonePath, plaza, dark_soil: darkSoil,
  tilled_soil: tilledSoil, water, bridge,
};

/* ---------- Decoration painters (transparent, over ground) ---------- */

function tallGrass(ctx, ox, oy, tx, ty) {
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(hash2(tx, ty, 10 + i) * 13) + 1;
    const y = Math.floor(hash2(tx, ty, 20 + i) * 10) + 4;
    px(ctx, ox + x, oy + y, C.grassTuft, 1, 3);
    px(ctx, ox + x + 1, oy + y - 1, '#5a6e48', 1, 4);
    px(ctx, ox + x + 2, oy + y, C.grassB, 1, 3);
  }
}

function flowerDecor(ctx, ox, oy, tx, ty) {
  const cols = [C.flowerR, C.flowerG, C.flowerB];
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(hash2(tx, ty, 30 + i) * 13) + 1;
    const y = Math.floor(hash2(tx, ty, 40 + i) * 13) + 1;
    px(ctx, ox + x, oy + y + 1, C.grassTuft);
    px(ctx, ox + x, oy + y, cols[(tx + ty + i) % 3]);
  }
}

function pebbles(ctx, ox, oy, tx, ty) {
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(hash2(tx, ty, 70 + i) * 13) + 1;
    const y = Math.floor(hash2(tx, ty, 75 + i) * 13) + 1;
    px(ctx, ox + x, oy + y, C.rockA, 2, 1);
    px(ctx, ox + x, oy + y + 1, C.rockC, 2, 1);
  }
}

function mushrooms(ctx, ox, oy, tx, ty) {
  for (let i = 0; i < 2; i++) {
    const x = ox + 3 + Math.floor(hash2(tx, ty, 80 + i) * 9);
    const y = oy + 4 + Math.floor(hash2(tx, ty, 85 + i) * 8);
    px(ctx, x + 1, y + 2, '#c9b9a0', 1, 2);
    px(ctx, x, y, '#7a2a4a', 3, 2);
    px(ctx, x + 1, y, '#b05a7a', 1, 1);
  }
}

function rubble(ctx, ox, oy, tx, ty) {
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(hash2(tx, ty, 90 + i) * 12) + 1;
    const y = Math.floor(hash2(tx, ty, 95 + i) * 12) + 2;
    const s = 1 + Math.floor(hash2(tx, ty, 99 + i) * 3);
    px(ctx, ox + x, oy + y, C.stoneC, s + 1, s);
    px(ctx, ox + x, oy + y, C.stoneB, s, 1);
  }
}

const DECOR_PAINTERS = { tall_grass: tallGrass, flowers: flowerDecor, pebbles, mushrooms, rubble };

export function hasTilePainter(id) { return id in GROUND_PAINTERS || id in DECOR_PAINTERS; }

/** Pre-render ground + decoration layers into one canvas (one blit per frame). */
export function renderMapCanvas(map) {
  const canvas = document.createElement('canvas');
  canvas.width = map.width * TILE;
  canvas.height = map.height * TILE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const { ground, decor } = map.layers;
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const def = map.legend.ground[ground[ty][tx]];
      (GROUND_PAINTERS[def.tile] ?? grass)(ctx, tx * TILE, ty * TILE, tx, ty, map);
    }
  }
  // Soft grass fringe where grass meets paths (drawn after all ground tiles)
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const t = map.legend.ground[ground[ty][tx]].tile;
      if (t !== 'dirt' && t !== 'stone_path' && t !== 'plaza' && t !== 'dark_soil') continue;
      const isGrass = (x, y) => {
        const ch = ground[y]?.[x];
        if (ch === undefined) return false;
        const n = map.legend.ground[ch].tile;
        return n === 'grass' || n === 'grass_dark';
      };
      const ox = tx * TILE, oy = ty * TILE;
      for (let i = 0; i < TILE; i += 2) {
        const h = 1 + Math.floor(hash2(tx * TILE + i, ty, 3) * 2);
        if (isGrass(tx, ty - 1)) px(ctx, ox + i, oy, C.grassA, 2, h);
        if (isGrass(tx, ty + 1)) px(ctx, ox + i, oy + TILE - h, C.grassA, 2, h);
        if (isGrass(tx - 1, ty)) px(ctx, ox, oy + i, C.grassA, h, 2);
        if (isGrass(tx + 1, ty)) px(ctx, ox + TILE - h, oy + i, C.grassA, h, 2);
      }
    }
  }
  if (decor) {
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        const ch = decor[ty][tx];
        if (ch === '.') continue;
        const paint = DECOR_PAINTERS[map.legend.decor[ch].tile];
        paint?.(ctx, tx * TILE, ty * TILE, tx, ty);
      }
    }
  }
  return canvas;
}

/* ---------- Static object sprites ---------- */

function shadow(ctx, x, y, w, h, a = 0.32) {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, Math.max(1, h - 2));
}

function blob(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const half = Math.round(Math.sqrt(r * r - y * y));
    ctx.fillRect(cx - half, cy + y, half * 2, 1);
  }
}

const TREE_TONES = [
  { d: C.leafDark, m: C.leafMid, h: C.leafHi },
  { d: '#1c2218', m: '#2a3322', h: '#3c4a2e' },
  { d: '#24191a', m: '#3a2424', h: '#5a3430' }, // ash-blighted, reddish
];

function drawTree(ctx, v) {
  const t = TREE_TONES[v % TREE_TONES.length];
  shadow(ctx, 2, 28, 12, 4);
  px(ctx, 6, 20, C.trunk, 4, 10);
  px(ctx, 6, 20, '#4a3628', 1, 10);
  px(ctx, 5, 28, C.trunk, 6, 2);
  blob(ctx, 8, 11, 8, t.d);
  blob(ctx, 8, 10, 7, t.m);
  blob(ctx, 6, 7, 3, t.h);
  px(ctx, 10, 12, t.h, 2, 2);
  px(ctx, 3, 14, t.d, 2, 2);
  px(ctx, 11, 5, t.d, 2, 1);
}

function drawTreeLarge(ctx) {
  shadow(ctx, 6, 35, 20, 5);
  px(ctx, 12, 24, C.trunk, 8, 14);
  px(ctx, 10, 35, C.trunk, 12, 3);
  px(ctx, 13, 24, '#4a3628', 1, 14);
  blob(ctx, 16, 14, 14, C.leafDark);
  blob(ctx, 16, 13, 12, C.leafMid);
  blob(ctx, 11, 9, 5, C.leafHi);
  blob(ctx, 21, 15, 3, C.leafHi);
  px(ctx, 6, 18, C.leafDark, 3, 2);
  px(ctx, 22, 6, C.leafDark, 3, 2);
}

function drawRock(ctx, v) {
  shadow(ctx, 2, 12, 12, 3);
  if (v === 0) {
    px(ctx, 3, 5, C.rockC, 10, 9); px(ctx, 2, 8, C.rockC, 12, 5);
    px(ctx, 4, 5, C.rockA, 8, 7); px(ctx, 5, 6, C.rockB, 4, 2); px(ctx, 9, 9, C.rockC, 1, 3);
  } else {
    px(ctx, 2, 7, C.rockC, 7, 7); px(ctx, 8, 9, C.rockC, 6, 5);
    px(ctx, 3, 7, C.rockA, 5, 5); px(ctx, 9, 9, C.rockA, 4, 4); px(ctx, 3, 8, C.rockB, 3, 1); px(ctx, 10, 10, C.rockB, 2, 1);
  }
}

function drawBush(ctx, v) {
  shadow(ctx, 2, 12, 12, 3);
  blob(ctx, 8, 9, 6, C.leafDark);
  blob(ctx, 8, 8, 5, C.leafMid);
  px(ctx, 5, 6, C.leafHi, 2, 1); px(ctx, 9, 8, C.leafHi, 2, 1);
  if (v === 1) { px(ctx, 6, 9, C.flowerR); px(ctx, 10, 6, C.flowerR); px(ctx, 11, 10, C.flowerR); }
}

const ROOFS = [
  { a: C.roofA, b: C.roofB, c: C.roofC },
  { a: '#2a3448', b: '#36425a', c: '#1c2333' },
  { a: '#4a3a2a', b: '#5c4a36', c: '#33271c' },
];

function drawHouse(ctx, v) {
  const r = ROOFS[v % ROOFS.length];
  shadow(ctx, 2, 60, 78, 4, 0.3);
  // Walls
  px(ctx, 4, 30, C.wallC, 72, 32);
  px(ctx, 5, 30, C.wallA, 70, 30);
  for (let x = 8; x < 74; x += 8) px(ctx, x, 31, C.wallC, 1, 28);
  px(ctx, 5, 58, C.wallC, 70, 2);
  // Timber frame
  px(ctx, 4, 30, C.woodDark, 2, 32); px(ctx, 74, 30, C.woodDark, 2, 32); px(ctx, 4, 42, C.woodDark, 72, 1);
  // Windows (warm glow)
  for (const wx of [12, 56]) {
    px(ctx, wx, 36, C.woodDark, 12, 10);
    px(ctx, wx + 1, 37, C.glow, 10, 8);
    px(ctx, wx + 6, 37, C.woodDark, 1, 8);
    px(ctx, wx + 1, 41, C.woodDark, 10, 1);
    px(ctx, wx - 1, 46, C.wood, 14, 2);
  }
  // Door (centre tile)
  px(ctx, 33, 44, C.woodDark, 14, 18);
  px(ctx, 34, 45, C.door, 12, 17);
  px(ctx, 40, 45, '#2e2016', 1, 17);
  px(ctx, 43, 53, C.gold);
  px(ctx, 31, 61, C.stoneB, 18, 3);
  // Roof
  for (let y = 0; y < 32; y++) {
    const inset = Math.max(0, 10 - Math.floor(y / 1.2));
    px(ctx, inset, y + 2, r.c, 80 - inset * 2, 1);
    if (y % 4 !== 3) {
      const off = (Math.floor(y / 4) % 2) * 3;
      for (let x = inset + 1 + off; x < 79 - inset; x += 6) px(ctx, x, y + 2, y % 4 === 0 ? r.b : r.a, 5, 1);
    }
  }
  px(ctx, 10, 2, r.b, 60, 1);
  px(ctx, 0, 32, r.c, 80, 2);
  // Chimney
  px(ctx, 60, 0, C.stoneC, 7, 10); px(ctx, 61, 0, C.stoneB, 5, 2);
}

function drawChapel(ctx) {
  shadow(ctx, 2, 60, 78, 4, 0.3);
  // Broken stone facade
  px(ctx, 2, 12, C.stoneC, 76, 50);
  px(ctx, 3, 12, C.stoneA, 74, 48);
  for (let y = 16; y < 60; y += 6) {
    px(ctx, 3, y, C.stoneC, 74, 1);
    for (let x = 3 + ((y / 6) % 2) * 6; x < 77; x += 12) px(ctx, x, y + 1, C.stoneC, 1, 5);
  }
  // Jagged ruined top edge
  for (let x = 2; x < 78; x += 2) {
    const h = Math.floor(hash2(x, 1, 7) * 10);
    ctx.clearRect(x, 12, 2, h);
  }
  // Central gable with round window
  px(ctx, 28, 2, C.stoneC, 24, 14);
  px(ctx, 29, 3, C.stoneA, 22, 12);
  blob(ctx, 40, 9, 4, '#120d12');
  blob(ctx, 40, 9, 2, '#4a1e4a');
  // Arched sealed door with violet sigil
  px(ctx, 31, 38, '#0a0809', 18, 24);
  blob(ctx, 40, 39, 9, '#0a0809');
  px(ctx, 33, 40, '#16121a', 14, 22);
  px(ctx, 39, 46, '#8a4ab0', 2, 8);
  px(ctx, 36, 49, '#8a4ab0', 8, 2);
  px(ctx, 38, 44, '#c07ae0', 4, 1);
  // Moss and cracks
  for (let i = 0; i < 30; i++) {
    const x = 3 + Math.floor(hash2(i, 2, 8) * 74), y = 14 + Math.floor(hash2(i, 3, 8) * 44);
    px(ctx, x, y, hash2(i, 4, 8) > 0.5 ? '#3c4a34' : C.stoneC, 2, 1);
  }
  px(ctx, 14, 26, '#1a1418', 8, 10); px(ctx, 58, 26, '#1a1418', 8, 10);
}

function drawPillar(ctx, v) {
  shadow(ctx, 2, 28, 12, 3);
  const top = v === 0 ? 4 : 10;
  px(ctx, 4, top, C.stoneC, 8, 30 - top);
  px(ctx, 5, top, C.stoneB, 5, 28 - top);
  px(ctx, 3, 26, C.stoneC, 10, 4);
  px(ctx, 3, 26, C.stoneB, 10, 1);
  for (let x = 4; x < 12; x += 2) px(ctx, x, top, C.stoneA, 1, 1 + Math.floor(hash2(x, v, 9) * 3));
  px(ctx, 6, top + 6, '#3c4a34', 2, 3);
}

function drawRuinWall(ctx, v) {
  shadow(ctx, 0, 21, 32, 3);
  px(ctx, 0, 6, C.stoneC, 32, 17);
  px(ctx, 1, 6, C.stoneA, 30, 15);
  for (let y = 10; y < 22; y += 5) {
    px(ctx, 1, y, C.stoneC, 30, 1);
    for (let x = 1 + ((y / 5) % 2) * 4; x < 31; x += 8) px(ctx, x, y + 1, C.stoneC, 1, 4);
  }
  for (let x = 0; x < 32; x += 2) ctx.clearRect(x, 6, 2, Math.floor(hash2(x, v, 10) * (v ? 9 : 6)));
  px(ctx, 6, 14, '#3c4a34', 4, 2);
}

function drawWell(ctx) {
  shadow(ctx, 1, 20, 14, 4);
  px(ctx, 2, 0, C.woodDark, 12, 2);
  px(ctx, 3, 2, C.woodDark, 1, 10); px(ctx, 12, 2, C.woodDark, 1, 10);
  px(ctx, 7, 2, '#8a7a5a', 1, 7);
  px(ctx, 6, 8, C.wood, 3, 2);
  px(ctx, 1, 10, C.stoneC, 14, 12);
  px(ctx, 2, 10, C.stoneB, 12, 10);
  px(ctx, 3, 11, '#0a1018', 10, 4);
  px(ctx, 5, 12, '#5a1f24', 4, 1);
  for (let x = 2; x < 14; x += 4) px(ctx, x, 16, C.stoneC, 1, 4);
}

function drawSign(ctx) {
  shadow(ctx, 4, 13, 8, 2);
  px(ctx, 7, 8, C.woodDark, 2, 7);
  px(ctx, 2, 2, C.woodDark, 12, 8);
  px(ctx, 3, 3, C.wood, 10, 6);
  px(ctx, 4, 4, C.goldDim, 8, 1); px(ctx, 4, 6, C.goldDim, 6, 1);
}

function drawNoticeboard(ctx) {
  shadow(ctx, 2, 21, 28, 3);
  px(ctx, 4, 6, C.woodDark, 2, 17); px(ctx, 26, 6, C.woodDark, 2, 17);
  px(ctx, 2, 2, C.woodDark, 28, 14);
  px(ctx, 3, 3, C.wood, 26, 12);
  px(ctx, 1, 1, '#2a1e16', 30, 2);
  px(ctx, 5, 5, '#c9b9a0', 7, 8); px(ctx, 14, 4, '#b5a88c', 6, 6); px(ctx, 22, 6, '#c9b9a0', 5, 7);
  for (const [x, y] of [[6, 7], [6, 9], [15, 6], [23, 8], [23, 10]]) px(ctx, x, y, '#5a4a3a', 4, 1);
  px(ctx, 8, 5, C.flowerR); px(ctx, 17, 4, C.flowerR);
}

function drawLamp(ctx) {
  shadow(ctx, 4, 29, 8, 3);
  // Faint glow halo
  ctx.fillStyle = 'rgba(217,166,74,0.12)';
  blob(ctx, 8, 7, 7, 'rgba(217,166,74,0.12)');
  px(ctx, 7, 10, '#1a1414', 2, 20);
  px(ctx, 5, 28, '#1a1414', 6, 2);
  px(ctx, 4, 3, '#1a1414', 8, 8);
  px(ctx, 5, 4, C.glow, 6, 6);
  px(ctx, 6, 5, '#f0d090', 4, 3);
  px(ctx, 5, 2, '#1a1414', 6, 1); px(ctx, 7, 1, '#1a1414', 2, 1);
}

function drawBarrel(ctx) {
  shadow(ctx, 2, 13, 12, 3);
  px(ctx, 3, 2, C.woodDark, 10, 13);
  px(ctx, 4, 2, C.wood, 8, 12);
  px(ctx, 3, 4, '#2a2420', 10, 1); px(ctx, 3, 11, '#2a2420', 10, 1);
  px(ctx, 4, 2, '#6b4e3a', 8, 1);
  px(ctx, 6, 3, '#6b4e3a', 1, 10);
}

function drawCrate(ctx) {
  shadow(ctx, 1, 13, 14, 3);
  px(ctx, 1, 2, C.woodDark, 14, 13);
  px(ctx, 2, 3, C.wood, 12, 11);
  px(ctx, 2, 3, C.woodDark, 12, 1); px(ctx, 2, 8, C.woodDark, 12, 1);
  for (let i = 0; i < 10; i++) px(ctx, 3 + i, 4 + Math.floor(i / 2), '#6b4e3a');
}

function drawFenceH(ctx) {
  shadow(ctx, 0, 13, 16, 2, 0.22);
  px(ctx, 0, 7, C.woodDark, 16, 2);
  px(ctx, 0, 11, C.woodDark, 16, 2);
  px(ctx, 0, 7, C.wood, 16, 1);
  px(ctx, 2, 4, C.woodDark, 3, 11); px(ctx, 11, 4, C.woodDark, 3, 11);
  px(ctx, 2, 4, C.wood, 2, 10); px(ctx, 11, 4, C.wood, 2, 10);
}

function drawFenceV(ctx) {
  shadow(ctx, 5, 13, 6, 3, 0.22);
  px(ctx, 7, 0, C.woodDark, 2, 16);
  px(ctx, 6, 1, C.woodDark, 4, 12);
  px(ctx, 6, 1, C.wood, 3, 11);
  px(ctx, 6, 1, '#6b4e3a', 3, 1);
}

function drawStump(ctx) {
  shadow(ctx, 2, 12, 12, 3);
  px(ctx, 3, 7, C.trunk, 10, 7);
  px(ctx, 3, 6, '#6b4e3a', 10, 3);
  px(ctx, 5, 7, '#8a6a4a', 6, 1);
  px(ctx, 2, 12, C.trunk, 2, 2); px(ctx, 12, 12, C.trunk, 2, 2);
}

function drawShrineStone(ctx) {
  shadow(ctx, 1, 20, 14, 4);
  px(ctx, 3, 2, C.stoneC, 10, 20);
  px(ctx, 4, 1, C.stoneC, 8, 1);
  px(ctx, 4, 2, C.stoneB, 8, 18);
  px(ctx, 2, 18, C.stoneC, 12, 4);
  px(ctx, 7, 5, '#8a6ad0', 2, 1); px(ctx, 6, 7, '#8a6ad0', 4, 1); px(ctx, 7, 9, '#8a6ad0', 2, 3);
  px(ctx, 5, 14, '#3c4a34', 3, 2); px(ctx, 9, 3, '#3c4a34', 2, 1);
}

function drawCanopy(ctx, v) {
  ctx.globalAlpha = 0.9;
  blob(ctx, 16, 12, 12, C.leafDark);
  blob(ctx, 32, 14, 11, C.leafDark);
  blob(ctx, 24, 9, 9, C.leafMid);
  blob(ctx, v ? 14 : 34, 8, 5, C.leafHi);
  ctx.globalAlpha = 1;
  // Hanging tendrils
  for (let i = 0; i < 6; i++) px(ctx, 6 + i * 7, 22 + (i % 2) * 2, C.leafDark, 1, 4 + (i % 3));
}

const OBJECT_PAINTERS = {
  tree: drawTree, tree_large: drawTreeLarge, rock: drawRock, bush: drawBush, house: drawHouse,
  chapel_ruin: drawChapel, pillar: drawPillar, ruin_wall: drawRuinWall, well: drawWell, sign: drawSign,
  noticeboard: drawNoticeboard, lamp: drawLamp, barrel: drawBarrel, crate: drawCrate,
  fence_h: drawFenceH, fence_v: drawFenceV, stump: drawStump, shrine_stone: drawShrineStone, canopy: drawCanopy,
};

/**
 * Build every object sprite once. Returns Map("type:variant" → canvas).
 * Unknown types fall back to a visible magenta box so missing art is obvious.
 */
export function createObjectSprites(objectTypes) {
  const out = new Map();
  for (const [type, def] of Object.entries(objectTypes.types)) {
    for (let v = 0; v < (def.variants ?? 1); v++) {
      const c = document.createElement('canvas');
      c.width = def.w;
      c.height = def.h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const paint = OBJECT_PAINTERS[type];
      if (paint) paint(ctx, v);
      else { ctx.fillStyle = '#ff00ff'; ctx.fillRect(0, 0, def.w, def.h); }
      out.set(`${type}:${v}`, c);
    }
  }
  return out;
}

/* ---------- Characters (16×24) ---------- */

export const CHARACTER_LOOKS = {
  kael:     { skin: '#d4ad85', hair: '#2a201c', top: '#6b2a2e', topD: '#4a1c20', scarf: '#33476a', legs: '#2b2522', boots: '#231d1b', belt: '#b5913f', mark: '#e0c070' },
  elder:    { skin: '#c9a283', hair: '#b8b0a4', top: '#3e3a52', topD: '#2a2738', scarf: '#6a5a3a', legs: '#2a2738', boots: '#1c1a22', belt: '#7a6230', beard: true, robe: true },
  farmer:   { skin: '#b88a66', hair: '#5a3a24', top: '#4f5e45', topD: '#37422f', scarf: '#8a7a5a', legs: '#4a3e31', boots: '#2a2018', belt: '#5a4130', hat: '#8a7448' },
  child:    { skin: '#e0b892', hair: '#8a4a2a', top: '#8a6a3a', topD: '#5e4826', scarf: '#8a3438', legs: '#3a3a4a', boots: '#2a2420', belt: '#5a4130', short: true },
  guard:    { skin: '#c49a74', hair: '#1e1a18', top: '#5a5e66', topD: '#3a3d44', scarf: '#5e2328', legs: '#2a2c32', boots: '#1a1a1e', belt: '#b5913f', helm: '#6e737c' },
  villager: { skin: '#cfa27e', hair: '#3a2a20', top: '#5a4a6a', topD: '#3e3248', scarf: '#6a5a3a', legs: '#3a3028', boots: '#231d1b', belt: '#5a4130' },
};

/** Character sheet: 4 frames (idle A, idle B, step A, step B) × 4 rows (down, left, right, up). */
export function createCharacterSheet(look = 'kael') {
  const L = CHARACTER_LOOKS[look] ?? CHARACTER_LOOKS.villager;
  const canvas = document.createElement('canvas');
  canvas.width = 16 * 4;
  canvas.height = 24 * 4;
  const ctx = canvas.getContext('2d');
  ['down', 'left', 'right', 'up'].forEach((dir, row) => {
    for (let f = 0; f < 4; f++) drawCharacter(ctx, f * 16, row * 24, dir, f, L);
  });
  return canvas;
}

export const createKaelSheet = () => createCharacterSheet('kael');

function drawCharacter(ctx, ox, baseY, dir, frame, L) {
  const short = L.short ? 3 : 0;
  // frame 0 idle A, 1 idle B (breath: shoulders drop 1px), 2/3 steps (body bobs up 1px)
  const bob = frame >= 2 ? -1 : 0;
  const breath = frame === 1 ? 1 : 0;
  const oy = baseY + short;
  const side = dir === 'left' || dir === 'right';

  // Shadow (anchored to the feet, never bobs)
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(ox + 4, baseY + 21, 8, 2);
  ctx.fillRect(ox + 3, baseY + 22, 10, 1);

  // Legs / boots
  const legTop = oy + 17 + bob;
  const legH = 23 - (17 + short) - bob - 1;
  if (frame === 2 || frame === 3) {
    const fwd = frame === 2 ? 0 : 1;
    if (side) {
      px(ctx, ox + 5, legTop, L.legs, 2, legH); px(ctx, ox + 9, legTop, L.legs, 2, legH);
      px(ctx, ox + (fwd ? 4 : 10), baseY + 20, L.boots, 3, 2);
      px(ctx, ox + (fwd ? 10 : 4), baseY + 19, L.boots, 2, 2);
    } else {
      px(ctx, ox + 5, legTop, L.legs, 2, legH - (fwd ? 1 : 0));
      px(ctx, ox + 9, legTop, L.legs, 2, legH - (fwd ? 0 : 1));
      px(ctx, ox + 5, baseY + 20 - (fwd ? 1 : 0), L.boots, 2, 2);
      px(ctx, ox + 9, baseY + 20 - (fwd ? 0 : 1), L.boots, 2, 2);
    }
  } else {
    px(ctx, ox + 5, legTop, L.legs, 2, legH);
    px(ctx, ox + 9, legTop, L.legs, 2, legH);
    px(ctx, ox + 5, baseY + 20, L.boots, 2, 2);
    px(ctx, ox + 9, baseY + 20, L.boots, 2, 2);
  }

  // Torso / cloak
  const ty = oy + 10 + bob + breath;
  const torsoH = 8 - breath;
  px(ctx, ox + 3, ty, L.topD, 10, torsoH);
  px(ctx, ox + 4, ty, L.top, 8, torsoH - 1);
  if (L.robe) px(ctx, ox + 4, ty + torsoH - 1, L.topD, 8, 4 - bob);
  px(ctx, ox + 3, ty + torsoH - 3, L.belt, 10, 1);
  // Arms swing while walking
  const swing = frame === 2 ? 1 : frame === 3 ? -1 : 0;
  if (!side) {
    px(ctx, ox + 2, ty + 1 + swing, L.topD, 1, 5);
    px(ctx, ox + 13, ty + 1 - swing, L.topD, 1, 5);
    px(ctx, ox + 2, ty + 6 + swing, L.skin, 1, 1);
    px(ctx, ox + 13, ty + 6 - swing, L.skin, 1, 1);
  } else {
    const ax = dir === 'left' ? 7 + swing : 8 - swing;
    px(ctx, ox + ax, ty + 1, L.topD, 2, 5);
    px(ctx, ox + ax, ty + 6, L.skin, 2, 1);
  }
  if (L.mark && dir !== 'up') px(ctx, ox + 7, ty + 2, L.mark, 2, 1);

  // Scarf
  px(ctx, ox + 4, ty - 1, L.scarf, 8, 2);
  if (dir === 'left') px(ctx, ox + 11, ty, L.scarf, 2, 4);
  if (dir === 'right') px(ctx, ox + 3, ty, L.scarf, 2, 4);
  if (dir === 'up') px(ctx, ox + 7, ty, L.scarf, 2, 4);

  // Head
  const hy = oy + 2 + bob + (breath && !L.short ? 0 : 0);
  px(ctx, ox + 4, hy + 1, L.skin, 8, 7);
  px(ctx, ox + 3, hy, L.hair, 10, 3);
  px(ctx, ox + 4, hy - 1, L.hair, 8, 1);
  if (dir === 'up') {
    px(ctx, ox + 3, hy, L.hair, 10, 8);
  } else if (dir === 'down') {
    px(ctx, ox + 3, hy + 2, L.hair, 1, 4);
    px(ctx, ox + 12, hy + 2, L.hair, 1, 4);
    px(ctx, ox + 5, hy + 3, L.hair, 2, 1); // fringe
    px(ctx, ox + 6, hy + 5, '#140f10');
    px(ctx, ox + 9, hy + 5, '#140f10');
    if (L.beard) px(ctx, ox + 5, hy + 7, L.hair, 6, 3);
  } else if (dir === 'left') {
    px(ctx, ox + 8, hy + 1, L.hair, 5, 5);
    px(ctx, ox + 5, hy + 5, '#140f10');
    if (L.beard) px(ctx, ox + 4, hy + 7, L.hair, 4, 3);
  } else {
    px(ctx, ox + 3, hy + 1, L.hair, 5, 5);
    px(ctx, ox + 10, hy + 5, '#140f10');
    if (L.beard) px(ctx, ox + 8, hy + 7, L.hair, 4, 3);
  }
  if (L.hat) { px(ctx, ox + 1, hy + 1, L.hat, 14, 1); px(ctx, ox + 4, hy - 2, L.hat, 8, 3); px(ctx, ox + 4, hy, '#5a4a2a', 8, 1); }
  if (L.helm) { px(ctx, ox + 3, hy - 2, L.helm, 10, 4); px(ctx, ox + 4, hy - 2, '#8a9098', 6, 1); if (dir !== 'up') px(ctx, ox + 7, hy + 2, L.helm, 2, 3); }
}

/** Radial vignette with a faint red eclipse tint — drawn once, blitted per frame. */
export function createVignette(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62);
  g.addColorStop(0, 'rgba(40,6,10,0)');
  g.addColorStop(1, 'rgba(18,4,6,0.62)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(90,20,24,0.10)';
  ctx.fillRect(0, 0, w, h);
  return canvas;
}

/** Title screen backdrop: blood-red sky, dim eclipsed sun, shattered floating land. */
export function createTitleBackdrop(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#12070a');
  sky.addColorStop(0.45, '#4a1418');
  sky.addColorStop(0.75, '#6a2420');
  sky.addColorStop(1, '#1a0a0b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Dithered stars
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(hash2(i, 1, 90) * w);
    const y = Math.floor(hash2(i, 2, 90) * h * 0.4);
    px(ctx, x, y, hash2(i, 3, 90) > 0.7 ? '#c9a46a' : '#5a3a3a');
  }

  // Eclipsed sun with corona
  const sx = 238, sy = 52;
  const corona = ctx.createRadialGradient(sx, sy, 10, sx, sy, 46);
  corona.addColorStop(0, 'rgba(224,170,90,0.9)');
  corona.addColorStop(0.3, 'rgba(180,70,50,0.45)');
  corona.addColorStop(1, 'rgba(120,20,20,0)');
  ctx.fillStyle = corona;
  ctx.fillRect(sx - 48, sy - 48, 96, 96);
  ctx.fillStyle = '#0d0607';
  ctx.beginPath();
  ctx.arc(sx, sy, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(224,192,112,0.9)';
  for (let a = 0; a < 64; a++) {
    const ang = (a / 64) * Math.PI * 2;
    if (hash2(a, 4, 91) > 0.35) px(ctx, Math.round(sx + Math.cos(ang) * 14), Math.round(sy + Math.sin(ang) * 14), 'rgba(224,192,112,0.9)');
  }

  // Floating shattered rocks
  const shards = [[60, 46, 18], [110, 30, 10], [176, 70, 14], [286, 96, 9], [24, 88, 8]];
  for (const [x, y, s] of shards) {
    ctx.fillStyle = '#1a0d0f';
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x + s * 0.3, y + s * 1.1);
    ctx.lineTo(x - s * 0.4, y + s * 0.7);
    ctx.closePath();
    ctx.fill();
    px(ctx, x - s, y - 1, '#3b2a22', s * 2, 1);
  }

  // Mountain layers
  const layer = (base, amp, color, seed) => {
    ctx.fillStyle = color;
    for (let x = 0; x < w; x++) {
      const n = Math.sin(x * 0.03 + seed) * amp + Math.sin(x * 0.11 + seed * 2) * amp * 0.35 + hash2(x, seed, 92) * 2;
      const top = Math.round(base - n);
      ctx.fillRect(x, top, 1, h - top);
    }
  };
  layer(128, 14, '#2a0f12', 1.3);
  layer(142, 10, '#1a0a0c', 4.1);

  // Ruined spires on the last ridge
  for (const [x, hgt, wd] of [[40, 34, 5], [52, 22, 4], [268, 40, 6], [282, 26, 4], [150, 18, 3]]) {
    ctx.fillStyle = '#0f0708';
    ctx.fillRect(x, 150 - hgt, wd, hgt + 30);
    ctx.fillRect(x - 1, 150 - hgt, wd + 2, 2);
    px(ctx, x + 1, 150 - hgt + 6, '#6a2a2a', 1, 2);
  }
  ctx.fillStyle = '#0f0708';
  ctx.fillRect(0, 150, w, h - 150);
  return canvas;
}

/* ================================================================== */
/* Phase 3 additions                                                    */
/* ================================================================== */

/**
 * Collect all water tile world-pixel positions from a map for WaterRipple.
 * @param {object} map
 * @param {number} tileSize
 * @returns {Array<{x:number, y:number}>}
 */
export function collectWaterTiles(map, tileSize = TILE) {
  const out = [];
  const { ground } = map.layers;
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const def = map.legend.ground[ground[ty][tx]];
      if (def?.tile === 'water') {
        out.push({ x: tx * tileSize, y: ty * tileSize });
      }
    }
  }
  return out;
}

/**
 * Collect sparse grass decoration positions for GrassWave.
 * Returns every Nth decor-grass tile to keep the count manageable.
 * @param {object} map
 * @param {number} tileSize
 * @param {number} [stride] - sample every stride tiles
 * @returns {Array<{x:number, y:number}>}
 */
export function collectGrassTiles(map, tileSize = TILE, stride = 3) {
  const out = [];
  const { ground } = map.layers;
  let n = 0;
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const def = map.legend.ground[ground[ty][tx]];
      if (def?.tile === 'grass' || def?.tile === 'grass_dark') {
        if (n % stride === 0) {
          out.push({ x: tx * tileSize + 4, y: ty * tileSize + 10 });
        }
        n++;
      }
    }
  }
  return out;
}

/**
 * Phase 3 — enhanced character sheet with improved Kael sprite details.
 * Adds rim-lighting, better cloth shading, and soul-mark glow on Kael.
 * Drop-in replacement for createCharacterSheet('kael').
 * @returns {HTMLCanvasElement}
 */
export function createEnhancedKaelSheet() {
  // Kael Phase 3: same 16×24 frame grid (4 cols × 4 rows)
  const L = {
    skin: '#d4ad85', skinShadow: '#b8906a', skinHi: '#e4c09a',
    hair: '#2a201c', hairHi: '#3e3028',
    top: '#6b2a2e', topD: '#4a1c20', topHi: '#8a3a3e',
    scarf: '#33476a', scarfHi: '#4a607e',
    legs: '#2b2522', legsHi: '#3e3530',
    boots: '#231d1b', bootsHi: '#342e2a',
    belt: '#b5913f', beltHi: '#d4aa58',
    mark: '#e0c070', markGlow: '#f0d888',
    rim: '#c0a060',
  };

  const canvas = document.createElement('canvas');
  canvas.width = 16 * 4;
  canvas.height = 24 * 4;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ['down', 'left', 'right', 'up'].forEach((dir, row) => {
    for (let f = 0; f < 4; f++) _drawKaelPhase3(ctx, f * 16, row * 24, dir, f, L);
  });

  return canvas;
}

function _drawKaelPhase3(ctx, ox, baseY, dir, frame, L) {
  const bob   = frame >= 2 ? -1 : 0;
  const breath = frame === 1 ? 1 : 0;
  const oy    = baseY;

  // Shadow (foot-anchored)
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillRect(ox + 3, baseY + 21, 10, 2);
  ctx.fillRect(ox + 2, baseY + 22, 12, 1);

  // === LEGS / BOOTS ===
  const legTop = oy + 17 + bob;
  const legH   = 6 - bob;
  const side = dir === 'left' || dir === 'right';
  if (frame === 2 || frame === 3) {
    const fwd = frame === 2 ? 0 : 1;
    if (side) {
      px(ctx, ox + 5, legTop, L.legs, 2, legH);
      px(ctx, ox + 9, legTop, L.legs, 2, legH);
      px(ctx, ox + 6, legTop, L.legsHi, 1, legH - 1);
      px(ctx, ox + (fwd ? 4 : 10), baseY + 20, L.boots, 3, 2);
      px(ctx, ox + (fwd ? 10 : 4), baseY + 19, L.boots, 2, 2);
    } else {
      px(ctx, ox + 5, legTop, L.legs, 2, legH - (fwd ? 1 : 0));
      px(ctx, ox + 9, legTop, L.legs, 2, legH - (fwd ? 0 : 1));
      px(ctx, ox + 5, baseY + 20 - (fwd ? 1 : 0), L.boots, 2, 2);
      px(ctx, ox + 9, baseY + 20 - (fwd ? 0 : 1), L.boots, 2, 2);
      px(ctx, ox + 6, baseY + 20 - (fwd ? 1 : 0), L.bootsHi, 1, 1);
      px(ctx, ox + 10, baseY + 20 - (fwd ? 0 : 1), L.bootsHi, 1, 1);
    }
  } else {
    px(ctx, ox + 5, legTop, L.legs, 2, legH);
    px(ctx, ox + 9, legTop, L.legs, 2, legH);
    px(ctx, ox + 6, legTop, L.legsHi, 1, legH - 1);
    px(ctx, ox + 5, baseY + 20, L.boots, 2, 2);
    px(ctx, ox + 9, baseY + 20, L.boots, 2, 2);
    px(ctx, ox + 6, baseY + 20, L.bootsHi, 1, 1);
    px(ctx, ox + 10, baseY + 20, L.bootsHi, 1, 1);
  }

  // === TORSO ===
  const ty    = oy + 10 + bob + breath;
  const torsoH = 8 - breath;
  px(ctx, ox + 3, ty, L.topD, 10, torsoH);
  px(ctx, ox + 4, ty, L.top, 8, torsoH - 1);
  px(ctx, ox + 5, ty, L.topHi, 1, 2);  // rim highlight
  px(ctx, ox + 3, ty + torsoH - 3, L.belt, 10, 1);
  px(ctx, ox + 4, ty + torsoH - 3, L.beltHi, 2, 1);

  // Arms
  const swing = frame === 2 ? 1 : frame === 3 ? -1 : 0;
  if (!side) {
    px(ctx, ox + 2, ty + 1 + swing, L.topD, 1, 5);
    px(ctx, ox + 13, ty + 1 - swing, L.topD, 1, 5);
    px(ctx, ox + 2, ty + 6 + swing, L.skin, 1, 1);
    px(ctx, ox + 13, ty + 6 - swing, L.skin, 1, 1);
  } else {
    const ax = dir === 'left' ? 7 + swing : 8 - swing;
    px(ctx, ox + ax, ty + 1, L.topD, 2, 5);
    px(ctx, ox + ax, ty + 6, L.skin, 2, 1);
  }

  // Soul mark (front + sides only) — golden glyph on chest
  if (L.mark && dir !== 'up') {
    px(ctx, ox + 7, ty + 2, L.mark, 2, 1);
    px(ctx, ox + 7, ty + 3, L.markGlow, 2, 1);
    px(ctx, ox + 7, ty + 4, L.mark, 1, 1);
  }

  // === SCARF ===
  px(ctx, ox + 4, ty - 1, L.scarf, 8, 2);
  px(ctx, ox + 5, ty - 1, L.scarfHi, 4, 1);
  if (dir === 'left')  px(ctx, ox + 11, ty, L.scarf, 2, 4);
  if (dir === 'right') px(ctx, ox + 3, ty, L.scarf, 2, 4);
  if (dir === 'up')    px(ctx, ox + 7, ty, L.scarf, 2, 4);

  // === HEAD ===
  const hy = oy + 2 + bob;
  // Face
  px(ctx, ox + 4, hy + 1, L.skin, 8, 7);
  px(ctx, ox + 5, hy + 1, L.skinHi, 4, 2);         // forehead hi
  px(ctx, ox + 4, hy + 6, L.skinShadow, 8, 2);      // chin shadow
  // Hair base
  px(ctx, ox + 3, hy, L.hair, 10, 3);
  px(ctx, ox + 4, hy - 1, L.hair, 8, 1);
  px(ctx, ox + 4, hy, L.hairHi, 2, 1);              // hair sheen

  if (dir === 'up') {
    px(ctx, ox + 3, hy, L.hair, 10, 8);
  } else if (dir === 'down') {
    px(ctx, ox + 3, hy + 2, L.hair, 1, 4);
    px(ctx, ox + 12, hy + 2, L.hair, 1, 4);
    px(ctx, ox + 5, hy + 3, L.hair, 2, 1);         // fringe
    // Eyes — dark with white hi
    px(ctx, ox + 6, hy + 5, '#140f10', 1, 1);
    px(ctx, ox + 9, hy + 5, '#140f10', 1, 1);
    px(ctx, ox + 6, hy + 4, '#a0806a', 1, 1);
    px(ctx, ox + 9, hy + 4, '#a0806a', 1, 1);
  } else if (dir === 'left') {
    px(ctx, ox + 8, hy + 1, L.hair, 5, 5);
    px(ctx, ox + 5, hy + 5, '#140f10', 1, 1);
    px(ctx, ox + 5, hy + 4, '#a0806a', 1, 1);
  } else {
    px(ctx, ox + 3, hy + 1, L.hair, 5, 5);
    px(ctx, ox + 10, hy + 5, '#140f10', 1, 1);
    px(ctx, ox + 10, hy + 4, '#a0806a', 1, 1);
  }

  // Rim lighting on head (from upper-left eclipse)
  if (dir === 'right') px(ctx, ox + 11, hy + 1, L.rim, 1, 4);
  if (dir === 'left')  px(ctx, ox + 4, hy + 1, L.rim, 1, 4);
  if (dir === 'down')  px(ctx, ox + 4, hy + 1, L.rim, 1, 4);
}
