import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateMap, validateObjectTypes } from '../js/utils/DataUtils.js';
import { CollisionSystem } from '../js/systems/CollisionSystem.js';
import { InteractionSystem } from '../js/systems/InteractionSystem.js';
import { Camera } from '../js/core/Camera.js';
import { WORLD_OBJECT_DEFINITIONS } from '../js/data/worldState.js';
import { WorldStateManager } from '../js/systems/WorldStateManager.js';
import { StoryFlagManager } from '../js/systems/StoryFlagManager.js';
import { EidolonManager } from '../js/systems/EidolonManager.js';
import { ENCOUNTER_TABLES } from '../js/data/encounters.js';

const objects = validateObjectTypes(JSON.parse(fs.readFileSync(new URL('../data/objects.json', import.meta.url))));
const maps = {};
for (const id of ['ashenveil_village','ashenveil_forest','forgotten_chapel_entrance','chapel_room_01_entrance','chapel_room_02_main_hall','chapel_room_03_library','chapel_room_04_sanctuary','chapel_room_05_sealed_chamber','chapel_room_06_ancient_sanctum']) {
  const raw = JSON.parse(fs.readFileSync(new URL(`../data/maps/${id}.json`, import.meta.url)));
  maps[id] = validateMap(raw, id, objects);
}
assert.deepEqual([maps.ashenveil_village.width,maps.ashenveil_village.height],[40,30]);
assert.deepEqual([maps.ashenveil_forest.width,maps.ashenveil_forest.height],[64,48]);
assert.deepEqual([maps.forgotten_chapel_entrance.width,maps.forgotten_chapel_entrance.height],[32,24]);
for (const map of Object.values(maps)) {
  assert.equal(map.tileSize,16);
  const collision = new CollisionSystem(map,objects);
  for (const [name,sp] of Object.entries(map.spawns)) {
    const x=sp.x*16+1,y=(sp.y+1)*16-24+18;
    assert.equal(collision.overlaps(x,y,10,6),false,`${map.id}:${name} spawn blocked`);
    assert.equal(collision.worldW,map.width*16);
    assert.equal(collision.worldH,map.height*16);
  }
  // Reachability uses the real player feet hitbox against CollisionSystem.
  const spawn = Object.values(map.spawns)[0];
  const start = `${spawn.x},${spawn.y}`;
  const queue = [[spawn.x,spawn.y]], seen = new Set([start]);
  const walkable = (tx,ty) => {
    if (tx<0||ty<0||tx>=map.width||ty>=map.height) return false;
    const px=tx*16, py=(ty+1)*16-24;
    return !collision.overlaps(px+3,py+18,10,6);
  };
  for (let i=0;i<queue.length;i++) {
    const [x,y]=queue[i];
    for (const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
      const key=`${nx},${ny}`;
      if (!seen.has(key)&&walkable(nx,ny)) { seen.add(key); queue.push([nx,ny]); }
    }
  }
  for (const exit of map.interactables.filter(it=>it.transition)) {
    const adjacent=[[exit.x+1,exit.y],[exit.x-1,exit.y],[exit.x,exit.y+1],[exit.x,exit.y-1]];
    assert(adjacent.some(([x,y])=>seen.has(`${x},${y}`)),`${map.id}:${exit.id} cannot be reached from map spawn`);
    assert(maps[exit.transition.mapId],`${exit.id} destination map missing`);
    assert(maps[exit.transition.mapId].spawns[exit.transition.spawn],`${exit.id} destination spawn missing`);
  }
  const camera = new Camera(320,180); camera.setBounds(map.width*16,map.height*16);
  camera.follow({x:map.width*16-16,y:map.height*16-24,w:16,h:24},true);
  assert(camera.x>=0 && camera.y>=0);
  assert(camera.x<=Math.max(0,map.width*16-320));
  assert(camera.y<=Math.max(0,map.height*16-180));
}
const village = maps.ashenveil_village;
for (const id of ['edrick','seren','darian','elder_maren','farmer_tobin','lira','guard_doran']) assert(village.npcs.some(n=>n.id===id),`missing NPC ${id}`);
const villageCollision = new CollisionSystem(village,objects);
for (const npc of village.npcs) { const px=npc.x*16, py=(npc.y+1)*16-24; assert.equal(villageCollision.overlaps(px+1,py+15,14,9),false,`NPC ${npc.id} overlaps static collision`); }
const forest = maps.ashenveil_forest;
for (const id of ['ancient_altar','forest_hidden_chest','forest_herb_patch_1','forest_herb_patch_2','forest_herb_patch_3','forest_to_village','forest_to_chapel']) assert(forest.interactables.some(x=>x.id===id),`missing forest interaction ${id}`);
assert.equal(forest.interactables.find(x=>x.id==='forest_to_chapel').transition.mapId,'forgotten_chapel_entrance');
for (const id of ['forest_herb_patch_1','forest_herb_patch_2','forest_herb_patch_3']) assert.deepEqual(forest.interactables.find(x=>x.id===id).collectItem,{id:'herb',amount:1});
for (const id of ['forest_hidden_chest','forest_herb_patch_1','forest_herb_patch_2','forest_herb_patch_3']) assert(WORLD_OBJECT_DEFINITIONS.some(x=>x.id===id&&x.type==='CHEST'),`missing persistent state for ${id}`);
for (const id of ['ancient_altar','forest_hidden_chest','forest_herb_patch_1','forest_herb_patch_2','forest_herb_patch_3']) { const it=forest.interactables.find(x=>x.id===id); assert(it,`missing ${id}`); assert(it.x>=0&&it.y>=0&&it.x<forest.width&&it.y<forest.height); }
assert.equal(village.interactables.find(x=>x.id==='village_to_forest').transition.mapId,'ashenveil_forest');
for (const id of ['village_square','house_elder_door','house_south_door','house_smith_door']) assert(village.interactables.some(x=>x.id===id),`missing village landmark ${id}`);
assert.equal(maps.forgotten_chapel_entrance.interactables.find(x=>x.id==='chapel_to_forest').transition.mapId,'ashenveil_forest');
const inter = new InteractionSystem(forest,[]);
const exit = inter.objects.find(x=>x.id==='forest_to_chapel');
assert.equal(exit.requires,null);
assert.equal(exit.transition.spawn,'chapel_path_entry');
const chapelDoor = maps.forgotten_chapel_entrance.interactables.find(x=>x.id==='chapel_entrance_door');
assert.equal(chapelDoor.transition.dungeonId,'forgotten_chapel');
assert.equal(chapelDoor.transition.enterDungeon,true);
assert.equal(forest.encounterZones.length,1);
assert.equal(forest.encounterZones[0].encounterTable,'ashenveil_forest');
assert(ENCOUNTER_TABLES[forest.encounterZones[0].encounterTable], 'encounter table missing');
for (const id of ['forest_herb_patch_1','forest_herb_patch_2','forest_herb_patch_3']) assert.equal(inter.objects.find(x=>x.id===id).collectItem.id,'herb');

