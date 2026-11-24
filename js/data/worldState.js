/** Declarative world-state registry and event rules. Conditions are data, never executable strings. */
export const WORLD_OBJECT_DEFINITIONS = Object.freeze([
  { id: 'chapel_gate', type: 'DOOR', initialState: 'LOCKED', states: ['LOCKED','CLOSED','OPEN'], transitions: [{ to: 'OPEN', when: { storyFlag: 'chapel_gate_unlocked' } }], dialogueVariants: [{ when: { storyFlag: 'chapel_gate_unlocked' }, lines: ['The violet seal has faded. The Forgotten Chapel gate now stands open.'] }], dialogue: { LOCKED: ['A heavy door sealed by a strange violet sigil.','It does not move.'], OPEN: ['The gate to the Forgotten Chapel is open.'] } },
  { id: 'forgotten_chapel_chest', type: 'CHEST', initialState: 'CLOSED', states: ['CLOSED','OPENED','CLAIMED'] },
  { id: 'chapel_seal_mechanism', type: 'MECHANISM', initialState: 'INACTIVE', states: ['INACTIVE','ACTIVE'] },
  { id: 'elder_maren', type: 'NPC', initialState: 'DEFAULT', states: ['DEFAULT','QUEST_AVAILABLE','QUEST_ACTIVE','QUEST_COMPLETED','CUSTOM'], dialogueVariants: [{ when: { questStatus: { id: 'qst_echoes_beneath_ash', status: 'COMPLETED' } }, lines: ['The seal has weakened. The way to the Forgotten Chapel is open.','Take care, Kael. The ruins have waited a long time.'] }], dialogue: {
    DEFAULT: ['Kael. The sky burns redder each dusk.','The Forgotten Chapel to the north has been sealed since before I was born.','Stay close to the village for now, child.'],
    QUEST_COMPLETED: ['The seal has weakened. The way to the Forgotten Chapel is open.','Take care, Kael. The ruins have waited a long time.']
  } },
  { id: 'edrick', type: 'NPC', initialState: 'DEFAULT', states: ['DEFAULT','QUEST_AVAILABLE','QUEST_ACTIVE','QUEST_COMPLETED','CUSTOM'] },
  { id: 'seren', type: 'NPC', initialState: 'DEFAULT', states: ['DEFAULT','QUEST_AVAILABLE','QUEST_ACTIVE','QUEST_COMPLETED','CUSTOM'] },
  { id: 'darian', type: 'NPC', initialState: 'DEFAULT', states: ['DEFAULT','QUEST_AVAILABLE','QUEST_ACTIVE','QUEST_COMPLETED','CUSTOM'] },
  { id: 'ashenveil_village', type: 'LOCATION', initialState: 'UNDISCOVERED', states: ['UNDISCOVERED','DISCOVERED'] },
  { id: 'ashenveil_forest', type: 'LOCATION', initialState: 'UNDISCOVERED', states: ['UNDISCOVERED','DISCOVERED'] },
  { id: 'forgotten_chapel_entrance', type: 'LOCATION', initialState: 'UNDISCOVERED', states: ['UNDISCOVERED','DISCOVERED'] },
  ...['chapel_room_01_entrance','chapel_room_02_main_hall','chapel_room_03_library','chapel_room_04_sanctuary','chapel_room_05_sealed_chamber','chapel_room_06_ancient_sanctum','chapel_library_chronicle','chapel_sanctuary_inscription','chapel_ancient_conduit'].map(id => ({ id, type: 'LOCATION', initialState: 'UNDISCOVERED', states: ['UNDISCOVERED','DISCOVERED'] })),
  { id: 'chapel_inner_seal', type: 'DOOR', initialState: 'LOCKED', states: ['LOCKED','CLOSED','OPEN'] },
  { id: 'forest_hidden_chest', type: 'CHEST', initialState: 'CLOSED', states: ['CLOSED','OPENED','CLAIMED'] },
  { id: 'forest_herb_patch_1', type: 'CHEST', initialState: 'CLOSED', states: ['CLOSED','OPENED','CLAIMED'] },
  { id: 'forest_herb_patch_2', type: 'CHEST', initialState: 'CLOSED', states: ['CLOSED','OPENED','CLAIMED'] },
  { id: 'forest_herb_patch_3', type: 'CHEST', initialState: 'CLOSED', states: ['CLOSED','OPENED','CLAIMED'] }
]);

export const WORLD_EVENT_RULES = Object.freeze([
  { id: 'chapel_mechanism_activated', when: { event: { type: 'MECHANISM_ACTIVATED', targetId: 'chapel_seal_mechanism' } }, actions: [{ type: 'SET_OBJECT_STATE', objectId: 'chapel_seal_mechanism', state: 'ACTIVE' }] },
  { id: 'echoes_beneath_ash_completed', when: { questStatus: { id: 'qst_echoes_beneath_ash', status: 'COMPLETED' } }, actions: [
    { type: 'SET_STORY_FLAG', flag: 'chapel_gate_unlocked', value: true },
    { type: 'SET_OBJECT_STATE', objectId: 'chapel_gate', state: 'OPEN' },
    { type: 'SET_OBJECT_STATE', objectId: 'elder_maren', state: 'QUEST_COMPLETED' },
    { type: 'SET_OBJECT_STATE', objectId: 'edrick', state: 'QUEST_COMPLETED' }
  ] }
]);
