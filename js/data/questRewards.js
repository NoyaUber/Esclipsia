/** Quest reward item catalog. IDs map to the existing EidolonManager inventory keys. */
export const QUEST_REWARD_ITEMS = Object.freeze({
  healing_potion: Object.freeze({ id: 'potion', name: 'Healing Potion', category: 'consumable' }),
  soul_sigil: Object.freeze({ id: 'basic', name: 'Soul Sigil', category: 'capture' }),
  evolution_stone: Object.freeze({ id: 'shadowCrystal', name: 'Evolution Stone', category: 'evolution' }),
  monster_essence: Object.freeze({ id: 'monsterEssence', name: 'Monster Essence', category: 'material' }),
  ancient_relic: Object.freeze({ id: 'ancientRelic', name: 'Ancient Relic', category: 'relic' }),
  herb: Object.freeze({ id: 'herb', name: 'Herb', category: 'material' }),
});
