import { BALANCE } from '../balance/config';
import { BLESSING_MAP, BLESSINGS, ENEMY_MAP, EVENT_MAP, fallbackEvents, poolEvents } from '../content';
import type { DungeonId, RunNode, SaveData } from '../types';
import { checkCondition } from './conditions';
import { draw, intRange } from './rng';

const NORMALS = ['enemy_leaf', 'enemy_fox', 'enemy_lamp', 'enemy_snake'];

export function selectEventId(save: SaveData, seed: number, cursor: number, used: string[]): { eventId: string; cursor: number; note?: string } {
  const due = poolEvents().filter((event) => event.chainId && (!event.condition || checkCondition(save, event.condition)) && !save.world.flags[`done_${event.id}`]);
  if (due.length) return { eventId: due[0].id, cursor };
  const pool = poolEvents().filter((event) => {
    if (used.includes(event.id)) return false;
    if (save.world.flags[`done_${event.id}`]) return false;
    if ((save.world.eventCooldown[event.id] ?? 0) > 0) return false;
    if (event.condition && !checkCondition(save, event.condition)) return false;
    return true;
  });
  if (!pool.length) {
    const fallback = fallbackEvents();
    const rolled = intRange(seed, cursor, 0, fallback.length - 1);
    return { eventId: fallback[rolled.value].id, cursor: rolled.cursor, note: '事件池为空，改用安全回退。' };
  }
  const weights = pool.map((event) => event.weight);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const rolled = draw(seed, cursor);
  let mark = rolled.value * total;
  for (let i = 0; i < pool.length; i += 1) {
    mark -= weights[i];
    if (mark <= 0) return { eventId: pool[i].id, cursor: rolled.cursor };
  }
  return { eventId: pool[pool.length - 1].id, cursor: rolled.cursor };
}

function node(layer: number, index: number, partial: Omit<RunNode, 'id' | 'layer'>): RunNode {
  return { id: `n${layer}_${index}`, layer, ...partial };
}

export function generateTutorial(): RunNode[] {
  return [
    node(0, 0, { kind: 'battle', label: '竹叶妖', icon: 'sword', risk: '低', enemyId: 'enemy_leaf', trait: ENEMY_MAP.enemy_leaf.traits }),
    node(1, 0, { kind: 'event', label: '石阶清泉', icon: 'scroll', risk: '低', eventId: 'event_spring', trait: '可以歇息，也可以记下泉眼' }),
    node(2, 0, { kind: 'event', label: '林边岔路', icon: 'rest', risk: '低', eventId: 'event_tutorial_fork', trait: '可安全撤离，也可再打一场' }),
  ];
}

