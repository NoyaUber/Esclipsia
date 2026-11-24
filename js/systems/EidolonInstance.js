import { SPECIES_SKILLS } from '../data/skills.js';
import { StatGrowthSystem } from './StatGrowthSystem.js';
const statGrowth = new StatGrowthSystem();
let fallbackCounter=0;
export function createEidolonInstance(species, {level=1,nickname='',now=Date.now(),idFactory}={}) {
 if(!species) throw new Error('Unknown Eidolon species');
 const safeLevel=Math.max(1,Math.min(100,Math.floor(Number(level)||1)));
 const stats=statGrowth.calculate(species,safeLevel);
 const instanceId=(idFactory ?? (()=>`eid-${now.toString(36)}-${(++fallbackCounter).toString(36)}-${Math.random().toString(36).slice(2,7)}`))();
 return {instanceId,speciesId:species.id,nickname:String(nickname).slice(0,18),level:safeLevel,experience:0,currentHP:stats.hp,maxHP:stats.hp,stats:{...stats},status:'normal',statusDuration:0,acquiredAt:new Date(now).toISOString(),skills:[...(SPECIES_SKILLS[species.id]??[])].slice(0,4),pendingSkills:[],evolutionHistory:[]};
}
export function validateEidolonInstance(value, speciesLookup) {
 if(!value || typeof value!=='object'||typeof value.instanceId!=='string'||!speciesLookup(value.speciesId)) return null;
 const species=speciesLookup(value.speciesId), level=Math.max(1,Math.min(100,Number(value.level)||1));
 const stats=statGrowth.calculate(species,level);
 const oldMax=Math.max(1,Number(value.maxHP)||stats.hp);
 const hp=Number.isFinite(Number(value.currentHP))?Number(value.currentHP):stats.hp;
 return {instanceId:value.instanceId,speciesId:value.speciesId,nickname:typeof value.nickname==='string'?value.nickname.slice(0,18):'',level,experience:Math.max(0,Number(value.experience)||0),currentHP:Math.max(0,Math.min(stats.hp,hp)),maxHP:stats.hp,stats:{...stats},status:typeof value.status==='string'?value.status:'normal',statusDuration:Math.max(0,Math.min(10,Math.floor(Number(value.statusDuration)||0))),acquiredAt:value.acquiredAt||new Date().toISOString(),skills:(Array.isArray(value.skills)&&value.skills.length?value.skills.filter(x=>typeof x==='string').slice(0,4):[...(SPECIES_SKILLS[value.speciesId]??[])]).slice(0,4),pendingSkills:Array.isArray(value.pendingSkills)?value.pendingSkills.filter(x=>typeof x==='string').slice(0,12):[],evolutionHistory:Array.isArray(value.evolutionHistory)?value.evolutionHistory.filter(x=>x&&typeof x.from==='string'&&typeof x.to==='string').slice(-50):[]};
}
