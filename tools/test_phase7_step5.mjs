import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateMap, validateObjectTypes } from '../js/utils/DataUtils.js';
import { CollisionSystem } from '../js/systems/CollisionSystem.js';
import { Camera } from '../js/core/Camera.js';
import { DungeonManager } from '../js/systems/DungeonManager.js';
import { DungeonRoomManager } from '../js/systems/DungeonRoomManager.js';
import { DUNGEON_DEFINITIONS } from '../js/data/dungeons.js';
import { WORLD_OBJECT_DEFINITIONS } from '../js/data/worldState.js';
import { WorldStateManager } from '../js/systems/WorldStateManager.js';
import { StoryFlagManager } from '../js/systems/StoryFlagManager.js';
import { GameEventBus } from '../js/systems/GameEventBus.js';
import { QuestManager } from '../js/systems/QuestManager.js';
import { QuestObjectiveTracker } from '../js/systems/QuestObjectiveTracker.js';
import { EncounterSystem } from '../js/systems/EncounterSystem.js';
import { ENCOUNTER_TABLES } from '../js/data/encounters.js';
import { EidolonManager } from '../js/systems/EidolonManager.js';
import { BattleManager } from '../js/battle/BattleManager.js';
import { SceneManager } from '../js/core/SceneManager.js';

const objects = validateObjectTypes(JSON.parse(fs.readFileSync(new URL('../data/objects.json', import.meta.url))));
const dungeon = DUNGEON_DEFINITIONS.find(x => x.id === 'forgotten_chapel');
assert(dungeon, 'Forgotten Chapel dungeon definition missing');
assert.equal(dungeon.rooms.length, 6);
const maps = new Map();
for (const room of dungeon.rooms) {
  const raw = JSON.parse(fs.readFileSync(new URL(`../data/maps/${room.mapId}.json`, import.meta.url)));
  const map = validateMap(raw, room.mapId, objects);
  maps.set(map.id, map);
  assert.equal(map.id, room.id);
  assert.equal(map.name, room.displayName);
  assert.equal(map.width, 24); assert.equal(map.height, 18);
  const collision = new CollisionSystem(map, objects);
  for (const [spawnId, spawn] of Object.entries(room.spawnPoints)) {
    assert(map.spawns[spawnId], `${room.id}: missing map spawn ${spawnId}`);
    assert.deepEqual(map.spawns[spawnId], spawn, `${room.id}:${spawnId} config/map spawn mismatch`);
    const px = spawn.x * 16 + 1, py = (spawn.y + 1) * 16 - 24 + 18;
    assert.equal(collision.overlaps(px, py, 10, 6), false, `${room.id}:${spawnId} spawn blocked`);
  }
  const camera = new Camera(320, 180); camera.setBounds(map.width * 16, map.height * 16);
  const spawn = Object.values(map.spawns)[0];
  camera.follow({ x: spawn.x * 16, y: spawn.y * 16, w: 16, h: 24 }, true);
  assert(camera.x >= 0 && camera.y >= 0);
  for (const it of map.interactables.filter(x => x.transition?.dungeonId)) {
    assert.equal(it.transition.dungeonId, 'forgotten_chapel');
    assert(dungeon.rooms.some(r => r.id === it.transition.roomId), `${it.id}: destination room missing`);
  }
}
assert.equal(maps.size, 6);

// All room connections are declared, have matching map exits and valid destination spawns.
const connectionIds = new Set();
for (const room of dungeon.rooms) {
  const map = maps.get(room.mapId);
  for (const connection of room.connections) {
    assert(!connectionIds.has(connection.id), `duplicate connection ${connection.id}`); connectionIds.add(connection.id);
    const target = dungeon.rooms.find(r => r.id === connection.toRoomId);
    assert(target, `${connection.id}: unknown target room`);
    assert(target.spawnPoints[connection.destinationSpawn], `${connection.id}: invalid target spawn`);
    const exit = map.interactables.find(it => it.id === connection.exitId);
    assert(exit?.transition, `${connection.id}: map exit missing`);
    assert.equal(exit.transition.roomId, connection.toRoomId);
    assert.equal(exit.transition.spawn, connection.destinationSpawn);
    assert.equal(exit.transition.connectionId, connection.id);
  }
}
assert.equal(maps.get('chapel_room_01_entrance').interactables.find(x => x.id === 'chapel_return_outside').transition.exitDungeon, true);
assert.equal(dungeon.rooms[0].exitPoints.chapel_return_outside.mapId, 'forgotten_chapel_entrance');
for (const room of dungeon.rooms) for (const [entryId, spawnId] of Object.entries(room.entryPoints)) assert(room.spawnPoints[spawnId], `${room.id}: invalid entry point ${entryId}`);
assert(maps.get('chapel_room_05_sealed_chamber').interactables.some(x => x.id === 'chapel_inner_seal' && x.requires?.storyFlag === 'chapel_inner_seal_open'));
assert(maps.get('chapel_room_06_ancient_sanctum').interactables.some(x => x.id === 'chapel_ancient_conduit'));

