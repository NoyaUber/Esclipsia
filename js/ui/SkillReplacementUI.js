import { SKILLS } from '../data/skills.js';
export class SkillReplacementUI {
  render(instance, pendingSkillId, callbacks = {}) {
    const root = document.createElement('section'); root.className = 'progress-subpanel';
    const skill = SKILLS[pendingSkillId]; const heading = document.createElement('strong'); heading.textContent = `Learn ${skill?.name ?? pendingSkillId}? Choose a skill to replace.`; root.append(heading);
    for (const id of instance.skills ?? []) {
      const old = SKILLS[id]; const card = document.createElement('div'); card.className = 'pending-skill'; const detail = document.createElement('small'); detail.textContent = `${old?.name ?? id} · ${old?.element ?? 'Unknown'} · ${old?.category ?? 'Skill'} · Power ${old?.power ?? 0} · Accuracy ${old?.accuracy ?? 0}% · Energy ${old?.energyCost ?? 0} · ${old?.description ?? ''}`; card.append(detail); const button = document.createElement('button'); button.type = 'button'; button.textContent = `Replace ${old?.name ?? id}`; button.addEventListener('click', () => callbacks.replace?.(id)); card.append(button); root.append(card);
    }
    const decline = document.createElement('button'); decline.textContent = 'Decline new skill'; decline.addEventListener('click', () => callbacks.decline?.()); root.append(decline);
    const defer = document.createElement('button'); defer.textContent = 'Decide later'; defer.addEventListener('click', () => callbacks.defer?.()); root.append(defer);
    return root;
  }
}
