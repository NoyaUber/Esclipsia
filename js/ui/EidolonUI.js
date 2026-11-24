import {EIDOLONS,getEidolonSpecies} from '../data/eidolons.js';
import {SOUL_SIGILS} from '../data/soulSigils.js';
import {EVOLUTIONS} from '../data/evolutions.js';
import {createEidolonSprite} from '../render/EidolonArtPhase4.js';
import {SkillLearningManager} from '../systems/SkillLearningManager.js';
import {LevelUpUI} from './LevelUpUI.js';
import {SkillLearningUI} from './SkillLearningUI.js';
import {EvolutionUI} from './EvolutionUI.js';
import {EvolutionAnimation} from './EvolutionAnimation.js';
export class EidolonUI {
 constructor(game,manager){
  this.game=game;this.manager=manager;this.root=document.getElementById('eidolon-ui');this.skillLearning=new SkillLearningManager();this.levelUI=new LevelUpUI();this.skillUI=new SkillLearningUI();this.evolutionUI=new EvolutionUI();this.evolutionAnimation=new EvolutionAnimation();this.pendingSkillChoice=null;this.pendingEvolution=null;
  this.root.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)this.act(b.dataset.action,b.dataset.id,b.dataset.sigil);});
  this._key=e=>{if(this.root.hidden)return;if(e.key==='Escape'||e.key==='Backspace'){e.preventDefault();this.close();return;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){const buttons=[...this.root.querySelectorAll('button:not(:disabled)')];if(!buttons.length)return;const i=buttons.indexOf(document.activeElement);const dir=(e.key==='ArrowUp'||e.key==='ArrowLeft')?-1:1;buttons[(i+dir+buttons.length)%buttons.length].focus();e.preventDefault();}else if(e.key==='Enter'&&document.activeElement?.matches('#eidolon-ui button:not(:disabled)')){document.activeElement.click();e.preventDefault();}};window.addEventListener('keydown',this._key);
 }
 open(view='party'){this.view=view;this.render();this.root.hidden=false;this.game.input.enabled=false;this.root.querySelector('button:not(:disabled)')?.focus();}
 close(){this.root.hidden=true;this.game.input.enabled=true;this.game.input.latchHeld();this.pendingSkillChoice=null;this.pendingEvolution=null;}
 async act(action,id,sigil){
  if(action==='close'){this.close();return;}
  if(action==='party')this.view='party';if(action==='storage')this.view='storage';if(action==='bestiary')this.view='bestiary';if(action==='progress')this.view='progress';
  if(action==='show-skills'){this.expandedSkills=this.expandedSkills===id?null:id;this.view='progress';}
  if(action==='show-evolutions'){this.expandedEvolution=this.expandedEvolution===id?null:id;this.view='progress';}
  if(action==='encounter'){const e=this.manager.currentEncounter??this.manager.startTestEncounter();this.view=e?'encounter':'party';}
  if(action==='battle'){if(this.manager.currentEncounter){this.root.hidden=true;this.game.input.latchHeld();this.game.scenes.push('battle',{encounter:this.manager.currentEncounter});return;}}
  if(action==='capture'){const result=this.manager.attemptCapture(sigil);this.notice=result.result==='SUCCESS'?'Bond formed!':result.result==='FAILURE'?'The Eidolon broke free.':result.result;this.view=this.manager.currentEncounter?'encounter':'party';}
  if(action==='select'){this.manager.party.select(id);this.view='party';}
  if(action==='to-party'){this.manager.moveToParty(id);this.view='storage';}
  if(action==='to-storage'){this.manager.moveToStorage(id);this.view='party';}
  if(action==='swap-up'||action==='swap-down'){const i=this.manager.party.ids.indexOf(id);this.manager.party.reorder(i,i+(action==='swap-up'?-1:1));}
  if(action==='skill-replace-confirm') { const c=this.pendingSkillChoice,instance=c&&this.manager.instances.get(c.instanceId);if(instance&&this.skillLearning.replace(instance,c.skillId,c.oldSkillId)){this.notice='Skill successfully replaced.';}else this.notice='Skill replacement could not be completed.';this.pendingSkillChoice=null; }
  if(action==='skill-decline') { const instance=this.manager.instances.get(id);if(instance)this.skillLearning.decline(instance,sigil);this.notice='New skill declined.'; }
  if(action==='skill-defer') { this.notice='Skill decision saved for later.'; }
  if(action==='skill-replace-cancel') this.pendingSkillChoice=null;
  if(action==='evolve-select') { this.pendingEvolution={instanceId:id,evolutionId:sigil}; }
  if(action==='evolve-cancel') this.pendingEvolution=null;
  if(action==='evolve-confirm') {
   const choice=this.pendingEvolution;this.pendingEvolution=null;
   if(choice){const result=this.manager.evolution.evolve(choice.instanceId,choice.evolutionId,{token:`${choice.instanceId}:${choice.evolutionId}:${Date.now()}`});if(result.ok){this.manager.save();await this.evolutionAnimation.play(this.root,result.from.name,result.to.name);this.notice=`${result.from.name} evolved into ${result.to.name}!`;}else this.notice=`Evolution failed: ${result.reason}.`;}
  }
  this.manager.save();this.render();
 }
 el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 render(){
  const root=this.root;root.replaceChildren();const panel=this.el('section','eidolon-panel');const header=this.el('header','eidolon-header');header.append(this.el('h2','','EIDOLON ARCHIVE'));const close=this.el('button','eidolon-close','×');close.dataset.action='close';header.append(close);panel.append(header);
  const nav=this.el('nav','eidolon-nav');for(const [v,label] of [['party','Party'],['storage','Storage'],['bestiary','Bestiary'],['progress','Progress'],['encounter','Test Encounter']]){const b=this.el('button',this.view===v?'active':'',label);b.dataset.action=v==='encounter'?'encounter':v;nav.append(b);}panel.append(nav);
  if(this.notice){panel.append(this.el('p','eidolon-notice',this.notice));this.notice='';}
  const body=this.el('div','eidolon-body');
  if(this.view==='party'||this.view==='storage'){
   const ids=this.view==='party'?this.manager.party.ids:this.manager.storage.ids;body.append(this.el('h3','',this.view==='party'?`Active Party (${ids.length}/4)`:`Storage (${ids.length})`));
   if(!ids.length)body.append(this.el('p','eidolon-muted','No Eidolons here yet.'));
   ids.forEach((id,i)=>{const m=this.manager.instances.get(id),s=getEidolonSpecies(m.speciesId);const row=this.el('article','eidolon-row');const sprite=createEidolonSprite(s.id);sprite.className='eidolon-sprite';const info=this.el('div','eidolon-row-info');info.append(this.el('strong','',m.nickname||s.name),this.el('small','',`${s.element} · ${s.rarity} · Lv.${m.level} · HP ${m.currentHP}/${m.maxHP??m.stats?.hp??s.baseHP}`));row.append(sprite,info);
    if(this.view==='party'){const up=this.el('button','','↑');up.dataset.action='swap-up';up.dataset.id=id;up.disabled=i===0;const down=this.el('button','','↓');down.dataset.action='swap-down';down.dataset.id=id;down.disabled=i===ids.length-1;const move=this.el('button','','Store');move.dataset.action='to-storage';move.dataset.id=id;row.append(up,down,move);}
    else {const move=this.el('button','','Add to party');move.dataset.action='to-party';move.dataset.id=id;move.disabled=this.manager.party.full;row.append(move);}body.append(row);
   });
  }else if(this.view==='bestiary'){
   body.append(this.el('h3','','Species discovered'));EIDOLONS.forEach(s=>{const known=this.manager.bestiary.has(s.id),owned=[...this.manager.instances.values()].some(m=>m.speciesId===s.id);const row=this.el('article','eidolon-row');if(known){const sprite=createEidolonSprite(s.id);sprite.className='eidolon-sprite';row.append(sprite);}row.append(this.el('strong','',known?s.name:'?????'),this.el('small','',known?`${s.element} · ${s.rarity} · ${s.description}`:'Undiscovered species'));row.append(this.el('small','',known?(owned?'OWNED':'DISCOVERED'):'HIDDEN'));
    if(known){const links=EVOLUTIONS.filter(rule=>rule.sourceSpeciesId===s.id&&this.manager.bestiary.has(rule.targetSpeciesId)).map(rule=>getEidolonSpecies(rule.targetSpeciesId)?.name).filter(Boolean);if(links.length)row.append(this.el('small','',`Known evolutions: ${links.join(', ')}`));}body.append(row);});
  }else if(this.view==='progress'){
   body.append(this.el('h3','','Eidolon Progression'));if(!this.manager.instances.size)body.append(this.el('p','eidolon-muted','No owned Eidolons yet.'));
   for(const [id,m] of this.manager.instances){const species=getEidolonSpecies(m.speciesId);const card=this.el('article','progress-eidolon');const sprite=createEidolonSprite(species.id);sprite.className='eidolon-sprite';card.append(sprite,this.levelUI.render(m));
    const options=this.manager.evolution.available(m);const evolve=this.el('button','',`Evolution paths (${options.length})`);evolve.dataset.action='show-evolutions';evolve.dataset.id=id;card.append(evolve);
    const skills=this.el('button','',`Pending skills (${m.pendingSkills?.length??0})`);skills.dataset.action='show-skills';skills.dataset.id=id;card.append(skills);
    if(this.pendingSkillChoice?.instanceId===id){const confirm=this.el('p','eidolon-notice',`Replace ${this.pendingSkillChoice.oldSkillId} with ${this.pendingSkillChoice.skillId}?`);card.append(confirm);const yes=this.el('button','eidolon-primary','Confirm replacement');yes.dataset.action='skill-replace-confirm';card.append(yes);const no=this.el('button','','Cancel');no.dataset.action='skill-replace-cancel';card.append(no);}
    if(this.pendingEvolution?.instanceId===id){const rule=EVOLUTIONS.find(x=>x.id===this.pendingEvolution.evolutionId);const target=rule&&getEidolonSpecies(rule.targetSpeciesId);card.append(this.el('p','eidolon-notice',`Evolve ${species.name} into ${target?.name??'unknown'}? This cannot be undone.`));const yes=this.el('button','eidolon-primary','Confirm evolution');yes.dataset.action='evolve-confirm';card.append(yes);const no=this.el('button','','Cancel');no.dataset.action='evolve-cancel';card.append(no);}
    if(this.expandedSkills===id){card.append(this.skillUI.render(m,{replace:(skillId,oldId)=>{this.pendingSkillChoice={instanceId:id,skillId,oldSkillId:oldId};this.render();},decline:skillId=>{this.skillLearning.decline(m,skillId);this.manager.save();this.notice='New skill declined.';this.render();},defer:()=>{this.notice='Skill decision saved for later.';this.render();}}));}
    if(this.expandedEvolution===id){card.append(this.evolutionUI.render(m,options,{choose:option=>{this.pendingEvolution={instanceId:id,evolutionId:option.id};this.render();}}));}
    body.append(card);
   }
  }else if(this.view==='encounter'){
   const e=this.manager.currentEncounter;if(!e){body.append(this.el('p','','No encounter is active.'));const b=this.el('button','eidolon-primary','Find test encounter');b.dataset.action='encounter';body.append(b);}
   else {body.append(this.el('h3','',`Wild ${e.species.name}!`),this.el('p','',`${e.species.element} · ${e.species.rarity} · Level ${e.level}`),this.el('p','',e.species.description),this.el('p','eidolon-muted',`Test HP: ${e.instance.currentHP}`));const battle=this.el('button','eidolon-primary','Begin Battle');battle.dataset.action='battle';body.append(battle);for(const [id,s] of Object.entries(SOUL_SIGILS)){const b=this.el('button','eidolon-primary',`${s.name} (${this.manager.inventory[id]})`);b.dataset.action='capture';b.dataset.sigil=id;b.disabled=this.manager.inventory[id]<=0;body.append(b);}}
  }
  panel.append(body);root.append(panel);
 }
}
