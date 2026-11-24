import { SKILLS } from '../data/skills.js';
import { SkillReplacementUI } from './SkillReplacementUI.js';
export class SkillLearningUI {
  constructor() { this.replacement = new SkillReplacementUI(); }
  render(instance, callbacks = {}) {
    const root = document.createElement('section'); root.className = 'progress-subpanel';
    const title = document.createElement('strong'); title.textContent = 'Pending skill lessons'; root.append(title);
    if (!instance.pendingSkills?.length) { const empty = document.createElement('small'); empty.textContent = 'No new skills waiting.'; root.append(empty); return root; }
    for (const skillId of instance.pendingSkills) {
      const skill = SKILLS[skillId];
      const card = document.createElement('div'); card.className = 'pending-skill';
      const info = document.createElement('small'); info.textContent = `${skill?.name ?? skillId} · ${skill?.element ?? 'Unknown'} · ${skill?.category ?? 'Skill'} · Power ${skill?.power ?? 0} · Accuracy ${skill?.accuracy ?? 0}% · Energy ${skill?.energyCost ?? 0} · ${skill?.description ?? ''}`; card.append(info);
      card.append(this.replacement.render(instance, skillId, { replace: oldId => callbacks.replace?.(skillId, oldId), decline: () => callbacks.decline?.(skillId), defer: () => callbacks.defer?.(skillId) }));
      root.append(card);
    }
    return root;
  }
}
