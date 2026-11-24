import { getEidolonSpecies } from '../data/eidolons.js';
import { PROGRESSION_CONFIG } from '../data/progressionConfig.js';
import { StatGrowthSystem } from './StatGrowthSystem.js';
import { SkillLearningManager } from './SkillLearningManager.js';
export class LevelUpManager {
  constructor({ config = PROGRESSION_CONFIG, stats = new StatGrowthSystem(config), skills = new SkillLearningManager() } = {}) { this.config = config; this.stats = stats; this.skills = skills; }
  apply(instance, newLevel) {
    const previousLevel = instance.level;
    const species = getEidolonSpecies(instance.speciesId);
    if (!species || previousLevel >= this.config.maxLevel || newLevel <= previousLevel) return { levels: [], skills: [] };
    const levels = [], skillEvents = [];
    for (let level = previousLevel + 1; level <= Math.min(this.config.maxLevel, newLevel); level++) {
      const oldStats = this.stats.calculate(species, instance.level);
      const oldRatio = Math.max(0, Math.min(1, instance.currentHP / Math.max(1, oldStats.hp)));
      instance.level = level;
      const stats = this.stats.calculate(species, level);
      // Level-up preserves the missing-HP amount while granting the HP increase.
      const wasAlive = instance.currentHP > 0;
      instance.currentHP = wasAlive ? Math.max(1, Math.min(stats.hp, Math.floor(stats.hp * oldRatio))) : 0;
      instance.maxHP = stats.hp;
      instance.stats = { ...stats };
      const learned = this.skills.check(instance, level - 1, level);
      levels.push({ level, stats, hpRatioBefore: oldRatio });
      skillEvents.push(...learned);
    }
    return { levels, skills: skillEvents };
  }
}
