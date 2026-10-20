import { DUNGEON_INFO, REALM_NAME } from '../balance/config';
import { APPEARANCE_MAP, BLESSING_MAP, EVENT_MAP, ITEM_MAP, ORIGIN_MAP, TALENT_MAP } from '../content';
import type { BattleAction, DungeonId, SaveData, ScreenId, SettlementKind, Settings, StepResult } from '../types';
import { checkCondition, choiceBlock, costAmount } from './conditions';
import { playAction, createBattle, suggestAction, beatenKey } from './combat';
import { applyEffects, rememberStory, unlockAchievement } from './effects';
import { addToList, payItem, removeFromList, countList } from './inventory';
import { uid } from './rng';
import { blessingChoices, generateBamboo, generateTutorial, maxLayer, shouldOfferBlessing } from './run';
import { computeStats, grantCultivation, learnCost } from './stats';

const SEASONS = ['春', '夏', '秋', '冬'];

function fail(error: string): StepResult {
  return { ok: false, error };
}

function done(save: SaveData, toast?: string): StepResult {
  return { ok: true, save, toast };
}

function clone(save: SaveData): SaveData {
  return structuredClone(save);
}

function track(save: SaveData, name: string, props: Record<string, string | number | boolean>): void {
  save.analytics.push({ name, at: Date.now(), props });
  if (save.analytics.length > 100) save.analytics.splice(0, save.analytics.length - 100);
}

function payCosts(save: SaveData, costs: { kind: 'item' | 'stones' | 'runHp'; itemId?: string; amount: number; shopDiscount?: boolean }[]): string | null {
  for (const cost of costs) {
    const amount = costAmount(save, cost);
    if (cost.kind === 'stones' && save.player.spiritStones < amount) return `灵石不足，还差${amount - save.player.spiritStones}`;
    if (cost.kind === 'runHp' && (!save.run || save.run.hp <= amount)) return '气血不足';
    if (cost.kind === 'item') {
      const inRun = Boolean(save.run) && ITEM_MAP[cost.itemId ?? '']?.type === 'consumable';
      const have = inRun
        ? save.run?.supplies.filter((item) => item.definitionId === cost.itemId).reduce((sum, item) => sum + item.qty, 0) ?? 0
        : countList(save.player.inventory, cost.itemId ?? '');
      if (have < amount) return `${ITEM_MAP[cost.itemId ?? '']?.name ?? '物品'}不足`;
    }
  }
  for (const cost of costs) {
    const amount = costAmount(save, cost);
    if (cost.kind === 'stones') save.player.spiritStones -= amount;
    if (cost.kind === 'runHp' && save.run) save.run.hp = Math.max(1, save.run.hp - amount);
    if (cost.kind === 'item' && !payItem(save, cost.itemId ?? '', amount)) return '消耗失败，没有扣除';
  }
  return null;
}

export function visibleTextLength(text: string): number {
  return Array.from(text.trim()).length;
}

export function createSave(input: {
  name: string;
  appearanceId: string;
  originId: string;
  talentId: string;
  offeredTalentIds: string[];
  saveId?: string;
  now?: number;
}): StepResult {
  const name = input.name.trim();
  const length = visibleTextLength(name);
  if (length < 2 || length > 12) return fail('名字需要2到12个字');
  if (!APPEARANCE_MAP[input.appearanceId] || !ORIGIN_MAP[input.originId] || !TALENT_MAP[input.talentId]) return fail('出身或天赋无效');
  if (!input.offeredTalentIds.includes(input.talentId)) return fail('天赋不在这次给出的选择里');
  const origin = ORIGIN_MAP[input.originId];
  const now = input.now ?? Date.now();
  const save: SaveData = {
    schemaVersion: 1,
    saveId: input.saveId ?? uid('save'),
    revision: 1,
    savedAt: now,
    player: {
      name,
      appearanceId: input.appearanceId,
      originId: input.originId,
      talentId: input.talentId,
      offeredTalentIds: [...input.offeredTalentIds],
      realm: 'mortal',
      stage: 'early',
      cultivation: 0,
      lifetimeCultivation: 0,
      insightReserve: 0,
      road: 'none',
      learnedTechniqueIds: [],
      learnedHeartIds: [],
      equipment: { techniqueId: null, heartId: null, treasureInstanceIds: [] },
      inventory: [],
      spiritStones: origin.stones,
      daoYun: 0,
      hpFlat: origin.hpFlat,
    },
    run: null,
    settlement: null,
    world: {
      flags: {},
      counters: { settledRuns: 0, tutorialCultivationBanked: 0 },
      relations: { npc_jiang: { value: origin.id === 'origin_herb' ? 15 : 5, lastReason: '你们在青禾村认识' } },
      renown: { qingheng: 0, duquan: 0, jindeng: 0 },
      unlockedLocations: ['loc_qinghe', 'loc_shrine'],
      currentLocation: 'loc_qinghe',
      feedback: '山雨要来了。旧屋外面的土路，通向山雨破庙。',
      quests: [{ id: 'q_shrine', title: '山雨破庙', detail: '前往山雨破庙，寻找避雨之处。', status: 'open' }],
      clues: [],
      eventCooldown: {},
      metNpcs: ['npc_jiang'],
    },
    codex: { entries: origin.rumor ? ['rumor_gate'] : [], achievements: {}, stories: [] },
    ledger: { claimedRewardIds: [], storyGrants: [] },
    settings: { sound: false, fontScale: 'standard', reduceMotion: false, battleSpeed: 'normal' },
    screen: 'home',
    townEvent: null,
    analytics: [],
    calendar: { age: 18, seasonIndex: 0 },
    ceremonySeen: true,
  };
  addToList(save.player.inventory, 'con_heal', 1, 'permanent');
  for (const item of origin.items) addToList(save.player.inventory, item.id, item.qty, 'permanent');
  track(save, 'character_created', { origin: input.originId, talent: input.talentId });
  return done(save, '名字已经写下。');
}

