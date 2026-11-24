import { Scene } from './Scene.js';
import { LOGICAL_WIDTH as W, LOGICAL_HEIGHT as H, PALETTE } from '../core/Renderer.js';
import { Action } from '../core/InputManager.js';

const CHAPTERS = [
  { title: 'THE WORLD BEFORE', flag: 'introduced_aether', lines: [
    'Long before the ash swallowed the horizon, Eclipsia flourished beneath a living sky.',
    'Aether flowed through every root, river, spell, and beating heart — the quiet current that bound all life together.',
    'At the heart of that current rested the Origin Core. Its true nature was known to very few.'
  ]},
  { title: 'THE SEVEN KINGDOMS', flag: 'introduced_origin_core', lines: [
    'Humanity learned to shape Aether. Villages became cities, and cities rose into kingdoms.',
    'In time, seven great kingdoms stood across Eclipsia. Each sought knowledge, strength, and a future of its own.',
    'Yet the Origin Core remained the balance upon which their world depended.'
  ]},
  { title: 'THE SHATTERING', flag: 'introduced_shattering', lines: [
    'The kingdoms turned their ambitions toward the Origin Core. Alliances fractured, and war followed.',
    'When the struggle reached its heart, the balance of Aether broke. The sky split, lands were torn apart, and an age of ruin began.',
    'The catastrophe came to be remembered as the Shattering.'
  ]},
  { title: 'THE FORGOTTEN AGE', flag: 'introduced_eidolons', lines: [
    'Generations passed. Names faded, roads vanished, and much of the old history became a collection of half-remembered tales.',
    'Eidolons — beings bound to the currents of Aether — still wander the world. Some are feared, some revered, and some remain beyond understanding.',
    'The world endured, but the wounds of the Shattering never truly healed.'
  ]},
  { title: 'ASHENVEIL', flag: 'prologue_ashenveil_seen', lines: [
    'In the forgotten reaches of the old kingdom lies Ashenveil, a village surviving among grey fields and fading memories.',
    'Here lives Kael. The people know him as one of their own, though strange echoes sometimes stir around him.',
    'There are questions within him that even he cannot yet name.'
  ]},
  { title: 'THE BEGINNING', flag: 'prologue_completed', lines: [
    'Tonight, the wind carries an unfamiliar tremor through Ashenveil. Somewhere beyond the village, an Eidolon answers.',
    'The past has remained silent for generations. Perhaps it is time for the silence to end.',
    'Your journey begins. Take your first steps through Ashenveil.'
  ]}
];

export class PrologueScene extends Scene {
  enter() {
    this.chapter = 0; this.line = 0; this.time = 0; this.reveal = 0; this.done = false;
    this.portrait = this.game.assets.get('kael_dialogue_portrait');
    this.game.eidolons.storyFlags.set('prologue_started', true);
  }
  update(dt) {
    if (this.done) return;
    this.time += dt; this.reveal = Math.min(this.currentLine.length, this.reveal + dt * 54);
    const input = this.input;
    if (input.wasPressed(Action.CANCEL) || input.wasKeyPressed('KeyB')) { this.finish(); return; }
    if (input.wasPressed(Action.CONFIRM) || input.wasKeyPressed('KeyA') || input.tapTotal) {
      if (this.reveal < this.currentLine.length) this.reveal = this.currentLine.length;
      else this.advance();
    }
  }
  get currentLine() { return CHAPTERS[this.chapter].lines[this.line]; }
  advance() {
    const chapter = CHAPTERS[this.chapter];
    if (this.line < chapter.lines.length - 1) { this.line++; this.reveal = 0; return; }
    this.game.eidolons.storyFlags.set(chapter.flag, true);
    this.game.eidolons.save();
    if (this.chapter < CHAPTERS.length - 1) { this.chapter++; this.line = 0; this.reveal = 0; }
    else this.finish();
  }
  finish() {
    if (this.done) return; this.done = true;
    this.game.eidolons.storyFlags.set('prologue_completed', true);
    this.game.eidolons.save();
    this.game.scenes.pop();
  }
  render(r) {
    const ctx = r.ctx; ctx.fillStyle = '#090b13'; ctx.fillRect(0,0,W,H);
    const glow = 0.08 + Math.sin(this.time * .6) * .025;
    ctx.fillStyle = `rgba(91,65,115,${glow})`; ctx.fillRect(0,0,W,H);
    for (let i=0;i<28;i++) { const x=(i*73+this.time*3)%W, y=(i*41+this.time*1.5)%H; ctx.fillStyle='rgba(190,145,115,.22)'; ctx.fillRect(x,y,1,1); }
    r.text('ECLIPSIA',W/2,13,{align:'center',size:15,font:'title',weight:'bold',color:PALETTE.goldHi});
    r.text(CHAPTERS[this.chapter].title,W/2,35,{align:'center',size:7,color:'#b9a6d2'});
    const iw=47, ih=78, scale=Math.min(iw/this.portrait.width,ih/this.portrait.height);
    const dw=this.portrait.width*scale, dh=this.portrait.height*scale;
    ctx.fillStyle='rgba(9,10,16,.95)'; ctx.fillRect(8,52,51,82); ctx.strokeStyle=PALETTE.gold; ctx.strokeRect(8,52,51,82);
    ctx.drawImage(this.portrait,10+(47-dw)/2,54+(78-dh)/2,dw,dh);
    r.panel(68,49,244,88,{alpha:.96,border:PALETTE.gold});
    const words=this.currentLine.slice(0,Math.floor(this.reveal));
    const lines=[]; let current='';
    for(const word of words.split(' ')){const next=current?`${current} ${word}`:word;if(r.measure(next,7)>220){lines.push(current);current=word;}else current=next;} if(current)lines.push(current);
    lines.slice(0,5).forEach((line,i)=>r.text(line,78,66+i*12,{size:7,color:PALETTE.text}));
    r.text(`${this.chapter+1} / ${CHAPTERS.length}`,W/2,149,{align:'center',size:6,color:PALETTE.textDim});
    r.text('A / Z / ENTER: Continue     B / X / ESC: Skip',W/2,166,{align:'center',size:5.5,color:PALETTE.textDim});
  }
}
