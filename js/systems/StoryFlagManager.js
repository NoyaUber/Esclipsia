/** Persistent boolean story flags shared by dialogue, quests and evolution prerequisites. */
export class StoryFlagManager {
  constructor(initial = {}, { onChange = null } = {}) {
    this.flags = new Map();
    this.listeners = new Set();
    this.onChange = typeof onChange === 'function' ? onChange : null;
    const entries = initial instanceof Map ? [...initial] : Object.entries(initial && typeof initial === 'object' ? initial : {});
    for (const [key, value] of entries) {
      if (typeof key === 'string' && key.trim() && typeof value === 'boolean') this.flags.set(key, value);
    }
  }

  has(flag) { return this.flags.get(String(flag)) === true; }
  get(flag) { return this.flags.get(String(flag)) ?? false; }

  set(flag, value = true) {
    const key = String(flag ?? '').trim();
    if (!key || typeof value !== 'boolean') return false;
    if (this.flags.get(key) === value) return false;
    this.flags.set(key, value);
    this._changed(key, value);
    return true;
  }

  clear(flag) { return this.set(flag, false); }
  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  toJSON() { return Object.fromEntries([...this.flags.entries()].sort(([a], [b]) => a.localeCompare(b))); }

  _changed(key, value) {
    this.onChange?.(key, value);
    for (const listener of this.listeners) listener(key, value);
  }
}