export function openTownEvent(save: SaveData, eventId: string): StepResult {
  if (save.run) return fail('先处理当前这场历练');
  if (save.settlement && !save.settlement.claimed) return fail('先领取上一场结算');
  const event = EVENT_MAP[eventId];
  if (!event) return fail('没有这场遭遇');
  if (event.once && save.world.flags[`done_${event.id}`]) return fail('这件事已经有了结果');
  if (event.condition && !checkCondition(save, event.condition)) return fail('时候未到');
  const next = clone(save);
  next.townEvent = { eventId, choiceId: null, result: null };
  next.screen = 'event';
  if (eventId === 'event_rain_1') next.world.currentLocation = 'loc_shrine';
  return done(next);
}

export function chooseTownOption(save: SaveData, choiceId: string): StepResult {
  if (!save.townEvent || save.townEvent.choiceId) return fail('这个选择已经做过');
  const event = EVENT_MAP[save.townEvent.eventId];
  const choice = event?.choices.find((entry) => entry.id === choiceId);
  if (!event || !choice) return fail('没有这个选择');
  const blocked = choiceBlock(save, choice.condition, choice.costs);
  if (blocked) return fail(blocked);
  const next = clone(save);
  const fresh = next.townEvent;
  const freshChoice = EVENT_MAP[fresh?.eventId ?? '']?.choices.find((entry) => entry.id === choiceId);
  if (!fresh || !freshChoice) return fail('没有这个选择');
  const paid = payCosts(next, freshChoice.costs);
  if (paid) return fail(paid);
  const deltas = applyEffects(next, freshChoice.effects, { scope: 'town' });
  fresh.choiceId = choiceId;
  fresh.result = { title: event.title, text: freshChoice.resultText, deltas };
  if (event.once) next.world.flags[`done_${event.id}`] = true;
  rememberStory(next, event.id, choiceId, freshChoice.resultText);
  track(next, 'node_choice', { event: event.id, choice: choiceId });
  return done(next);
}

export function continueTown(save: SaveData): StepResult {
  if (!save.townEvent?.choiceId) return fail('还没有做出选择');
  const next = clone(save);
  next.townEvent = null;
  next.screen = 'home';
  return done(next);
}

export function startDungeon(save: SaveData, dungeonId: DungeonId, bring: { definitionId: string; qty: number }[], seed = Math.floor(Date.now() % 99991) + 1): StepResult {
  if (save.run) return fail('已经有一场未结束的历练');
  if (save.settlement && !save.settlement.claimed) return fail('先领取上一场结算');
  const techniqueId = save.player.equipment.techniqueId;
  if (!techniqueId) return fail('还没有可使用的功法');
  if (dungeonId === 'tutorial' && !save.world.flags.qi_taught) return fail('先在破庙听沈砚讲解');
  if (dungeonId === 'bamboo' && save.player.realm === 'mortal') return fail('炼气之后才能进入雾隐竹林');
  const next = clone(save);
  for (const item of bring) {
    if (item.qty < 0) return fail('携带数量不对');
    if (countList(next.player.inventory, item.definitionId) < item.qty) return fail(`${ITEM_MAP[item.definitionId]?.name ?? '物品'}不够带`);
  }
  for (const item of bring) {
    if (item.qty > 0 && !removeFromList(next.player.inventory, item.definitionId, item.qty)) return fail('携带失败，没有扣除');
  }
  for (const key of Object.keys(next.world.eventCooldown)) {
    next.world.eventCooldown[key] = Math.max(0, next.world.eventCooldown[key] - 1);
  }
  const stats = computeStats(next.player);
  const generated = dungeonId === 'tutorial' ? { nodes: generateTutorial(), cursor: 0, notes: [] } : generateBamboo(next, seed);
  const mirror = next.player.equipment.treasureInstanceIds.some((id) => next.player.inventory.find((item) => item.instanceId === id)?.definitionId === 'tre_mirror');
  next.run = {
    runId: uid('run'),
    dungeonId,
    seed,
    rngCursor: generated.cursor,
    map: generated.nodes,
    layer: 0,
    nodeId: null,
    phase: 'choose',
    loot: [],
    stones: 0,
    cultivation: 0,
    blessings: [],
    blessingOffer: null,
    blessingSerial: 0,
    sealedInstanceId: null,
    battle: null,
    eventId: null,
    choiceId: null,
    pendingBattleEnemyId: null,
    pendingBattleEnds: false,
    pendingEnd: null,
    pendingResult: null,
    loadout: {
      techniqueId,
      heartId: next.player.equipment.heartId,
      treasureInstanceIds: [...next.player.equipment.treasureInstanceIds],
    },
    supplies: bring.filter((item) => item.qty > 0).map((item) => ({ instanceId: uid('sup'), definitionId: item.definitionId, qty: item.qty })),
    hp: stats.maxHp,
    mp: stats.maxMp,
    maxHp: stats.maxHp,
    maxMp: stats.maxMp,
    inspected: 0,
    keyNodesCleared: 0,
    mirrorReady: mirror,
    log: [],
    generationNotes: generated.notes,
    seenEvents: [],
  };
  next.screen = 'run';
  next.world.currentLocation = dungeonId === 'bamboo' ? 'loc_bamboo' : 'loc_shrine';
  track(next, 'run_started', { dungeon: dungeonId, seed });
  return done(next, `进入${DUNGEON_INFO[dungeonId].name}`);
}

