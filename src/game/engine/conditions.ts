import { REALM_ORDER } from '../balance/config';
import { ITEM_MAP } from '../content';
import type { Condition, Cost, SaveData } from '../types';
import { shopPrice } from './stats';

export function countItem(save: SaveData, itemId: string, where: 'player' | 'supplies' | 'auto'): number {
  const inRun = Boolean(save.run) && where !== 'player';
  if (where === 'supplies' || (where === 'auto' && inRun && ITEM_MAP[itemId]?.type === 'consumable')) {
    return save.run?.supplies.filter((item) => item.definitionId === itemId).reduce((sum, item) => sum + item.qty, 0) ?? 0;
  }
  return save.player.inventory.filter((item) => item.definitionId === itemId && item.ownership === 'permanent').reduce((sum, item) => sum + item.qty, 0);
}

export function checkCondition(save: SaveData, condition?: Condition): boolean {
  if (!condition) return true;
  switch (condition.op) {
    case 'all':
      return (condition.of ?? []).every((entry) => checkCondition(save, entry));
    case 'any':
      return (condition.of ?? []).some((entry) => checkCondition(save, entry));
    case 'not':
      return !(condition.of ?? []).some((entry) => checkCondition(save, entry));
    case 'realmAtLeast': {
      const current = REALM_ORDER.indexOf(save.player.realm);
      const need = REALM_ORDER.indexOf(condition.realm ?? 'mortal');
      return current >= need;
    }
    case 'item':
      return countItem(save, condition.itemId ?? '', 'auto') >= (condition.qty ?? 1) || countItem(save, condition.itemId ?? '', 'player') >= (condition.qty ?? 1);
    case 'flag':
      return Boolean(save.world.flags[condition.flag ?? '']) === (condition.value ?? true);
    case 'relation':
      return (save.world.relations[condition.npcId ?? '']?.value ?? 0) >= (condition.min ?? 0);
    case 'renown':
      return (save.world.renown[condition.factionId ?? ''] ?? 0) >= (condition.min ?? 0);
    case 'count':
      return (save.world.counters[condition.key ?? ''] ?? 0) >= (condition.min ?? 0);
    case 'location':
      return save.world.currentLocation === condition.locationId;
    case 'road':
      return save.player.road === condition.road;
    case 'school':
      return save.world.flags.school_sword ? condition.school === 'sword' : save.world.flags.school_fire ? condition.school === 'fire' : false;
    case 'stones':
      return save.player.spiritStones >= (condition.min ?? 0);
    case 'runHp':
      return (save.run?.hp ?? 0) >= (condition.min ?? 0);
    default:
      return false;
  }
}

export function costAmount(save: SaveData, cost: Cost): number {
  if (cost.kind === 'stones' && cost.shopDiscount) return shopPrice(save.player, cost.amount);
  return cost.amount;
}

export function costReason(save: SaveData, cost: Cost): string | null {
  const amount = costAmount(save, cost);
  if (cost.kind === 'stones' && save.player.spiritStones < amount) {
    return `灵石不足，还差${amount - save.player.spiritStones}`;
  }
  if (cost.kind === 'runHp') {
    if (!save.run) return '眼下不在历练中';
    if (save.run.hp < amount + 1 && save.run.hp <= amount) return '气血太低，这样做会倒下';
    if (save.run.hp <= amount) return '气血不足';
  }
  if (cost.kind === 'item') {
    const have = Math.max(countItem(save, cost.itemId ?? '', 'auto'), countItem(save, cost.itemId ?? '', 'player'));
    if (have < amount) {
      const name = ITEM_MAP[cost.itemId ?? '']?.name ?? '物品';
      return `${name}不足`;
    }
  }
  return null;
}

export function choiceBlock(save: SaveData, condition: Condition | undefined, costs: Cost[]): string | null {
  if (!checkCondition(save, condition)) {
    if (condition?.op === 'item') {
      const name = ITEM_MAP[condition.itemId ?? '']?.name ?? '所需物品';
      return `没有${name}`;
    }
    if (condition?.op === 'runHp') return '气血太低，不能这么做';
    if (condition?.op === 'stones') return `灵石不足，需要${condition.min}`;
    return '条件不足';
  }
  for (const cost of costs) {
    const reason = costReason(save, cost);
    if (reason) return reason;
  }
  return null;
}
