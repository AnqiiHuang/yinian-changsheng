import { BALANCE } from '../balance/config';
import { ENEMY_MAP, ITEM_MAP } from '../content';
import type { BattleAction, BattleReward, BattleState, RunState, SaveData, StatusInstance } from '../types';
import { draw } from './rng';
import { computeStats } from './stats';
import { runTreasureDefinitions } from './inventory';
import { addToList } from './inventory';

export function directDamage(atk: number, multiplier: number, def: number, crit: boolean, reduction: number): number {
  if (multiplier <= 0) return 0;
  const raw = (atk * multiplier * 100) / (100 + def);
  const withCrit = crit ? raw * BALANCE.critMult : raw;
  return Math.max(1, Math.round(withCrit * reduction));
}

export function applyHit(
  hp: number,
  shield: number,
  amount: number,
  mirrorReady = false,
): { hp: number; shield: number; mirrored: boolean } {
  if (amount <= 0) return { hp, shield, mirrored: false };
  const absorbed = Math.min(shield, amount);
  const nextShield = shield - absorbed;
  const rest = amount - absorbed;
  if (rest > 0 && hp - rest <= 0 && mirrorReady && hp > 0) {
    return { hp: 1, shield: nextShield, mirrored: true };
  }
  return { hp: Math.max(0, hp - rest), shield: nextShield, mirrored: false };
}

export function bloodBurnPlan(hp: number, maxHp: number, extraHpCosts: number[]): { ok: boolean; cost: number; reason?: string } {
  const burn = Math.ceil(maxHp * BALANCE.bloodBurnRatio);
  const cost = burn + extraHpCosts.reduce((sum, value) => sum + value, 0);
  if (hp - cost <= 0) return { ok: false, cost: 0, reason: '气血不足以安全支付燃血' };
  return { ok: true, cost };
}

function stacksOf(battle: BattleState, id: StatusInstance['id']): number {
  return battle.statuses.find((status) => status.id === id)?.stacks ?? 0;
}

function setStatus(battle: BattleState, status: StatusInstance): void {
  const index = battle.statuses.findIndex((entry) => entry.id === status.id);
  if (index >= 0) battle.statuses[index] = status;
  else battle.statuses.push(status);
}

function clearStatus(battle: BattleState, id: StatusInstance['id']): void {
  battle.statuses = battle.statuses.filter((status) => status.id !== id);
}

function blessing(battle: BattleState, id: string): number {
  return battle.blessings.find((entry) => entry.id === id)?.stacks ?? 0;
}

function pushLog(battle: BattleState, line: string): void {
  battle.log.push(line);
  if (battle.log.length > 200) battle.log.splice(0, battle.log.length - 200);
}

function rollCrit(battle: BattleState, seed: number): boolean {
  const next = draw(seed, battle.rngCursor);
  battle.rngCursor = next.cursor;
  return next.value < BALANCE.critRate;
}

function canExtra(battle: BattleState, depth: number): boolean {
  if ((battle.counters.triggers ?? 0) >= BALANCE.triggerCap || depth > BALANCE.triggerDepth) {
    pushLog(battle, '追加已经停下。');
    return false;
  }
  return true;
}

export function rollBattleReward(enemyId: string, seed: number, cursor: number, learned: string[]): { reward: BattleReward; cursor: number } {
  const enemy = ENEMY_MAP[enemyId];
  const reward: BattleReward = { stones: 0, cultivation: 0, items: [] };
  if (!enemy) return { reward, cursor };
  let next = cursor;
  const take = (itemId: string | undefined, qty = 1, stones = 0, cultivation = 0) => {
    reward.stones += stones;
    reward.cultivation += cultivation;
    if (!itemId) return;
    const def = ITEM_MAP[itemId];
    if ((def?.type === 'technique' || def?.type === 'heart') && learned.includes(itemId)) return;
    reward.items.push({ itemId, qty });
  };
  for (const drop of enemy.drops) {
    if (drop.guaranteed) take(drop.itemId, drop.qty ?? 1, drop.stones ?? 0, drop.cultivation ?? 0);
  }
  const pool = enemy.drops.filter((drop) => !drop.guaranteed && drop.weight > 0);
  if (pool.length) {
    const rolled = draw(seed, next);
    next = rolled.cursor;
    let mark = rolled.value * pool.reduce((sum, drop) => sum + drop.weight, 0);
    let picked = pool[pool.length - 1];
    for (const drop of pool) {
      mark -= drop.weight;
      if (mark <= 0) {
        picked = drop;
        break;
      }
    }
    take(picked.itemId, picked.qty ?? 1, picked.stones ?? 0, picked.cultivation ?? 0);
  }
  return { reward, cursor: next };
}