export function chooseNode(save: SaveData, nodeId: string): StepResult {
  if (!save.run || save.run.phase !== 'choose') return fail('现在不是选路的时候');
  const node = save.run.map.find((entry) => entry.id === nodeId && entry.layer === save.run?.layer);
  if (!node) return fail('这条路不在当前这一层');
  const next = clone(save);
  const run = next.run!;
  const picked = run.map.find((entry) => entry.id === nodeId)!;
  run.nodeId = picked.id;
  if (picked.kind === 'battle' || picked.kind === 'elite' || picked.kind === 'boss') {
    run.battle = createBattle(next, picked.enemyId ?? 'enemy_leaf', Boolean(picked.endsRun));
    run.phase = 'battle';
    next.screen = 'battle';
    return done(next);
  }
  if (picked.kind === 'event' || picked.kind === 'merchant') {
    let eventId = picked.eventId ?? 'event_spring';
    const event = EVENT_MAP[eventId];
    if (!event || (event.once && next.world.flags[`done_${event.id}`])) {
      eventId = 'event_spring';
      picked.eventId = eventId;
      run.generationNotes.push('原定事件不可重复，改入石阶清泉。');
    }
    run.eventId = eventId;
    run.choiceId = null;
    run.phase = 'event';
    next.screen = 'event';
    return done(next);
  }
  if (picked.kind === 'treasure') {
    if (!picked.rewardGranted && picked.reward) {
      picked.rewardGranted = true;
      if (picked.reward.itemId) addToList(run.loot, picked.reward.itemId, picked.reward.qty ?? 1, 'run');
      run.stones += picked.reward.stones ?? 0;
      run.cultivation += picked.reward.cultivation ?? 0;
    }
    run.pendingResult = {
      title: picked.label,
      text: picked.reward?.text ?? '匣子是空的。',
      deltas: picked.reward?.itemId ? [`${ITEM_MAP[picked.reward.itemId]?.name ?? '物品'} +${picked.reward.qty ?? 1}`] : [],
    };
    run.phase = 'result';
    next.screen = 'event';
    return done(next);
  }
  run.phase = 'rest';
  next.screen = 'run';
  return done(next);
}

export function chooseRunOption(save: SaveData, choiceId: string): StepResult {
  if (!save.run || save.run.phase !== 'event' || save.run.choiceId) return fail('这个选择已经做过');
  const event = EVENT_MAP[save.run.eventId ?? ''];
  const choice = event?.choices.find((entry) => entry.id === choiceId);
  if (!event || !choice) return fail('没有这个选择');
  const blocked = choiceBlock(save, choice.condition, choice.costs);
  if (blocked) return fail(blocked);
  const next = clone(save);
  const run = next.run!;
  const paid = payCosts(next, choice.costs);
  if (paid) return fail(paid);
  const deltas = applyEffects(next, choice.effects, { scope: 'run' });
  run.choiceId = choiceId;
  run.seenEvents.push(event.id);
  run.pendingResult = { title: event.title, text: choice.resultText, deltas };
  run.phase = 'result';
  const battle = choice.effects.find((effect) => effect.op === 'battle');
  const ending = choice.effects.find((effect) => effect.op === 'endRun');
  if (battle && battle.op === 'battle') {
    run.pendingBattleEnemyId = battle.enemyId;
    run.pendingBattleEnds = event.id === 'event_tutorial_fork';
  }
  if (ending && ending.op === 'endRun') run.pendingEnd = ending.kind;
  if (event.once) next.world.flags[`done_${event.id}`] = true;
  rememberStory(next, event.id, choiceId, choice.resultText);
  next.screen = 'event';
  track(next, 'node_choice', { event: event.id, choice: choiceId });
  return done(next);
}

function advance(save: SaveData): void {
  const run = save.run!;
  run.layer += 1;
  run.nodeId = null;
  run.eventId = null;
  run.choiceId = null;
  run.pendingResult = null;
  run.pendingBattleEnemyId = null;
  run.pendingEnd = null;
  if (run.layer > maxLayer(run.map)) {
    endRun(save, 'victory');
    return;
  }
  run.phase = 'choose';
  save.screen = 'run';
}

