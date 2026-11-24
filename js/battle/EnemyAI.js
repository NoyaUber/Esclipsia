import {getSkillsFor,canUseSkill} from '../systems/SkillSystem.js';
import {elementMultiplier} from '../systems/ElementSystem.js';
export class EnemyAI{
 choose(enemy,target,random=Math.random){
  const usable=getSkillsFor(enemy).filter(skill=>canUseSkill({energy:enemy.energy,hp:enemy.hp},skill));
  if(!usable.length)return {type:'skill',skill:null};
  const scored=usable.map(skill=>({skill,score:(skill.power??0)*elementMultiplier(skill.element,target?.element??'')+(skill.statusEffect&&!target?.status?2:skill.statusEffect?-2:0)+random()*5}));
  scored.sort((a,b)=>b.score-a.score);
  const pick=scored[Math.min(scored.length-1,Math.floor(random()*Math.min(2,scored.length)))];
  return {type:'skill',skill:pick.skill};
 }
}
