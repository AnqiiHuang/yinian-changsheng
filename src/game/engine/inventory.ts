import { ITEM_MAP } from '../content';
import type { ItemInstance, RunState, SaveData } from '../types';
import { uid } from './rng';

function stackable(itemId: string): boolean {
  const kind = ITEM_MAP[itemId]?.type;
  return kind === 'material' || kind === 'consumable';
}

export function addToList(list: ItemInstance[], itemId: string, qty: number, ownership: ItemInstance['ownership']): ItemInstance {
  if (stackable(itemId)) {
    const found = list.find((item) => item.definitionId === itemId && item.ownership === ownership && !item.sealed);
    if (found) {
      found.qty += qty;
      return found;
    }
  }
  const created: ItemInstance = {
    instanceId: uid(itemId),
    definitionId: itemId,
    qty: stackable(itemId) ? qty : 1,
    ownership,
    sealed: false,
  };
  list.push(created);
  if (!stackable(itemId) && qty > 1) {
    for (let i = 1; i < qty; i += 1) {
      list.push({ ...created, instanceId: uid(itemId), qty: 1 });
    }
  }
  return created;
}

export function removeFromList(list: ItemInstance[], itemId: string, qty: number): boolean {
  let left = qty;
  for (const item of list) {
    if (item.definitionId !== itemId || item.sealed) continue;
    const take = Math.min(item.qty, left);
    item.qty -= take;
    left -= take;
    if (left <= 0) break;
  }
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i].qty <= 0) list.splice(i, 1);
  }
  return left <= 0;
}

export function countList(list: ItemInstance[], itemId: string): number {
  return list.filter((item) => item.definitionId === itemId).reduce((sum, item) => sum + item.qty, 0);
}

export function removeSupply(run: RunState, itemId: string, qty: number): boolean {
  let left = qty;
  for (const item of run.supplies) {
    if (item.definitionId !== itemId) continue;
    const take = Math.min(item.qty, left);
    item.qty -= take;
    left -= take;
  }
  run.supplies = run.supplies.filter((item) => item.qty > 0);
  return left <= 0;
}

export function payItem(save: SaveData, itemId: string, qty: number): boolean {
  const inRun = Boolean(save.run) && ITEM_MAP[itemId]?.type === 'consumable';
  if (inRun && save.run) {
    const supplies = save.run.supplies.filter((item) => item.definitionId === itemId).reduce((sum, item) => sum + item.qty, 0);
    if (supplies < qty) return false;
    return removeSupply(save.run, itemId, qty);
  }
  const owned = countList(save.player.inventory.filter((item) => item.ownership === 'permanent'), itemId);
  if (owned < qty) return false;
  return removeFromList(save.player.inventory, itemId, qty);
}

export function treasureDefinitions(save: SaveData, instanceIds: string[]): string[] {
  return instanceIds
    .map((id) => save.player.inventory.find((item) => item.instanceId === id)?.definitionId)
    .filter((id): id is string => Boolean(id));
}

export function runTreasureDefinitions(save: SaveData): string[] {
  if (!save.run) return [];
  return save.run.loadout.treasureInstanceIds
    .map((id) => {
      const owned = save.player.inventory.find((item) => item.instanceId === id);
      if (owned) return owned.definitionId;
      return save.run?.loot.find((item) => item.instanceId === id)?.definitionId;
    })
    .filter((id): id is string => Boolean(id));
}