function afterNode(save: SaveData): void {
  const run = save.run!;
  const node = run.map.find((entry) => entry.id === run.nodeId);
  run.battle = null;
  if (node && ['battle', 'elite', 'boss', 'event', 'merchant'].includes(node.kind)) run.keyNodesCleared += 1;
  const offer = blessingChoices(save);
  if (shouldOfferBlessing(run.keyNodesCleared, run.blessingSerial) && offer.length) {
    run.blessingOffer = offer;
    run.phase = 'blessing';
    run.pendingResult = null;
    save.screen = 'run';
    return;
  }
  advance(save);
}

export function continueAfterResult(save: SaveData): StepResult {
  if (!save.run || save.run.phase !== 'result') return fail('现在没有待确认的结果');
  const next = clone(save);
  const run = next.run!;
  if (run.pendingEnd) {
    const kind = run.pendingEnd;
    run.pendingEnd = null;
    endRun(next, kind);
    return done(next);
  }
  if (run.pendingBattleEnemyId) {
    const enemyId = run.pendingBattleEnemyId;
    const ends = run.pendingBattleEnds;
    run.pendingBattleEnemyId = null;
    run.battle = createBattle(next, enemyId, ends);
    run.phase = 'battle';
    next.screen = 'battle';
    return done(next);
  }
  afterNode(next);
  return done(next);
}

export function actInBattle(save: SaveData, action: BattleAction, expectedRound?: number): StepResult {
  if (!save.run?.battle) return fail('现在没有战斗');
  if (expectedRound !== undefined && save.run.battle.round !== expectedRound) return fail('这一手已经落下');
  const next = clone(save);
  const error = playAction(next, action);
  if (error) return fail(error);
  next.screen = 'battle';
  if (next.run?.battle?.finished) track(next, 'battle_finished', { enemy: next.run.battle.enemyId, result: next.run.battle.finished });
  return done(next);
}

export function autoResolveBattle(save: SaveData): StepResult {
  if (!save.run?.battle || save.run.battle.finished) return fail('现在没有进行中的战斗');
  const next = clone(save);
  let guard = 0;
  while (next.run?.battle && !next.run.battle.finished && guard < 80) {
    const action = suggestAction(next.run.battle, next);
    const error = playAction(next, action);
    if (error) return fail(error);
    guard += 1;
  }
  if (next.run?.battle?.finished) track(next, 'battle_finished', { enemy: next.run.battle.enemyId, result: next.run.battle.finished, auto: true });
  return done(next);
}

export function setBattleAuto(save: SaveData, auto: boolean): StepResult {
  if (!save.run?.battle) return fail('现在没有战斗');
  const next = clone(save);
  next.run!.battle!.auto = auto;
  return done(next);
}

export function leaveBattle(save: SaveData): StepResult {
  if (!save.run?.battle?.finished) return fail('战斗还没有结束');
  const next = clone(save);
  const battle = next.run!.battle!;
  if (battle.finished === 'win') next.world.flags[beatenKey(battle.enemyId)] = true;
  if (battle.finished === 'lose') {
    endRun(next, 'defeat');
    return done(next);
  }
  if (battle.nodeEndsRun || battle.enemyId === 'enemy_wugu' || (next.run!.dungeonId === 'tutorial' && next.run!.layer === 2)) {
    endRun(next, 'victory');
    return done(next);
  }
  afterNode(next);
  return done(next);
}

export function pickBlessing(save: SaveData, blessingId: string): StepResult {
  if (!save.run || save.run.phase !== 'blessing' || !save.run.blessingOffer?.includes(blessingId)) return fail('这不是当前的造化');
  const next = clone(save);
  const run = next.run!;
  const existing = run.blessings.find((entry) => entry.id === blessingId);
  const def = BLESSING_MAP[blessingId];
  if (!def || (existing?.stacks ?? 0) >= def.max) return fail('这门造化已经满层');
  if (existing) existing.stacks += 1;
  else run.blessings.push({ id: blessingId, stacks: 1 });
  if (blessingId === 'bless_mp') {
    const stats = computeStats(next.player, run.blessings, run.loadout.heartId);
    const gain = Math.max(0, stats.maxMp - run.maxMp);
    run.maxMp = stats.maxMp;
    run.mp = Math.min(stats.maxMp, run.mp + gain);
  }
  run.blessingSerial += 1;
  run.blessingOffer = null;
  advance(next);
  return done(next, '造化已记下，只在本局生效。');
}

export function restHere(save: SaveData): StepResult {
  if (!save.run || save.run.phase !== 'rest') return fail('这里不能歇息');
  const next = clone(save);
  const run = next.run!;
  const node = run.map.find((entry) => entry.id === run.nodeId);
  if (!node) return fail('没有找到落脚处');
  if (node.rested) return fail('这里已经歇过一次');
  node.rested = true;
  const ratio = node.kind === 'prep' ? 0.25 : 0.4;
  const before = run.hp;
  run.hp = Math.min(run.maxHp, run.hp + Math.max(1, Math.round(run.maxHp * ratio)));
  run.mp = Math.min(run.maxMp, run.mp + (node.kind === 'prep' ? 4 : 6));
  return done(next, `气血恢复${run.hp - before}`);
}

