import { QUEST_REWARD_ITEMS } from '../data/questRewards.js';
import { ExperienceManager } from './ExperienceManager.js';

/** Synchronous, idempotent reward transaction against existing EidolonManager state/save. */
export class QuestRewardManager {
  constructor({ questManager, eidolons, experience = new ExperienceManager(), itemCatalog = QUEST_REWARD_ITEMS } = {}) {
    this.quests = questManager; this.eidolons = eidolons; this.experience = experience; this.itemCatalog = itemCatalog;
  }
  canClaim(questId) {
    const quest = this.quests.getQuest(questId), state = this.quests.states.get(questId);
    if (!quest || !state || state.status !== 'COMPLETED' || state.rewardClaimed === true || state.rewardDelivery?.status === 'PROCESSING') return false;
    return (quest.objectives ?? []).filter(objective => !objective.optional).every(objective => state.objectiveProgress[objective.id]?.completed === true);
  }
  claim(questId) {
    const quest = this.quests.getQuest(questId), state = this.quests.states.get(questId);
    if (!quest || !state) return { ok: false, reason: 'UNKNOWN_QUEST' };
    if (state.status !== 'COMPLETED') return { ok: false, reason: 'QUEST_NOT_COMPLETED' };
    const requiredObjectives = (quest.objectives ?? []).filter(objective => !objective.optional);
    if (requiredObjectives.some(objective => state.objectiveProgress[objective.id]?.completed !== true)) return { ok: false, reason: 'OBJECTIVES_INCOMPLETE' };
    if (state.rewardClaimed) return { ok: false, reason: 'ALREADY_CLAIMED' };
    if (state.rewardDelivery?.status === 'PROCESSING') return { ok: false, reason: 'CLAIM_IN_PROGRESS' };
    const rewards = quest.rewards ?? {}, shards = Number(rewards.aetherShards ?? 0), exp = Number(rewards.eidolonExp ?? 0);
    if (!Number.isSafeInteger(shards) || shards < 0 || !Number.isSafeInteger(exp) || exp < 0 || !Array.isArray(rewards.items ?? [])) return { ok: false, reason: 'INVALID_REWARD_DATA' };
    const items = [];
    for (const reward of rewards.items ?? []) {
      const amount = Number(reward.amount), definition = this.itemCatalog[reward.id];
      if (!definition || !Number.isSafeInteger(amount) || amount <= 0) return { ok: false, reason: 'INVALID_ITEM_REWARD', itemId: reward.id };
      items.push({ id: definition.id, amount });
    }
    const snapshot = {
      inventory: structuredCloneSafe(this.eidolons.inventory), aetherShards: this.eidolons.aetherShards,
      instances: [...this.eidolons.instances.entries()].map(([id, instance]) => [id, structuredCloneSafe(instance)]),
      rewardClaimed: state.rewardClaimed, rewardDelivery: state.rewardDelivery ?? null,
    };
    state.rewardDelivery = { status: 'PROCESSING', startedAt: new Date().toISOString() };
    try {
      this.eidolons.aetherShards += shards;
      for (const item of items) this.eidolons.inventory[item.id] = Math.max(0, Number(this.eidolons.inventory[item.id]) || 0) + item.amount;
      let progression = null;
      if (exp > 0) progression = this.experience.award(this.eidolons, this.eidolons.party.ids, exp, { share: 'party', mode: 'full', save: false });
      state.rewardClaimed = true;
      state.rewardDelivery = { status: 'CLAIMED', claimedAt: new Date().toISOString(), aetherShards: shards, eidolonExp: exp, items };
      const saved = this.quests._changed('reward_claimed', questId);
      if (saved === false) throw new Error('SAVE_FAILED');
      return { ok: true, aetherShards: shards, eidolonExp: exp, items, progression };
    } catch (error) {
      for (const key of Object.keys(this.eidolons.inventory)) delete this.eidolons.inventory[key];
      Object.assign(this.eidolons.inventory, snapshot.inventory);
      this.eidolons.aetherShards = snapshot.aetherShards;
      this.eidolons.instances = new Map(snapshot.instances);
      state.rewardClaimed = snapshot.rewardClaimed;
      state.rewardDelivery = snapshot.rewardDelivery;
      this.quests._changed('reward_failed', questId);
      return { ok: false, reason: error.message === 'SAVE_FAILED' ? 'SAVE_FAILED' : 'DELIVERY_FAILED', error: error.message };
    }
  }
}
function structuredCloneSafe(value) { return JSON.parse(JSON.stringify(value)); }
