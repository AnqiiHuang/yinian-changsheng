import { REALM_BASE, RESERVE_CAP, cultivationCap, stageFor, stageMultipliers } from '../balance/config';
import { BLESSING_MAP, ITEM_MAP } from '../content';
import type { Player, RunState, SchoolId } from '../types';

export interface Stats {
  maxHp: number;
  atk: number;
  def: number;
  maxMp: number;
  school: SchoolId;
}

export function techniqueSchool(techniqueId: string | null): SchoolId {
  if (!techniqueId) return 'sword';
  const item = ITEM_MAP[techniqueId];
  if (item?.school === 'fire' || item?.school === 'body' || item?.school === 'sword') return item.school;
  return 'sword';
}

export function computeStats(player: Player, blessings: { id: string; stacks: number }[] = [], heartId = player.equipment.heartId): Stats {
  const base = REALM_BASE[player.realm];
  const stage = player.realm === 'mortal' ? 'early' : player.stage;
  const mult = stageMultipliers(stage);
  let maxHp = Math.round(base.hp * mult.body) + player.hpFlat;
  const atk = Math.round(base.atk * mult.body);
  const def = Math.round(base.def * mult.body);
  let maxMp = base.mp + mult.mp;
  if (heartId === 'heart_yangyuan') maxMp += 10;
  for (const blessing of blessings) {
    if (blessing.id === 'bless_mp') maxMp += 4 * blessing.stacks;
  }
  if (player.talentId === 'talent_bone') maxHp = Math.round(maxHp * 1.1);
  return { maxHp, atk, def, maxMp, school: techniqueSchool(player.equipment.techniqueId) };
}

export function learnCost(player: Player): number {
  const base = 4;
  if (player.talentId === 'talent_study') return Math.max(1, Math.floor(base * 0.9));
  return base;
}

export function shopPrice(player: Player, amount: number): number {
  if (player.talentId === 'talent_market') return Math.max(1, Math.floor(amount * 0.9));
  return amount;
}

export interface CultivationNote {
  accepted: number;
  overflow: number;
  notes: string[];
}

export function grantCultivation(player: Player, amount: number): CultivationNote {
  if (amount <= 0) return { accepted: 0, overflow: 0, notes: [] };
  const notes: string[] = [];
  const previous = player.stage;
  const cap = cultivationCap(player.realm);
  let left = amount;
  let accepted = 0;
  if (cap === null) {
    notes.push('这一境暂时没有下一阶，修为没有记入进度。');
    return { accepted: 0, overflow: amount, notes };
  }
  const room = Math.max(0, cap - player.cultivation);
  const into = Math.min(room, left);
  player.cultivation += into;
  accepted += into;
  left -= into;
  const reserveCap = RESERVE_CAP[player.realm];
  const reserveRoom = Math.max(0, reserveCap - player.insightReserve);
  const intoReserve = Math.min(reserveRoom, left);
  player.insightReserve += intoReserve;
  accepted += intoReserve;
  left -= intoReserve;
  player.lifetimeCultivation += accepted;
  if (intoReserve > 0) notes.push(`超出当前门槛的${intoReserve}点记入见闻储备。`);
  if (left > 0) notes.push(`还有${left}点超过储备上限，没有记入。`);
  const nextStage = stageFor(player.realm, player.cultivation);
  if (player.realm !== 'mortal' && nextStage !== previous) {
    player.stage = nextStage;
    const label = nextStage === 'mid' ? '中期' : '后期';
    notes.push(`你进入了${player.realm === 'qi' ? '炼气' : '筑基'}${label}。`);
  }
  return { accepted, overflow: left, notes };
}

export function syncRunVitals(run: RunState, stats: Stats): void {
  const hpRatio = run.maxHp > 0 ? run.hp / run.maxHp : 1;
  const mpRatio = run.maxMp > 0 ? run.mp / run.maxMp : 1;
  run.maxHp = stats.maxHp;
  run.maxMp = stats.maxMp;
  run.hp = Math.max(1, Math.min(stats.maxHp, Math.round(stats.maxHp * hpRatio)));
  run.mp = Math.max(0, Math.min(stats.maxMp, Math.round(stats.maxMp * mpRatio)));
}

export function blessingLabel(id: string, stacks: number): string {
  const def = BLESSING_MAP[id];
  if (!def) return id;
  return `${def.name} ${stacks}/${def.max}`;
}