export function sealLoot(save: SaveData, instanceId: string): StepResult {
  if (!save.run || save.run.phase !== 'rest') return fail('只有在休息处可以封存');
  const next = clone(save);
  const run = next.run!;
  if (run.sealedInstanceId) return fail('本局已经封存过一件');
  const item = run.loot.find((entry) => entry.instanceId === instanceId);
  if (!item) return fail('这件东西不在本局战利里');
  const kind = ITEM_MAP[item.definitionId]?.type;
  if (kind === 'material' || kind === 'consumable') return fail('材料战败也会保留一半。封存用来保住法宝或功法书。');
  item.sealed = true;
  run.sealedInstanceId = instanceId;
  return done(next, `${ITEM_MAP[item.definitionId]?.name ?? '物品'}已封存`);
}

export function safeRetreat(save: SaveData): StepResult {
  if (!save.run || save.run.phase !== 'rest') return fail('只有休息或整备时可以安全撤离');
  const next = clone(save);
  endRun(next, 'retreat');
  return done(next);
}

export function leaveRest(save: SaveData): StepResult {
  if (!save.run || save.run.phase !== 'rest') return fail('现在不能继续');
  const next = clone(save);
  afterNode(next);
  return done(next);
}

export function abandonRun(save: SaveData): StepResult {
  if (!save.run) return fail('没有进行中的历练');
  if (save.run.battle && !save.run.battle.finished) return fail('先结束这场战斗，或在战斗外再放弃');
  const next = clone(save);
  endRun(next, 'abandon');
  return done(next);
}

function endRun(save: SaveData, kind: SettlementKind): void {
  const run = save.run;
  if (!run) return;
  if (save.settlement && save.settlement.runId === run.runId) {
    save.screen = 'settlement';
    save.run = null;
    return;
  }
  const defeat = kind === 'defeat' || kind === 'abandon';
  let stones = run.stones;
  let cultivation = run.cultivation;
  let cultivationDropped = 0;
  if (defeat) {
    const keptCultivation = Math.floor(cultivation * 0.5);
    cultivationDropped = cultivation - keptCultivation;
    cultivation = keptCultivation;
    stones = Math.floor(stones * 0.5);
  }
  const grants = [`settle:${run.runId}`];
  if (kind === 'victory' && run.dungeonId === 'tutorial' && !save.ledger.storyGrants.includes('bonus:tutorial')) {
    const banked = save.world.counters.tutorialCultivationBanked ?? 0;
    cultivation += Math.max(0, 30 - banked - cultivation);
    grants.push('bonus:tutorial');
  }
  if (kind === 'victory' && run.dungeonId === 'tutorial' && save.ledger.storyGrants.includes('bonus:tutorial')) {
    cultivationDropped += cultivation;
    cultivation = 0;
  }
  const items: { definitionId: string; qty: number; sealed?: boolean }[] = [];
  const lost: { definitionId: string; qty: number }[] = [];
  for (const item of run.loot) {
    const def = ITEM_MAP[item.definitionId];
    const sealed = item.sealed || item.instanceId === run.sealedInstanceId;
    const stackable = def?.type === 'material' || def?.type === 'consumable';
    if (!defeat || sealed || def?.type === 'plot') {
      items.push({ definitionId: item.definitionId, qty: item.qty, sealed });
    } else if (stackable) {
      const kept = Math.floor(item.qty * 0.5);
      if (kept > 0) items.push({ definitionId: item.definitionId, qty: kept });
      if (item.qty - kept > 0) lost.push({ definitionId: item.definitionId, qty: item.qty - kept });
    } else {
      lost.push({ definitionId: item.definitionId, qty: item.qty });
    }
  }
  const heavy = run.battle?.counters.heavyUnblocked && run.battle.enemyId === 'enemy_wugu';
  const advice = defeat
    ? heavy
      ? '山魈蓄力后的重击可用守御减半。守御还会恢复2点灵力。'
      : '战败只失去本局未封存的新法宝和功法书。已经学会的功法、带入的装备都还在，可以免费再入。'
    : undefined;
  const title = kind === 'victory' ? '这场历练走完了' : kind === 'retreat' ? '你安全撤离了' : kind === 'abandon' ? '你放弃了这场历练' : '你没能走完这场历练';
  save.settlement = {
    id: `settle:${run.runId}`,
    runId: run.runId,
    dungeonId: run.dungeonId,
    kind,
    claimed: false,
    items,
    lost,
    returnedSupplies: run.supplies.map((item) => ({ definitionId: item.definitionId, qty: item.qty })),
    stones,
    cultivation,
    cultivationDropped,
    summary: title,
    advice,
    grants,
    seenEvents: [...run.seenEvents],
  };
  save.run = null;
  save.screen = 'settlement';
}

