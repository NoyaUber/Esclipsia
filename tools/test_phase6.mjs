import assert from 'node:assert/strict';
import { EidolonManager } from '../js/systems/EidolonManager.js';
import { StatGrowthSystem } from '../js/systems/StatGrowthSystem.js';
import { ExperienceManager } from '../js/systems/ExperienceManager.js';
import { SkillLearningManager } from '../js/systems/SkillLearningManager.js';
import { EvolutionManager } from '../js/systems/EvolutionManager.js';
import { experienceForNextLevel } from '../js/data/experienceCurves.js';
import { PROGRESSION_CONFIG } from '../js/data/progressionConfig.js';
import { EIDOLONS, getEidolonSpecies } from '../js/data/eidolons.js';
import { SKILLS } from '../js/data/skills.js';
import { BattleManager } from '../js/battle/BattleManager.js';

const store = new Map();
globalThis.localStorage = { getItem:k=>store.get(k)??null, setItem:(k,v)=>store.set(k,v) };
const stats = new StatGrowthSystem();
for (const species of EIDOLONS) {
  const a=stats.calculate(species,1), b=stats.calculate(species,20);
  for (const key of ['hp','attack','defense','specialAttack','specialDefense','speed']) { assert.ok(a[key]>0); assert.ok(b[key]>=a[key], `${species.id} ${key} growth`); }
}
assert.equal(experienceForNextLevel(2,'Custom',{base:10,exponent:2}),40);
const manager = new EidolonManager();
const starter = manager.create('emberling',1); starter.nickname='Cinder'; manager.addOwned(starter);
const exp = new ExperienceManager();
starter.currentHP = Math.floor(starter.maxHP / 2);
const hpRatioBeforeLeveling = starter.currentHP / starter.maxHP;
const totalReward = experienceForNextLevel(1,'Medium') + experienceForNextLevel(2,'Medium') + experienceForNextLevel(3,'Medium') + 7;
let awarded = exp.award(manager,[starter.instanceId],totalReward);
assert.equal(starter.level,4,'multiple level-ups should be processed');
assert.equal(starter.experience,7,'overflow EXP should be preserved');
assert.equal(starter.maxHP,stats.calculate(getEidolonSpecies('emberling'),4).hp);
assert.ok(Math.abs(starter.currentHP/starter.maxHP-hpRatioBeforeLeveling)<.05,'level-up should preserve HP ratio');
assert.equal(starter.stats.specialAttack>0,true);
assert.equal(awarded.levelUps.length,3);
const splitExp = new ExperienceManager({config:{...PROGRESSION_CONFIG,expShare:'party',expShareMode:'split'}});const splitAward=splitExp.award(manager,[starter.instanceId],40);assert.equal(splitAward.recipients.length,manager.party.ids.length);assert.equal(splitAward.exp,Math.floor(40/manager.party.ids.length));
const capped=manager.create('mistray',100);manager.addOwned(capped);exp.award(manager,[capped.instanceId],999999);assert.equal(capped.level,100);assert.equal(capped.experience,0);

// Skill learning is queued rather than silently overwriting a full four-skill loadout.
const learner = manager.create('emberling',7); manager.addOwned(learner);
const learning = new SkillLearningManager();
const learned = learning.check(learner,7,8);
assert.equal(learned.length,1); assert.equal(learner.pendingSkills.includes('radiant-flare'),true);
assert.equal(learning.replace(learner,'radiant-flare',learner.skills[0]),true);
assert.equal(learner.skills.includes('radiant-flare'),true); assert.equal(learner.skills.length,4);
const pending = learning.check(learner,13,14); assert.ok(pending.length);
assert.equal(learning.decline(learner,pending[0].skillId),true);
assert.equal(SKILLS['radiant-flare'].name,'Radiant Flare');

// Level evolution branch and item branch; identity and nickname are preserved.
const grim = manager.create('grimfang',20); grim.nickname='Night'; grim.experience=123; grim.currentHP=Math.floor(grim.currentHP/2); const oldHpRatio=grim.currentHP/grim.maxHP; manager.addOwned(grim);
const evo = manager.evolution;
const paths=evo.available(grim); assert.equal(paths.length,2);
const levelPath=paths.find(x=>x.id==='grimfang-dreadwolf');
const evolved=evo.evolve(grim.instanceId,levelPath.id,{token:'level-branch-test'});
assert.equal(evolved.ok,true); assert.equal(grim.speciesId,'dreadwolf'); assert.equal(grim.instanceId,evolved.instance.instanceId); assert.equal(grim.nickname,'Night'); assert.equal(grim.level,20); assert.equal(grim.experience,123); assert.equal(manager.party.has(grim.instanceId),true); assert.ok(Math.abs(grim.currentHP/grim.maxHP-oldHpRatio)<.05,'evolution should preserve HP ratio');
assert.equal(manager.bestiary.has('dreadwolf'),true); assert.equal(grim.evolutionHistory.length,1);
assert.equal(evo.evolve(grim.instanceId,levelPath.id,{token:'level-branch-test'}).ok,false,'duplicate evolution token must be rejected');

