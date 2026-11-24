const defs = [
 ['shadow-claw','Shadow Claw','Shadow','Physical',9,96,0,0,null,0,'A quick strike from the dusk.'],
 ['ember-burst','Ember Burst','Fire','Special',11,92,3,0,'burn',18,'A burst of living flame.'],
 ['stone-guard','Stone Guard','Earth','Support',0,100,3,2,'guard',100,'Raises defense for one turn.'],
 ['night-pulse','Night Pulse','Shadow','Special',10,94,3,0,'curse',14,'A pulse of unsettling darkness.'],
 ['water-jet','Water Jet','Water','Special',10,96,2,0,null,0,'A focused stream of water.'],
 ['mist-mend','Mist Mend','Water','Support',0,100,4,1,'heal',100,'Restore a portion of HP.'],
 ['wind-slice','Wind Slice','Wind','Physical',9,98,0,1,null,0,'A razor-thin gust.'],
 ['spark-pounce','Spark Pounce','Lightning','Physical',12,90,3,1,'paralysis',16,'A charged pounce.'],
 ['frost-shard','Frost Shard','Ice','Special',11,92,3,0,'freeze',12,'A shard of biting frost.'],
 ['earth-rumble','Earth Rumble','Earth','Physical',12,90,3,0,null,0,'A tremor beneath the target.'],
 ['radiant-flare','Radiant Flare','Light','Special',12,94,4,0,null,0,'A concentrated ray of light.'],
 ['venom-spore','Venom Spore','Shadow','Special',7,95,2,0,'poison',30,'A cloud of lingering venom.'],
 ['dark-hex','Dark Hex','Shadow','Special',8,95,3,0,'curse',25,'A lingering hex.'],
 ['glacier-bite','Glacier Bite','Ice','Physical',10,94,2,0,'freeze',10,'A freezing bite.'],
 ['flare-dash','Flare Dash','Fire','Physical',10,95,2,1,null,0,'A swift fiery dash.'],
 ['gust-call','Gust Call','Wind','Support',0,100,2,2,'guard',100,'Brace against the next attack.'],
 ['drowse','Drowse','Shadow','Support',0,92,3,0,'sleep',35,'A hush that lulls the target to sleep.'],
];
export const SKILLS = Object.freeze(Object.fromEntries(defs.map(d=>[d[0],Object.freeze({id:d[0],name:d[1],element:d[2],category:d[3],power:d[4],accuracy:d[5],energyCost:d[6],priority:d[7],target:'enemy',statusEffect:d[8],statusChance:d[9],description:d[10]})])));
export const SPECIES_SKILLS = Object.freeze({
 grimfang:['shadow-claw','venom-spore','dark-hex','gust-call'], emberling:['ember-burst','flare-dash','stone-guard','night-pulse'],
 crysturtle:['earth-rumble','stone-guard','water-jet','mist-mend'], wraithling:['night-pulse','shadow-claw','venom-spore','dark-hex'],
 mistray:['water-jet','mist-mend','gust-call','frost-shard'], zephlet:['wind-slice','gust-call','spark-pounce','drowse'],
 voltkit:['spark-pounce','wind-slice','radiant-flare','stone-guard'], frostmote:['frost-shard','glacier-bite','mist-mend','water-jet'],
 dreadwolf:['shadow-claw','dark-hex','venom-spore','flare-dash'], moonwraith:['night-pulse','radiant-flare','drowse','glacier-bite'],
});
