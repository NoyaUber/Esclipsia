import { createEidolonSprite } from '../render/EidolonArtPhase4.js';
import { getEidolonSpecies } from '../data/eidolons.js';
export class EvolutionUI {
  render(instance, options, callbacks = {}) {
    const root = document.createElement('section'); root.className = 'progress-subpanel';
    const title = document.createElement('strong'); title.textContent = `Current: ${getEidolonSpecies(instance.speciesId)?.name ?? instance.speciesId} · Available evolution paths`; root.append(title);
    if (!options.length) { const empty = document.createElement('small'); empty.textContent = 'No evolution requirement is currently met.'; root.append(empty); return root; }
    for (const option of options) {
      const row = document.createElement('div'); row.className = 'evolution-choice';
      const current = getEidolonSpecies(instance.speciesId); const fromSprite = createEidolonSprite(current.id); fromSprite.className = 'eidolon-sprite'; const toSprite = createEidolonSprite(option.target.id); toSprite.className = 'eidolon-sprite'; row.append(fromSprite, toSprite);
      const info = document.createElement('small');
      const requirement = option.requiredItem ? `Requires ${option.item?.name ?? option.requiredItem}` : `Requires Level ${option.minimumLevel}`;
      info.textContent = `${option.target.name} · ${option.target.element} · ${option.target.rarity} · ${requirement}`; row.append(info);
      const choose = document.createElement('button'); choose.type = 'button'; choose.textContent = `Choose ${option.target.name}`; choose.addEventListener('click', () => callbacks.choose?.(option)); row.append(choose);
      root.append(row);
    }
    return root;
  }
}
