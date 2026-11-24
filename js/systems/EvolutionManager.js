import { EVOLUTIONS } from '../data/evolutions.js';
import { EVOLUTION_ITEMS } from '../data/evolutionItems.js';
import { getEidolonSpecies } from '../data/eidolons.js';
import { StatGrowthSystem } from './StatGrowthSystem.js';
export class EvolutionManager {
  constructor(collection, { definitions = EVOLUTIONS, stats = new StatGrowthSystem() } = {}) { this.collection = collection; this.definitions = definitions; this.stats = stats; this.resolved = new Set(); }
  _requirements(instance, rule, context = {}) {
    if (!instance || instance.speciesId !== rule.sourceSpeciesId || instance.level < (rule.minimumLevel ?? 1)) return false;
    if (rule.requiredItem && !(Number(this.collection.inventory[rule.requiredItem]) > 0)) return false;
    if (rule.requiredLocation && context.location !== rule.requiredLocation) return false;
    if (rule.requiredStoryFlag && !context.storyFlags?.includes(rule.requiredStoryFlag)) return false;
    if (rule.requiredCondition && !context.conditions?.[rule.requiredCondition]) return false;
    return !!getEidolonSpecies(rule.targetSpeciesId) && rule.targetSpeciesId !== instance.speciesId;
  }
  available(instance, context = {}) {
    return this.definitions.filter(rule => this._requirements(instance, rule, context)).sort((a,b)=>(a.priority??0)-(b.priority??0)).map(rule => ({ ...rule, target: getEidolonSpecies(rule.targetSpeciesId), item: rule.requiredItem ? EVOLUTION_ITEMS[rule.requiredItem] : null }));
  }
  evolve(instanceId, evolutionId, { context = {}, token = `${instanceId}:${evolutionId}` } = {}) {
    if (this.resolved.has(token)) return { ok:false, reason:'ALREADY_RESOLVED' };
    const instance = this.collection.instances.get(instanceId);
    const rule = this.definitions.find(x => x.id === evolutionId);
    if (!instance || !rule || !this._requirements(instance, rule, context)) return { ok:false, reason:'REQUIREMENTS_NOT_MET' };
    const target = getEidolonSpecies(rule.targetSpeciesId);
    if (!target || this._wouldLoop(instance, target.id)) return { ok:false, reason:'INVALID_EVOLUTION' };
    if (rule.requiredItem && (Number(this.collection.inventory[rule.requiredItem]) || 0) < 1) return { ok:false, reason:'ITEM_MISSING' };
    const oldSpecies = getEidolonSpecies(instance.speciesId);
    const oldStats = this.stats.calculate(oldSpecies, instance.level);
    const ratio = Math.max(0, Math.min(1, instance.currentHP / Math.max(1, oldStats.hp)));
    // All validation is complete before the item is consumed or the instance mutates.
    if (rule.requiredItem) this.collection.inventory[rule.requiredItem]--;
    const previousSpeciesId = instance.speciesId;
    instance.speciesId = target.id;
    const nextStats = this.stats.calculate(target, instance.level);
    instance.stats = { ...nextStats };
    instance.maxHP = nextStats.hp;
    instance.currentHP = Math.max(instance.currentHP > 0 ? 1 : 0, Math.min(nextStats.hp, Math.floor(nextStats.hp * ratio)));
    instance.evolutionHistory ??= [];
    instance.evolutionHistory.push({ from: previousSpeciesId, to: target.id, evolutionId: rule.id, at: new Date().toISOString() });
    this.collection.bestiary.discover(target.id);
    this.resolved.add(token);
    this.collection.save();
    return { ok:true, instance, from:oldSpecies, to:target, evolution:rule };
  }
  _wouldLoop(instance, targetId) {
    if (instance.evolutionHistory?.some(x => x.from === targetId || x.to === targetId)) return true;
    const seen = new Set();
    const visit = id => {
      if (id === instance.speciesId) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return this.definitions.filter(x => x.sourceSpeciesId === id).some(x => visit(x.targetSpeciesId));
    };
    return visit(targetId);
  }
}
