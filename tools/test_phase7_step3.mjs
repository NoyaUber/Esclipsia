import assert from 'node:assert/strict';
import { WorldStateManager, evaluateWorldCondition } from '../js/systems/WorldStateManager.js';
import { WORLD_OBJECT_DEFINITIONS, WORLD_EVENT_RULES } from '../js/data/worldState.js';
import { StoryFlagManager } from '../js/systems/StoryFlagManager.js';
import { QuestManager } from '../js/systems/QuestManager.js';
import { GameEventBus } from '../js/systems/GameEventBus.js';
import { EidolonSaveAdapter } from '../js/systems/EidolonSaveAdapter.js';
import { QUEST_DEFINITIONS } from '../js/data/quests.js';
import { NPC } from '../js/entities/NPC.js';

const flags = new StoryFlagManager();
const quests = new QuestManager({ definitions: QUEST_DEFINITIONS, storyFlags: flags });
const events = new GameEventBus();
let persisted = null;
const world = new WorldStateManager({ definitions: WORLD_OBJECT_DEFINITIONS, eventRules: WORLD_EVENT_RULES, storyFlags: flags, quests, inventory: { herb: 2 }, events, onChange: state => { persisted = structuredClone(state); return true; } });

// 1–2. Door locked until a required story flag becomes true.
assert.equal(world.getState('chapel_gate'), 'LOCKED');
assert.equal(world.canInteract('chapel_gate', { storyFlag: 'chapel_gate_unlocked' }), false);
flags.set('chapel_gate_unlocked', true);
assert.equal(world.getState('chapel_gate'), 'OPEN');
assert.equal(world.getDialogue('chapel_gate')[0], 'The violet seal has faded. The Forgotten Chapel gate now stands open.');

// 3. Open door remains open after restoring persisted state.
const restored = new WorldStateManager({ definitions: WORLD_OBJECT_DEFINITIONS, savedState: persisted, storyFlags: flags, quests, inventory: { herb: 2 } });
assert.equal(restored.getState('chapel_gate'), 'OPEN');

// 4. Chest cannot be claimed twice; failed delivery does not mark it claimed.
assert.equal(restored.handleInteraction({ targetId: 'forgotten_chapel_chest', eventId: 'chest-open-1' }).state, 'OPENED');
assert.equal(restored.claimChest('forgotten_chapel_chest', { grant: () => false }).reason, 'REWARD_DELIVERY_FAILED');
assert.equal(restored.getState('forgotten_chapel_chest'), 'OPENED');
assert.equal(restored.claimChest('forgotten_chapel_chest', { eventId: 'chest-claim-1', grant: () => true }).ok, true);
assert.equal(restored.claimChest('forgotten_chapel_chest', { eventId: 'chest-claim-2', grant: () => true }).reason, 'ALREADY_CLAIMED');
const chestReload = new WorldStateManager({ definitions: WORLD_OBJECT_DEFINITIONS, savedState: restored.toJSON(), storyFlags: flags, quests });
assert.equal(chestReload.getState('forgotten_chapel_chest'), 'CLAIMED');

// 5. Mechanism activation persists.
restored.handleInteraction({ targetId: 'chapel_seal_mechanism', eventId: 'mechanism-1' });
const restoredAgain = new WorldStateManager({ definitions: WORLD_OBJECT_DEFINITIONS, savedState: restored.toJSON(), storyFlags: flags, quests });
assert.equal(restoredAgain.getState('chapel_seal_mechanism'), 'ACTIVE');
assert.equal(restoredAgain.setState('chapel_seal_mechanism', 'ACTIVE', { eventId: 'mechanism-already-active' }).ok, true);
assert.ok(restoredAgain.toJSON().appliedEvents.includes('mechanism-already-active'));
events.emit('MECHANISM_ACTIVATED', { targetId: 'chapel_seal_mechanism', eventId: 'mechanism-event-1' });
assert.equal(world.getState('chapel_seal_mechanism'), 'ACTIVE');
assert.equal(evaluateWorldCondition({ event: { type: 'OBJECT_FOUND', targetId: 'ancient_altar' } }, { event: { type: 'OBJECT_FOUND', targetId: 'ancient_altar' } }), true);

