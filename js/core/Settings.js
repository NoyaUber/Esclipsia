/**
 * Persistent player settings (LocalStorage). Independent of save slots.
 */
const STORAGE_KEY = 'eclipsia.settings.v1';

const DEFAULTS = Object.freeze({
  soundEnabled: true,
  volume: 0.6,
  showFps: false,
  touchControls: 'auto', // 'auto' | 'on' | 'off'
  controlSize: 'large', // 'medium' | 'large' | 'xl'
});

const VALIDATORS = {
  soundEnabled: (v) => typeof v === 'boolean',
  volume: (v) => typeof v === 'number' && v >= 0 && v <= 1,
  showFps: (v) => typeof v === 'boolean',
  touchControls: (v) => ['auto', 'on', 'off'].includes(v),
  controlSize: (v) => ['medium', 'large', 'xl'].includes(v),
};

export class Settings {
  constructor() {
    this.values = { ...DEFAULTS };
    this.listeners = new Set();
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      for (const key of Object.keys(DEFAULTS)) {
        if (key in parsed && VALIDATORS[key](parsed[key])) this.values[key] = parsed[key];
      }
    } catch (err) {
      console.warn('Settings could not be loaded, using defaults.', err);
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch (err) {
      console.warn('Settings could not be saved.', err);
    }
  }

  get(key) { return this.values[key]; }

  set(key, value) {
    if (!(key in DEFAULTS) || !VALIDATORS[key](value)) {
      console.warn(`Rejected invalid setting ${key}=`, value);
      return;
    }
    this.values[key] = value;
    this.save();
    for (const fn of this.listeners) fn(key, value);
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
