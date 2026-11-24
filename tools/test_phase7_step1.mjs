import assert from 'node:assert/strict';
import { EidolonManager } from '../js/systems/EidolonManager.js';
import { QuestManager, QUEST_STATUS } from '../js/systems/QuestManager.js';
import { QUEST_DEFINITIONS } from '../js/data/quests.js';

const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
};

// Existing Eidolon persistence now owns story flags and quest snapshots too.
const eidolons = new EidolonManager();
const buildQuestManager = owner => new QuestManager({
  storyFlags: owner.storyFlags,
  inventory: owner.inventory,
  savedState: owner.questState,
  onChange: state => { owner.questState = state; owner.save(); },
});
const quests = buildQuestManager(eidolons);

assert.equal(QUEST_DEFINITIONS.length, 5, 'initial quest data should stay intentionally small');
assert.equal(quests.definitions.size, 5);
assert.equal(quests.getStatus('qst_ashenveil_arrival'), QUEST_STATUS.AVAILABLE);
assert.equal(quests.getStatus('qst_whispers_in_ash'), QUEST_STATUS.LOCKED);
assert.equal(quests.getQuest('qst_ashenveil_arrival').objectives.length, 2);
assert.deepEqual(quests.getQuest('qst_ashenveil_arrival').rewards.items, []);

// Lookup, immutable reference definitions and duplicate registration guard.
const arrival = quests.getQuest('qst_ashenveil_arrival');
assert.equal(arrival.id, 'qst_ashenveil_arrival');
assert.equal(Object.isFrozen(arrival), true);
assert.equal(quests.registerQuest(arrival), false, 'duplicate quest id must be rejected');
assert.equal(quests.registerQuest({ id: 'bad quest', title: 'Invalid', objectives: [], rewards: {} }), false);
assert.equal(quests.getQuest('does_not_exist'), null);

// Accept once; repeated calls must not reset timestamps or state.
const accepted = quests.acceptQuest(arrival.id, { acceptedAt: '2026-11-24T00:00:00.000Z' });
assert.equal(accepted.ok, true);
assert.equal(quests.getStatus(arrival.id), QUEST_STATUS.ACTIVE);
assert.equal(quests.acceptQuest(arrival.id).ok, false);
assert.equal(quests.acceptQuest(arrival.id).reason, 'ALREADY_ACTIVE');

// Prerequisites combine completed quest IDs and story flags.
assert.equal(quests.canAccept('qst_whispers_in_ash'), false);
eidolons.storyFlags.set('met_village_guide', true);
assert.equal(quests.getStatus('qst_whispers_in_ash'), QUEST_STATUS.LOCKED, 'quest prerequisite must still be incomplete');
assert.equal(quests.completeQuest(arrival.id).ok, true);
assert.equal(quests.getStatus('qst_whispers_in_ash'), QUEST_STATUS.AVAILABLE);
assert.equal(quests.getStatus('qst_forest_traces'), QUEST_STATUS.AVAILABLE);
assert.equal(quests.acceptQuest('qst_whispers_in_ash').ok, true);
assert.equal(quests.failQuest('qst_whispers_in_ash').ok, true);
assert.equal(quests.acceptQuest('qst_whispers_in_ash').reason, 'QUEST_TERMINAL');

// Unknown quest / invalid lifecycle transitions are safe.
assert.equal(quests.acceptQuest('missing').reason, 'UNKNOWN_QUEST');
assert.equal(quests.completeQuest('qst_forest_traces').reason, 'QUEST_NOT_ACTIVE');
assert.equal(quests.failQuest('missing').reason, 'UNKNOWN_QUEST');

// QuestManager shares the pre-existing inventory object; it does not create another inventory.
assert.equal(quests.inventory, eidolons.inventory);
assert.equal(quests.inventory.potion, eidolons.inventory.potion);

// Save/reload: story flags and quest statuses persist through existing save adapter.
eidolons.save();
const envelope = JSON.parse(store.get('eclipsia.phase4'));
assert.equal(envelope.version, 7);
assert.equal(envelope.data.storyFlags.met_village_guide, true);
assert.equal(envelope.data.quests.quests[arrival.id].status, QUEST_STATUS.COMPLETED);
assert.equal(envelope.data.quests.quests['qst_whispers_in_ash'].status, QUEST_STATUS.FAILED);

const reloadedEidolons = new EidolonManager();
const reloadedQuests = buildQuestManager(reloadedEidolons);
assert.equal(reloadedEidolons.storyFlags.has('met_village_guide'), true);
assert.equal(reloadedQuests.getStatus(arrival.id), QUEST_STATUS.COMPLETED);
assert.equal(reloadedQuests.getStatus('qst_whispers_in_ash'), QUEST_STATUS.FAILED);
assert.equal(reloadedQuests.getStatus('qst_forest_traces'), QUEST_STATUS.AVAILABLE);

// Legacy v1 and v2 save envelopes remain readable and are upgraded on next save.
for (const version of [1, 2, 3]) {
  store.set('eclipsia.phase4', JSON.stringify({ version, data: { instances: [], party: [], storage: [], inventory: {}, discovered: [] } }));
  const legacy = new EidolonManager();
  assert.ok(legacy.storyFlags);
  assert.deepEqual(legacy.storyFlags.toJSON(), {});
  assert.ok(legacy.questState);
  assert.equal(JSON.parse(store.get('eclipsia.phase4')).version, 7);
}

quests.destroy();
reloadedQuests.destroy();
console.log('Phase 7 Step 1 tests passed (quest schema, immutable registry, lookup, duplicate guard, status lifecycle, prerequisites, accept-once, StoryFlag integration, shared legacy inventory, save v7 persistence, and v1-v3 migration (v7 write)).');
