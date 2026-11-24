import assert from 'node:assert/strict';
import { EidolonManager } from '../js/systems/EidolonManager.js';
import { QuestManager, QUEST_STATUS } from '../js/systems/QuestManager.js';
import { QuestObjectiveTracker, OBJECTIVE_TYPES } from '../js/systems/QuestObjectiveTracker.js';
import { QuestRewardManager } from '../js/systems/QuestRewardManager.js';
import { GameEventBus } from '../js/systems/GameEventBus.js';
import { QUEST_DEFINITIONS } from '../js/data/quests.js';
import { BattleResultManager } from '../js/battle/BattleResultManager.js';
import { ExperienceManager } from '../js/systems/ExperienceManager.js';

const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
};
const owner = new EidolonManager();
const events = new GameEventBus(); owner.events = events;
const quests = new QuestManager({ storyFlags: owner.storyFlags, inventory: owner.inventory, savedState: owner.questState, onChange: state => { owner.questState = state; return owner.save(); } });
const tracker = new QuestObjectiveTracker({ questManager: quests, events });
const rewards = new QuestRewardManager({ questManager: quests, eidolons: owner });

// All seven objective types update from typed events, with exact target validation.
const types = OBJECTIVE_TYPES.map((type, i) => ({ id: `obj_${i}`, type, targetId: `target_${i}`, requiredAmount: i === 3 ? 3 : 1, description: type }));
const allTypesQuest = { id: 'test_all_types', title: 'All Objective Types', objectives: types, rewards: { items: [] } };
assert.equal(quests.registerQuest(allTypesQuest), true);
assert.equal(quests.registerQuest({ id: 'invalid_objective', title: 'Invalid', objectives: [{ id: 'x', type: 'NOT_A_TYPE', targetId: 'x', requiredAmount: 1 }], rewards: {} }), false, 'unknown objective types are rejected');
assert.equal(quests.acceptQuest(allTypesQuest.id).ok, true);
const eventNames = ['NPC_TALKED','LOCATION_VISITED','EIDOLON_DEFEATED','ITEM_ACQUIRED','OBJECT_FOUND','DUNGEON_COMPLETED','MECHANISM_ACTIVATED'];
for (let i = 0; i < eventNames.length; i++) {
  if (i === 3) events.emit(eventNames[i], { targetId: `target_${i}`, amount: 2, eventId: 'herb-batch-1' });
  events.emit(eventNames[i], { targetId: `target_${i}`, eventId: `event-${i}` });
}
assert.equal(tracker.getProgress(allTypesQuest.id)[3].currentAmount, 3, 'collect objective counts acquisition deltas and caps at required amount');
assert.equal(quests.getStatus(allTypesQuest.id), QUEST_STATUS.COMPLETED);

// Optional objectives do not block completion; sequential groups unlock in order.
const flowQuest = { id: 'test_flow', title: 'Objective Flow', objectives: [
  { id: 'first', type: 'TALK_TO_NPC', targetId: 'a', requiredAmount: 1, sequence: 1 },
  { id: 'optional', type: 'FIND_OBJECT', targetId: 'bonus', requiredAmount: 1, optional: true },
  { id: 'second', type: 'VISIT_LOCATION', targetId: 'b', requiredAmount: 1, sequence: 2 },
], rewards: { items: [] } };
assert.equal(quests.registerQuest(flowQuest), true); quests.acceptQuest(flowQuest.id);
events.emit('LOCATION_VISITED', { targetId: 'b', eventId: 'too-early' });
assert.equal(tracker.getProgress(flowQuest.id)[2].completed, false);
events.emit('OBJECT_FOUND', { targetId: 'bonus', eventId: 'bonus-1' });
assert.equal(tracker.getProgress(flowQuest.id)[1].completed, true);
events.emit('NPC_TALKED', { targetId: 'a', eventId: 'first-1' });
events.emit('LOCATION_VISITED', { targetId: 'b', eventId: 'second-1' });
assert.equal(quests.getStatus(flowQuest.id), QUEST_STATUS.COMPLETED, 'optional objective must not block completion');

// BattleResultManager is the live defeat-event adapter and supplies stable enemy identity.
const battleSourceQuest = { id: 'test_battle_source', title: 'Battle Source', objectives: [{ id: 'defeat_source', type: 'DEFEAT_EIDOLON', targetId: 'source_eidolon', requiredAmount: 1 }], rewards: { items: [] } };
assert.equal(quests.registerQuest(battleSourceQuest), true); quests.acceptQuest(battleSourceQuest.id);
const battleResults = new BattleResultManager({ expBase: 0, expLevelFactor: 0, expRewardMultiplier: 1, victoryRewards: {} }, new ExperienceManager(), events);
battleResults.award(owner, [], { level: 1, speciesId: 'source_eidolon', instanceId: 'source-enemy' });
assert.equal(quests.getStatus(battleSourceQuest.id), QUEST_STATUS.COMPLETED, 'battle victory source emits matching defeated species ID');

