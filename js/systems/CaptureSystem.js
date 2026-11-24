const RARITY_FACTOR={Common:1,Uncommon:.82,Rare:.62,Epic:.45,Legendary:.28,Mythic:.16};
const STATUS_FACTOR={normal:1,sleep:1.35,paralysis:1.2,poison:1.08};
export class CaptureSystem {
 constructor(sigils){this.sigils=sigils;this.resolved=new Set();}
 resolve({encounter,species,instanceId,sigilId,inventory,currentHP,status='normal',random=Math.random}){
  const token=encounter?.token??instanceId;
  if(!token||this.resolved.has(token))return {result:'ALREADY_RESOLVED'};
  const sigil=this.sigils[sigilId];if(!sigil||!(inventory[sigilId]>0))return {result:'NO_SIGIL'};
  this.resolved.add(token);
  const hpRatio=Math.max(0,Math.min(1,currentHP/Math.max(1,species.baseHP+(encounter.level-1)*2)));
  const hpFactor=0.25+0.75*(1-hpRatio);
  const chance=Math.max(.01,Math.min(.95,species.baseCaptureRate*sigil.captureMultiplier*(RARITY_FACTOR[species.rarity]??1)*hpFactor*(STATUS_FACTOR[status]??1)));
  const success=random()<chance;
  if(success)return {result:'SUCCESS',chance,consume:true};
  return {result:'FAILURE',chance,consume:sigil.consumeOnFailure};
 }
}
