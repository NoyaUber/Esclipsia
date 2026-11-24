const definitions = [
  { id: 'grimfang-dreadwolf', sourceSpeciesId: 'grimfang', targetSpeciesId: 'dreadwolf', evolutionType: 'LEVEL', minimumLevel: 20, requiredItem: null, requiredCondition: null, requiredLocation: null, requiredStoryFlag: null, optionalBranchId: 'grimfang-path', priority: 1 },
  { id: 'grimfang-moonwraith', sourceSpeciesId: 'grimfang', targetSpeciesId: 'moonwraith', evolutionType: 'ITEM', minimumLevel: 1, requiredItem: 'shadowCrystal', requiredCondition: null, requiredLocation: null, requiredStoryFlag: null, optionalBranchId: 'grimfang-path', priority: 2 },
];
export const EVOLUTIONS = Object.freeze(definitions.map(x => Object.freeze({ ...x })));
export const EVOLUTION_BY_ID = Object.freeze(Object.fromEntries(EVOLUTIONS.map(x => [x.id, x])));
