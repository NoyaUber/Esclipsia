/**
 * Data validation helpers. External JSON is never trusted blindly:
 * each loader passes a validator that throws a descriptive DataError.
 */
export class DataError extends Error {
  constructor(source, message) {
    super(`[${source}] ${message}`);
    this.name = 'DataError';
  }
}

export function assert(cond, source, message) {
  if (!cond) throw new DataError(source, message);
}

export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const isInt = (v) => Number.isInteger(v);
export const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;

export function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const key of Object.keys(obj)) deepFreeze(obj[key]);
  }
  return obj;
}

const DIRS = ['up', 'down', 'left', 'right'];
const isRect4 = (hb) => Array.isArray(hb) && hb.length === 4 && hb.every(isInt) && hb[2] > 0 && hb[3] > 0;

/**
 * Validates data/objects.json — static world object type definitions.
 */
export function validateObjectTypes(data, source = 'objects') {
  assert(isObject(data) && isObject(data.types), source, 'objects.json requires a "types" object');
  for (const [id, def] of Object.entries(data.types)) {
    assert(isInt(def.w) && def.w > 0 && isInt(def.h) && def.h > 0, source, `type "${id}" requires positive integer w/h`);
    assert(def.variants === undefined || (isInt(def.variants) && def.variants > 0), source, `type "${id}" has invalid variants`);
    assert(def.layer === undefined || ['world', 'foreground'].includes(def.layer), source, `type "${id}" has invalid layer`);
    if (def.hitbox !== undefined) {
      assert(isRect4(def.hitbox), source, `type "${id}" hitbox must be [x, y, w, h] integers`);
      const [x, y, w, h] = def.hitbox;
      assert(x >= 0 && y >= 0 && x + w <= def.w && y + h <= def.h, source, `type "${id}" hitbox must fit inside the sprite`);
    }
  }
  return data;
}

/**
 * Validates a map definition (data/maps/*.json).
 * { id, name, tileSize, width, height,
 *   legend: { ground: {ch: {tile, solid, hitbox?}}, decor: {ch: {tile}} },
 *   layers: { ground: string[], decor: string[] },
 *   objects: [{type, x, y, variant?, id?}], npcs: [...], interactables: [...], spawns: {} }
 * Object types are checked against `objectTypes` when provided.
 */