// World-state gate condition and chest claim persistence/idempotency.
const flags = new StoryFlagManager();
const saved = {version:1,states:{},appliedEvents:[]};
const world = new WorldStateManager({definitions:WORLD_OBJECT_DEFINITIONS,savedState:saved,storyFlags:flags,onChange:()=>true});
assert.equal(world.canInteract('chapel_gate',{storyFlag:'chapel_gate_unlocked'}),false);
flags.set('chapel_gate_unlocked',true);
world.refresh();
assert.equal(world.getState('chapel_gate'),'OPEN');
assert.equal(world.canInteract('chapel_gate',{storyFlag:'chapel_gate_unlocked'}),true);
world.setState('forest_hidden_chest','OPENED');
let grants=0;
assert.equal(world.claimChest('forest_hidden_chest',{eventId:'test-chest-claim',grant:()=>{grants++;return true;}}).ok,true);
assert.equal(world.claimChest('forest_hidden_chest',{eventId:'test-chest-claim',grant:()=>{grants++;return true;}}).ok,false);
assert.equal(grants,1);
const restored = new WorldStateManager({definitions:WORLD_OBJECT_DEFINITIONS,savedState:world.toJSON(),storyFlags:flags,onChange:()=>true});
assert.equal(restored.getState('forest_hidden_chest'),'CLAIMED');
assert.equal(restored.getState('chapel_gate'),'OPEN');
world.setState('forest_herb_patch_1','OPENED');
let herbGrant=0;
assert.equal(world.claimChest('forest_herb_patch_1',{eventId:'herb-pickup-1',grant:()=>{herbGrant++;return true;}}).ok,true);
assert.equal(world.claimChest('forest_herb_patch_1',{eventId:'herb-pickup-1',grant:()=>{herbGrant++;return true;}}).ok,false);
assert.equal(herbGrant,1);

// Session data is saved with the existing Eidolon save envelope; legacy saves remain readable.
const store = new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
const eidolons = new EidolonManager();
eidolons.worldSession={currentMap:'ashenveil_forest',playerPosition:{x:512,y:384}};
assert.equal(eidolons.save(),true);
const envelope=JSON.parse(store.get('eclipsia.phase4'));
assert.equal(envelope.version,7);
assert.equal(envelope.data.worldSession.currentMap,'ashenveil_forest');
assert.equal(envelope.data.worldSession.playerPosition.x,512);
store.set('eclipsia.phase4',JSON.stringify({version:5,data:{inventory:{potion:4}}}));
const legacy=new EidolonManager();
assert.equal(legacy.inventory.potion,4);
assert.equal(legacy.worldSession.currentMap,'ashenveil_village');

console.log('Phase 7 Step 4 tests passed (all nine validated maps and dimensions, collision/camera bounds, reachable exits, NPC preservation/additions, village landmarks, altar/chest/herb collectibles, discoverable chapel exterior and gated entrance, world-state persistence/claim protection, save v7 session and v5 migration).');