export function createBattle(save: SaveData, enemyId: string, endsRun: boolean): BattleState {
  const run = save.run as RunState;
  const stats = computeStats(save.player, run.blessings, run.loadout.heartId);
  const learned = [...save.player.learnedTechniqueIds, ...save.player.learnedHeartIds];
  const rolled = rollBattleReward(enemyId, run.seed, run.rngCursor, learned);
  run.rngCursor = rolled.cursor;
  const enemy = ENEMY_MAP[enemyId];
  let reward = rolled.reward;
  if (run.dungeonId === 'tutorial' && enemyId === 'enemy_leaf') {
    const repeat = save.ledger.storyGrants.includes('grant:tutorial-battle');
    reward = {
      stones: repeat ? 4 : 12,
      cultivation: repeat ? 0 : 8,
      items: repeat ? [] : [{ itemId: 'mat_wood', qty: 1 }],
    };
  }
  return {
    battleId: `battle_${run.runId}_${run.layer}_${enemyId}`,
    enemyId,
    round: 1,
    enemyHp: enemy?.hp ?? 1,
    enemyMaxHp: enemy?.hp ?? 1,
    enemyShield: 0,
    playerHp: run.hp,
    playerMaxHp: stats.maxHp,
    playerMp: run.mp,
    playerMaxMp: stats.maxMp,
    playerShield: 0,
    playerAtk: stats.atk,
    playerDef: stats.def,
    enemyAtk: enemy?.atk ?? 1,
    enemyDef: enemy?.def ?? 0,
    intentIndex: 0,
    statuses: [],
    log: [`${enemy?.name ?? '对手'}出现了。${enemy?.traits ?? ''}`],
    counters: {},
    finished: null,
    auto: false,
    rngCursor: run.rngCursor,
    rewardGranted: false,
    pendingReward: reward,
    school: techniqueOf(run),
    heartId: run.loadout.heartId,
    treasureIds: runTreasureDefinitions(save),
    blessings: run.blessings.map((entry) => ({ ...entry })),
    mirrorReady: run.mirrorReady && runTreasureDefinitions(save).includes('tre_mirror'),
    nodeEndsRun: endsRun,
  };
}

function techniqueOf(run: RunState): BattleState['school'] {
  return ITEM_MAP[run.loadout.techniqueId]?.school === 'fire' ? 'fire' : 'sword';
}

function applyBurn(battle: BattleState, layers: number): void {
  let next = layers;
  if (battle.treasureIds.includes('tre_gourd') && !battle.counters.gourdUsed) {
    next += 1;
    battle.counters.gourdUsed = 1;
    pushLog(battle, '赤炎葫迸出一点火星，灼烧又深了一层。');
  }
  const current = stacksOf(battle, 'burn');
  setStatus(battle, {
    id: 'burn',
    stacks: Math.min(BALANCE.burnMax, current + next),
    turns: BALANCE.burnTurns,
    sourceAtk: battle.playerAtk,
  });
}

function strikeEnemy(battle: BattleState, seed: number, multiplier: number, kind: 'basic' | 'spell' | 'extra', depth: number): void {
  if (kind === 'extra' && !canExtra(battle, depth)) return;
  const crit = rollCrit(battle, seed);
  const damage = directDamage(battle.playerAtk, multiplier, battle.enemyDef, crit, 1);
  const hit = applyHit(battle.enemyHp, battle.enemyShield, damage);
  battle.enemyHp = hit.hp;
  battle.enemyShield = hit.shield;
  pushLog(battle, `${crit ? '这一击打在破绽上，' : ''}造成${damage}点伤害。`);
  if (kind === 'extra') battle.counters.triggers = (battle.counters.triggers ?? 0) + 1;
  if (kind === 'basic') {
    battle.counters.hits = (battle.counters.hits ?? 0) + 1;
    if (battle.heartId === 'heart_tingfeng' && !battle.counters.tingfeng) {
      battle.counters.tingfeng = 1;
      battle.playerMp = Math.min(battle.playerMaxMp, battle.playerMp + 2);
      pushLog(battle, '听风录把第一剑的余势收了回来，灵力+2。');
    }
    if (battle.treasureIds.includes('tre_jade') && battle.counters.hits % 3 === 0 && !battle.counters.jadeThisTurn) {
      battle.counters.jadeThisTurn = 1;
      battle.playerMp = Math.min(battle.playerMaxMp, battle.playerMp + 2);
      pushLog(battle, '回灵玉温了一下，灵力+2。');
    }
    const qi = blessing(battle, 'bless_sword_qi');
    if (qi > 0 && !battle.counters.extraThisTurn) {
      battle.counters.extraThisTurn = 1;
      const extra = 0.25 + (qi - 1) * 0.1;
      pushLog(battle, '剑气顺着这一击又追了一段。');
      strikeEnemy(battle, seed, extra, 'extra', depth + 1);
    }
    if (battle.school === 'fire') applyBurn(battle, 1);
  }
}