// Dungeon manager registration, entry condition, all six room transitions and safe exit.
const events = new GameEventBus();
const flags = new StoryFlagManager();
let savedDungeonState = null;
const manager = new DungeonManager({ definitions: DUNGEON_DEFINITIONS, storyFlags: flags, events, onChange: state => { savedDungeonState = state; return true; } });
assert.equal(manager.rooms.listRooms('forgotten_chapel').length, 6);
assert.equal(manager.getRoomById('chapel_room_03_library').displayName, 'Forgotten Library');
assert.equal(manager.enterDungeon('forgotten_chapel').reason, 'REQUIREMENT_NOT_MET');
flags.set('chapel_gate_unlocked', true);
assert.equal(manager.loadDungeon('forgotten_chapel').ok, true);
assert.equal(manager.getCurrentRoom().id, 'chapel_room_01_entrance');
assert.equal(manager.isDiscovered('chapel_room_01_entrance'), true);
flags.set('chapel_gate_unlocked', false);
assert.equal(manager.checkRoomAccessibility('forgotten_chapel', 'chapel_room_05_sealed_chamber', { fromRoomId: 'chapel_room_04_sanctuary', connectionId: 'chapel_04_to_05' }).reason, 'REQUIREMENT_NOT_MET');
flags.set('chapel_gate_unlocked', true);
const steps = [
  ['chapel_room_02_main_hall','chapel_01_to_02','from_entrance'],
  ['chapel_room_03_library','chapel_02_to_03','from_main_hall'],
  ['chapel_room_04_sanctuary','chapel_03_to_04','from_library'],
  ['chapel_room_05_sealed_chamber','chapel_04_to_05','from_sanctuary'],
  ['chapel_room_04_sanctuary','chapel_05_to_04','from_sealed_chamber'],
  ['chapel_room_06_ancient_sanctum','chapel_04_to_06','from_sanctuary'],
  ['chapel_room_04_sanctuary','chapel_06_to_04','from_ancient_sanctum'],
  ['chapel_room_02_main_hall','chapel_04_to_02','from_sanctuary'],
  ['chapel_room_01_entrance','chapel_02_to_01','from_main_hall'],
];
for (const [roomId, connectionId, spawn] of steps) {
  const result = manager.transitionRoom('forgotten_chapel', roomId, connectionId);
  assert.equal(result.ok, true, `${connectionId} failed: ${result.reason}`);
  assert.equal(result.spawn, spawn);
  assert.equal(manager.getCurrentRoom().id, roomId);
  assert.equal(manager.isDiscovered(roomId), true);
}
assert.equal(Object.keys(manager.getState().discoveredRooms).length, 6);
assert.equal(manager.getCurrentRoom().id, 'chapel_room_01_entrance');
manager.setRoomState('chapel_room_03_library', 'chapel_library_chronicle', true);
assert.equal(manager.getRoomState('chapel_room_03_library', 'chapel_library_chronicle'), true);
assert.equal(manager.exitDungeon().ok, true);
assert.equal(manager.getCurrentDungeon(), null);
assert.equal(savedDungeonState.entryState, 'EXITED');

// Save/restore retains active room, discovered rooms, room state, unlocked exits and completion.
manager.enterDungeon('forgotten_chapel');
manager.transitionRoom('forgotten_chapel', 'chapel_room_02_main_hall', 'chapel_01_to_02');
manager.transitionRoom('forgotten_chapel', 'chapel_room_03_library', 'chapel_02_to_03');
events.emit('OBJECT_FOUND', { targetId: 'chapel_library_chronicle', eventId: 'room-state-event' });
assert.equal(manager.getRoomState('chapel_room_03_library', 'chapel_library_chronicle'), true);
manager.transitionRoom('forgotten_chapel', 'chapel_room_02_main_hall', 'chapel_03_to_02');
manager.unlockConnection('chapel_04_to_05');
const restored = new DungeonManager({ definitions: DUNGEON_DEFINITIONS, savedState: manager.getState(), storyFlags: flags, onChange: () => true });
assert.equal(restored.state.currentDungeonId, 'forgotten_chapel');
assert.equal(restored.state.currentRoomId, 'chapel_room_02_main_hall');
assert.equal(restored.isDiscovered('chapel_room_01_entrance'), true);
assert.equal(restored.state.unlockedConnections.chapel_04_to_05, true);
assert.equal(restored.getRoomState('chapel_room_03_library', 'chapel_library_chronicle'), true);
assert.equal(restored.completeDungeon('forgotten_chapel'), true);
assert.equal(restored.completeDungeon('forgotten_chapel'), false, 'completion must be idempotent');
assert.equal(restored.isCompleted('forgotten_chapel'), true);

