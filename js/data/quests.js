/** Quest definitions are immutable configuration; runtime progress is stored separately. */
const definitions = [
  {
    id: 'qst_ashenveil_arrival', title: 'A Stranger in Ashenveil',
    description: 'Learn the first things a traveler should know about Ashenveil Village.', chapter: 'Prologue',
    prerequisites: { questIds: [], storyFlags: [] },
    objectives: [
      { id: 'meet_village_guide', type: 'TALK_TO_NPC', targetId: 'village_guide', requiredAmount: 1, description: 'Speak with the village guide.' },
      { id: 'inspect_old_shrine', type: 'FIND_OBJECT', targetId: 'old_shrine', requiredAmount: 1, description: 'Inspect the old shrine.' },
    ], rewards: { aetherShards: 0, eidolonExp: 0, items: [], storyFlags: ['quest_ashenveil_arrival_complete'] },
  },
  {
    id: 'qst_whispers_in_ash', title: 'Whispers in the Ash',
    description: 'A quiet rumor points toward something hidden beyond the village.', chapter: 'Prologue',
    prerequisites: { questIds: ['qst_ashenveil_arrival'], storyFlags: ['met_village_guide'] },
    objectives: [{ id: 'hear_the_rumor', type: 'TALK_TO_NPC', targetId: 'elder_maren', requiredAmount: 1, description: 'Learn about the strange whisper.' }],
    rewards: { aetherShards: 0, eidolonExp: 0, items: [], storyFlags: ['quest_whispers_in_ash_complete'] },
  },
  {
    id: 'qst_forest_traces', title: 'Traces at the Forest Edge',
    description: 'Someone has left signs near the edge of Ashenveil Forest.', chapter: 'Prologue',
    prerequisites: { questIds: ['qst_ashenveil_arrival'], storyFlags: [] },
    objectives: [{ id: 'find_forest_traces', type: 'VISIT_LOCATION', targetId: 'ashenveil_forest', requiredAmount: 1, description: 'Find the forest edge.' }],
    rewards: { aetherShards: 0, eidolonExp: 0, items: [], storyFlags: [] },
  },
  {
    id: 'qst_echoes_beneath_ash', title: 'Echoes Beneath the Ash', description: 'Follow the signs beneath Ashenveil.', chapter: 'Main Quest',
    prerequisites: { questIds: [], storyFlags: [] },
    objectives: [
      { id: 'talk_edrick', type: 'TALK_TO_NPC', targetId: 'edrick', requiredAmount: 1, description: 'Speak with Edrick.' },
      { id: 'visit_ashenveil_forest', type: 'VISIT_LOCATION', targetId: 'ashenveil_forest', requiredAmount: 1, description: 'Visit Ashenveil Forest.' },
      { id: 'find_ancient_altar', type: 'FIND_OBJECT', targetId: 'ancient_altar', requiredAmount: 1, description: 'Find the Ancient Altar.' },
      { id: 'defeat_guardian_eidolon', type: 'DEFEAT_EIDOLON', targetId: 'guardian_eidolon', requiredAmount: 1, description: 'Defeat the Guardian Eidolon.' },
    ],
    rewards: { aetherShards: 100, eidolonExp: 150, items: [{ id: 'healing_potion', amount: 2 }] },
  },
  {
    id: 'qst_a_healers_request', title: "A Healer's Request", description: 'Gather herbs for Seren.', chapter: 'Side Quest',
    prerequisites: { questIds: [], storyFlags: [] },
    objectives: [
      { id: 'collect_herbs', type: 'COLLECT_ITEM', targetId: 'herb', requiredAmount: 3, description: 'Collect 3 Herbs.' },
      { id: 'talk_seren', type: 'TALK_TO_NPC', targetId: 'seren', requiredAmount: 1, description: 'Speak with Seren.' },
    ],
    rewards: { aetherShards: 50, eidolonExp: 0, items: [{ id: 'healing_potion', amount: 1 }] },
  },
];
function deepFreeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.freeze(value); for (const child of Object.values(value)) deepFreeze(child); return value; }
export const QUEST_DEFINITIONS = deepFreeze(definitions);
export const QUEST_BY_ID = Object.freeze(Object.fromEntries(QUEST_DEFINITIONS.map(quest => [quest.id, quest])));