function playerDefend(battle: BattleState): void {
  setStatus(battle, { id: 'defending', stacks: 1, turns: 1, sourceAtk: 0 });
  battle.playerMp = Math.min(battle.playerMaxMp, battle.playerMp + BALANCE.defendMp);
  const shieldStacks = blessing(battle, 'bless_shield');
  if (shieldStacks > 0) {
    const gain = Math.max(1, Math.round(battle.playerMaxHp * 0.04 * shieldStacks));
    battle.playerShield += gain;
    pushLog(battle, `你沉气守御，护盾+${gain}，灵力+${BALANCE.defendMp}。`);
  } else {
    pushLog(battle, `你沉气守御，本回合受到的直接伤害减半，灵力+${BALANCE.defendMp}。`);
  }
  if (battle.treasureIds.includes('tre_lamp') && !battle.counters.lampUsed && stacksOf(battle, 'burn') > 0) {
    battle.counters.lampUsed = 1;
    const burn = battle.statuses.find((status) => status.id === 'burn');
    if (burn) {
      burn.stacks -= 1;
      if (burn.stacks <= 0) clearStatus(battle, 'burn');
      pushLog(battle, '青莲灯亮了一下，清掉一层灼烧。');
    }
  }
}

function playerSpell(battle: BattleState, seed: number): void {
  battle.playerMp -= BALANCE.spellCost;
  if (battle.school === 'fire') {
    const damage = directDamage(battle.playerAtk, 1.2, battle.enemyDef, rollCrit(battle, seed), 1);
    const hit = applyHit(battle.enemyHp, battle.enemyShield, damage);
    battle.enemyHp = hit.hp;
    battle.enemyShield = hit.shield;
    pushLog(battle, `离火诀推出，造成${damage}点伤害。`);
    const burn = stacksOf(battle, 'burn');
    if (burn > 0 && battle.enemyHp > 0) {
      const per = Math.max(1, Math.round(battle.playerAtk * BALANCE.detonateRatio));
      const extra = per * burn;
      const burned = applyHit(battle.enemyHp, battle.enemyShield, extra);
      battle.enemyHp = burned.hp;
      battle.enemyShield = burned.shield;
      clearStatus(battle, 'burn');
      pushLog(battle, `灼烧被引爆，额外造成${extra}点伤害。`);
    }
    return;
  }
  const echo = blessing(battle, 'bless_sword_echo');
  const intent = stacksOf(battle, 'swordIntent');
  let multiplier = 1.6;
  if (echo > 0 && intent > 0) {
    multiplier += intent * (0.3 + (echo - 1) * 0.1);
    clearStatus(battle, 'swordIntent');
    pushLog(battle, '积下的剑意在这一式里一起放出。');
  }
  const damage = directDamage(battle.playerAtk, multiplier, battle.enemyDef, rollCrit(battle, seed), 1);
  const hit = applyHit(battle.enemyHp, battle.enemyShield, damage);
  battle.enemyHp = hit.hp;
  battle.enemyShield = hit.shield;
  pushLog(battle, `松风剑诀落下来，造成${damage}点伤害。`);
  const nextIntent = Math.min(BALANCE.swordIntentMax, stacksOf(battle, 'swordIntent') + 1);
  setStatus(battle, { id: 'swordIntent', stacks: nextIntent, turns: 99, sourceAtk: battle.playerAtk });
}