// WorldStateManager persists room location and inspectable-object discovery.
const world = new WorldStateManager({ definitions: WORLD_OBJECT_DEFINITIONS, storyFlags: flags, events, onChange: () => true });
events.emit('LOCATION_VISITED', { targetId: 'chapel_room_01_entrance', eventId: 'visit-room-01' });
assert.equal(world.getState('chapel_room_01_entrance'), 'DISCOVERED');
events.emit('WORLD_INTERACTION', { targetId: 'chapel_library_chronicle', eventId: 'inspect-chronicle' });
assert.equal(world.getState('chapel_library_chronicle'), 'DISCOVERED');
const restoredWorld = new WorldStateManager({ definitions: WORLD_OBJECT_DEFINITIONS, savedState: world.toJSON(), storyFlags: flags, events, onChange: () => true });
assert.equal(restoredWorld.getState('chapel_room_01_entrance'), 'DISCOVERED');
assert.equal(restoredWorld.getState('chapel_library_chronicle'), 'DISCOVERED');

// Quest objective adapter consumes the real dungeon event contracts.
const questEvents = new GameEventBus();
const questManager = new QuestManager({ definitions: [{
  id: 'test_chapel_objectives', title: 'Chapel Test', prerequisites: { questIds: [], storyFlags: [] },
  objectives: [
    { id: 'visit', type: 'VISIT_LOCATION', targetId: 'chapel_room_01_entrance', requiredAmount: 1 },
    { id: 'find', type: 'FIND_OBJECT', targetId: 'chapel_library_chronicle', requiredAmount: 1 },
    { id: 'complete', type: 'COMPLETE_DUNGEON', targetId: 'forgotten_chapel', requiredAmount: 1 },
  ], rewards: { aetherShards: 0, eidolonExp: 0, items: [], storyFlags: [] },
} ] });
const tracker = new QuestObjectiveTracker({ questManager, events: questEvents });
assert.equal(questManager.acceptQuest('test_chapel_objectives').ok, true);
questEvents.emit('LOCATION_VISITED', { targetId: 'chapel_room_01_entrance', eventId: 'quest-visit-room' });
questEvents.emit('OBJECT_FOUND', { targetId: 'chapel_library_chronicle', eventId: 'quest-find-object' });
const questDungeonManager = new DungeonManager({ definitions: DUNGEON_DEFINITIONS, storyFlags: flags, events: questEvents, onChange: () => true });
assert.equal(questDungeonManager.completeDungeon('forgotten_chapel', { eventId: 'quest-dungeon-complete' }), true);
assert.equal(questManager.getStatus('test_chapel_objectives'), 'COMPLETED');

// Dungeon encounters use the existing species table, EncounterSystem and BattleManager.
const encounterSystem = new EncounterSystem(ENCOUNTER_TABLES);
const roll = encounterSystem.force('forgotten_chapel', { random: () => 0 });
assert(roll && ENCOUNTER_TABLES.forgotten_chapel.entries.some(x => x.speciesId === roll.speciesId));
const store = new Map();
globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
const eidolons = new EidolonManager();
const encounter = eidolons.startEncounterFromRoll(roll);
const battleGame = { eidolons, experience: { awardBattleExp: () => ({ exp: 0 }) }, events };
const battle = new BattleManager(battleGame, encounter);
assert.equal(battle.enemy.speciesId, roll.speciesId);
battle.close();

// SceneManager's overlay contract keeps the underlying overworld instance and its state.
const fakeGame = { input: { latchHeld() {} }, fatal(error) { throw error; } };
const scenes = new SceneManager(fakeGame);
class FakeWorld { async enter() { this.player = { x: 123, y: 234 }; } pause() { this.paused = true; } resume() { this.paused = false; } }
class FakeBattle { async enter() {} }
scenes.register('overworld', FakeWorld); scenes.register('battle', FakeBattle);
await scenes.change('overworld', {}, { fade: false });
const worldScene = scenes.base;
await scenes.push('battle');
assert.equal(scenes.base, worldScene);
scenes.pop();
assert.equal(scenes.top, worldScene);
assert.deepEqual(worldScene.player, { x: 123, y: 234 });

// Save envelope v7 includes dungeon state and still accepts v6 legacy envelopes.
eidolons.dungeonState = manager.getState();
eidolons.worldSession = { currentMap: 'chapel_room_02_main_hall', playerPosition: { x: 123, y: 456 } };
eidolons.save();
assert.equal(JSON.parse(store.get('eclipsia.phase4')).version, 7);
assert.equal(JSON.parse(store.get('eclipsia.phase4')).data.dungeonState.currentDungeonId, 'forgotten_chapel');
assert.equal(JSON.parse(store.get('eclipsia.phase4')).data.dungeonState.currentRoomId, 'chapel_room_02_main_hall');
assert.equal(JSON.parse(store.get('eclipsia.phase4')).data.worldSession.playerPosition.x, 123);
store.set('eclipsia.phase4', JSON.stringify({ version: 6, data: { inventory: { potion: 2 } } }));
const legacy = new EidolonManager();
assert.equal(legacy.inventory.potion, 2);
assert.equal(legacy.dungeonState, null);

tracker.destroy(); questManager.destroy(); manager.destroy(); restored.destroy(); questDungeonManager.destroy(); world.destroy(); restoredWorld.destroy();
console.log('Phase 7 Step 5 tests passed (six validated room maps, room graph/spawns, gated entry, transitions and exit, discovery/room-state persistence, v7 save restore, quest event adapters, existing encounter/battle pipeline, and overlay scene preservation).');
