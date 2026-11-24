export const PARTY_LIMIT=4;
export class PartyManager {
 constructor(ids=[],activeId=null){this.ids=[];for(const id of ids)this.add(id);this.activeId=this.ids.includes(activeId)?activeId:(this.ids[0]??null);}
 add(id){if(typeof id!=='string'||this.ids.includes(id)||this.ids.length>=PARTY_LIMIT)return false;this.ids.push(id);if(!this.activeId)this.activeId=id;return true;}
 remove(id){const i=this.ids.indexOf(id);if(i<0)return false;this.ids.splice(i,1);if(this.activeId===id)this.activeId=this.ids[0]??null;return true;}
 reorder(from,to){if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=this.ids.length||to>=this.ids.length)return false;const [v]=this.ids.splice(from,1);this.ids.splice(to,0,v);return true;}
 has(id){return this.ids.includes(id);}
 select(id){if(!this.has(id))return false;this.activeId=id;return true;}
 get full(){return this.ids.length>=PARTY_LIMIT;}
}
