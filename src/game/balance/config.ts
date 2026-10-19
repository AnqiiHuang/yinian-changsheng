import type { DungeonId, RealmId, StageId } from '../types';

export const REALM_ORDER: RealmId[] = ['mortal', 'qi', 'foundation', 'golden'];

export const REALM_NAME: Record<RealmId, string> = {
  mortal: '凡人',
  qi: '炼气',
  foundation: '筑基',
  golden: '金丹',
};

export const STAGE_NAME: Record<StageId, string> = {
  early: '初期',
  mid: '中期',
  late: '后期',
};

export const REALM_BASE: Record<RealmId, { hp: number; atk: number; def: number; mp: number }> = {
  mortal: { hp: 80, atk: 8, def: 3, mp: 10 },
  qi: { hp: 100, atk: 12, def: 4, mp: 30 },
  foundation: { hp: 180, atk: 22, def: 8, mp: 45 },
  golden: { hp: 280, atk: 34, def: 12, mp: 60 },
};

export const CULTIVATION_NODES: Record<RealmId, number[]> = {
  mortal: [50],
  qi: [0, 90, 220, 360],
  foundation: [0, 240, 580, 1000],
  golden: [],
};

export const RESERVE_CAP: Record<RealmId, number> = {
  mortal: 22,
  qi: 60,
  foundation: 0,
  golden: 0,
};

export const BALANCE = {
  critRate: 0.1,
  critMult: 1.5,
  spellCost: 8,
  defendMp: 2,
  defendReduction: 0.5,
  burnMax: 5,
  burnTurns: 3,
  burnRatio: 0.1,
  burnDeepPerStack: 0.05,
  detonateRatio: 0.25,
  swordIntentMax: 5,
  triggerCap: 20,
  triggerDepth: 2,
  learnWoodCost: 4,
  studyDiscount: 0.9,
  pillHealRatio: 0.25,
  powderMp: 10,
  restHealRatio: 0.4,
  restMp: 6,
  prepHealRatio: 0.25,
  shopTalentDiscount: 0.9,
  sellRatio: 0.5,
  tutorialCultivationTarget: 30,
  storyRainCultivation: 8,
  storyTeachCultivation: 12,
  defeatKeepRatio: 0.5,
  blessingThresholds: [1, 3, 5, 8],
  bloodBurnRatio: 0.05,
  adDailyCap: 4,
  offlineCapHours: 8,
  offlinePerHour: 6,
};

export function stageMultipliers(stage: StageId): { body: number; mp: number } {
  if (stage === 'mid') return { body: 1.2, mp: 5 };
  if (stage === 'late') return { body: 1.45, mp: 10 };
  return { body: 1, mp: 0 };
}

export function cultivationCap(realm: RealmId): number | null {
  if (realm === 'mortal') return 50;
  if (realm === 'qi') return 360;
  if (realm === 'foundation') return 1000;
  return null;
}

export function stageFor(realm: RealmId, cultivation: number): StageId {
  if (realm === 'qi') {
    if (cultivation >= 220) return 'late';
    if (cultivation >= 90) return 'mid';
  }
  if (realm === 'foundation') {
    if (cultivation >= 580) return 'late';
    if (cultivation >= 240) return 'mid';
  }
  return 'early';
}

export function nextStageNeed(realm: RealmId, stage: StageId): { label: string; need: number } | null {
  if (realm === 'mortal') return { label: '引气', need: 50 };
  if (realm === 'qi') {
    if (stage === 'early') return { label: '炼气中期', need: 90 };
    if (stage === 'mid') return { label: '炼气后期', need: 220 };
    return { label: '申请筑基', need: 360 };
  }
  if (realm === 'foundation') {
    if (stage === 'early') return { label: '筑基中期', need: 240 };
    if (stage === 'mid') return { label: '筑基后期', need: 580 };
    return { label: '申请金丹', need: 1000 };
  }
  return null;
}

export const DUNGEON_INFO: Record<
  DungeonId,
  { name: string; nodes: number; suggest: string; trait: string; loot: string; retreat: string; minRealm: RealmId }
> = {
  tutorial: {
    name: '引气试炼',
    nodes: 3,
    suggest: '凡人',
    trait: '低危小兽，用来熟悉攻击、守御和施术',
    loot: '少量灵石、灵木枝、完成引气所需的修为',
    retreat: '第三处可以安全撤离并带回全部收获；主动放弃则按战败，只保留一半灵石与材料。',
    minRealm: 'mortal',
  },
  bamboo: {
    name: '雾隐竹林',
    nodes: 10,
    suggest: '炼气',
    trait: '雾骨山魈会先蓄力，下一击重击可用守御减半',
    loot: '灵木枝、青髓草、灵石、可能出现的法宝或功法书',
    retreat: '休息处可安全撤离并带回全部收获。其余时候放弃，按战败结算。',
    minRealm: 'qi',
  },
};

export const ENEMY_STATS = {
  enemy_leaf: { hp: 36, atk: 7, def: 1 },
  enemy_fox: { hp: 40, atk: 8, def: 1 },
  enemy_lamp: { hp: 44, atk: 8, def: 2 },
  enemy_snake: { hp: 48, atk: 9, def: 2 },
  enemy_shade: { hp: 78, atk: 11, def: 3 },
  enemy_wugu: { hp: 120, atk: 12, def: 2 },
} as const;
