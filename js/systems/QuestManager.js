import { QUEST_DEFINITIONS } from '../data/quests.js';
import { OBJECTIVE_TYPES } from './QuestObjectiveTracker.js';
const VALID_OBJECTIVE_TYPES = new Set(OBJECTIVE_TYPES);

export const QUEST_STATUS = Object.freeze({
  LOCKED: 'LOCKED',
  AVAILABLE: 'AVAILABLE',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
});
const VALID_STATUSES = new Set(Object.values(QUEST_STATUS));
const TERMINAL_STATUSES = new Set([QUEST_STATUS.COMPLETED, QUEST_STATUS.FAILED]);

function validDefinition(definition) {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) return false;
  if (typeof definition.id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/i.test(definition.id)) return false;
  if (typeof definition.title !== 'string' || !definition.title.trim()) return false;
  if (!Array.isArray(definition.objectives) || !definition.rewards || typeof definition.rewards !== 'object') return false;
  if (definition.objectives.some(o => !o || typeof o.id !== 'string' || !o.id.trim() || !VALID_OBJECTIVE_TYPES.has(o.type) || typeof o.targetId !== 'string' || !o.targetId.trim() || !Number.isSafeInteger(Number(o.requiredAmount ?? o.required ?? 1)) || Number(o.requiredAmount ?? o.required ?? 1) < 1 || (o.sequence != null && (!Number.isSafeInteger(Number(o.sequence)) || Number(o.sequence) < 0)))) return false;
  if (new Set(definition.objectives.map(o => o.id)).size !== definition.objectives.length) return false;
  const prerequisites = definition.prerequisites ?? {};
  return Array.isArray(prerequisites.questIds ?? []) && Array.isArray(prerequisites.storyFlags ?? []);
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

/** Quest registry and lifecycle service; objective and reward services attach through events. */
export class QuestManager {
  constructor({ definitions = QUEST_DEFINITIONS, storyFlags = null, inventory = null, savedState = null, onChange = null } = {}) {
    this.definitions = new Map();
    this.states = new Map();
    this.storyFlags = storyFlags;
    // Shared reference to the existing EidolonManager inventory; no second inventory is created.
    this.inventory = inventory;
    this.onChange = typeof onChange === 'function' ? onChange : null;
    this.listeners = new Set();

    for (const definition of definitions) this.registerQuest(definition, { silent: true });
    this._restore(savedState);
    this.refreshAvailability({ silent: true });
    this._unsubscribeFlags = this.storyFlags?.subscribe?.(() => this.refreshAvailability()) ?? null;
  }

  registerQuest(definition, { silent = false } = {}) {
    if (!validDefinition(definition) || this.definitions.has(definition.id)) return false;
    const frozen = deepFreeze(clone(definition));
    this.definitions.set(frozen.id, frozen);
    this.states.set(frozen.id, this._newState(QUEST_STATUS.LOCKED));
    if (!silent) {
      this.refreshAvailability({ silent: true });
      this._changed('registered', frozen.id);
    }
    return true;
  }

  getQuest(id) { return this.definitions.get(String(id)) ?? null; }
  getStatus(id) { return this.states.get(String(id))?.status ?? null; }
  getState(id) {
    const state = this.states.get(String(id));
    return state ? clone(state) : null;
  }

  list({ status = null } = {}) {
    return [...this.definitions.values()]
      .filter(quest => !status || this.getStatus(quest.id) === status)
      .map(quest => ({ quest, state: this.getState(quest.id) }));
  }

  canAccept(id) {
    const quest = this.getQuest(id);
    if (!quest || this.getStatus(id) !== QUEST_STATUS.AVAILABLE) return false;
    return this._prerequisitesMet(quest);
  }

  acceptQuest(id, { acceptedAt = new Date().toISOString() } = {}) {
    const quest = this.getQuest(id);
    if (!quest) return { ok: false, reason: 'UNKNOWN_QUEST' };
    const state = this.states.get(quest.id);
    if (state.status === QUEST_STATUS.ACTIVE) return { ok: false, reason: 'ALREADY_ACTIVE' };
    if (TERMINAL_STATUSES.has(state.status)) return { ok: false, reason: 'QUEST_TERMINAL' };
    if (!this._prerequisitesMet(quest)) {
      this.refreshAvailability({ silent: true });
      return { ok: false, reason: 'PREREQUISITES_NOT_MET' };
    }
    if (state.status !== QUEST_STATUS.AVAILABLE) return { ok: false, reason: 'QUEST_NOT_AVAILABLE' };
    this.states.set(quest.id, { ...state, status: QUEST_STATUS.ACTIVE, acceptedAt, updatedAt: acceptedAt });
    this._changed('accepted', quest.id);
    return { ok: true, quest, state: this.getState(quest.id) };
  }

