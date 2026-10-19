import { BLESSINGS, ENEMIES, EVENTS, ITEMS, poolEvents } from '../content';
import { ENEMY_MAP, EVENT_MAP, ITEM_MAP } from '../content';
import type { SaveData } from '../types';

export function validateContent(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const take = (id: string, label: string) => {
    if (ids.has(id)) errors.push(`重复ID ${id}`);
    ids.add(id);
    if (!id) errors.push(`${label} 缺少ID`);
  };
  for (const item of ITEMS) {
    take(item.id, item.name);
    if (!item.name || !item.description || !item.effectText || !item.source) errors.push(`${item.id} 信息不完整`);
    if (item.sellable && (item.price === null || item.price < 0)) errors.push(`${item.id} 售价无效`);
    if (!item.sellable && item.type === 'plot' && item.price !== null) errors.push(`${item.id} 信物不应标价`);
  }
  for (const enemy of ENEMIES) {
    take(enemy.id, enemy.name);
    if (!enemy.intents.length) errors.push(`${enemy.id} 没有意图`);
    for (const drop of enemy.drops) {
      if (drop.weight < 0) errors.push(`${enemy.id} 掉落权重为负`);
      if (drop.itemId && !ITEM_MAP[drop.itemId]) errors.push(`${enemy.id} 掉落引用了不存在的 ${drop.itemId}`);
    }
  }
  for (const event of EVENTS) {
    take(event.id, event.title);
    if (event.choices.length < 2) errors.push(`${event.id} 选项少于两个`);
    for (const choice of event.choices) {
      if (!choice.resultText) errors.push(`${event.id}/${choice.id} 没有结果`);
      for (const cost of choice.costs) {
        if (cost.amount < 0) errors.push(`${event.id} 成本为负`);
        if (cost.kind === 'item' && !ITEM_MAP[cost.itemId ?? '']) errors.push(`${event.id} 成本物品不存在`);
      }
      for (const effect of choice.effects) {
        if (effect.op === 'item' && !ITEM_MAP[effect.itemId]) errors.push(`${event.id} 奖励物品不存在`);
        if (effect.op === 'battle' && !ENEMY_MAP[effect.enemyId]) errors.push(`${event.id} 战斗敌人不存在`);
        if ((effect.op === 'stones' || effect.op === 'cultivation' || effect.op === 'dao') && effect.amount < 0 && effect.op !== 'stones') {
          errors.push(`${event.id} 奖励为负`);
        }
      }
    }
  }
  const pool = poolEvents();
  if (pool.length < 9) errors.push('独立事件不足9个');
  const chain = EVENTS.filter((event) => event.chainId === 'rain');
  if (chain.length < 3) errors.push('雨夜之约不足3个节点');
  if (!chain.every((event, index) => event.chainStep === index + 1)) errors.push('雨夜之约没有显式步骤');
  if (ITEMS.length < 14) errors.push('物品不足14');
  const count = (type: string) => ITEMS.filter((item) => item.type === type).length;
  if (count('technique') < 2 || count('heart') < 2 || count('treasure') < 4 || count('consumable') < 2 || count('material') < 2 || count('plot') < 2) {
    errors.push('物品类别数量不足');
  }
  if (ENEMIES.filter((enemy) => enemy.rank === 'normal').length < 4) errors.push('普通敌人不足');
  if (ENEMIES.filter((enemy) => enemy.rank === 'elite').length < 1) errors.push('缺少精英');
  if (ENEMIES.filter((enemy) => enemy.rank === 'boss').length < 1) errors.push('缺少首领');
  if (BLESSINGS.length < 6) errors.push('造化不足6种');
  if (!EVENT_MAP.event_spring?.safeFallback) errors.push('缺少安全回退事件');
  return errors;
}

export function validateSave(data: unknown): { ok: true; save: SaveData } | { ok: false; error: string } {
  if (!data || typeof data !== 'object') return { ok: false, error: '存档无法解析' };
  const save = data as SaveData;
  if (save.schemaVersion !== 1) return { ok: false, error: '这份存档版本无法读取' };
  if (typeof save.saveId !== 'string' || typeof save.revision !== 'number') return { ok: false, error: '存档缺少编号' };
  if (!save.player || typeof save.player.name !== 'string') return { ok: false, error: '存档里没有角色' };
  if (!['mortal', 'qi', 'foundation', 'golden'].includes(save.player.realm)) return { ok: false, error: '境界数据损坏' };
  if (!Array.isArray(save.player.inventory) || !save.world || !save.ledger || !Array.isArray(save.ledger.claimedRewardIds)) {
    return { ok: false, error: '存档结构不完整' };
  }
  if (save.run && (!save.run.runId || !Array.isArray(save.run.map))) return { ok: false, error: '历练进度损坏' };
  if (save.settlement && typeof save.settlement.id !== 'string') return { ok: false, error: '结算记录损坏' };
  return { ok: true, save };
}