export function claimSettlement(save: SaveData): StepResult {
  if (!save.settlement) return fail('没有可领取的结算');
  if (save.settlement.claimed || save.ledger.claimedRewardIds.includes(save.settlement.id)) {
    const next = clone(save);
    if (next.settlement) next.settlement.claimed = true;
    next.screen = 'home';
    return done(next, '这份收获已经领过');
  }
  const next = clone(save);
  const settlement = next.settlement!;
  if (next.ledger.claimedRewardIds.includes(settlement.id)) return done(next, '这份收获已经领过');
  next.ledger.claimedRewardIds.push(...settlement.grants);
  for (const grant of settlement.grants) {
    if (!next.ledger.storyGrants.includes(grant)) next.ledger.storyGrants.push(grant);
  }
  for (const item of settlement.items) addToList(next.player.inventory, item.definitionId, item.qty, 'permanent');
  for (const item of settlement.returnedSupplies) addToList(next.player.inventory, item.definitionId, item.qty, 'permanent');
  next.player.spiritStones += settlement.stones;
  const beforeStats = computeStats(next.player);
  const beforeStage = next.player.stage;
  const cultivated = grantCultivation(next.player, settlement.cultivation);
  settlement.overflowNote = cultivated.notes.join('');
  settlement.claimed = true;
  next.world.counters.settledRuns = (next.world.counters.settledRuns ?? 0) + 1;
  if (settlement.dungeonId === 'tutorial') {
    next.world.counters.tutorialCultivationBanked = (next.world.counters.tutorialCultivationBanked ?? 0) + settlement.cultivation;
    if (settlement.kind === 'victory') {
      next.world.flags.tutorial_completed = true;
      const quest = next.world.quests.find((entry) => entry.id === 'q_tutorial');
      if (quest) quest.status = 'done';
      track(next, 'tutorial_completed', { result: 'victory' });
    }
  }
  if (settlement.dungeonId === 'bamboo' && settlement.kind === 'victory') {
    next.world.counters.bambooClears = (next.world.counters.bambooClears ?? 0) + 1;
  }
  for (const eventId of settlement.seenEvents) {
    const event = EVENT_MAP[eventId];
    if (event) next.world.eventCooldown[eventId] = event.cooldown;
  }
  if (settlement.kind === 'victory' || settlement.kind === 'retreat') unlockAchievement(next, 'ach_return');
  if (settlement.items.some((item) => ITEM_MAP[item.definitionId]?.type === 'treasure' && ITEM_MAP[item.definitionId]?.quality === 'spirit')) {
    unlockAchievement(next, 'ach_treasure');
  }
  next.calendar.seasonIndex = (next.calendar.seasonIndex + 1) % 4;
  if (next.calendar.seasonIndex === 0) next.calendar.age += 1;
  next.screen = 'home';
  if (next.player.realm !== 'mortal' && next.player.stage !== beforeStage) {
    const afterStats = computeStats(next.player);
    const stageName = next.player.stage === 'mid' ? '中期' : '后期';
    next.world.feedback = `进入炼气${stageName}。气血 ${beforeStats.maxHp}→${afterStats.maxHp}，攻击 ${beforeStats.atk}→${afterStats.atk}，防御 ${beforeStats.def}→${afterStats.def}，灵力 ${beforeStats.maxMp}→${afterStats.maxMp}。`;
  } else {
    next.world.feedback = settlement.summary;
  }
  track(next, 'run_settled', { dungeon: settlement.dungeonId, kind: settlement.kind });
  const extra = cultivated.notes[0] ? ` ${cultivated.notes.join('')}` : '';
  return done(next, `收获已收入行囊。${extra}`.trim());
}

export function attemptBreakthrough(save: SaveData): StepResult {
  if (save.run) return fail('先结束当前历练，再尝试突破');
  if (save.settlement && !save.settlement.claimed) return fail('先领取结算');
  if (save.player.realm !== 'mortal') {
    return fail('筑基试炼尚未开放。当前能做的是在竹林里取得青髓草。');
  }
  if (!save.world.flags.qi_taught || !save.world.flags.tutorial_completed) return fail('还没有完成引气前的历练');
  if (save.player.cultivation < 50) return fail(`修为不足，还差${50 - save.player.cultivation}`);
  const next = clone(save);
  const before = computeStats(next.player);
  next.ceremonyBaseline = { maxHp: before.maxHp, atk: before.atk, def: before.def, maxMp: before.maxMp };
  const reserve = next.player.insightReserve;
  next.player.realm = 'qi';
  next.player.stage = 'early';
  next.player.cultivation = reserve;
  next.player.insightReserve = 0;
  next.player.stage = reserve >= 90 ? 'mid' : 'early';
  if (!next.player.learnedHeartIds.includes('heart_yangyuan')) next.player.learnedHeartIds.push('heart_yangyuan');
  next.player.equipment.heartId = 'heart_yangyuan';
  if (!next.world.unlockedLocations.includes('loc_bamboo')) next.world.unlockedLocations.push('loc_bamboo');
  next.world.flags.breakthrough_qi = true;
  next.world.feedback = '呼吸落到丹田。雨声忽然远了。';
  next.world.relations.npc_shen = {
    value: Math.min(100, (next.world.relations.npc_shen?.value ?? 0) + 8),
    lastReason: '你把气真正引进了身体',
  };
  const quest = next.world.quests.find((entry) => entry.id === 'q_bamboo');
  if (!quest) next.world.quests.push({ id: 'q_bamboo', title: '青髓草', detail: '探索雾隐竹林，击败雾骨山魈可以获得青髓草。', status: 'open' });
  unlockAchievement(next, 'ach_spark');
  next.ceremonySeen = false;
  next.screen = 'breakthrough';
  track(next, 'breakthrough_completed', { realm: 'qi' });
  return done(next);
}

