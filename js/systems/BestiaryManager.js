export class BestiaryManager {
 constructor(discovered=[]){this.discovered=new Set(Array.isArray(discovered)?discovered:[]);}
 discover(speciesId){this.discovered.add(speciesId);}
 has(speciesId){return this.discovered.has(speciesId);}
 toJSON(){return [...this.discovered];}
}
