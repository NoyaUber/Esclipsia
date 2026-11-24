const TYPES = Object.freeze({
  DOOR: ['LOCKED','CLOSED','OPEN'], CHEST: ['CLOSED','OPENED','CLAIMED'],
  MECHANISM: ['INACTIVE','ACTIVE'], NPC: ['DEFAULT','QUEST_AVAILABLE','QUEST_ACTIVE','QUEST_COMPLETED','CUSTOM'],
  LOCATION: ['UNDISCOVERED','DISCOVERED'],
});
const clone = value => JSON.parse(JSON.stringify(value));

/** Safe declarative condition evaluator. Unknown operators and malformed conditions fail closed. */
export function evaluateWorldCondition(condition, context = {}) {
  if (condition == null) return true;
  if (!condition || typeof condition !== 'object' || Array.isArray(condition)) return false;
  const keys = Object.keys(condition);
  if (keys.length !== 1) return false;
  const [operator] = keys, value = condition[operator];
  switch (operator) {
    case 'all': return Array.isArray(value) && value.every(c => evaluateWorldCondition(c, context));
    case 'any': return Array.isArray(value) && value.some(c => evaluateWorldCondition(c, context));
    case 'not': return !evaluateWorldCondition(value, context);
    case 'storyFlag': return typeof value === 'string' && context.storyFlags?.has?.(value) === true;
    case 'questStatus': return !!value && typeof value.id === 'string' && context.quests?.getStatus?.(value.id) === value.status;
    case 'itemOwned': return !!value && typeof value.id === 'string' && Number(context.inventory?.[value.id] ?? 0) >= Number(value.amount ?? 1);
    case 'objectState': return !!value && context.world?.getState?.(value.id) === value.state;
    case 'event': return !!value && !!context.event && context.event.type === value.type && (value.targetId == null || context.event.targetId === value.targetId);
    default: return false;
  }
}

