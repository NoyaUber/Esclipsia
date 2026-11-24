import {STATUS_EFFECTS} from '../data/statusEffects.js';
export class StatusEffectSystem {
 apply(target,id,random=Math.random,chanceOverride=null){const def=STATUS_EFFECTS[id];if(!def||!target||target.hp<=0||target.status&&target.status.id!=='normal')return false;const chance=chanceOverride===null?def.applicationChance:Math.min(def.applicationChance,chanceOverride);if(random()*100>=chance)return false;target.status={id,duration:def.duration};return true;}
 canAct(target,random=Math.random){const id=target.status?.id;if(!id)return true;if(id==='freeze'||id==='sleep'){if(random()<.35)return true;return false;}return true;}
 actionModifier(target){return target.status?.id==='paralysis'?.25:1;}
 resolveEndTurn(target){const st=target.status;if(!st?.id)return {damage:0,message:''};const def=STATUS_EFFECTS[st.id];let damage=0;if(['burn','poison','curse'].includes(st.id))damage=Math.max(1,Math.floor(target.maxHP*def.effectStrength));st.duration-=1;if(st.duration<=0)target.status=null;return {damage,message:damage?`${st.id.toUpperCase()} dealt ${damage} damage.`:`${st.id.toUpperCase()} lingers.`};}
}
