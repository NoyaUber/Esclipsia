import { PROGRESSION_CONFIG } from '../data/progressionConfig.js';
import { experienceForNextLevel } from '../data/experienceCurves.js';
import { getEidolonSpecies } from '../data/eidolons.js';
import { LevelUpManager } from './LevelUpManager.js';
export class ExperienceManager {
  constructor({ config = PROGRESSION_CONFIG, levelUps = new LevelUpManager() } = {}) { this.config = config; this.levelUps = levelUps; }
  required(instance) { const species = getEidolonSpecies(instance.speciesId); return experienceForNextLevel(instance.level, species?.growthCurve ?? 'Medium', species?.customExpCurve); }
  award(manager, participantIds, amount, { share = this.config.expShare, mode = this.config.expShareMode, save = true } = {}) {
    const ids = [...new Set((share === 'party' ? manager.party.ids : participantIds).filter(id => manager.instances.has(id)))];
    if (!ids.length) return { exp: 0, recipients: [], levelUps: [], skillEvents: [] };
    const total = Math.max(0, Math.floor(Number(amount) || 0));
    const perMonster = mode === 'split' ? Math.floor(total / ids.length) : total;
    const levelUps = [], skillEvents = [];
    for (const id of ids) {
      const instance = manager.instances.get(id);
      const species = getEidolonSpecies(instance.speciesId);
      if (!species || instance.level >= this.config.maxLevel) { if (species && instance.level >= this.config.maxLevel) instance.experience = 0; continue; }
      instance.experience = Math.max(0, Number(instance.experience) || 0) + perMonster;
      let safety = 0;
      while (instance.level < this.config.maxLevel && instance.experience >= this.required(instance) && safety++ < this.config.maxLevel) {
        instance.experience -= this.required(instance);
        const result = this.levelUps.apply(instance, instance.level + 1);
        for (const level of result.levels) levelUps.push({ instanceId: id, ...level });
        for (const skill of result.skills) skillEvents.push({ instanceId: id, ...skill });
      }
      if (instance.level >= this.config.maxLevel) instance.experience = 0;
    }
    if (save) manager.save();
    return { exp: perMonster, totalExp: total, recipients: ids, levelUps, skillEvents };
  }
}
