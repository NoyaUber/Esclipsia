/** Small synchronous event bus. Events are facts; producers supply stable eventId when retrying. */
export class GameEventBus {
  constructor() { this.listeners = new Map(); this.sequence = 0; }
  on(type, listener) {
    if (typeof type !== 'string' || typeof listener !== 'function') return () => {};
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }
  emit(type, payload = {}) {
    if (typeof type !== 'string' || !type) return null;
    const event = Object.freeze({ ...payload, type, eventId: payload.eventId ?? `evt-${Date.now().toString(36)}-${(++this.sequence).toString(36)}` });
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
    for (const listener of [...(this.listeners.get('*') ?? [])]) listener(event);
    return event;
  }
  clear() { this.listeners.clear(); }
}