  /** Lifecycle hooks for future objective/story systems; no objective/reward engine is invoked. */
  completeQuest(id, { completedAt = new Date().toISOString() } = {}) {
    return this._setTerminalStatus(id, QUEST_STATUS.COMPLETED, completedAt);
  }
  failQuest(id, { failedAt = new Date().toISOString() } = {}) {
    return this._setTerminalStatus(id, QUEST_STATUS.FAILED, failedAt);
  }

  refreshAvailability({ silent = false } = {}) {
    let changed = false;
    for (const quest of this.definitions.values()) {
      const state = this.states.get(quest.id);
      if (state.status === QUEST_STATUS.LOCKED && this._prerequisitesMet(quest)) {
        this.states.set(quest.id, { ...state, status: QUEST_STATUS.AVAILABLE, updatedAt: new Date().toISOString() });
        changed = true;
      }
    }
    if (changed && !silent) this._changed('availability', null);
    return changed;
  }

  toJSON() {
    return {
      version: 1,
      quests: Object.fromEntries([...this.states.entries()].map(([id, state]) => [id, clone(state)])),
    };
  }

  destroy() { this._unsubscribeFlags?.(); this.listeners.clear(); }
  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _newState(status) {
    return { status, acceptedAt: null, updatedAt: null, completedAt: null, failedAt: null, objectiveProgress: {}, processedEventIds: [], rewardClaimed: false, rewardDelivery: null };
  }

  _restore(savedState) {
    const source = savedState?.quests && typeof savedState.quests === 'object' ? savedState.quests : {};
    for (const id of this.definitions.keys()) {
      const saved = source[id];
      if (!saved || !VALID_STATUSES.has(saved.status)) continue;
      const state = this._newState(saved.status);
      for (const key of ['acceptedAt', 'updatedAt', 'completedAt', 'failedAt']) {
        state[key] = typeof saved[key] === 'string' ? saved[key] : null;
      }
      state.objectiveProgress = {};
      const progress = saved.objectiveProgress && typeof saved.objectiveProgress === 'object' && !Array.isArray(saved.objectiveProgress) ? saved.objectiveProgress : {};
      for (const objective of this.getQuest(id).objectives) {
        const entry = progress[objective.id]; if (!entry || typeof entry !== 'object') continue;
        const required = Math.max(1, Math.floor(Number(objective.requiredAmount ?? objective.required) || 1));
        const currentAmount = Math.max(0, Math.min(required, Math.floor(Number(entry.currentAmount) || 0)));
        state.objectiveProgress[objective.id] = { currentAmount, completed: currentAmount >= required };
      }
      state.rewardClaimed = saved.rewardClaimed === true;
      state.processedEventIds = Array.isArray(saved.processedEventIds) ? saved.processedEventIds.filter(x => typeof x === 'string').slice(-500) : [];
      state.rewardDelivery = saved.rewardDelivery && typeof saved.rewardDelivery === 'object' ? clone(saved.rewardDelivery) : null;
      // A save cannot mark a never-accepted quest active without an accepted timestamp.
      if (state.status === QUEST_STATUS.ACTIVE && !state.acceptedAt) state.status = QUEST_STATUS.LOCKED;
      this.states.set(id, state);
    }
  }

  _prerequisitesMet(quest) {
    const requirements = quest.prerequisites ?? {};
    const questsMet = (requirements.questIds ?? []).every(id => this.getStatus(id) === QUEST_STATUS.COMPLETED);
    const flagsMet = (requirements.storyFlags ?? []).every(flag => this.storyFlags?.has?.(flag) === true);
    return questsMet && flagsMet;
  }

  _setTerminalStatus(id, status, timestamp) {
    const quest = this.getQuest(id);
    if (!quest) return { ok: false, reason: 'UNKNOWN_QUEST' };
    const state = this.states.get(id);
    if (state.status !== QUEST_STATUS.ACTIVE) return { ok: false, reason: 'QUEST_NOT_ACTIVE' };
    this.states.set(id, { ...state, status, updatedAt: timestamp, [status === QUEST_STATUS.COMPLETED ? 'completedAt' : 'failedAt']: timestamp });
    this.refreshAvailability({ silent: true });
    this._changed(status.toLowerCase(), id);
    return { ok: true, quest, state: this.getState(id) };
  }

  _changed(type, questId) {
    const snapshot = this.toJSON();
    let persisted = true;
    try { if (this.onChange?.(snapshot) === false) persisted = false; } catch { persisted = false; }
    for (const listener of this.listeners) { try { listener({ type, questId, snapshot }); } catch (error) { console.warn('Quest listener failed:', error); } }
    return persisted;
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
