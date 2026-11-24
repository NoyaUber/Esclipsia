const KEY='eclipsia.phase4';
const VERSION=7;
export class EidolonSaveAdapter {
 load(){
  try{const raw=localStorage.getItem(KEY);if(!raw)return null;const parsed=JSON.parse(raw);if(![1,2,3,4,5,6,VERSION].includes(parsed.version)||!parsed.data)return null;return parsed.data;}catch(err){console.warn('Eidolon save ignored:',err);return null;}
 }
 save(data){
  try{localStorage.setItem(KEY,JSON.stringify({version:VERSION,savedAt:new Date().toISOString(),data}));return true;}catch(err){console.warn('Eidolon save failed:',err);return false;}
 }
}
