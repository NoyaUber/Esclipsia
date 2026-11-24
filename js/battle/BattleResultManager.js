import { BATTLE_BALANCE } from '../data/battleBalance.js';
import { ExperienceManager } from '../systems/ExperienceManager.js';
export class BattleResultManager {
  constructor(balance = BATTLE_BALANCE, experience = new ExperienceManager(), events = null) { this.balance = balance; this.experience = experience; this.events = events; }
  award(manager, participants, enemy) {
    const exp = Math.max(0, Math.floor((this.balance.expBase + enemy.level * this.balance.expLevelFactor) * (this.balance.expRewardMultiplier ?? 1)));
    const progression = this.experience.award(manager, participants, exp);
    const items = {};
    this.events?.emit?.('EIDOLON_DEFEATED', { targetId: enemy.speciesId, amount: 1, eventId: `battle-defeat:${enemy.instanceId ?? enemy.speciesId}` });
    for (const [id, rule] of Object.entries(this.balance.victoryRewards ?? {})) if (Math.random() < rule.chance) { const granted = typeof manager.addInventoryItem === 'function' ? manager.addInventoryItem(id, rule.amount, { eventId: `battle-drop:${enemy.instanceId ?? enemy.speciesId}:${id}` }) : (manager.inventory[id] = (manager.inventory[id] ?? 0) + rule.amount, this.events?.emit?.('ITEM_ACQUIRED', { targetId: id, amount: rule.amount, eventId: `battle-drop:${enemy.instanceId ?? enemy.speciesId}:${id}` }), true); if (granted) items[id] = rule.amount; }
    manager.save();
    return { exp, participants: progression.recipients.length, items, progression };
  }
}
