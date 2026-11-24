/** Registry for immutable room definitions. Map geometry remains in data/maps/*.json. */
export class DungeonRoomManager {
  constructor() { this.rooms = new Map(); this.byDungeon = new Map(); }

  registerRoom(room) {
    if (!room || typeof room.id !== 'string' || !room.id.trim() || this.rooms.has(room.id)) return false;
    if (typeof room.dungeonId !== 'string' || typeof room.displayName !== 'string' || typeof room.mapId !== 'string') return false;
    if (!Array.isArray(room.connections) || !room.entryPoints || !room.exitPoints || !room.spawnPoints || typeof room.entryPoints !== 'object' || typeof room.exitPoints !== 'object' || typeof room.spawnPoints !== 'object') return false;
    if ([...this.rooms.values()].some(existing => existing.mapId === room.mapId)) return false;
    if (!Object.values(room.spawnPoints).every(sp => Number.isInteger(sp.x) && Number.isInteger(sp.y))) return false;
    if (!Object.values(room.entryPoints).every(id => typeof id === 'string' && !!room.spawnPoints[id])) return false;
    const copy = structuredCloneSafe(room);
    deepFreeze(copy);
    this.rooms.set(copy.id, copy);
    if (!this.byDungeon.has(copy.dungeonId)) this.byDungeon.set(copy.dungeonId, new Set());
    this.byDungeon.get(copy.dungeonId).add(copy.id);
    return true;
  }

  registerRooms(rooms = []) { return rooms.map(room => this.registerRoom(room)).every(Boolean); }
  getRoomById(id) { return this.rooms.get(String(id)) ?? null; }
  listRooms(dungeonId) { return [...(this.byDungeon.get(String(dungeonId)) ?? [])].map(id => this.rooms.get(id)); }
  getRoomForMap(mapId) { return [...this.rooms.values()].find(room => room.mapId === mapId) ?? null; }
  hasDungeon(dungeonId) { return this.byDungeon.has(String(dungeonId)); }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
