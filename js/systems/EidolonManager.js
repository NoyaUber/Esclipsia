import {EIDOLON_BY_ID,getEidolonSpecies} from '../data/eidolons.js';
import {ENCOUNTER_TABLES} from '../data/encounters.js';
import {SOUL_SIGILS} from '../data/soulSigils.js';
import {EVOLUTION_ITEMS} from '../data/evolutionItems.js';
import {createEidolonInstance,validateEidolonInstance} from './EidolonInstance.js';
import {PartyManager} from './PartyManager.js';
import {StorageManager} from './StorageManager.js';
import {BestiaryManager} from './BestiaryManager.js';
import {EncounterSystem} from './EncounterSystem.js';
import {CaptureSystem} from './CaptureSystem.js';
import {EidolonSaveAdapter} from './EidolonSaveAdapter.js';
import {EvolutionManager} from './EvolutionManager.js';
import {StoryFlagManager} from './StoryFlagManager.js';
export class EidolonManager {
 constructor(){
  this.saveAdapter=new EidolonSaveAdapter();const raw=this.saveAdapter.load();const saved=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  this.instances=new Map();for(const value of Array.isArray(saved.instances)?saved.instances:[]){const instance=validateEidolonInstance(value,getEidolonSpecies);if(instance&&!this.instances.has(instance.instanceId))this.instances.set(instance.instanceId,instance);}
  this.party=new PartyManager((Array.isArray(saved.party)?saved.party:[]).filter(id=>this.instances.has(id)).slice(0,4),saved.activeId);
  this.storage=new StorageManager((Array.isArray(saved.storage)?saved.storage:[]).filter(id=>this.instances.has(id)&&!this.party.has(id)));
  for(const id of this.instances.keys())if(!this.party.has(id)&&!this.storage.ids.includes(id))this.storage.add(id);
  this.bestiary=new BestiaryManager((Array.isArray(saved.discovered)?saved.discovered:[]).filter(id=>EIDOLON_BY_ID[id]));
  this.inventory={basic:5,refined:2,ancient:1,potion:3,shadowCrystal:1,flameCore:0,aquaCore:0,earthCore:0,stormCore:0,frostCore:0,radiantCore:0,herb:0,monsterEssence:0,ancientRelic:0,...(saved.inventory??{})};
  this.aetherShards=Math.max(0,Math.floor(Number(saved.aetherShards)||0));
  this.inventoryEventIds=Array.isArray(saved.inventoryEventIds)?saved.inventoryEventIds.filter(x=>typeof x==='string').slice(-500):[];
  for(const key of [...Object.keys(SOUL_SIGILS),'potion',...Object.keys(EVOLUTION_ITEMS)])this.inventory[key]=Math.max(0,Math.floor(Number(this.inventory[key])||0));
  this.events=null;
  this.storyFlags=new StoryFlagManager(saved.storyFlags??{}, {onChange:()=>this.save()});
  this.questState=saved.quests&&typeof saved.quests==='object'&&!Array.isArray(saved.quests)?saved.quests:{version:1,quests:{}};this.worldState=saved.worldState&&typeof saved.worldState==='object'&&!Array.isArray(saved.worldState)?saved.worldState:{version:1,states:{},appliedEvents:[]};this.worldSession=saved.worldSession&&typeof saved.worldSession==='object'&&!Array.isArray(saved.worldSession)?saved.worldSession:{currentMap:'ashenveil_village',playerPosition:null};this.dungeonState=saved.dungeonState&&typeof saved.dungeonState==='object'&&!Array.isArray(saved.dungeonState)?saved.dungeonState:null;
  this.encounters=new EncounterSystem(ENCOUNTER_TABLES);this.capture=new CaptureSystem(SOUL_SIGILS);this.currentEncounter=null;this.evolution=new EvolutionManager(this);this.save();
 }
 addInventoryItem(itemId, amount=1, { eventId = null } = {}){const count=Number(amount);if(typeof itemId!=='string'||!itemId.trim()||!Number.isSafeInteger(count)||count<=0)return false;const token=eventId==null?null:String(eventId);if(token&&this.inventoryEventIds.includes(token))return false;this.inventory[itemId]=(Math.max(0,Number(this.inventory[itemId])||0)+count);if(token){this.inventoryEventIds.push(token);if(this.inventoryEventIds.length>500)this.inventoryEventIds.splice(0,this.inventoryEventIds.length-500);}this.events?.emit?.('ITEM_ACQUIRED',{targetId:itemId,amount:count,eventId:token??undefined});this.save();return true;}
 create(speciesId,level=1){return createEidolonInstance(getEidolonSpecies(speciesId),{level});}
 addOwned(instance){if(!instance||this.instances.has(instance.instanceId))return false;this.instances.set(instance.instanceId,instance);if(!this.party.add(instance.instanceId))this.storage.add(instance.instanceId);this.bestiary.discover(instance.speciesId);this.save();return true;}
 moveToParty(id){if(!this.instances.has(id)||this.party.has(id)||this.party.full)return false;if(!this.storage.remove(id))return false;this.party.add(id);this.save();return true;}
 moveToStorage(id){if(!this.party.remove(id))return false;this.storage.add(id);this.save();return true;}
 startEncounterFromRoll(roll){if(!roll||!getEidolonSpecies(roll.speciesId))return null;const species=getEidolonSpecies(roll.speciesId);this.currentEncounter={...roll,token:`enc-${Date.now()}-${Math.random().toString(36).slice(2)}`,species,instance:createEidolonInstance(species,{level:roll.level})};this.bestiary.discover(species.id);this.save();return this.currentEncounter;}
 startTestEncounter(locationId='ashenveil_forest'){const roll=this.encounters.force(locationId);return roll?this.startEncounterFromRoll(roll):null;}
 attemptCapture(sigilId,{random=Math.random,actionToken=null,keepEncounterOnFailure=false}={}){
  const encounter=this.currentEncounter;if(!encounter)return {result:'NO_ENCOUNTER'};
  const token=actionToken??encounter.token;if(this.instances.size&&this.capture.resolved.has(token))return {result:'ALREADY_RESOLVED'};
  const result=this.capture.resolve({encounter:{...encounter,token},species:encounter.species,instanceId:encounter.instance.instanceId,sigilId,inventory:this.inventory,currentHP:encounter.instance.currentHP,status:encounter.instance.status,random});
  if(result.consume)this.inventory[sigilId]=Math.max(0,this.inventory[sigilId]-1);
  if(result.result==='SUCCESS'){const instance=encounter.instance;this.instances.set(instance.instanceId,instance);if(!this.party.add(instance.instanceId))this.storage.add(instance.instanceId);this.bestiary.discover(instance.speciesId);}
  if(result.result==='SUCCESS'||(result.result==='FAILURE'&&!keepEncounterOnFailure))this.currentEncounter=null;
  this.save();return result;
 }
 save(){return this.saveAdapter.save({aetherShards:this.aetherShards,inventoryEventIds:this.inventoryEventIds,instances:[...this.instances.values()],party:this.party.ids,activeId:this.party.activeId,storage:this.storage.ids,inventory:this.inventory,discovered:this.bestiary.toJSON(),storyFlags:this.storyFlags?.toJSON?.()??{},quests:this.questState??{version:1,quests:{}},worldState:this.worldState??{version:1,states:{},appliedEvents:[]},worldSession:this.worldSession??{currentMap:'ashenveil_village',playerPosition:null},dungeonState:this.dungeonState??{version:1,currentDungeonId:null,currentRoomId:null,entryState:'NEVER_ENTERED',discoveredRooms:{},roomStates:{},unlockedConnections:{},completedDungeons:{}}});}
}
