import {createEidolonBattleSheet} from './EidolonArt.js';
const COLORS={
 mistray:['#183b52','#4e9cb5','#b4e8ed'],zephlet:['#c6c4ad','#7d9d9c','#e4e6c7'],
 voltkit:['#29243e','#7663c7','#f6dc65'],frostmote:['#24475b','#7db9d0','#e0f7ff'],dreadwolf:['#241c29','#66516f','#c5a4d4'],moonwraith:['#1e2337','#59678e','#d7e4ff']
};
export function createEidolonSprite(id){
 const c=document.createElement('canvas');c.width=32;c.height=32;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
 if(['grimfang','emberling','crysturtle','wraithling'].includes(id)){const sheet=createEidolonBattleSheet(id);x.drawImage(sheet,0,0,32,32,0,0,32,32);return c;}
 const p=COLORS[id];if(!p){x.fillStyle='#ff00ff';x.fillRect(0,0,32,32);return c;}
 const [dark,mid,light]=p;
 x.fillStyle='rgba(0,0,0,.35)';x.fillRect(7,27,18,3);
 if(id==='mistray'){
  x.fillStyle=dark;x.fillRect(8,12,16,13);x.fillRect(11,8,10,17);x.fillStyle=mid;x.fillRect(10,10,12,13);x.fillRect(5,16,5,6);x.fillRect(22,16,5,6);x.fillStyle=light;x.fillRect(12,12,3,3);x.fillRect(19,12,2,3);x.fillRect(14,18,5,2);
 }else if(id==='zephlet'){
  x.fillStyle=mid;x.fillRect(9,10,14,14);x.fillRect(5,14,7,5);x.fillRect(21,14,7,5);x.fillStyle=light;x.fillRect(12,7,8,5);x.fillRect(13,13,2,2);x.fillRect(19,13,2,2);x.fillStyle=dark;x.fillRect(14,20,4,5);x.fillRect(9,24,5,2);x.fillRect(19,24,5,2);
 }else if(id==='voltkit'){
  x.fillStyle=dark;x.fillRect(8,13,16,12);x.fillRect(10,9,12,7);x.fillRect(7,8,5,7);x.fillRect(20,8,5,7);x.fillStyle=mid;x.fillRect(11,11,10,10);x.fillStyle=light;x.fillRect(12,13,3,2);x.fillRect(19,13,2,2);x.fillRect(23,19,7,2);x.fillRect(27,16,3,3);x.fillRect(5,22,4,2);
 }else if(id==='dreadwolf'){
  x.fillStyle=dark;x.fillRect(7,12,18,13);x.fillRect(9,7,5,8);x.fillRect(19,7,5,8);x.fillRect(3,17,6,4);x.fillStyle=mid;x.fillRect(10,12,12,10);x.fillStyle=light;x.fillRect(12,14,3,2);x.fillRect(19,14,3,2);x.fillRect(24,19,6,2);
 }else if(id==='moonwraith'){
  x.fillStyle=dark;x.fillRect(9,9,14,17);x.fillRect(5,14,22,10);x.fillStyle=mid;x.fillRect(11,7,10,16);x.fillRect(6,12,5,9);x.fillRect(21,12,5,9);x.fillStyle=light;x.fillRect(12,11,3,3);x.fillRect(19,11,3,3);x.fillRect(15,17,3,3);x.fillRect(15,3,2,4);
 }else{
  x.fillStyle=dark;x.fillRect(9,10,14,16);x.fillRect(7,15,18,9);x.fillStyle=mid;x.fillRect(11,9,10,14);x.fillRect(12,7,8,5);x.fillStyle=light;x.fillRect(13,12,2,3);x.fillRect(19,12,2,3);x.fillRect(15,18,3,2);x.fillStyle='#ffffff';x.fillRect(15,4,2,3);x.fillRect(8,6,2,3);x.fillRect(23,7,2,3);
 }
 return c;
}