// 6–8. Quest completion changes flag, door, NPC state and applies the world rule once.
assert.equal(quests.acceptQuest('qst_echoes_beneath_ash').ok, true);
assert.equal(quests.completeQuest('qst_echoes_beneath_ash').ok, true);
assert.equal(flags.has('chapel_gate_unlocked'), true);
assert.equal(world.getState('chapel_gate'), 'OPEN');
assert.equal(world.getState('elder_maren'), 'QUEST_COMPLETED');
assert.equal(world.getState('edrick'), 'QUEST_COMPLETED');
const ruleCount = world.toJSON().appliedEvents.filter(id => id === 'rule:echoes_beneath_ash_completed').length;
world.refresh(); world.refresh();
assert.equal(world.toJSON().appliedEvents.filter(id => id === 'rule:echoes_beneath_ash_completed').length, ruleCount);
assert.match(world.getDialogue('elder_maren')[0], /seal has weakened/i);
const elderNpc = new NPC({ id: 'elder_maren', name: 'Elder Maren', x: 1, y: 1, lines: ['Old dialogue'] }, null);
elderNpc.setWorldState(world.getState('elder_maren'), world.getDialogue('elder_maren', elderNpc.baseLines));
assert.equal(elderNpc.worldState, 'QUEST_COMPLETED');
assert.match(elderNpc.lines[0], /seal has weakened/i);
const questWorldReload = new WorldStateManager({ definitions: WORLD_OBJECT_DEFINITIONS, eventRules: WORLD_EVENT_RULES, savedState: world.toJSON(), storyFlags: flags, quests });
assert.equal(questWorldReload.getState('chapel_gate'), 'OPEN');
assert.equal(questWorldReload.getState('edrick'), 'QUEST_COMPLETED');

// 9. Legacy save envelopes v1-v4 remain readable; v7 writes new world state.
const store = new Map();
globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
const adapter = new EidolonSaveAdapter();
for (const version of [1,2,3,4]) {
  store.set('eclipsia.phase4', JSON.stringify({ version, data: { inventory: { herb: 4 } } }));
  assert.equal(adapter.load().inventory.herb, 4);
}
assert.equal(adapter.save({ inventory: {}, worldState: world.toJSON() }), true);
assert.equal(JSON.parse(store.get('eclipsia.phase4')).version, 7);
assert.ok(JSON.parse(store.get('eclipsia.phase4')).data.worldState.states.chapel_gate);

// 10. Safe condition evaluator and legacy Phase 1–6 systems are covered by prior suites.
assert.equal(evaluateWorldCondition({ itemOwned: { id: 'herb', amount: 2 } }, { inventory: { herb: 2 } }), true);
assert.equal(evaluateWorldCondition({ questStatus: { id: 'qst_echoes_beneath_ash', status: 'COMPLETED' } }, { quests }), true);
assert.equal(world.getState('ashenveil_village'), 'UNDISCOVERED');
events.emit('LOCATION_VISITED', { targetId: 'ashenveil_village', eventId: 'visit-village-1' });
assert.equal(world.getState('ashenveil_village'), 'DISCOVERED');
assert.equal(world.handleInteraction({ targetId: 'chapel_gate', eventId: 'gate-interact-1' }).ok, true);
assert.equal(world.handleInteraction({ targetId: 'chapel_gate', eventId: 'gate-interact-1' }).reason, 'DUPLICATE_EVENT');
const failingWorld = new WorldStateManager({ definitions: WORLD_OBJECT_DEFINITIONS, storyFlags: flags, quests, onChange: () => false });
assert.equal(failingWorld.setState('chapel_seal_mechanism', 'ACTIVE').reason, 'SAVE_FAILED');
assert.equal(failingWorld.getState('chapel_seal_mechanism'), 'INACTIVE');
failingWorld.destroy();
assert.equal(evaluateWorldCondition({ __proto__: { polluted: true } }, {}), false);
assert.equal(evaluateWorldCondition({ unknown: 'anything' }, {}), false);

world.destroy(); restored.destroy(); restoredAgain.destroy(); chestReload.destroy(); questWorldReload.destroy(); quests.destroy();
console.log('Phase 7 Step 3 tests passed (door conditions/persistence, chest claim idempotency, mechanism persistence, quest-to-world rules, NPC dialogue state, event idempotency, safe condition evaluator and v1-v4 save compatibility).');
