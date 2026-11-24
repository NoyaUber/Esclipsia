export const OBJECTIVE_TYPES = Object.freeze(['TALK_TO_NPC','VISIT_LOCATION','DEFEAT_EIDOLON','COLLECT_ITEM','FIND_OBJECT','COMPLETE_DUNGEON','ACTIVATE_MECHANISM']);
const EVENT_TO_OBJECTIVE = Object.freeze({
  NPC_TALKED: 'TALK_TO_NPC', LOCATION_VISITED: 'VISIT_LOCATION', EIDOLON_DEFEATED: 'DEFEAT_EIDOLON',
  ITEM_ACQUIRED: 'COLLECT_ITEM', OBJECT_FOUND: 'FIND_OBJECT', DUNGEON_COMPLETED: 'COMPLETE_DUNGEON', MECHANISM_ACTIVATED: 'ACTIVATE_MECHANISM',
});

/** Event-driven tracker. COLLECT_ITEM counts positive acquisition deltas, never inventory totals. */
export class QuestObjectiveTracker {
  constructor({ questManager, events, maxEventHistory = 500 } = {}) {
    this.quests = questManager; this.events = events; this.maxEventHistory = maxEventHistory;
    this.unsubscribers = Object.keys(EVENT_TO_OBJECTIVE).map(type => events?.on?.(type, event => this.processEvent(event)) ?? (() => {}));
  }
  processEvent(event) {
    if (!event || EVENT_TO_OBJECTIVE[event.type] == null || typeof event.targetId !== 'string') return { ok: false, reason: 'INVALID_EVENT' };
    const amount = Math.floor(Number(event.amount ?? 1));
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: 'INVALID_AMOUNT' };
    let updated = 0;
    for (const { quest } of this.quests.list({ status: 'ACTIVE' })) {
      const state = this.quests.states.get(quest.id);
      const eventId = String(event.eventId ?? '');
      if (eventId && state.processedEventIds.includes(eventId)) continue;
      const objectives = quest.objectives ?? [];
      const activeSequence = objectives.filter(o => !o.optional && !state.objectiveProgress[o.id]?.completed).reduce((min, o) => o.sequence == null ? min : Math.min(min, Number(o.sequence)), Infinity);
      let questChanged = false;
      for (const objective of objectives) {
        if (objective.type !== EVENT_TO_OBJECTIVE[event.type] || objective.targetId !== event.targetId) continue;
        if (objective.sequence != null && Number(objective.sequence) !== activeSequence) continue;
        const previous = state.objectiveProgress[objective.id] ?? { currentAmount: 0, completed: false };
        if (previous.completed) continue;
        const required = Math.max(1, Math.floor(Number(objective.requiredAmount ?? objective.required) || 1));
        const currentAmount = Math.min(required, previous.currentAmount + amount);
        state.objectiveProgress[objective.id] = { currentAmount, completed: currentAmount >= required };
        questChanged = true;
      }
      if (eventId) {
        state.processedEventIds.push(eventId);
        if (state.processedEventIds.length > this.maxEventHistory) state.processedEventIds.splice(0, state.processedEventIds.length - this.maxEventHistory);
      }
      if (questChanged || eventId) { this.quests._changed('objective_progress', quest.id); updated += questChanged ? 1 : 0; }
      const requiredObjectives = objectives.filter(o => !o.optional);
      if (requiredObjectives.length && requiredObjectives.every(o => state.objectiveProgress[o.id]?.completed)) this.quests.completeQuest(quest.id);
    }
    return { ok: true, updated };
  }
  getProgress(questId) {
    const quest = this.quests.getQuest(questId); const state = this.quests.states.get(questId);
    if (!quest || !state) return null;
    return quest.objectives.map(o => ({ ...o, currentAmount: state.objectiveProgress[o.id]?.currentAmount ?? 0, completed: state.objectiveProgress[o.id]?.completed === true }));
  }
  destroy() { for (const off of this.unsubscribers) off(); this.unsubscribers.length = 0; }
}
