export const STATUS_EFFECTS = Object.freeze({
 burn:{id:'burn',name:'Burn',duration:3,applicationChance:18,effectTiming:'endTurn',effectStrength:.08,restriction:null,expiration:'clear'},
 poison:{id:'poison',name:'Poison',duration:4,applicationChance:30,effectTiming:'endTurn',effectStrength:.10,restriction:null,expiration:'clear'},
 freeze:{id:'freeze',name:'Freeze',duration:2,applicationChance:12,effectTiming:'action',effectStrength:1,restriction:'skip',expiration:'clear'},
 paralysis:{id:'paralysis',name:'Paralysis',duration:3,applicationChance:16,effectTiming:'action',effectStrength:.25,restriction:'slow',expiration:'clear'},
 curse:{id:'curse',name:'Curse',duration:3,applicationChance:20,effectTiming:'endTurn',effectStrength:.07,restriction:null,expiration:'clear'},
 sleep:{id:'sleep',name:'Sleep',duration:2,applicationChance:15,effectTiming:'action',effectStrength:1,restriction:'skip',expiration:'clear'},
});