export function acknowledgeCeremony(save: SaveData): StepResult {
  const next = clone(save);
  next.ceremonySeen = true;
  next.screen = 'home';
  return done(next);
}

export function equipTechnique(save: SaveData, techniqueId: string): StepResult {
  if (save.run?.battle && !save.run.battle.finished) return fail('战斗中不能更换功法');
  if (!save.player.learnedTechniqueIds.includes(techniqueId)) return fail('还没有学会这门功法');
  const next = clone(save);
  next.player.equipment.techniqueId = techniqueId;
  if (next.run) next.run.loadout.techniqueId = techniqueId;
  return done(next, `已装备${ITEM_MAP[techniqueId]?.name ?? ''}`);
}

export function equipHeart(save: SaveData, heartId: string): StepResult {
  if (save.run?.battle && !save.run.battle.finished) return fail('战斗中不能更换心法');
  if (!save.player.learnedHeartIds.includes(heartId)) return fail('还没有学会这门心法');
  const next = clone(save);
  next.player.equipment.heartId = heartId;
  if (next.run) {
    next.run.loadout.heartId = heartId;
    const stats = computeStats(next.player, next.run.blessings, heartId);
    next.run.maxMp = stats.maxMp;
    next.run.mp = Math.min(stats.maxMp, next.run.mp);
  }
  return done(next, `已装备${ITEM_MAP[heartId]?.name ?? ''}`);
}

export function equipTreasure(save: SaveData, instanceId: string): StepResult {
  if (save.run?.battle && !save.run.battle.finished) return fail('战斗中不能更换法宝');
  const next = clone(save);
  const owned = next.player.inventory.find((item) => item.instanceId === instanceId);
  const loot = next.run?.loot.find((item) => item.instanceId === instanceId);
  const item = owned ?? loot;
  if (!item || ITEM_MAP[item.definitionId]?.type !== 'treasure') return fail('这不是法宝');
  if (!next.run && item.ownership !== 'permanent') return fail('本局战利还没带回');
  if (next.run) next.run.loadout.treasureInstanceIds = [instanceId];
  else next.player.equipment.treasureInstanceIds = [instanceId];
  if (item.definitionId === 'tre_mirror' && next.run) next.run.mirrorReady = true;
  return done(next, loot ? '本局临时装备。未封存的话，战败会失去它。' : `已装备${ITEM_MAP[item.definitionId].name}`);
}

export function unequipTreasure(save: SaveData, instanceId: string): StepResult {
  if (save.run?.battle && !save.run.battle.finished) return fail('战斗中不能卸下法宝');
  const next = clone(save);
  if (next.run) next.run.loadout.treasureInstanceIds = next.run.loadout.treasureInstanceIds.filter((id) => id !== instanceId);
  next.player.equipment.treasureInstanceIds = next.player.equipment.treasureInstanceIds.filter((id) => id !== instanceId);
  return done(next, '已卸下');
}

export function useConsumable(save: SaveData, definitionId: string): StepResult {
  if (definitionId !== 'con_heal' && definitionId !== 'con_mind') return fail('这件物品不能这样使用');
  if (!save.run) return fail('眼下没有需要治疗的伤势');
  if (save.run.battle && !save.run.battle.finished) return fail('战斗中请使用底部的服药');
  const next = clone(save);
  const supply = next.run!.supplies.find((item) => item.definitionId === definitionId && item.qty > 0);
  if (!supply) return fail('这件没有带进秘境');
  supply.qty -= 1;
  next.run!.supplies = next.run!.supplies.filter((item) => item.qty > 0);
  if (definitionId === 'con_heal') {
    const ratio = 0.25 * (1 + (next.run!.blessings.find((entry) => entry.id === 'bless_pill')?.stacks ?? 0) * 0.1);
    const heal = Math.max(1, Math.round(next.run!.maxHp * ratio));
    next.run!.hp = Math.min(next.run!.maxHp, next.run!.hp + heal);
    return done(next, `气血恢复${heal}`);
  }
  next.run!.mp = Math.min(next.run!.maxMp, next.run!.mp + 10);
  return done(next, '灵力恢复10');
}