function enemyActs(battle: BattleState, seed: number): void {
  const enemy = ENEMY_MAP[battle.enemyId];
  const intent = enemy?.intents[battle.intentIndex % (enemy.intents.length || 1)];
  if (!intent || battle.enemyHp <= 0) return;
  if (intent.kind === 'charge') {
    pushLog(battle, `${enemy?.name ?? '对手'}把力气攒满，这一下还没有打出来。`);
    return;
  }
  if (intent.kind === 'guard') {
    battle.enemyShield += 6;
    pushLog(battle, `${enemy?.name ?? '对手'}收紧防守，获得6点护盾。`);
    return;
  }
  const defending = stacksOf(battle, 'defending') > 0;
  const reduction = defending ? BALANCE.defendReduction : 1;
  const crit = rollCrit(battle, seed);
  const damage = directDamage(battle.enemyAtk, intent.power, battle.playerDef, crit, reduction);
  const hit = applyHit(battle.playerHp, battle.playerShield, damage, battle.mirrorReady);
  battle.playerHp = hit.hp;
  battle.playerShield = hit.shield;
  if (hit.mirrored) {
    battle.mirrorReady = false;
    pushLog(battle, '裂纹铜镜裂光一闪，你停在1点气血上。这面镜子本局已经用过。');
  } else if (intent.kind === 'heavy' && defending) {
    pushLog(battle, `你提前守御，挡下重击，实际受到${damage}点伤害。`);
  } else if (intent.kind === 'heavy') {
    battle.counters.heavyUnblocked = 1;
    pushLog(battle, `重击结结实实砸中，受到${damage}点伤害。`);
  } else {
    pushLog(battle, `${enemy?.name ?? '对手'}击中了你，受到${damage}点伤害。`);
  }
}

function tickDots(battle: BattleState): void {
  const burn = battle.statuses.find((status) => status.id === 'burn');
  if (!burn || battle.enemyHp <= 0) return;
  const ratio = BALANCE.burnRatio + blessing(battle, 'bless_burn') * BALANCE.burnDeepPerStack;
  const per = Math.max(1, Math.round(burn.sourceAtk * ratio));
  const damage = per * burn.stacks;
  const hit = applyHit(battle.enemyHp, battle.enemyShield, damage);
  battle.enemyHp = hit.hp;
  battle.enemyShield = hit.shield;
  pushLog(battle, `灼烧发作，造成${damage}点伤害。`);
  burn.turns -= 1;
  if (burn.turns <= 0) clearStatus(battle, 'burn');
}

export function currentIntent(battle: BattleState): { name: string; telegraph: string; kind: string } {
  const enemy = ENEMY_MAP[battle.enemyId];
  const intent = enemy?.intents[battle.intentIndex % (enemy.intents.length || 1)];
  return { name: intent?.name ?? '待机', telegraph: intent?.telegraph ?? '', kind: intent?.kind ?? 'attack' };
}

export function suggestAction(battle: BattleState, save: SaveData): BattleAction {
  const intent = currentIntent(battle);
  if (intent.kind === 'heavy') return 'defend';
  const pill = save.run?.supplies.find((item) => item.definitionId === 'con_heal' && item.qty > 0);
  if (battle.playerHp < battle.playerMaxHp * 0.35 && pill) return 'pill';
  if (battle.playerMp >= BALANCE.spellCost) {
    if (battle.school === 'fire' && stacksOf(battle, 'burn') >= 2) return 'spell';
    if (battle.school === 'sword' && (stacksOf(battle, 'swordIntent') >= 2 || battle.playerMp >= 16)) return 'spell';
  }
  return 'attack';
}

export function actionRejection(battle: BattleState, action: BattleAction, save: SaveData): string | null {
  if (battle.finished) return '这场战斗已经结束';
  if (action === 'spell' && battle.playerMp < BALANCE.spellCost) {
    return `灵力不足，还差${BALANCE.spellCost - battle.playerMp}`;
  }
  if (action === 'pill' || action === 'powder') {
    const id = action === 'pill' ? 'con_heal' : 'con_mind';
    const have = save.run?.supplies.find((item) => item.definitionId === id && item.qty > 0);
    if (!have) return action === 'pill' ? '没有回春丹' : '没有凝神散';
  }
  return null;
}

function grantReward(save: SaveData, battle: BattleState): void {
  const run = save.run;
  if (!run || battle.rewardGranted) return;
  battle.rewardGranted = true;
  run.stones += battle.pendingReward.stones;
  run.cultivation += battle.pendingReward.cultivation;
  for (const item of battle.pendingReward.items) addToList(run.loot, item.itemId, item.qty, 'run');
  if (run.dungeonId === 'tutorial' && battle.enemyId === 'enemy_leaf' && !save.ledger.storyGrants.includes('grant:tutorial-battle')) {
    save.ledger.storyGrants.push('grant:tutorial-battle');
  }
  pushLog(battle, '战斗的收获先放进本局战利里，结算前还不算真正带出。');
}

