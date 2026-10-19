import { DUNGEON_INFO, REALM_NAME, nextStageNeed } from '../balance/config';
import { CODEX_MAP, EVENT_MAP, ITEM_MAP, NPC_MAP, FACTIONS } from '../content';
import type { EventChoice, SaveData } from '../types';
import { choiceBlock, costAmount } from './conditions';
import { currentIntent } from './combat';
import { calendarLabel, realmLabel } from './flow';
import { blessingText } from './run';
import { computeStats } from './stats';

export function relationLabel(value: number): string {
  if (value <= -60) return '敌视';
  if (value <= -20) return '疏远';
  if (value < 20) return '陌生';
  if (value < 50) return '相识';
  if (value < 80) return '信任';
  return '莫逆';
}

export function qualityLabel(quality: string): string {
  if (quality === 'spirit') return '灵品';
  if (quality === 'rare') return '珍品';
  return '凡品';
}

export function typeLabel(type: string): string {
  return { technique: '功法', heart: '心法', treasure: '法宝', consumable: '消耗', material: '灵材', plot: '信物' }[type] ?? type;
}

export function goalOf(save: SaveData): { title: string; how: string } {
  const flags = save.world.flags;
  if (!flags.rain_done) return { title: '前往山雨破庙，寻找避雨之处', how: '从历练进入山雨破庙。推开门之后，要在三个做法里选一个。' };
  if (!flags.qi_taught) return { title: '在破庙侧殿听沈砚讲解引气', how: '回到山雨破庙，走向侧殿。剑修与火修只能先选一门，另一门以后还能在竹林找到。' };
  if (!flags.tutorial_completed) return { title: '完成三处引气试炼', how: '在历练里进入引气试炼。打一场小战，选一次造化，再决定撤离或把路走完。' };
  if (save.player.realm === 'mortal' && save.player.cultivation < 50) {
    return { title: '把修为积到五十，再尝试引气', how: `还差${50 - save.player.cultivation}点。把引气试炼胜利走完，修为会一次补到门槛。` };
  }
  if (save.player.realm === 'mortal') return { title: '回到修行页，尝试引气', how: '打开修行，点击尝试突破。这次引气不会失败，也不会抽签。' };
  const marrow = save.player.inventory.filter((item) => item.definitionId === 'mat_marrow').reduce((sum, item) => sum + item.qty, 0);
  return {
    title: '探索雾隐竹林，寻找筑基所需的青髓草',
    how: `雾骨山魈每次战胜都会留下1株青髓草，目前持有${marrow}株。它蓄力后的重击可用守御减半。筑基还需要凝露芝，那种材料不在这一段的掉落里。`,
  };
}

export interface ActionLink {
  id: string;
  label: string;
  detail?: string;
  disabled?: boolean;
  reason?: string;
}

export function homeActions(save: SaveData): ActionLink[] {
  if (save.settlement && !save.settlement.claimed) return [{ id: 'claim', label: '领取上一场收获', detail: '还没收入行囊' }];
  if (save.run) return [{ id: 'continue', label: '继续未完成的历练', detail: '回到刚才的选择' }];
  const actions: ActionLink[] = [];
  if (!save.world.flags.rain_done) actions.push({ id: 'rain', label: '前往山雨破庙', detail: '雨已经落到残瓦上' });
  else if (!save.world.flags.qi_taught) actions.push({ id: 'shen', label: '走向侧殿，请教沈砚', detail: '选择一门基础功法' });
  else if (!save.world.flags.tutorial_completed || save.player.realm === 'mortal') {
    actions.push({ id: 'tutorial', label: save.world.flags.tutorial_completed ? '再走一次引气试炼' : '开始引气试炼', detail: '三处节点，可在最后安全撤离' });
    if (save.player.cultivation >= 50 && save.world.flags.tutorial_completed) actions.push({ id: 'break', label: '尝试引气', detail: '条件已经齐了' });
  }
  if (save.player.realm !== 'mortal') actions.push({ id: 'bamboo', label: '前往雾隐竹林', detail: '十处节点，首领是雾骨山魈' });
  if (save.world.flags.rain_2_done && !save.world.flags.rain_3_done) actions.push({ id: 'rain3', label: '去听秦照的下文', detail: '残碑的两种说法' });
  else if ((save.world.counters.settledRuns ?? 0) >= 2 && save.world.flags.rain_chain_started && !save.world.flags.rain_2_done) {
    actions.push({ id: 'rain2', label: '查看村口的来信', detail: '秦照写来的' });
  }
  if (!actions.length) actions.push({ id: 'map', label: '打开青岚地图', detail: '看看还能去哪里' });
  return actions;
}