const itemGrim=manager.create('grimfang',5); manager.addOwned(itemGrim);
const crystalsBefore=manager.inventory.shadowCrystal;
const itemPath=evo.available(itemGrim).find(x=>x.id==='grimfang-moonwraith'); assert.ok(itemPath);
const itemResult=evo.evolve(itemGrim.instanceId,itemPath.id,{token:'item-branch-test'});
assert.equal(itemResult.ok,true); assert.equal(itemGrim.speciesId,'moonwraith'); assert.equal(manager.inventory.shadowCrystal,crystalsBefore-1);

// Failed requirement does not consume the item or mutate identity.
const noCrystal=manager.create('grimfang',2); manager.addOwned(noCrystal); manager.inventory.shadowCrystal=0;
manager.inventory.shadowCrystal=1;const invalid=evo.evolve(noCrystal.instanceId,'grimfang-dreadwolf',{token:'invalid-level-test'});assert.equal(manager.inventory.shadowCrystal,1,'invalid level evolution must not consume item');
manager.inventory.shadowCrystal=0;const invalidItem=evo.evolve(noCrystal.instanceId,'grimfang-moonwraith',{token:'invalid-item-test'});
assert.equal(invalid.ok,false); assert.equal(invalidItem.ok,false); assert.equal(noCrystal.speciesId,'grimfang'); assert.equal(manager.inventory.shadowCrystal,0);

// Evolution works for a storage Eidolon and party/storage references remain stable.
const partyFull=[...manager.party.ids];
const stored=manager.create('grimfang',20); manager.addOwned(stored);
if(manager.party.has(stored.instanceId)) manager.moveToStorage(stored.instanceId);
const storageResult=evo.evolve(stored.instanceId,'grimfang-dreadwolf',{token:'storage-evolution-test'});
assert.equal(storageResult.ok,true); assert.equal(manager.storage.ids.includes(stored.instanceId),true); assert.deepEqual(manager.party.ids,partyFull);

// Victory in the actual battle pipeline awards progression through BattleResultManager.
const battleEncounter=manager.startTestEncounter();const battle=new BattleManager({eidolons:manager},battleEncounter);battle.enemy.hp=1;battle.enemy.speed=1;if(battle.player)battle.player.speed=999;const battleOwner=manager.instances.get(battle.playerActiveId);const beforeBattleExp=battleOwner.experience;const beforeBattleLevel=battleOwner.level;const battleSkill=battle.skills.find(x=>x.category!=='Support'&&x.energyCost<=battle.player.energy);const savedRandom=Math.random;Math.random=()=>.1;let battleAction;try{battleAction=battle.act({type:'skill',skill:battleSkill});}finally{Math.random=savedRandom;}assert.ok(battleAction.ok);assert.equal(battle.result,'VICTORY');assert.ok(battleOwner.experience>beforeBattleExp||battleOwner.level>beforeBattleLevel,'battle victory must award EXP');battle.close();

// Versioned save reload keeps progression, species, skills and history; old v1 envelope migrates.
manager.save();
const raw=JSON.parse(store.get('eclipsia.phase4')); assert.equal(raw.version,7);
const reload=new EidolonManager();
const reloaded=reload.instances.get(grim.instanceId); assert.equal(reloaded.speciesId,'dreadwolf'); assert.equal(reloaded.nickname,'Night'); assert.equal(reloaded.evolutionHistory.length,1); assert.ok(reloaded.stats.specialDefense>0);
const oldEnvelope={version:1,data:{instances:[{...starter,instanceId:'legacy-one'}],party:['legacy-one'],storage:[],discovered:['emberling'],inventory:{potion:1}}};
store.set('eclipsia.phase4',JSON.stringify(oldEnvelope));
const migrated=new EidolonManager(); assert.equal(migrated.instances.has('legacy-one'),true); assert.equal(migrated.party.has('legacy-one'),true); assert.equal(migrated.inventory.shadowCrystal,1);

console.log('Phase 6 tests passed (six-stat growth, EXP curves, multi-level rewards, max level, ratio-preserving HP growth, party EXP sharing, custom curves, battle EXP reward, skill learning/replacement/decline, level and item branches, identity preservation, storage evolution, Bestiary, v1 save migration and v7 persistence).');
