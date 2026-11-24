export class EncounterSystem {
 constructor(tables){this.tables=tables;this.lastEncounterAt=0;}
 roll(locationId,{now=Date.now(),random=Math.random,unlocked=()=>true,time='any'}={}){
  const table=this.tables[locationId];if(!table)return null;
  if(now-this.lastEncounterAt<table.cooldownSeconds*1000)return null;
  if(random()>=table.encounterRate)return null;
  const entries=table.entries.filter(e=>unlocked(e.unlockRequirements)&&(!e.timeCondition||e.timeCondition===time));
  const total=entries.reduce((n,e)=>n+Math.max(0,e.encounterWeight),0);if(!total)return null;
  let roll=random()*total,entry=entries[entries.length-1];
  for(const e of entries){roll-=e.encounterWeight;if(roll<0){entry=e;break;}}
  this.lastEncounterAt=now;
  return {...entry,level:entry.minimumLevel+Math.floor(random()*(entry.maximumLevel-entry.minimumLevel+1))};
 }
 force(locationId,{random=Math.random,unlocked=()=>true}={}){
  const table=this.tables[locationId];if(!table)return null;
  const entries=table.entries.filter(e=>unlocked(e.unlockRequirements));const total=entries.reduce((n,e)=>n+e.encounterWeight,0);if(!total)return null;
  let roll=random()*total,entry=entries[entries.length-1];for(const e of entries){roll-=e.encounterWeight;if(roll<0){entry=e;break;}}
  return {...entry,level:entry.minimumLevel+Math.floor(random()*(entry.maximumLevel-entry.minimumLevel+1))};
 }
}
