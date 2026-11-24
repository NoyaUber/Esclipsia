export const PROGRESSION_CONFIG = Object.freeze({
  maxLevel: 100,
  defaultGrowthRate: 1,
  hpRatioOnLevelUp: 1,
  hpRatioOnEvolution: 1,
  autoLearnWhenSlotsAvailable: true,
  maxActiveSkills: 4,
  expShare: 'participants', // 'participants' or 'party'
  expShareMode: 'full', // 'full' or 'split'
  expRewardMultiplier: 1,
  growthCurves: Object.freeze({ Fast: 'fast', Medium: 'medium', Slow: 'slow' }),
});
