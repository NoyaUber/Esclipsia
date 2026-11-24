import { SKILLS } from '../data/skills.js';
import { SKILL_LEARNING } from '../data/skillLearning.js';
import { PROGRESSION_CONFIG } from '../data/progressionConfig.js';
export class SkillLearningManager {
  constructor({ maxSkills = PROGRESSION_CONFIG.maxActiveSkills } = {}) { this.maxSkills = maxSkills; }
  check(instance, previousLevel, newLevel) {
    const known = new Set(instance.skills ?? []);
    const pending = new Set(instance.pendingSkills ?? []);
    const learned = (SKILL_LEARNING[instance.speciesId] ?? []).filter(x => x.level > previousLevel && x.level <= newLevel && SKILLS[x.skillId] && !known.has(x.skillId) && !pending.has(x.skillId));
    instance.pendingSkills ??= [];
    for (const entry of learned) {
      if (instance.skills.length < this.maxSkills) instance.skills.push(entry.skillId);
      else instance.pendingSkills.push(entry.skillId);
    }
    return learned.map(x => ({ ...x, skill: SKILLS[x.skillId], pending: instance.pendingSkills.includes(x.skillId) }));
  }
  replace(instance, newSkillId, oldSkillId) {
    if (!SKILLS[newSkillId] || instance.skills?.includes(newSkillId) || !instance.pendingSkills?.includes(newSkillId)) return false;
    const index = instance.skills.indexOf(oldSkillId);
    if (index < 0) return false;
    instance.skills[index] = newSkillId;
    instance.pendingSkills = instance.pendingSkills.filter(x => x !== newSkillId);
    return true;
  }
  decline(instance, skillId) {
    if (!instance.pendingSkills?.includes(skillId)) return false;
    instance.pendingSkills = instance.pendingSkills.filter(x => x !== skillId);
    return true;
  }
  defer(instance, skillId) { return !!instance.pendingSkills?.includes(skillId); }
}
