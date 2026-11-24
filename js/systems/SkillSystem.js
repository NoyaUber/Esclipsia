import {SKILLS,SPECIES_SKILLS} from '../data/skills.js';
export function getSkillsFor(instance){const ids=instance.skills?.length?instance.skills:SPECIES_SKILLS[instance.speciesId]??[];return ids.slice(0,4).map(id=>SKILLS[id]).filter(Boolean);}
export function canUseSkill(instance,skill){
 if(!instance||!skill)return false;
 const hp=instance.currentHP??instance.hp;
 return Number(instance.energy??12)>=Number(skill.energyCost??0)&&Number(hp)>0;
}
export function ensureSkillSlots(instance){if(!Array.isArray(instance.skills)||!instance.skills.length)instance.skills=(SPECIES_SKILLS[instance.speciesId]??[]).slice(0,4);while(instance.skills.length<4)instance.skills.push(instance.skills[instance.skills.length-1]??'shadow-claw');instance.skills=instance.skills.slice(0,4);return instance;}
