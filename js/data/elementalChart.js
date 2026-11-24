// Multipliers are intentionally centralized for future balance passes.
const strong = {Fire:['Ice','Wind'],Water:['Fire','Earth'],Earth:['Lightning','Fire'],Wind:['Earth'],Lightning:['Water','Wind'],Ice:['Wind','Earth'],Light:['Shadow'],Shadow:['Light']};
const weak = {Fire:['Water','Earth'],Water:['Lightning'],Earth:['Water','Wind'],Wind:['Ice','Lightning'],Lightning:['Earth'],Ice:['Fire'],Light:['Shadow'],Shadow:['Light']};
export const ELEMENT_CHART = Object.freeze(Object.fromEntries(Object.keys(strong).map(a=>[a,Object.freeze(Object.fromEntries(Object.keys(strong).map(d=>[d,strong[a].includes(d)?2:weak[a].includes(d)?.5:1])))])));
export function elementMultiplier(attack, defend){return ELEMENT_CHART[attack]?.[defend]??1;}