export function burnTickDamage(battle: BattleState): number {
  const burn = battle.statuses.find((status) => status.id === 'burn');
  if (!burn) return 0;
  const ratio = BALANCE.burnRatio + blessing(battle, 'bless_burn') * BALANCE.burnDeepPerStack;
  return Math.max(1, Math.round(burn.sourceAtk * ratio)) * burn.stacks;
}

export function playAction(save: SaveData, action: BattleAction): string | null {
  const run = save.run;
  const battle = run?.battle;
  if (!run || !battle) return '现在没有战斗';
  const rejected = actionRejection(battle, action, save);
  if (rejected) return rejected;
  const logStart = battle.log.length;
  const enemyBefore = battle.enemyHp;
  const playerBefore = battle.playerHp;
  const enemyShieldBefore = battle.enemyShield;
  battle.counters.extraThisTurn = 0;
  battle.counters.jadeThisTurn = 0;
  if (action === 'attack') strikeEnemy(battle, run.seed, battle.school === 'fire' ? 0.85 : 1, 'basic', 0);
  if (action === 'defend') playerDefend(battle);
  if (action === 'spell') playerSpell(battle, run.seed);
  if (action === 'pill' || action === 'powder') {
    const id = action === 'pill' ? 'con_heal' : 'con_mind';
    const stack = run.supplies.find((item) => item.definitionId === id && item.qty > 0);
    if (!stack) return '物品不足';
    stack.qty -= 1;
    run.supplies = run.supplies.filter((item) => item.qty > 0);
    if (action === 'pill') {
      const ratio = BALANCE.pillHealRatio * (1 + blessing(battle, 'bless_pill') * 0.1);
      const heal = Math.max(1, Math.round(battle.playerMaxHp * ratio));
      battle.playerHp = Math.min(battle.playerMaxHp, battle.playerHp + heal);
      pushLog(battle, `你服下回春丹，气血恢复${heal}。`);
    } else {
      battle.playerMp = Math.min(battle.playerMaxMp, battle.playerMp + BALANCE.powderMp);
      pushLog(battle, `你服下凝神散，灵力恢复${BALANCE.powderMp}。`);
    }
  }
  const closeBrief = () => {
    const added = battle.log.slice(logStart).filter((line) => !line.startsWith('战斗的收获') && !line.startsWith('对手倒下') && !line.startsWith('对手倒在'));
    const parts = added.slice(0, 3);
    if (enemyBefore !== battle.enemyHp) parts.push(`敌方气血${enemyBefore}→${battle.enemyHp}`);
    if (playerBefore !== battle.playerHp) parts.push(`我方气血${playerBefore}→${battle.playerHp}`);
    if (enemyShieldBefore > battle.enemyShield) parts.push(`护盾吸收${enemyShieldBefore - battle.enemyShield}`);
    battle.lastBrief = parts.join(' · ');
  };
  if (battle.enemyHp <= 0) {
    battle.finished = 'win';
    grantReward(save, battle);
    pushLog(battle, '对手倒下了。');
    closeBrief();
    syncRun(run, battle);
    return null;
  }
  enemyActs(battle, run.seed);
  if (battle.playerHp <= 0) {
    battle.finished = 'lose';
    pushLog(battle, '你支撑不住，这场战斗失败了。');
    closeBrief();
    syncRun(run, battle);
    return null;
  }
  tickDots(battle);
  if (battle.playerHp <= 0) {
    battle.finished = 'lose';
    pushLog(battle, '持续的伤势同时压过了双方。按这一路的规矩，算你战败。');
    closeBrief();
    syncRun(run, battle);
    return null;
  }
  if (battle.enemyHp <= 0) {
    battle.finished = 'win';
    grantReward(save, battle);
    pushLog(battle, '对手倒在余烬里。');
    closeBrief();
    syncRun(run, battle);
    return null;
  }
  clearStatus(battle, 'defending');
  battle.counters.triggers = 0;
  battle.intentIndex += 1;
  battle.round += 1;
  closeBrief();
  syncRun(run, battle);
  return null;
}

function syncRun(run: RunState, battle: BattleState): void {
  run.hp = battle.playerHp;
  run.mp = battle.playerMp;
  run.maxHp = battle.playerMaxHp;
  run.maxMp = battle.playerMaxMp;
  run.mirrorReady = battle.mirrorReady;
  run.rngCursor = battle.rngCursor;
}

export function beatenKey(enemyId: string): string {
  return `beat:${enemyId}`;
}
