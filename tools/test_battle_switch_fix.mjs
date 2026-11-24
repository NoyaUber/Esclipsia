import assert from 'node:assert/strict';
import { EidolonManager } from '../js/systems/EidolonManager.js';
import { BattleManager } from '../js/battle/BattleManager.js';
import { BattleState as S } from '../js/battle/BattleStateMachine.js';

function fresh() {
  const store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  const eidolons = new EidolonManager();
  for (const species of ['crysturtle', 'mistray', 'voltkit']) eidolons.addOwned(eidolons.create(species, 3));
  const encounter = eidolons.startTestEncounter('ashenveil_forest');
  const game = { eidolons, experience: { awardBattleExp: () => ({ exp: 0 }) }, events: null };
  return { eidolons, battle: new BattleManager(game, encounter) };
}
function forceActiveDown(battle) {
  battle.player.hp = 0;
  battle._syncOwned();
  battle._state(S.TURN_RESOLUTION);
  battle._state(S.STATUS_RESOLUTION);
  battle._state(S.CHECK_RESULT);
  battle._checkResult();
}

// One reserve is enough: forced switch is mandatory and confirms successfully.
{
  const { eidolons, battle } = fresh();
  const active = battle.playerActiveId;
  const reserve = eidolons.party.ids.find(id => id !== active);
  for (const id of eidolons.party.ids) if (id !== active && id !== reserve) eidolons.instances.get(id).currentHP = 0;
  forceActiveDown(battle);
  assert.equal(battle.forcedSwitch, true);
  const result = battle.act({ type: 'switch', id: reserve });
  assert.equal(result.ok, true);
  assert.equal(battle.playerActiveId, reserve);
  assert.equal(battle.forcedSwitch, false);
  assert(battle.player.hp > 0);
}

// A defeated reserve cannot be selected; the mandatory replacement state remains available.
{
  const { eidolons, battle } = fresh();
  const active = battle.playerActiveId;
  const defeated = eidolons.party.ids.find(id => id !== active);
  eidolons.instances.get(defeated).currentHP = 0;
  forceActiveDown(battle);
  const result = battle.act({ type: 'switch', id: defeated });
  assert.equal(result.ok, false);
  assert.equal(battle.forcedSwitch, true);
  assert.equal(battle.ended, false);
}

// If no Eidolon remains, defeat resolves rather than trapping the player in switch selection.
{
  const { eidolons, battle } = fresh();
  for (const id of eidolons.party.ids) eidolons.instances.get(id).currentHP = 0;
  forceActiveDown(battle);
  assert.equal(battle.ended, true);
  assert.equal(battle.result, 'DEFEAT');
}
console.log('Battle switch regression tests passed (single reserve, invalid defeated reserve, no surviving party).');
