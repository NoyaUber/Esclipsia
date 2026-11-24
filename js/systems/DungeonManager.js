import { DungeonRoomManager } from './DungeonRoomManager.js';
import { evaluateWorldCondition } from './WorldStateManager.js';

const clone = value => JSON.parse(JSON.stringify(value));

/** Persistent dungeon progression; it coordinates rooms but never owns map geometry. */
export class DungeonManager {
  constructor({ definitions = [], savedState = null, world = null, storyFlags = null, inventory = null, quests = null, events = null, onChange = null } = {}) {
    this.rooms = new DungeonRoomManager();
    this.dungeons = new Map();
    this.world = world; this.storyFlags = storyFlags; this.inventory = inventory; this.quests = quests; this.events = events;
    this.onChange = typeof onChange === 'function' ? onChange : null;
    for (const dungeon of definitions) this.registerDungeon(dungeon);
    const loaded = savedState && typeof savedState === 'object' ? clone(savedState) : {};
    this.state = {
      version: 1, currentDungeonId: null, currentRoomId: null, entryState: 'NEVER_ENTERED',
      discoveredRooms: {}, roomStates: {}, unlockedConnections: {}, completedDungeons: {},
      ...loaded,
      discoveredRooms: loaded.discoveredRooms && typeof loaded.discoveredRooms === 'object' ? loaded.discoveredRooms : {},
      roomStates: loaded.roomStates && typeof loaded.roomStates === 'object' ? loaded.roomStates : {},
      unlockedConnections: loaded.unlockedConnections && typeof loaded.unlockedConnections === 'object' ? loaded.unlockedConnections : {},
      completedDungeons: loaded.completedDungeons && typeof loaded.completedDungeons === 'object' ? loaded.completedDungeons : {},
    };
    for (const dungeon of this.dungeons.values()) for (const room of this.rooms.listRooms(dungeon.id)) {
      if (!this.state.roomStates[room.id]) this.state.roomStates[room.id] = clone(room.worldState ?? {});
    }
    this._sanitizeState();
    this._offObjectFound = events?.on?.('OBJECT_FOUND', event => {
      const room = this.getCurrentRoom();
      if (room && room.interactableObjects?.includes(event?.targetId)) this.setRoomState(room.id, event.targetId, true);
    }) ?? null;
  }

  registerDungeon(definition) {
    if (!definition || typeof definition.id !== 'string' || !definition.id.trim() || this.dungeons.has(definition.id)) return false;
    if (!Array.isArray(definition.rooms) || !definition.rooms.length) return false;
    const roomIds = new Set(definition.rooms.map(room => room.id));
    if (roomIds.size !== definition.rooms.length || definition.rooms.some(room => room.dungeonId !== definition.id)) return false;
    const connections = new Map();
    for (const room of definition.rooms) for (const connection of room.connections) {
      if (!connection.id || connections.has(connection.id) || !roomIds.has(connection.toRoomId) || !roomIds.has(room.id)) return false;
      if (typeof connection.destinationSpawn !== 'string' || !connection.destinationSpawn) return false;
      connections.set(connection.id, { ...connection, fromRoomId: room.id });
    }
    for (const connection of connections.values()) {
      const targetRoom = definition.rooms.find(room => room.id === connection.toRoomId);
      if (!targetRoom?.spawnPoints?.[connection.destinationSpawn]) return false;
    }
    if (!this.rooms.registerRooms(definition.rooms)) return false;
    const frozen = Object.freeze({ ...definition, connections });
    this.dungeons.set(definition.id, frozen);
    return true;
  }

  getDungeon(id) { return this.dungeons.get(String(id)) ?? null; }
  getRoomById(id) { return this.rooms.getRoomById(id); }
  getCurrentRoom() { return this.getRoomById(this.state.currentRoomId); }
  getCurrentDungeon() { return this.getDungeon(this.state.currentDungeonId); }
  getState() { return clone(this.state); }
  restoreSnapshot(snapshot) { if (!snapshot || typeof snapshot !== 'object') return false; const previous = this.getState(); this.state = clone(snapshot); if (!this._persist()) { this.state = previous; return false; } return true; }
  isDungeonMap(mapId) { return !!this.rooms.getRoomForMap(mapId); }