// MAIN QUEST objective flow and duplicate-event protection.
const mainId = 'qst_echoes_beneath_ash';
assert.equal(quests.acceptQuest(mainId).ok, true);
events.emit('NPC_TALKED', { targetId: 'edrick', eventId: 'talk-edrick' });
events.emit('NPC_TALKED', { targetId: 'edrick', eventId: 'talk-edrick' });
assert.equal(tracker.getProgress(mainId)[0].currentAmount, 1, 'same eventId is processed once');
events.emit('LOCATION_VISITED', { targetId: 'ashenveil_forest', eventId: 'visit-forest' });
events.emit('OBJECT_FOUND', { targetId: 'ancient_altar', eventId: 'find-altar' });
events.emit('EIDOLON_DEFEATED', { targetId: 'guardian_eidolon', eventId: 'defeat-guardian' });
assert.equal(quests.getStatus(mainId), QUEST_STATUS.COMPLETED);

// Reward transaction: 100 shards, 150 EXP per party Eidolon, two Healing Potions.
const starter = owner.create('emberling', 3); assert.equal(owner.addOwned(starter), true);
const potionBefore = owner.inventory.potion;
const claimed = rewards.claim(mainId);
assert.equal(claimed.ok, true);
assert.equal(owner.aetherShards, 100);
assert.equal(owner.inventory.potion, potionBefore + 2);
assert.equal(claimed.progression.totalExp, 150); assert.ok(owner.instances.get(starter.instanceId).level > 3, 'existing ExperienceManager applies reward EXP and level-ups');
assert.equal(rewards.claim(mainId).reason, 'ALREADY_CLAIMED');
assert.equal(owner.aetherShards, 100, 'duplicate claim cannot duplicate currency');

// Every requested inventory reward family maps to an existing persisted inventory key.
const catalogQuest = { id: 'test_catalog_rewards', title: 'Catalog Rewards', objectives: [], rewards: { items: [
  { id: 'soul_sigil', amount: 1 }, { id: 'evolution_stone', amount: 1 },
  { id: 'monster_essence', amount: 2 }, { id: 'ancient_relic', amount: 1 },
] } };
assert.equal(quests.registerQuest(catalogQuest), true); quests.acceptQuest(catalogQuest.id); quests.completeQuest(catalogQuest.id);
const catalogClaim = rewards.claim(catalogQuest.id); assert.equal(catalogClaim.ok, true);
assert.equal(owner.inventory.basic, 6); assert.equal(owner.inventory.shadowCrystal, 2);
assert.equal(owner.inventory.monsterEssence, 2); assert.equal(owner.inventory.ancientRelic, 1);

// Side quest collect semantics: only explicit positive acquisition events count, not load/snapshot.
const sideId = 'qst_a_healers_request'; assert.equal(quests.acceptQuest(sideId).ok, true);
events.emit('ITEM_ACQUIRED', { targetId: 'herb', amount: 2, eventId: 'herb-drop-1' });
assert.equal(tracker.getProgress(sideId)[0].currentAmount, 2);
events.emit('ITEM_ACQUIRED', { targetId: 'herb', amount: 2, eventId: 'herb-drop-1' });
assert.equal(tracker.getProgress(sideId)[0].currentAmount, 2);
events.emit('ITEM_ACQUIRED', { targetId: 'herb', amount: 1, eventId: 'herb-drop-2' });
events.emit('NPC_TALKED', { targetId: 'seren', eventId: 'talk-seren' });
assert.equal(quests.getStatus(sideId), QUEST_STATUS.COMPLETED);
assert.equal(rewards.claim(sideId).ok, true);
assert.equal(owner.aetherShards, 150);
assert.equal(owner.inventory.potion, potionBefore + 3);

// Inventory acquisition action tokens are idempotent and persisted.
const herbBefore = owner.inventory.herb;
assert.equal(owner.addInventoryItem('herb', 2, { eventId: 'inventory-token-1' }), true);
assert.equal(owner.addInventoryItem('herb', 2, { eventId: 'inventory-token-1' }), false);
assert.equal(owner.inventory.herb, herbBefore + 2);

// An unfinished objective and its duplicate-event ledger survive save/load.
const partialQuest = { id: 'test_partial_save', title: 'Partial Save', objectives: [{ id: 'partial_herb', type: 'COLLECT_ITEM', targetId: 'herb', requiredAmount: 3 }], rewards: { items: [] } };
assert.equal(quests.registerQuest(partialQuest), true); quests.acceptQuest(partialQuest.id);
events.emit('ITEM_ACQUIRED', { targetId: 'herb', amount: 2, eventId: 'partial-herb-token' });

