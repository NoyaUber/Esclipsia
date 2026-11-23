/**
 * AudioManager — Web Audio based. Phase 1 uses synthesised placeholder SFX and an
 * ambient drone so no audio files are required. Audio is unlocked on first input
 * (browser autoplay policy).
 */
const SFX = Object.freeze({
  move: { type: 'square', freq: [520], dur: 0.04, vol: 0.05 },
  confirm: { type: 'triangle', freq: [440, 660], dur: 0.12, vol: 0.12 },
  cancel: { type: 'triangle', freq: [392, 262], dur: 0.12, vol: 0.1 },
  start: { type: 'sawtooth', freq: [196, 294, 392], dur: 0.6, vol: 0.06 },
  blocked: { type: 'square', freq: [140], dur: 0.08, vol: 0.05 },
});

export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.master = null;
    this.ambient = null;
    this.wantAmbient = false;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.applySettings();
      } catch (err) {
        console.warn('Audio unavailable:', err);
        this.ctx = null;
        return;
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (this.wantAmbient && !this.ambient) this._startAmbient();
  }

  applySettings() {
    if (!this.master) return;
    const v = this.settings.get('soundEnabled') ? this.settings.get('volume') : 0;
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  play(name) {
    const def = SFX[name];
    if (!def || !this.ctx || this.ctx.state !== 'running' || !this.settings.get('soundEnabled')) return;
    const t0 = this.ctx.currentTime;
    const step = def.dur / def.freq.length;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = def.type;
    def.freq.forEach((f, i) => osc.frequency.setValueAtTime(f, t0 + i * step));
    gain.gain.setValueAtTime(def.vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + def.dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + def.dur + 0.02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  playAmbient() {
    this.wantAmbient = true;
    if (this.ctx && !this.ambient) this._startAmbient();
  }

  stopAmbient() {
    this.wantAmbient = false;
    if (!this.ambient) return;
    const { nodes, gain } = this.ambient;
    const t = this.ctx.currentTime;
    gain.gain.setTargetAtTime(0, t, 0.3);
    nodes.forEach((n) => n.stop(t + 1.5));
    this.ambient = null;
  }

  _startAmbient() {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const nodes = [55, 82.4, 110.5].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 1 ? 'triangle' : 'sine';
      o.frequency.value = f;
      o.detune.value = i * 4 - 4;
      o.connect(filter);
      o.start();
      return o;
    });
    filter.connect(gain).connect(this.master);
    gain.gain.setTargetAtTime(0.05, ctx.currentTime, 1.2);
    this.ambient = { nodes, gain };
  }
}