  checkRoomAccessibility(dungeonId, roomId, { fromRoomId = this.state.currentRoomId, connectionId = null } = {}) {
    const dungeon = this.getDungeon(dungeonId), room = this.getRoomById(roomId);
    if (!dungeon || !room || room.dungeonId !== dungeonId) return { ok: false, reason: 'UNKNOWN_ROOM' };
    if (fromRoomId == null) {
      if (room.id !== dungeon.entryRoomId) return { ok: false, reason: 'NOT_ENTRY_ROOM' };
      if (dungeon.entryRequires && !evaluateWorldCondition(dungeon.entryRequires, this._conditionContext())) return { ok: false, reason: 'REQUIREMENT_NOT_MET' };
      return { ok: true, connection: null };
    }
    const connection = [...dungeon.connections.values()].find(c => c.fromRoomId === fromRoomId && c.toRoomId === roomId && (!connectionId || c.id === connectionId));
    if (!connection) return { ok: false, reason: 'CONNECTION_NOT_REGISTERED' };
    if (this.state.unlockedConnections[connection.id] === false) return { ok: false, reason: 'CONNECTION_LOCKED' };
    if (connection.requires && !evaluateWorldCondition(connection.requires, this._conditionContext())) return { ok: false, reason: 'REQUIREMENT_NOT_MET' };
    return { ok: true, connection };
  }

  loadDungeon(dungeonId, { roomId = null } = {}) { return this.enterDungeon(dungeonId, roomId); }

  enterDungeon(dungeonId, roomId = null, { connectionId = null } = {}) {
    const dungeon = this.getDungeon(dungeonId);
    if (!dungeon) return { ok: false, reason: 'UNKNOWN_DUNGEON' };
    const target = roomId ?? dungeon.entryRoomId;
    const access = this.checkRoomAccessibility(dungeonId, target, { fromRoomId: null });
    if (!access.ok) return access;
    const previous = this.getState();
    this.state.currentDungeonId = dungeonId;
    this.state.currentRoomId = target;
    this.state.entryState = 'ENTERED';
    this._discover(target);
    if (!this._persist()) { this.state = previous; return { ok: false, reason: 'SAVE_FAILED' }; }
    this.events?.emit?.('DUNGEON_ENTERED', { targetId: dungeonId, roomId: target, eventId: `dungeon-enter:${dungeonId}:${Date.now()}` });
    return { ok: true, room: this.getRoomById(target), previous };
  }

  transitionRoom(dungeonId, roomId, connectionId) {
    if (this.state.currentDungeonId !== dungeonId || !this.state.currentRoomId) return { ok: false, reason: 'DUNGEON_NOT_ACTIVE' };
    const access = this.checkRoomAccessibility(dungeonId, roomId, { fromRoomId: this.state.currentRoomId, connectionId });
    if (!access.ok) return access;
    const room = this.getRoomById(roomId);
    const spawnId = access.connection.destinationSpawn;
    if (!room.spawnPoints[spawnId]) return { ok: false, reason: 'INVALID_DESTINATION_SPAWN' };
    const previous = this.getState();
    this.state.currentRoomId = roomId;
    this._discover(roomId);
    if (!this._persist()) { this.state = previous; return { ok: false, reason: 'SAVE_FAILED' }; }
    this.events?.emit?.('DUNGEON_ROOM_CHANGED', { targetId: roomId, dungeonId, fromRoomId: previous.currentRoomId, eventId: `room-change:${dungeonId}:${previous.currentRoomId}:${roomId}:${Date.now()}` });
    return { ok: true, room, spawn: spawnId, previous, connection: access.connection };
  }

  onRoomLoaded(mapId) {
    const room = this.rooms.getRoomForMap(mapId);
    if (!room) return false;
    if (this.state.currentDungeonId !== room.dungeonId || this.state.currentRoomId !== room.id) {
      // Continue restores the dungeon state before the scene is loaded. Refuse to silently
      // teleport into a different room if a stale/corrupt save points elsewhere.
      return false;
    }
    this._discover(room.id);
    return true;
  }

