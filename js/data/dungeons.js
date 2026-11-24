const room = (id, displayName, connections, spawnPoints, extra = {}) => ({
  id, dungeonId: 'forgotten_chapel', displayName, mapId: id,
  connections, entryPoints: Object.fromEntries(Object.keys(spawnPoints).map(id => [id, id])),
  exitPoints: { ...Object.fromEntries(connections.map(c => [c.id, c.exitId])), ...(extra.exitPoints ?? {}) },
  spawnPoints, interactableObjects: extra.interactableObjects ?? [],
  encounterDefinitions: extra.encounterDefinitions ?? [],
  worldState: extra.worldState ?? { locationId: id },
});

export const DUNGEON_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'forgotten_chapel', name: 'Forgotten Chapel', entryRoomId: 'chapel_room_01_entrance',
    entryRequires: { storyFlag: 'chapel_gate_unlocked' },
    rooms: [
      room('chapel_room_01_entrance', 'Entrance', [
        { id: 'chapel_01_to_02', toRoomId: 'chapel_room_02_main_hall', destinationSpawn: 'from_entrance', exitId: 'entrance_to_main_hall' },
      ], { entry_from_exterior: { x: 11, y: 13, facing: 'up' }, from_main_hall: { x: 11, y: 13, facing: 'up' } }, { worldState: { locationId: 'chapel_room_01_entrance' }, exitPoints: { chapel_return_outside: { mapId: 'forgotten_chapel_entrance', spawn: 'chapel_interior_return', exitDungeon: true } } }),
      room('chapel_room_02_main_hall', 'Main Hall', [
        { id: 'chapel_02_to_01', toRoomId: 'chapel_room_01_entrance', destinationSpawn: 'from_main_hall', exitId: 'main_hall_to_entrance' },
        { id: 'chapel_02_to_03', toRoomId: 'chapel_room_03_library', destinationSpawn: 'from_main_hall', exitId: 'main_hall_to_library' },
        { id: 'chapel_02_to_04', toRoomId: 'chapel_room_04_sanctuary', destinationSpawn: 'from_main_hall', exitId: 'main_hall_to_sanctuary' },
      ], { from_entrance: { x: 11, y: 14, facing: 'up' }, from_library: { x: 11, y: 14, facing: 'left' }, from_sanctuary: { x: 11, y: 14, facing: 'right' } }, { worldState: { locationId: 'chapel_room_02_main_hall' } }),
      room('chapel_room_03_library', 'Forgotten Library', [
        { id: 'chapel_03_to_02', toRoomId: 'chapel_room_02_main_hall', destinationSpawn: 'from_library', exitId: 'library_to_main_hall' },
        { id: 'chapel_03_to_04', toRoomId: 'chapel_room_04_sanctuary', destinationSpawn: 'from_library', exitId: 'library_to_sanctuary' },
      ], { from_main_hall: { x: 2, y: 8, facing: 'right' }, from_sanctuary: { x: 20, y: 8, facing: 'left' } }, { interactableObjects: ['chapel_library_chronicle'], worldState: { locationId: 'chapel_room_03_library', archiveRead: false } }),
      room('chapel_room_04_sanctuary', 'Broken Sanctuary', [
        { id: 'chapel_04_to_02', toRoomId: 'chapel_room_02_main_hall', destinationSpawn: 'from_sanctuary', exitId: 'sanctuary_to_main_hall' },
        { id: 'chapel_04_to_03', toRoomId: 'chapel_room_03_library', destinationSpawn: 'from_sanctuary', exitId: 'sanctuary_to_library' },
        { id: 'chapel_04_to_05', toRoomId: 'chapel_room_05_sealed_chamber', destinationSpawn: 'from_sanctuary', exitId: 'sanctuary_to_sealed_chamber', requires: { storyFlag: 'chapel_gate_unlocked' } },
        { id: 'chapel_04_to_06', toRoomId: 'chapel_room_06_ancient_sanctum', destinationSpawn: 'from_sanctuary', exitId: 'sanctuary_to_ancient_sanctum' },
      ], { from_main_hall: { x: 11, y: 2, facing: 'down' }, from_library: { x: 11, y: 14, facing: 'right' }, from_sealed_chamber: { x: 11, y: 14, facing: 'up' }, from_ancient_sanctum: { x: 20, y: 8, facing: 'left' } }, { interactableObjects: ['chapel_sanctuary_inscription'], encounterDefinitions: [{ zoneId: 'chapel_room_04_sanctuary_encounters', encounterTable: 'forgotten_chapel' }], worldState: { locationId: 'chapel_room_04_sanctuary' } }),
      room('chapel_room_05_sealed_chamber', 'Sealed Chamber', [
        { id: 'chapel_05_to_04', toRoomId: 'chapel_room_04_sanctuary', destinationSpawn: 'from_sealed_chamber', exitId: 'sealed_chamber_return' },
      ], { from_sanctuary: { x: 11, y: 14, facing: 'up' } }, { interactableObjects: ['chapel_inner_seal'], worldState: { locationId: 'chapel_room_05_sealed_chamber', sealExamined: false } }),
      room('chapel_room_06_ancient_sanctum', 'Ancient Sanctum', [
        { id: 'chapel_06_to_04', toRoomId: 'chapel_room_04_sanctuary', destinationSpawn: 'from_ancient_sanctum', exitId: 'ancient_sanctum_return' },
      ], { from_sanctuary: { x: 2, y: 8, facing: 'right' } }, { interactableObjects: ['chapel_ancient_conduit'], worldState: { locationId: 'chapel_room_06_ancient_sanctum', conduitExamined: false } }),
    ],
  }),
]);
