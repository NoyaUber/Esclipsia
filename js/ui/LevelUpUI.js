import { experienceForNextLevel } from '../data/experienceCurves.js';
import { getEidolonSpecies } from '../data/eidolons.js';
export class LevelUpUI {
  render(instance) {
    const species = getEidolonSpecies(instance.speciesId);
    const wrap = document.createElement('div'); wrap.className = 'progress-card';
    const title = document.createElement('strong'); title.textContent = `${instance.nickname || species.name} · Lv.${instance.level}`; wrap.append(title);
    const stats = instance.stats ?? {};
    const line = document.createElement('small');
    line.textContent = `HP ${instance.currentHP}/${stats.hp ?? instance.maxHP ?? '?'} · ATK ${stats.attack ?? species.baseAttack} · DEF ${stats.defense ?? species.baseDefense} · SpA ${stats.specialAttack ?? species.baseSpecialAttack} · SpD ${stats.specialDefense ?? species.baseSpecialDefense} · SPD ${stats.speed ?? species.baseSpeed}`;
    wrap.append(line);
    const next = experienceForNextLevel(instance.level, species.growthCurve, species.customExpCurve);
    const exp = document.createElement('small'); exp.textContent = instance.level >= 100 ? 'MAX LEVEL' : `EXP ${instance.experience}/${next}`; wrap.append(exp);
    return wrap;
  }
}