export function learnFromBook(save: SaveData, instanceId: string): StepResult {
  if (save.run) return fail('先结束历练，再研读功法');
  const next = clone(save);
  const book = next.player.inventory.find((item) => item.instanceId === instanceId);
  if (!book) return fail('找不到这本功法');
  const def = ITEM_MAP[book.definitionId];
  if (!def || (def.type !== 'technique' && def.type !== 'heart')) return fail('这不是能研读的功法');
  const learned = def.type === 'technique' ? next.player.learnedTechniqueIds : next.player.learnedHeartIds;
  if (learned.includes(book.definitionId)) return fail('已经学会了');
  const cost = learnCost(next.player);
  if (countList(next.player.inventory, 'mat_wood') < cost) return fail(`灵木枝不足，需要${cost}枝`);
  if (!removeFromList(next.player.inventory, 'mat_wood', cost)) return fail('材料扣除失败');
  if (!removeFromList(next.player.inventory, book.definitionId, 1)) return fail('功法书扣除失败');
  learned.push(book.definitionId);
  return done(next, `学会了${def.name}`);
}

export function sellItem(save: SaveData, instanceId: string, qty: number): StepResult {
  if (save.run) return fail('历练途中不能出售。本局战利要结算后才归你。');
  if (qty <= 0) return fail('数量不对');
  const next = clone(save);
  const item = next.player.inventory.find((entry) => entry.instanceId === instanceId);
  if (!item || item.qty < qty) return fail('数量不足');
  const def = ITEM_MAP[item.definitionId];
  if (!def?.sellable || def.price === null || def.type === 'plot') return fail('这件不能出售');
  if (next.player.equipment.treasureInstanceIds.includes(instanceId)) return fail('先卸下再出售');
  const gain = Math.floor(def.price * 0.5) * qty;
  if (!removeFromList(next.player.inventory, item.definitionId, qty)) return fail('出售失败，没有扣除');
  next.player.spiritStones += gain;
  return done(next, `获得${gain}灵石`);
}

export function talkToJiang(save: SaveData): StepResult {
  if (save.world.flags.talk_jiang) return fail('暂时没有新的消息');
  const next = clone(save);
  next.world.flags.talk_jiang = true;
  addToList(next.player.inventory, 'mat_wood', 1, 'permanent');
  const current = next.world.relations.npc_jiang?.value ?? 0;
  next.world.relations.npc_jiang = { value: Math.min(100, current + 4), lastReason: '她分了你一枝用得上的灵木' };
  next.world.feedback = '江小满说，山里的药不要一次采尽。破庙那边在下雨。';
  return done(next);
}

export function inspectNode(save: SaveData, nodeId: string): StepResult {
  if (save.player.talentId !== 'talent_eye') return fail('没有观物入微');
  if (!save.run || save.run.phase !== 'choose') return fail('现在不能察看');
  if (save.run.inspected >= 1) return fail('本局已经察看过一次');
  const next = clone(save);
  const node = next.run!.map.find((entry) => entry.id === nodeId && entry.layer === next.run!.layer);
  if (!node) return fail('没有这个节点');
  node.revealed = true;
  next.run!.inspected += 1;
  return done(next, node.trait ?? '你把这条路看清了');
}

export function updateSettings(save: SaveData, patch: Partial<Settings>): StepResult {
  const next = clone(save);
  next.settings = { ...next.settings, ...patch, sound: false };
  return done(next);
}

export function moveScreen(save: SaveData, screen: ScreenId): StepResult {
  if (save.run && !['run', 'event', 'battle', 'inventory', 'settings'].includes(screen)) {
    return fail('先完成、撤离或放弃这场历练。返回首页不会自动放弃。');
  }
  if (save.settlement && !save.settlement.claimed && screen !== 'settlement' && screen !== 'inventory') {
    return fail('先领取这场结算');
  }
  const next = clone(save);
  next.screen = screen;
  return done(next);
}

export function devMark(save: SaveData, recipe: (save: SaveData) => void): StepResult {
  const next = clone(save);
  next.devMarked = true;
  recipe(next);
  return done(next);
}

export function commitRealmMaterials(input: { trialPassed: boolean; materials: { id: string; qty: number }[]; have: Record<string, number> }): { ok: boolean; have: Record<string, number> } {
  const before = { ...input.have };
  if (!input.trialPassed) return { ok: false, have: before };
  for (const material of input.materials) {
    if ((before[material.id] ?? 0) < material.qty) return { ok: false, have: { ...input.have } };
  }
  const have = { ...before };
  for (const material of input.materials) have[material.id] -= material.qty;
  return { ok: true, have };
}

export function bootScreen(save: SaveData): ScreenId {
  if (save.settlement && !save.settlement.claimed) return 'settlement';
  if (save.run?.battle) return 'battle';
  if (save.run?.phase === 'event' || save.run?.phase === 'result') return 'event';
  if (save.run) return 'run';
  if (save.townEvent) return 'event';
  if (!save.ceremonySeen && save.world.flags.breakthrough_qi) return 'breakthrough';
  return 'opening';
}

export function calendarLabel(save: SaveData): string {
  return `${save.calendar.age}岁·${SEASONS[save.calendar.seasonIndex] ?? '春'}`;
}

export function realmLabel(save: SaveData): string {
  if (save.player.realm === 'mortal') return REALM_NAME.mortal;
  const stage = save.player.stage === 'early' ? '初期' : save.player.stage === 'mid' ? '中期' : '后期';
  return `${REALM_NAME[save.player.realm]}${stage}`;
}

export { beatenKey };