export function validateMap(map, source = 'map', objectTypes = null) {
  assert(isObject(map), source, 'Map must be an object');
  assert(isNonEmptyString(map.id), source, 'Map requires an "id"');
  assert(isNonEmptyString(map.name), source, 'Map requires a "name"');
  assert(map.tileSize === 16, source, 'tileSize must be 16');
  assert(isInt(map.width) && map.width > 0, source, 'width must be a positive integer');
  assert(isInt(map.height) && map.height > 0, source, 'height must be a positive integer');
  assert(isObject(map.legend) && isObject(map.legend.ground), source, 'legend.ground must be an object');
  assert(isObject(map.layers), source, 'layers must be an object');

  for (const [ch, def] of Object.entries(map.legend.ground)) {
    assert(ch.length === 1, source, `ground legend key "${ch}" must be one character`);
    assert(isObject(def) && isNonEmptyString(def.tile), source, `ground legend "${ch}" requires a "tile" id`);
    assert(typeof def.solid === 'boolean', source, `ground legend "${ch}" requires boolean "solid"`);
    if (def.hitbox !== undefined) {
      assert(isRect4(def.hitbox), source, `ground legend "${ch}" hitbox must be [x, y, w, h] integers`);
      const [x, y, w, h] = def.hitbox;
      assert(x >= 0 && y >= 0 && x + w <= map.tileSize && y + h <= map.tileSize, source, `ground legend "${ch}" hitbox must fit inside the tile`);
    }
  }
  const decorLegend = map.legend.decor ?? {};
  for (const [ch, def] of Object.entries(decorLegend)) {
    assert(ch.length === 1 && isObject(def) && isNonEmptyString(def.tile), source, `decor legend "${ch}" requires a "tile" id`);
  }

  const checkRows = (rows, name, legend, allowDot) => {
    assert(Array.isArray(rows) && rows.length === map.height, source, `layers.${name} must contain ${map.height} rows`);
    rows.forEach((row, y) => {
      assert(typeof row === 'string' && row.length === map.width, source, `layers.${name} row ${y} must be ${map.width} characters (got ${row?.length})`);
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        assert(legend[ch] || (allowDot && ch === '.'), source, `unknown ${name} tile "${ch}" at ${x},${y}`);
      }
    });
  };
  checkRows(map.layers.ground, 'ground', map.legend.ground, false);
  if (map.layers.decor !== undefined) checkRows(map.layers.decor, 'decor', decorLegend, true);

  const worldW = map.width * map.tileSize, worldH = map.height * map.tileSize;
  map.objects = map.objects ?? [];
  assert(Array.isArray(map.objects), source, 'objects must be an array');
  map.objects.forEach((o, i) => {
    assert(isObject(o) && isNonEmptyString(o.type), source, `object #${i} requires a "type"`);
    assert(Number.isFinite(o.x) && Number.isFinite(o.y), source, `object #${i} requires numeric x/y`);
    assert(o.x > -64 && o.y > -64 && o.x < worldW + 64 && o.y < worldH + 64, source, `object #${i} is far outside the map`);
    if (objectTypes) {
      const def = objectTypes.types[o.type];
      assert(def, source, `object #${i} has unknown type "${o.type}"`);
      assert(o.variant === undefined || (isInt(o.variant) && o.variant >= 0 && o.variant < (def.variants ?? 1)), source, `object #${i} has invalid variant`);
    }
  });

  const walkable = (tx, ty) => tx >= 0 && ty >= 0 && tx < map.width && ty < map.height && !map.legend.ground[map.layers.ground[ty][tx]].solid;
  const ids = new Set();
  const checkId = (id, what) => {
    assert(isNonEmptyString(id), source, `${what} requires an "id"`);
    assert(!ids.has(id), source, `duplicate id "${id}"`);
    ids.add(id);
  };

  map.npcs = map.npcs ?? [];
  assert(Array.isArray(map.npcs), source, 'npcs must be an array');
  for (const n of map.npcs) {
    checkId(n.id, 'npc');
    assert(isNonEmptyString(n.name), source, `npc "${n.id}" requires a name`);
    assert(isInt(n.x) && isInt(n.y) && walkable(n.x, n.y), source, `npc "${n.id}" must stand on a walkable tile`);
    assert(DIRS.includes(n.facing ?? 'down'), source, `npc "${n.id}" has invalid facing`);
    assert(Array.isArray(n.lines) && n.lines.length > 0 && n.lines.every((l) => typeof l === 'string'), source, `npc "${n.id}" requires dialogue lines`);
  }

  if (map.encounterZones !== undefined) {
    assert(Array.isArray(map.encounterZones), source, 'encounterZones must be an array');
    const zoneIds = new Set();
    for (const zone of map.encounterZones) {
      assert(isObject(zone) && isNonEmptyString(zone.id) && !zoneIds.has(zone.id), source, 'encounter zone requires a unique id');
      zoneIds.add(zone.id);
      assert([zone.x,zone.y,zone.width,zone.height].every(Number.isInteger) && zone.x>=0 && zone.y>=0 && zone.width>0 && zone.height>0 && zone.x+zone.width<=map.width && zone.y+zone.height<=map.height, source, `encounter zone "${zone.id}" is outside the map`);
      assert(isNonEmptyString(zone.encounterTable), source, `encounter zone "${zone.id}" requires an encounterTable`);
    }
  }

  map.interactables = map.interactables ?? [];
  assert(Array.isArray(map.interactables), source, 'interactables must be an array');
  for (const it of map.interactables) {
    checkId(it.id, 'interactable');
    assert(isInt(it.x) && isInt(it.y) && it.x >= 0 && it.y >= 0 && it.x < map.width && it.y < map.height, source, `interactable "${it.id}" is outside the map`);
    assert(Array.isArray(it.lines) && it.lines.length > 0 && it.lines.every(line => typeof line === 'string'), source, `interactable "${it.id}" requires lines`);
    if (it.transition !== undefined) {
      assert(isObject(it.transition) && isNonEmptyString(it.transition.mapId) && isNonEmptyString(it.transition.spawn), source, `interactable \"${it.id}\" has an invalid transition`);
      for (const key of ['dungeonId','roomId','connectionId']) if (it.transition[key] !== undefined) assert(isNonEmptyString(it.transition[key]), source, `interactable \"${it.id}\" has invalid ${key}`);
      for (const key of ['enterDungeon','exitDungeon']) if (it.transition[key] !== undefined) assert(typeof it.transition[key] === 'boolean', source, `interactable \"${it.id}\" has invalid ${key}`);
    }
    if (it.requires !== undefined) assert(isObject(it.requires), source, `interactable "${it.id}" requires must be a condition object`);
    if (it.lockedLines !== undefined) assert(Array.isArray(it.lockedLines) && it.lockedLines.every(line => typeof line === 'string'), source, `interactable "${it.id}" lockedLines must be strings`);
    if (it.worldObjectId !== undefined) assert(isNonEmptyString(it.worldObjectId), source, `interactable "${it.id}" has an invalid worldObjectId`);
    if (it.collectItem !== undefined) assert(isObject(it.collectItem) && isNonEmptyString(it.collectItem.id) && isInt(it.collectItem.amount) && it.collectItem.amount > 0, source, `interactable "${it.id}" has invalid collectItem data`);
  }

  assert(isObject(map.spawns) && Object.keys(map.spawns).length > 0, source, 'map requires at least one spawn');
  for (const [id, sp] of Object.entries(map.spawns)) {
    assert(isInt(sp.x) && isInt(sp.y), source, `spawn "${id}" requires integer x/y`);
    assert(walkable(sp.x, sp.y), source, `spawn "${id}" must be on a walkable tile`);
    assert(DIRS.includes(sp.facing ?? 'down'), source, `spawn "${id}" has invalid facing`);
  }
  return map;
}
