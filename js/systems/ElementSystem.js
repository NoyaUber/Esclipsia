import {elementMultiplier} from '../data/elementalChart.js';
export {elementMultiplier};
export function effectivenessLabel(multiplier){return multiplier>1?'Super effective!':multiplier<1?'Not very effective.':'It had a normal effect.';}