export class WorldStateManager {
  constructor({ definitions = [], eventRules = [], savedState = null, storyFlags = null, quests = null, inventory = null, events = null, onChange = null } = {}) {
    this.definitions = new Map(); this.states = new Map(); this.appliedEvents = new Set(); this.listeners = new Set();
    this.eventRules = eventRules; this.storyFlags = storyFlags; this.quests = quests; this.inventory = inventory; this.events = events;
    this.onChange = typeof onChange === 'function' ? onChange : null; this._applyingRules = false;
    for (const definition of definitions) this.registerObject(definition);
    this.restore(savedState);
    this._offQuest = quests?.subscribe?.(change => this._evaluateRules(`quest:${change.questId}:${change.type}`)) ?? null;
    this._offFlags = storyFlags?.subscribe?.((flag, value) => { this._evaluateTransitions(); this._evaluateRules(`flag:${flag}:${value}`); }) ?? null;
    this._offEvents = events?.on?.('WORLD_INTERACTION', event => this.handleInteraction(event)) ?? null;
    this._offLocation = events?.on?.('LOCATION_VISITED', event => { if (this.getObject(event.targetId)?.type === 'LOCATION') this.setState(event.targetId, 'DISCOVERED', { eventId: event.eventId }); this._evaluateRules(event.eventId, event); }) ?? null;
    this._offGameplay = ['EIDOLON_DEFEATED','OBJECT_FOUND','MECHANISM_ACTIVATED','DUNGEON_COMPLETED','ITEM_ACQUIRED'].map(type => events?.on?.(type, event => this._evaluateRules(event.eventId, event)) ?? (() => {}));
    this._evaluateTransitions();
    this._evaluateRules('world:restore');
  }
  registerObject(definition) {
    if (!definition || typeof definition.id !== 'string' || !definition.id.trim() || this.definitions.has(definition.id)) return false;
    const validStates = TYPES[definition.type];
    if (!validStates || !Array.isArray(definition.states) || !definition.states.every(s => validStates.includes(s)) || !definition.states.includes(definition.initialState)) return false;
    const frozen = Object.freeze(clone(definition)); this.definitions.set(frozen.id, frozen); this.states.set(frozen.id, frozen.initialState); return true;
  }
  getObject(id) { return this.definitions.get(String(id)) ?? null; }
  getState(id) { return this.states.get(String(id)) ?? null; }
  getObjectData(id) { const def = this.getObject(id); return def ? { ...clone(def), state: this.getState(id) } : null; }
  getDialogue(id, fallback = []) {
    const def = this.getObject(id); if (!def) return fallback;
    const state = this.getState(id);
    const variants = def.dialogueVariants ?? [];
    const match = variants.find(entry => evaluateWorldCondition(entry.when, this._context()));
    return (match?.lines ?? def.dialogue?.[state] ?? fallback).slice();
  }
  setState(id, state, { eventId = null, silent = false } = {}) {
    const def = this.getObject(id); if (!def || !def.states.includes(state)) return { ok: false, reason: 'INVALID_OBJECT_OR_STATE' };
    if (eventId && this.appliedEvents.has(eventId)) return { ok: false, reason: 'DUPLICATE_EVENT' };
    const previous = this.getState(id); if (previous === state) {
      if (eventId && !this.appliedEvents.has(eventId)) { this.appliedEvents.add(eventId); if (!this._changed({ type: 'object_event', objectId: id, state, eventId })) { this.appliedEvents.delete(eventId); return { ok: false, reason: 'SAVE_FAILED' }; } }
      return { ok: true, changed: false };
    }
    this.states.set(id, state); if (eventId) this.appliedEvents.add(eventId);
    if (!silent && !this._changed({ type: 'object_state', objectId: id, previous, state, eventId })) { this.states.set(id, previous); if (eventId) this.appliedEvents.delete(eventId); return { ok: false, reason: 'SAVE_FAILED' }; }
    return { ok: true, changed: true, previous, state };
  }
  canInteract(id, condition = null) { return !!this.getObject(id) && evaluateWorldCondition(condition, this._context()); }
  handleInteraction(event) {
    if (!event || typeof event.targetId !== 'string') return { ok: false, reason: 'INVALID_EVENT' };
    const def = this.getObject(event.targetId); if (!def) return { ok: false, reason: 'UNKNOWN_OBJECT' };
    const eventId = event.eventId ?? null;
    if (eventId && this.appliedEvents.has(eventId)) return { ok: false, reason: 'DUPLICATE_EVENT' };
    if (def.type === 'CHEST') {
      if (this.getState(def.id) === 'CLAIMED') return { ok: false, reason: 'ALREADY_CLAIMED' };
      if (this.getState(def.id) === 'CLOSED') {
        const opened = this.setState(def.id, 'OPENED', { eventId });
        if (!opened.ok) return opened;
      } else if (eventId) { this.appliedEvents.add(eventId); if (!this._changed({ type: 'interaction', objectId: def.id, eventId })) { this.appliedEvents.delete(eventId); return { ok: false, reason: 'SAVE_FAILED' }; } }
      this._evaluateRules(eventId, event);
      return { ok: true, state: this.getState(def.id) };
    }
    if (def.type === 'MECHANISM') return this.setState(def.id, 'ACTIVE', { eventId });
    if (def.type === 'LOCATION') return this.setState(def.id, 'DISCOVERED', { eventId });
    if (eventId) {
      this.appliedEvents.add(eventId);
      if (!this._changed({ type: 'interaction', objectId: def.id, eventId })) { this.appliedEvents.delete(eventId); return { ok: false, reason: 'SAVE_FAILED' }; }
    }
    this._evaluateRules(eventId, event);
    return { ok: true, state: this.getState(def.id) };
  }
  claimChest(id, { eventId = null, grant = null, rollback = null } = {}) {
    const def = this.getObject(id); if (!def || def.type !== 'CHEST') return { ok: false, reason: 'NOT_A_CHEST' };
    if (this.getState(id) !== 'OPENED') return { ok: false, reason: this.getState(id) === 'CLAIMED' ? 'ALREADY_CLAIMED' : 'CHEST_NOT_OPEN' };
    if (eventId && this.appliedEvents.has(eventId)) return { ok: false, reason: 'DUPLICATE_EVENT' };
    // Grant first; only mark CLAIMED after a successful grant callback.
    if (typeof grant === 'function' && grant() !== true) return { ok: false, reason: 'REWARD_DELIVERY_FAILED' };
    const result = this.setState(id, 'CLAIMED', { eventId });
    if (!result.ok && typeof rollback === 'function') { try { rollback(); } catch {} }
    return result;
  }
  refresh() { const changed = this._evaluateTransitions(); this._evaluateRules('manual:refresh'); return changed; }
  toJSON() { return { version: 1, states: Object.fromEntries(this.states), appliedEvents: [...this.appliedEvents].slice(-1000) }; }
  restore(saved) {
    if (!saved || typeof saved !== 'object') return;
    const states = saved.states && typeof saved.states === 'object' ? saved.states : {};
    for (const [id, state] of Object.entries(states)) { const def = this.getObject(id); if (def?.states.includes(state)) this.states.set(id, state); }
    this.appliedEvents = new Set(Array.isArray(saved.appliedEvents) ? saved.appliedEvents.filter(x => typeof x === 'string').slice(-1000) : []);
  }
  destroy() { this._offQuest?.(); this._offFlags?.(); this._offEvents?.(); this._offLocation?.(); for (const off of this._offGameplay ?? []) off(); this.listeners.clear(); }
  subscribe(listener) { if (typeof listener !== 'function') return () => {}; this.listeners.add(listener); return () => this.listeners.delete(listener); }
  _context() { return { storyFlags: this.storyFlags, quests: this.quests, inventory: this.inventory, world: this }; }
  _evaluateTransitions({ silent = false } = {}) {
    let changed = false;
    for (const [id, def] of this.definitions) for (const transition of def.transitions ?? []) {
      if (this.getState(id) !== transition.from && transition.from != null) continue;
      if (this.getState(id) === transition.to) continue;
      if (evaluateWorldCondition(transition.when, this._context())) { this.setState(id, transition.to, { silent }); changed = true; break; }
    }
    return changed;
  }
  _evaluateRules(trigger, event = null) {
    if (this._applyingRules) return;
    this._applyingRules = true;
    try {
      for (const rule of this.eventRules) {
        if (this.appliedEvents.has(`rule:${rule.id}`) || !evaluateWorldCondition(rule.when, { ...this._context(), event })) continue;
        // Mark before executing so synchronous notifications cannot re-enter the same rule.
        const priorStates = new Map(this.states);
        const priorFlags = new Map((rule.actions ?? []).filter(a => a.type === 'SET_STORY_FLAG').map(a => [a.flag, this.storyFlags?.get?.(a.flag) ?? false]));
        this.appliedEvents.add(`rule:${rule.id}`);
        for (const action of rule.actions ?? []) {
          if (action.type === 'SET_STORY_FLAG') this.storyFlags?.set?.(action.flag, action.value === true);
          else if (action.type === 'SET_OBJECT_STATE') this.setState(action.objectId, action.state, { silent: true });
        }
        if (!this._changed({ type: 'world_event', eventId: rule.id, trigger })) {
          this.states = priorStates;
          this.appliedEvents.delete(`rule:${rule.id}`);
          for (const [flag, value] of priorFlags) this.storyFlags?.set?.(flag, value);
        }
      }
    } finally { this._applyingRules = false; }
  }
  _changed(change) {
    const snapshot = this.toJSON(); let persisted = true;
    try { if (this.onChange?.(snapshot) === false) persisted = false; } catch { persisted = false; }
    for (const listener of this.listeners) { try { listener({ ...change, snapshot }); } catch (error) { console.warn('World state listener failed:', error); } }
    if (persisted) this.events?.emit?.('WORLD_STATE_CHANGED', change);
    return persisted;
  }
}
