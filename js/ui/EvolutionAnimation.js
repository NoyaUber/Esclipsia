import { createEidolonSprite } from '../render/EidolonArtPhase4.js';
export class EvolutionAnimation {
  async play(root, fromName, toName) {
    const overlay = document.createElement('div'); overlay.className = 'evolution-overlay';
    const title = document.createElement('strong'); title.textContent = `${fromName} is evolving…`; overlay.append(title); const from = createEidolonSprite(fromName.toLowerCase()); from.className = 'eidolon-sprite evolution-from'; overlay.append(from);
    const beam = document.createElement('div'); beam.className = 'evolution-aether'; overlay.append(beam);
    const reveal = document.createElement('strong'); reveal.className = 'evolution-reveal'; reveal.textContent = toName; const to = createEidolonSprite(toName.toLowerCase()); to.className = 'eidolon-sprite evolution-to'; overlay.append(to,reveal);
    const skip = document.createElement('button'); skip.type = 'button'; skip.textContent = 'Skip animation'; overlay.append(skip); root.append(overlay); skip.focus();
    await new Promise(resolve => {
      let done = false; const finish = () => { if (done) return; done = true; overlay.remove(); resolve(); };
      skip.addEventListener('click', finish, { once:true });
      const timer = setTimeout(finish, 2300);
      overlay.addEventListener('animationend', () => { clearTimeout(timer); finish(); }, { once:true });
    });
  }
}
