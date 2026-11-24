import assert from 'node:assert/strict';
import {EidolonManager} from '../js/systems/EidolonManager.js';
import {BattleManager} from '../js/battle/BattleManager.js';
import {BattleStateMachine,BattleState} from '../js/battle/BattleStateMachine.js';
import {DamageCalculator} from '../js/battle/DamageCalculator.js';
import {elementMultiplier} from '../js/systems/ElementSystem.js';
import {StatusEffectSystem} from '../js/systems/StatusEffectSystem.js';
import {TurnManager} from '../js/battle/TurnManager.js';
import {getSkillsFor} from '../js/systems/SkillSystem.js';
import {EIDOLONS} from '../js/data/eidolons.js';
import {SPECIES_SKILLS,SKILLS} from '../js/data/skills.js';
import {EnemyAI} from '../js/battle/EnemyAI.js';
import {canUseSkill} from '../js/systems/SkillSystem.js';

const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
const manager=new EidolonManager();
const starter=manager.create('emberling',5);assert.equal(starter.skills.length,4);manager.addOwned(starter);
const second=manager.create('crysturtle',4);manager.addOwned(second);
assert.equal(getSkillsFor(starter).length,4);for(const species of EIDOLONS){assert.equal(SPECIES_SKILLS[species.id].length,4);for(const id of SPECIES_SKILLS[species.id])assert.ok(SKILLS[id],`missing skill ${id}`);}

const sm=new BattleStateMachine();assert.equal(sm.state,BattleState.BATTLE_START);sm.transition(BattleState.INTRODUCTION);assert.throws(()=>sm.transition(BattleState.VICTORY));sm.transition(BattleState.PLAYER_COMMAND);
const calc=new DamageCalculator();const dmg=calc.calculate({attacker:{level:5,attack:12,special:12},defender:{defense:6,specialDefense:6,element:'Ice'},skill:{power:10,accuracy:100,category:'Physical',element:'Fire'},random:()=>.5});assert.ok(dmg.hit&&dmg.damage>0);assert.equal(dmg.elementMultiplier,2);assert.equal(calc.calculate({attacker:{level:1,attack:1},defender:{defense:1,element:'Fire'},skill:{power:10,accuracy:0,category:'Physical',element:'Fire'},random:()=>.5}).hit,false);
assert.equal(elementMultiplier('Water','Fire'),2);assert.equal(elementMultiplier('Lightning','Earth'),.5);
const statuses=new StatusEffectSystem();const target={hp:20,maxHP:20,status:null};assert.equal(statuses.apply(target,'burn',()=>0),true);assert.equal(statuses.apply(target,'poison',()=>0),false);assert.ok(statuses.resolveEndTurn(target).damage>0);for(const id of ['burn','poison','freeze','paralysis','curse','sleep']){const unit={hp:20,maxHP:20,status:null};assert.equal(statuses.apply(unit,id,()=>0),true,`status ${id} should apply`);}
const order=new TurnManager().order({type:'skill',priority:0},{type:'switch'},8,20,()=>0);assert.deepEqual(order,['enemy','player']);
const enemySkill=SKILLS['shadow-claw'];assert.equal(canUseSkill({energy:12,hp:20},enemySkill),true);const ai=new EnemyAI();const choice=ai.choose({speciesId:'grimfang',skills:['shadow-claw'],energy:12,hp:20},{element:'Fire'},()=>.5);assert.equal(choice.skill.id,'shadow-claw');

const oldRandom=Math.random;Math.random=()=>.5;
try {
  let encounter=manager.startTestEncounter();assert.ok(encounter);
  let battle=new BattleManager({eidolons:manager},encounter);assert.equal(battle.machine.state,BattleState.PLAYER_COMMAND);
  battle.enemy.hp=100;battle.enemy.speed=1;battle.enemy.skills=['shadow-claw'];battle.enemy.energy=12;battle.player.speed=999;const hpBeforeCounter=battle.player.hp;const counterSkill=battle.skills.find(s=>s.category!=='Support'&&s.energyCost<=battle.player.energy);const counter=battle.act({type:'skill',skill:counterSkill});assert.equal(counter.ok,true);assert.ok(battle.player.hp<hpBeforeCounter,'wild Eidolon must counterattack after player acts');assert.ok(battle.messages.some(m=>m.includes('used Shadow Claw')));battle.close();
  encounter=manager.startTestEncounter();battle=new BattleManager({eidolons:manager},encounter);
  battle.openMenu('skills');assert.equal(battle.machine.state,BattleState.PLAYER_SKILL_SELECT);
  battle.enemy.hp=1;
  const skill=battle.skills.find(s=>s.category!=='Support'&&s.energyCost<=battle.player.energy);
  const action=battle.act({type:'skill',skill});assert.equal(action.ok,true);assert.equal(battle.ended,true);assert.equal(battle.result,'VICTORY');assert.equal(battle.machine.state,BattleState.VICTORY);
  battle.close();assert.equal(battle.machine.state,BattleState.BATTLE_END);

  // Capture path: temporary wild instance is only added after successful capture.
  encounter=manager.startTestEncounter();battle=new BattleManager({eidolons:manager},encounter);battle.enemy.hp=1;battle.openMenu('items');
  const wildId=encounter.instance.instanceId;const before=manager.instances.size;
  Math.random=()=>0;const capture=battle.act({type:'item',id:'ancient'});assert.equal(capture.ok,true);assert.equal(battle.result,'CAPTURE');assert.equal(manager.instances.has(wildId),true);assert.equal(manager.instances.size,before+1);
} finally {Math.random=oldRandom;}
console.log('Phase 5 tests passed (state transitions, skills, damage, elements, status effects, priority, enemy counterattack regression, victory, capture and temporary enemy ownership).');
