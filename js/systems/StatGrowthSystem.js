import { PROGRESSION_CONFIG } from '../data/progressionConfig.js';
const KEYS = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
export class StatGrowthSystem {
  constructor(config = PROGRESSION_CONFIG) { this.config = config; }
  calculate(species, level = 1) {
    if (!species) throw new Error('Cannot calculate stats without species data.');
    const lv = Math.max(1, Math.min(this.config.maxLevel, Math.floor(Number(level) || 1)));
    const growth = species.growth ?? {};
    const rate = Math.max(.1, Number(species.growthRate ?? this.config.defaultGrowthRate) || 1);
    const base = {
      hp: species.baseHP,
      attack: species.baseAttack,
      defense: species.baseDefense,
      specialAttack: species.baseSpecialAttack ?? species.baseAttack,
      specialDefense: species.baseSpecialDefense ?? species.baseDefense,
      speed: species.baseSpeed,
    };
    const result = {};
    for (const key of KEYS) {
      const g = growth[key] ?? {};
      const flat = Number(g.flat ?? (key === 'hp' ? 2 : 1));
      const slope = Number(g.rate ?? (key === 'hp' ? 1.8 : .55));
      const value = Math.floor(Number(base[key] ?? 1) + (flat + slope * (lv - 1)) * rate);
      result[key] = Math.max(1, Number.isFinite(value) ? value : 1);
    }
    return Object.freeze(result);
  }
  recalculate(instance, species, { hpPolicy = 'ratio', previousMaxHP = null } = {}) {
    const oldMax = Math.max(1, Number(previousMaxHP ?? instance.maxHP ?? this.calculate(species, instance.level).hp));
    const oldHP = Math.max(0, Number(instance.currentHP ?? oldMax));
    const oldRatio = Math.max(0, Math.min(1, oldHP / oldMax));
    const stats = this.calculate(species, instance.level);
    const newHP = hpPolicy === 'full' ? stats.hp : Math.floor(stats.hp * oldRatio);
    instance.currentHP = Math.max(oldHP > 0 ? 1 : 0, Math.min(stats.hp, newHP));
    instance.maxHP = stats.hp;
    instance.stats = { ...stats };
    return stats;
  }
}
export const STAT_KEYS = Object.freeze([...KEYS]);