export function generateBamboo(save: SaveData, seed: number): { nodes: RunNode[]; cursor: number; notes: string[] } {
  const notes: string[] = [];
  let cursor = 0;
  const usedEvents: string[] = [];
  const nodes: RunNode[] = [];
  const pushEvents = (layer: number, count: number) => {
    for (let i = 0; i < count; i += 1) {
      const picked = selectEventId(save, seed, cursor, usedEvents);
      cursor = picked.cursor;
      if (picked.note) notes.push(picked.note);
      usedEvents.push(picked.eventId);
      const event = EVENT_MAP[picked.eventId];
      nodes.push(node(layer, i, {
        kind: event?.id === 'event_merchant' ? 'merchant' : 'event',
        label: event?.title ?? '奇遇',
        icon: event?.id === 'event_merchant' ? 'bag' : 'scroll',
        risk: '低',
        eventId: picked.eventId,
        trait: event?.title ?? '',
      }));
    }
  };
  const count2 = intRange(seed, cursor, 2, 2);
  cursor = count2.cursor;
  pushEvents(0, 2);
  const battles = intRange(seed, cursor, 1, 2);
  cursor = battles.cursor;
  for (let i = 0; i < battles.value; i += 1) {
    const enemyId = NORMALS[i % NORMALS.length];
    nodes.push(node(1, i, { kind: 'battle', label: ENEMY_MAP[enemyId].name, icon: 'sword', risk: '中', enemyId, trait: ENEMY_MAP[enemyId].traits }));
  }
  const events2 = intRange(seed, cursor, 1, 2);
  cursor = events2.cursor;
  pushEvents(2, events2.value);
  nodes.push(node(3, 0, { kind: 'battle', label: ENEMY_MAP.enemy_snake.name, icon: 'sword', risk: '中', enemyId: 'enemy_snake', trait: ENEMY_MAP.enemy_snake.traits }));
  nodes.push(node(3, 1, { kind: 'merchant', label: '夜行商', icon: 'bag', risk: '低', eventId: 'event_merchant', trait: '可以买明码标价的东西，也可以只询问' }));
  const eliteSafe = draw(seed, cursor);
  cursor = eliteSafe.cursor;
  nodes.push(node(4, 0, { kind: 'elite', label: ENEMY_MAP.enemy_shade.name, icon: 'sword', risk: '高', enemyId: 'enemy_shade', trait: ENEMY_MAP.enemy_shade.traits }));
  if (eliteSafe.value > 0.45) {
    const picked = selectEventId(save, seed, cursor, usedEvents);
    cursor = picked.cursor;
    nodes.push(node(4, 1, { kind: 'event', label: EVENT_MAP[picked.eventId]?.title ?? '稳妥的路', icon: 'scroll', risk: '低', eventId: picked.eventId, trait: '避开精英的路' }));
  }
  nodes.push(node(5, 0, { kind: 'rest', label: '竹亭', icon: 'rest', risk: '低', trait: '可恢复、封存一件战利，或安全撤离' }));
  const events6 = intRange(seed, cursor, 1, 2);
  cursor = events6.cursor;
  pushEvents(6, events6.value);
  nodes.push(node(7, 0, { kind: 'battle', label: ENEMY_MAP.enemy_lamp.name, icon: 'sword', risk: '中', enemyId: 'enemy_lamp', trait: ENEMY_MAP.enemy_lamp.traits }));
  const treasureRoll = draw(seed, cursor);
  cursor = treasureRoll.cursor;
  const treasureId = treasureRoll.value > 0.5 ? 'tre_lamp' : 'con_heal';
  nodes.push(node(7, 1, {
    kind: 'treasure',
    label: treasureId === 'tre_lamp' ? '石灯下的小匣' : '遗落的药包',
    icon: 'bag',
    risk: '低',
    trait: '打开就能拿走，先进入本局战利',
    reward: {
      itemId: treasureId,
      qty: 1,
      text: treasureId === 'tre_lamp' ? '匣中是一盏还温的青莲灯。' : '药包里有一枚回春丹。',
    },
  }));
  nodes.push(node(8, 0, { kind: 'prep', label: '首领前的空地', icon: 'lamp', risk: '低', trait: '可以整备。山魈的重击要用守御接。' }));
  nodes.push(node(9, 0, {
    kind: 'boss',
    label: '雾骨山魈',
    icon: 'boss',
    risk: '高',
    enemyId: 'enemy_wugu',
    endsRun: true,
    trait: ENEMY_MAP.enemy_wugu.traits,
  }));
  return { nodes, cursor, notes };
}

export function blessingChoices(save: SaveData): string[] {
  const school = save.world.flags.school_fire ? 'fire' : 'sword';
  const owned = save.run?.blessings ?? [];
  const usable = BLESSINGS.filter((blessing) => {
    const have = owned.find((entry) => entry.id === blessing.id)?.stacks ?? 0;
    return have < blessing.max;
  });
  const preferred = usable.filter((blessing) => blessing.school === school || blessing.school === 'any');
  const picked: string[] = [];
  const take = (id: string) => {
    if (!picked.includes(id) && usable.some((blessing) => blessing.id === id)) picked.push(id);
  };
  if (school === 'sword') take('bless_sword_qi');
  if (school === 'fire') take('bless_burn');
  for (const blessing of preferred) take(blessing.id);
  for (const blessing of usable) take(blessing.id);
  return picked.slice(0, 3);
}

export function shouldOfferBlessing(keyNodes: number, serial: number): boolean {
  return BALANCE.blessingThresholds[serial] === keyNodes;
}

export function blessingText(id: string, stacks: number): string {
  const def = BLESSING_MAP[id];
  if (!def) return id;
  return `${def.description} 当前${stacks}/${def.max}层。`;
}

export function layerNodes(nodes: RunNode[], layer: number): RunNode[] {
  return nodes.filter((entry) => entry.layer === layer);
}

export function maxLayer(nodes: RunNode[]): number {
  return nodes.reduce((max, entry) => Math.max(max, entry.layer), 0);
}

export function validateRoute(nodes: RunNode[], dungeon: DungeonId): string[] {
  const errors: string[] = [];
  const last = dungeon === 'tutorial' ? 2 : 9;
  for (let layer = 0; layer <= last; layer += 1) {
    const row = nodes.filter((entry) => entry.layer === layer);
    if (!row.length) errors.push(`第${layer + 1}层没有节点`);
    if (row.length > 3) errors.push(`第${layer + 1}层超过三个选项`);
  }
  if (dungeon === 'bamboo') {
    if (!nodes.some((entry) => entry.kind === 'rest' && entry.layer < 9)) errors.push('首领前没有休息');
    if (!nodes.some((entry) => entry.kind === 'boss' && entry.layer === 9)) errors.push('终点不是首领');
    if (!nodes.some((entry) => entry.kind === 'event' || entry.kind === 'merchant')) errors.push('没有奇遇');
  }
  return errors;
}