export function choiceViews(save: SaveData, choices: EventChoice[]): { choice: EventChoice; disabled: boolean; reason?: string; detail?: string }[] {
  return choices
    .filter((choice) => {
      if (!choice.hideIfUnavailable) return true;
      return !choiceBlock(save, choice.condition, choice.costs);
    })
    .map((choice) => {
      const reason = choiceBlock(save, choice.condition, choice.costs);
      let detail = choice.detail;
      const stone = choice.costs.find((cost) => cost.kind === 'stones');
      if (stone) detail = `${detail ? `${detail} · ` : ''}实际花费${costAmount(save, stone)}灵石`;
      if (choice.id === 'buy_jade') {
        const owned = [...save.player.inventory, ...(save.run?.loot ?? [])].some((item) => item.definitionId === 'tre_jade');
        if (owned) return { choice, disabled: true, reason: '已经有回灵玉', detail };
      }
      return { choice, disabled: Boolean(reason), reason: reason ?? undefined, detail };
    });
}

export function activeEvent(save: SaveData): { title: string; body: string; scene: string; choices: EventChoice[]; result: { title: string; text: string; deltas: string[] } | null } | null {
  if (save.run?.phase === 'result' && save.run.pendingResult && !save.run.eventId) {
    return { title: save.run.pendingResult.title, body: save.run.pendingResult.text, scene: 'bamboo', choices: [], result: save.run.pendingResult };
  }
  const eventId = save.run?.eventId ?? save.townEvent?.eventId;
  if (!eventId) return null;
  const event = EVENT_MAP[eventId];
  if (!event) return null;
  const result = save.run?.phase === 'result' ? save.run.pendingResult : save.townEvent?.result ?? null;
  return { title: event.title, body: event.body, scene: event.scene, choices: event.choices, result };
}

export function playerStats(save: SaveData) {
  const blessings = save.run?.blessings ?? [];
  const heart = save.run?.loadout.heartId ?? save.player.equipment.heartId;
  return computeStats(save.player, blessings, heart);
}

export function progressText(save: SaveData): { label: string; current: number; max: number; hint: string } {
  const need = nextStageNeed(save.player.realm, save.player.stage);
  if (!need) return { label: REALM_NAME[save.player.realm], current: save.player.cultivation, max: save.player.cultivation || 1, hint: '这一段没有下一境界。' };
  return {
    label: realmLabel(save),
    current: save.player.cultivation,
    max: need.need,
    hint: save.player.insightReserve > 0 ? `见闻储备 ${save.player.insightReserve}` : `下一程：${need.label}`,
  };
}

export function battleView(save: SaveData) {
  const battle = save.run?.battle;
  if (!battle) return null;
  const intent = currentIntent(battle);
  return { battle, intent, enemy: ITEM_MAP[battle.enemyId] ? battle.enemyId : battle.enemyId };
}

export function blessingCards(save: SaveData): { id: string; name: string; text: string }[] {
  const offer = save.run?.blessingOffer ?? [];
  return offer.map((id) => {
    const stacks = save.run?.blessings.find((entry) => entry.id === id)?.stacks ?? 0;
    return { id, name: blessingText(id, stacks).split('。')[0], text: blessingText(id, stacks) };
  }).map((card) => {
    const map: Record<string, string> = {
      bless_sword_qi: '剑气追加',
      bless_sword_echo: '剑阵回响',
      bless_burn: '灼烧加深',
      bless_shield: '护盾加固',
      bless_mp: '灵力上限',
      bless_pill: '药效提升',
    };
    return { ...card, name: map[card.id] ?? card.name };
  });
}

export function codexLines(save: SaveData): { title: string; text: string }[] {
  return save.codex.entries.map((id) => CODEX_MAP[id]).filter(Boolean);
}

export function knownNpcs(save: SaveData) {
  return save.world.metNpcs.map((id) => {
    const npc = NPC_MAP[id];
    const relation = save.world.relations[id];
    return npc ? { ...npc, value: relation?.value ?? 0, reason: relation?.lastReason ?? '还没有新的来往', label: relationLabel(relation?.value ?? 0) } : null;
  }).filter((npc): npc is NonNullable<typeof npc> => Boolean(npc));
}

export function knownFactions(save: SaveData) {
  return FACTIONS.filter((faction) => (save.world.renown[faction.id] ?? 0) !== 0).map((faction) => ({
    ...faction,
    value: save.world.renown[faction.id] ?? 0,
  }));
}

export function ageText(save: SaveData): string {
  return calendarLabel(save);
}

export function dungeonCopy(id: 'tutorial' | 'bamboo') {
  return DUNGEON_INFO[id];
}

export { realmLabel };