// Progress, processed IDs, claim status, items and currency survive save/load.
const beforeReload = tracker.getProgress(mainId);
const saved = JSON.parse(store.get('eclipsia.phase4'));
assert.equal(saved.version, 7);
assert.equal(saved.data.aetherShards, 150);
const reloaded = new EidolonManager();
assert.equal(reloaded.aetherShards, 150);
assert.equal(reloaded.inventory.potion, potionBefore + 3);
assert.equal(reloaded.inventory.herb, herbBefore + 2);
assert.equal(reloaded.addInventoryItem('herb', 2, { eventId: 'inventory-token-1' }), false, 'inventory acquisition idempotency survives reload');
const reloadedEvents = new GameEventBus();
const reloadedQuests = new QuestManager({ definitions: [...QUEST_DEFINITIONS, partialQuest], storyFlags: reloaded.storyFlags, inventory: reloaded.inventory, savedState: reloaded.questState, onChange: state => { reloaded.questState = state; return reloaded.save(); } });
const reloadedTracker = new QuestObjectiveTracker({ questManager: reloadedQuests, events: reloadedEvents });
assert.deepEqual(reloadedTracker.getProgress(mainId).map(o => o.completed), beforeReload.map(o => o.completed));
assert.equal(reloadedQuests.getState(mainId).rewardClaimed, true);
assert.equal(reloadedTracker.getProgress(partialQuest.id)[0].currentAmount, 2);
reloadedEvents.emit('ITEM_ACQUIRED', { targetId: 'herb', amount: 2, eventId: 'partial-herb-token' });
assert.equal(reloadedTracker.getProgress(partialQuest.id)[0].currentAmount, 2, 'duplicate event token remains blocked after reload');
reloadedEvents.emit('ITEM_ACQUIRED', { targetId: 'herb', amount: 1, eventId: 'partial-herb-token-2' });
assert.equal(reloadedQuests.getStatus(partialQuest.id), QUEST_STATUS.COMPLETED);
assert.equal(new QuestRewardManager({ questManager: reloadedQuests, eidolons: reloaded }).claim(mainId).reason, 'ALREADY_CLAIMED');

// Completion state alone cannot bypass mandatory objective requirements for claiming.
const guardedDef = { id: 'test_guarded_reward', title: 'Guarded', objectives: [{ id: 'must_do', type: 'TALK_TO_NPC', targetId: 'someone', requiredAmount: 1 }], rewards: { aetherShards: 5 } };
assert.equal(reloadedQuests.registerQuest(guardedDef), true); reloadedQuests.acceptQuest(guardedDef.id); reloadedQuests.completeQuest(guardedDef.id);
assert.equal(new QuestRewardManager({ questManager: reloadedQuests, eidolons: reloaded }).claim(guardedDef.id).reason, 'OBJECTIVES_INCOMPLETE');

// Failed save rolls back rewards and leaves claim retryable.
const retryDef = { id: 'test_retry_reward', title: 'Retry', objectives: [], rewards: { aetherShards: 9, items: [{ id: 'healing_potion', amount: 1 }] } };
assert.equal(reloadedQuests.registerQuest(retryDef), true); reloadedQuests.acceptQuest(retryDef.id); reloadedQuests.completeQuest(retryDef.id);
const shardsBeforeFailure = reloaded.aetherShards, potionsBeforeFailure = reloaded.inventory.potion;
const realSave = reloaded.save.bind(reloaded); reloaded.save = () => false;
const failed = new QuestRewardManager({ questManager: reloadedQuests, eidolons: reloaded }).claim(retryDef.id);
assert.equal(failed.reason, 'SAVE_FAILED');
assert.equal(reloaded.aetherShards, shardsBeforeFailure);
assert.equal(reloaded.inventory.potion, potionsBeforeFailure);
assert.equal(reloadedQuests.getState(retryDef.id).rewardClaimed, false);
assert.equal(reloadedQuests.inventory, reloaded.inventory, 'rollback must preserve shared inventory reference');
reloaded.save = realSave;
assert.equal(new QuestRewardManager({ questManager: reloadedQuests, eidolons: reloaded }).claim(retryDef.id).ok, true);

// Legacy v1-v3 saves are readable and upgraded to v5 without losing player inventory.
for (const version of [1,2,3]) {
  store.set('eclipsia.phase4', JSON.stringify({ version, data: { inventory: { potion: 7 }, instances: [], party: [], storage: [], discovered: [] } }));
  const legacy = new EidolonManager();
  assert.equal(legacy.inventory.potion, 7);
  assert.equal(JSON.parse(store.get('eclipsia.phase4')).version, 7);
}

tracker.destroy(); reloadedTracker.destroy(); quests.destroy(); reloadedQuests.destroy();
console.log('Phase 7 Step 2 tests passed (7 objective types, target/type validation, capped progress, optional/sequential/multiple objectives, duplicate event IDs, quest completion, reward delivery/idempotency/rollback, save-load progress and v1-v3 migration).');
