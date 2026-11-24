export class StorageManager {
 constructor(ids=[]){this.ids=[];for(const id of ids)this.add(id);}
 add(id){if(typeof id!=='string'||this.ids.includes(id))return false;this.ids.push(id);return true;}
 remove(id){const i=this.ids.indexOf(id);if(i<0)return false;this.ids.splice(i,1);return true;}
}