  exitDungeon({ eventId = null } = {}) {
    if (!this.state.currentDungeonId) return { ok: false, reason: 'DUNGEON_NOT_ACTIVE' };
    const previous = this.getState();
    const dungeonId = this.state.currentDungeonId;
    this.state.currentDungeonId = null;
    this.state.currentRoomId = null;
    this.state.entryState = 'EXITED';
    if (!this._persist()) { this.state = previous; return { ok: false, reason: 'SAVE_FAILED' }; }
    this.events?.emit?.('DUNGEON_EXITED', { targetId: dungeonId, eventId: eventId ?? `dungeon-exit:${dungeonId}:${Date.now()}` });
    return { ok: true, previous };
  }

  unlockConnection(connectionId) {
    const connection = this._findConnection(connectionId);
    if (!connection) return false;
    const previous = this.state.unlockedConnections[connectionId];
    this.state.unlockedConnections[connectionId] = true;
    if (!this._persist()) { if (previous === undefined) delete this.state.unlockedConnections[connectionId]; else this.state.unlockedConnections[connectionId] = previous; return false; }
    return true;
  }

  setRoomState(roomId, key, value) {
    if (!this.getRoomById(roomId) || typeof key !== 'string' || !key.trim()) return false;
    const previous = this.getState();
    this.state.roomStates[roomId] ??= {};
    this.state.roomStates[roomId][key] = clone(value);
    if (!this._persist()) { this.state = previous; return false; }
    return true;
  }

  getRoomState(roomId, key, fallback = null) { return this.state.roomStates?.[roomId]?.[key] ?? fallback; }

  completeDungeon(dungeonId, { eventId = null } = {}) {
    if (!this.getDungeon(dungeonId) || this.state.completedDungeons[dungeonId]) return false;
    this.state.completedDungeons[dungeonId] = { completed: true, completedAt: new Date().toISOString() };
    if (!this._persist()) { delete this.state.completedDungeons[dungeonId]; return false; }
    this.events?.emit?.('DUNGEON_COMPLETED', { targetId: dungeonId, amount: 1, eventId: eventId ?? `dungeon-complete:${dungeonId}` });
    return true;
  }

  isCompleted(dungeonId) { return this.state.completedDungeons?.[dungeonId]?.completed === true; }
  isDiscovered(roomId) { return this.state.discoveredRooms?.[roomId] === true; }
  destroy() { this._offObjectFound?.(); }

  _discover(roomId) { this.state.discoveredRooms[roomId] = true; }
  _conditionContext() { return { storyFlags: this.storyFlags, quests: this.quests, inventory: this.inventory, world: this.world }; }
  _findConnection(id) { for (const dungeon of this.dungeons.values()) if (dungeon.connections.has(id)) return dungeon.connections.get(id); return null; }
  _sanitizeState() {
    if (this.state.currentDungeonId && (!this.getDungeon(this.state.currentDungeonId) || this.getRoomById(this.state.currentRoomId)?.dungeonId !== this.state.currentDungeonId)) {
      this.state.currentDungeonId = null; this.state.currentRoomId = null; this.state.entryState = 'EXITED';
    }
    if (!this.state.currentDungeonId) this.state.currentRoomId = null;
    for (const id of Object.keys(this.state.discoveredRooms ?? {})) if (!this.getRoomById(id)) delete this.state.discoveredRooms[id];
    for (const id of Object.keys(this.state.roomStates ?? {})) if (!this.getRoomById(id)) delete this.state.roomStates[id];
    for (const id of Object.keys(this.state.completedDungeons ?? {})) if (!this.getDungeon(id)) delete this.state.completedDungeons[id];
    for (const id of Object.keys(this.state.unlockedConnections ?? {})) if (!this._findConnection(id)) delete this.state.unlockedConnections[id];
  }
  _persist() { try { return this.onChange?.(this.getState()) !== false; } catch { return false; } }
}
