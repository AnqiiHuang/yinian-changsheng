import { describe, expect, it } from 'vitest';
import { poolEvents } from '../src/game/content';
import { directDamage, applyHit, bloodBurnPlan, suggestAction } from '../src/game/engine/combat';
import {
  abandonRun,
  actInBattle,
  attemptBreakthrough,
  chooseNode,
  chooseRunOption,
  chooseTownOption,
  claimSettlement,
  commitRealmMaterials,
  continueAfterResult,
  continueTown,
  createSave,
  leaveBattle,
  openTownEvent,
  pickBlessing,
  startDungeon,
} from '../src/game/engine/flow';
import { generateBamboo, selectEventId, validateRoute } from '../src/game/engine/run';
import { unit } from '../src/game/engine/rng';
import { validateContent, validateSave } from '../src/game/engine/validate';
import { EVENTS } from '../src/game/content';
import type { SaveData, StepResult } from '../src/game/types';
import { SaveRepository, type KeyValueStorage } from '../src/services/saveRepository';
import { applyAdReward } from '../src/services/ads';
import { offlineYield } from '../src/services/offline';

function take(result: StepResult): SaveData {
  if (!result.ok) throw new Error(result.error);
  return result.save;
}

function hero(name = '沈照'): SaveData {
  return take(createSave({
    name,
    appearanceId: 'app_robe',
    originId: 'origin_scholar',
    talentId: 'talent_bone',
    offeredTalentIds: ['talent_bone', 'talent_eye', 'talent_market'],
    saveId: 'save-test',
    now: 1,
  }));
}

function taught(): SaveData {
  let save = hero();
  save = take(openTownEvent(save, 'event_rain_1'));
  save = take(chooseTownOption(save, 'ask'));
  save = take(continueTown(save));
  save = take(openTownEvent(save, 'event_shen'));
  save = take(chooseTownOption(save, 'sword'));
  save = take(continueTown(save));
  return save;
}

function fightUntilDone(save: SaveData): SaveData {
  let guard = 0;
  while (save.run?.battle && !save.run.battle.finished && guard < 40) {
    const action = suggestAction(save.run.battle, save);
    save = take(actInBattle(save, action));
    guard += 1;
  }
  return save;
}

describe('content and rng', () => {
  it('checks sample counts and event length', () => {
    expect(validateContent()).toEqual([]);
    const shortBodies = EVENTS.filter((event) => Array.from(event.body).length < 80 || Array.from(event.body).length > 180).map((event) => `${event.id}:${Array.from(event.body).length}`);
    const shortResults = EVENTS.flatMap((event) => event.choices.filter((choice) => {
      const size = Array.from(choice.resultText).length;
      return size < 40 || size > 110;
    }).map((choice) => `${event.id}/${choice.id}:${Array.from(choice.resultText).length}`));
    expect(shortBodies).toEqual([]);
    expect(shortResults).toEqual([]);
  });

  it('keeps the same seed stable and different seeds legal', () => {
    expect(unit(8, 1)).toBe(unit(8, 1));
    expect(unit(8, 1)).not.toBe(unit(8, 2));
    const save = hero();
    const first = generateBamboo(save, 11);
    const second = generateBamboo(save, 11);
    expect(first.nodes.map((node) => `${node.layer}:${node.kind}:${node.enemyId ?? ''}:${node.eventId ?? ''}`)).toEqual(
      second.nodes.map((node) => `${node.layer}:${node.kind}:${node.enemyId ?? ''}:${node.eventId ?? ''}`),
    );
    expect(validateRoute(first.nodes, 'bamboo')).toEqual([]);
    expect(validateRoute(generateBamboo(save, 99).nodes, 'bamboo')).toEqual([]);
  });

  it('falls back when the event pool is empty', () => {
    const save = hero();
    for (const event of poolEvents()) save.world.eventCooldown[event.id] = 3;
    const picked = selectEventId(save, 3, 0, []);
    expect(picked.note).toContain('回退');
    expect(['event_spring', 'event_scroll', 'event_garden', 'event_traveler']).toContain(picked.eventId);
  });
});

describe('story, battle, settlement', () => {
  it('rejects an unaffordable choice without taking the other cost', () => {
    let save = hero();
    save.player.spiritStones = 0;
    save.player.inventory = save.player.inventory.filter((item) => item.definitionId !== 'con_heal');
    const before = save.player.inventory.length;
    save = take(openTownEvent(save, 'event_rain_1'));
    const failed = chooseTownOption(save, 'heal');
    expect(failed.ok).toBe(false);
    expect(save.player.inventory.length).toBe(before);
    expect(save.townEvent?.choiceId).toBeNull();
  });

  it('plays the first victory, retreat and defeat without losing permanent gear', () => {
    let save = taught();
    expect(save.player.cultivation).toBe(20);
    expect(save.player.equipment.techniqueId).toBe('tech_songfeng');
    save = take(startDungeon(save, 'tutorial', [{ definitionId: 'con_heal', qty: 1 }], 5));
    save = take(chooseNode(save, save.run!.map.find((node) => node.layer === 0)!.id));
    save = fightUntilDone(save);
    expect(save.run?.battle?.finished).toBe('win');
    save = take(leaveBattle(save));
    expect(save.run?.phase).toBe('blessing');
    const offer = save.run?.blessingOffer ?? [];
    expect(offer.length).toBeGreaterThan(0);
    expect(offer.some((id) => id.startsWith('bless_sword') || id === 'bless_shield')).toBe(true);
    save = take(pickBlessing(save, offer[0]));
    expect(save.run?.phase).toBe('choose');
    const eventNode = save.run?.map.find((node) => node.layer === save.run?.layer);
    save = take(chooseNode(save, eventNode!.id));
    save = take(chooseRunOption(save, 'note'));
    save = take(continueAfterResult(save));
    const fork = save.run?.map.find((node) => node.layer === save.run?.layer);
    save = take(chooseNode(save, fork!.id));
    save = take(chooseRunOption(save, 'chase'));
    save = take(continueAfterResult(save));
    save = fightUntilDone(save);
    save = take(leaveBattle(save));
    expect(save.settlement?.kind).toBe('victory');
    const claimed = take(claimSettlement(save));
    const again = claimSettlement(claimed);
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.save.player.spiritStones).toBe(claimed.player.spiritStones);
    expect(claimed.player.cultivation).toBeGreaterThanOrEqual(50);
    expect(claimed.player.equipment.techniqueId).toBe('tech_songfeng');
    const broken = attemptBreakthrough(claimed);
    expect(broken.ok).toBe(true);
    if (broken.ok) {
      expect(broken.save.player.realm).toBe('qi');
      expect(broken.save.player.learnedHeartIds).toContain('heart_yangyuan');
      expect(broken.save.world.unlockedLocations).toContain('loc_bamboo');
    }

    let retreat = taught();
    retreat = take(startDungeon(retreat, 'tutorial', [], 6));
    retreat = take(chooseNode(retreat, retreat.run!.map.find((node) => node.layer === 0)!.id));
    retreat = fightUntilDone(retreat);
    retreat = take(leaveBattle(retreat));
    retreat = take(pickBlessing(retreat, retreat.run!.blessingOffer![0]));
    retreat = take(chooseNode(retreat, retreat.run!.map.find((node) => node.layer === retreat.run?.layer)!.id));
    retreat = take(chooseRunOption(retreat, 'rest'));
    retreat = take(continueAfterResult(retreat));
    retreat = take(chooseNode(retreat, retreat.run!.map.find((node) => node.layer === retreat.run?.layer)!.id));
    retreat = take(chooseRunOption(retreat, 'leave'));
    retreat = take(continueAfterResult(retreat));
    expect(retreat.settlement?.kind).toBe('retreat');
    expect(retreat.settlement?.lost).toEqual([]);

    let defeat = take(startDungeon(take(attemptBreakthrough(claimed)), 'bamboo', [], 8));
    const battleNode = defeat.run!.map.find((node) => node.kind === 'battle' && node.layer === 1);
    defeat = take(chooseNode(defeat, defeat.run!.map.find((node) => node.layer === 0)!.id));
    if (defeat.run?.phase === 'event') {
      const attempt = ['note', 'read', 'rest', 'leave', 'around', 'mark', 'ask', 'listen', 'pick', 'trade'].map((id) => chooseRunOption(defeat, id)).find((result) => result.ok);
      defeat = take(attempt ?? chooseRunOption(defeat, 'note'));
      defeat = take(continueAfterResult(defeat));
    }
    if (defeat.run?.phase === 'blessing') defeat = take(pickBlessing(defeat, defeat.run.blessingOffer![0]));
    const nextBattle = defeat.run?.map.find((node) => node.layer === defeat.run?.layer && (node.kind === 'battle' || node.kind === 'elite'));
    expect(nextBattle ?? battleNode).toBeTruthy();
    defeat = take(chooseNode(defeat, (nextBattle ?? battleNode)!.id));
    defeat.run!.battle!.playerHp = 1;
    defeat.run!.battle!.enemyAtk = 400;
    defeat.run!.battle!.intentIndex = 0;
    defeat = take(actInBattle(defeat, 'attack'));
    expect(defeat.run?.battle?.finished ?? defeat.settlement?.kind).toBeTruthy();
    if (defeat.run?.battle?.finished === 'lose') defeat = take(leaveBattle(defeat));
    if (!defeat.settlement) defeat = take(abandonRun(defeat));
    expect(['defeat', 'abandon']).toContain(defeat.settlement?.kind);
    const after = take(claimSettlement(defeat));
    expect(after.player.equipment.techniqueId).toBe('tech_songfeng');
    expect(after.player.learnedTechniqueIds).toContain('tech_songfeng');
  });

  it('does not spend breakthrough materials when the trial fails', () => {
    const failed = commitRealmMaterials({ trialPassed: false, materials: [{ id: 'mat_marrow', qty: 3 }], have: { mat_marrow: 3 } });
    expect(failed.ok).toBe(false);
    expect(failed.have.mat_marrow).toBe(3);
    const missing = commitRealmMaterials({ trialPassed: true, materials: [{ id: 'mat_marrow', qty: 3 }, { id: 'mat_wood', qty: 2 }], have: { mat_marrow: 3, mat_wood: 1 } });
    expect(missing.have).toEqual({ mat_marrow: 3, mat_wood: 1 });
    const passed = commitRealmMaterials({ trialPassed: true, materials: [{ id: 'mat_marrow', qty: 3 }], have: { mat_marrow: 3 } });
    expect(passed.have.mat_marrow).toBe(0);
  });

  it('keeps shield, burn cost, death and trigger limits', () => {
    expect(applyHit(20, 10, 12).hp).toBe(18);
    expect(applyHit(8, 0, 20, true)).toEqual({ hp: 1, shield: 0, mirrored: true });
    expect(bloodBurnPlan(8, 100, [3]).ok).toBe(false);
    expect(bloodBurnPlan(40, 100, [3]).ok).toBe(true);
    expect(directDamage(12, 2.2, 4, false, 0.5)).toBeLessThan(directDamage(12, 2.2, 4, false, 1));
    let save = taught();
    save = take(startDungeon(save, 'tutorial', [], 3));
    save.run!.blessings = [{ id: 'bless_sword_qi', stacks: 3 }];
    save = take(chooseNode(save, save.run!.map[0].id));
    save.run!.battle!.counters.triggers = 20;
    const hp = save.run!.battle!.enemyHp;
    save = take(actInBattle(save, 'attack'));
    const spent = hp - (save.run!.battle?.enemyHp ?? 0);
    expect(save.run?.battle?.log.some((line) => line.includes('停下'))).toBe(true);
    expect(spent).toBeLessThan(40);
  });
});

describe('save, ads, offline', () => {
  it('restores the same battle cursor and blocks a corrupt file', () => {
    const memory = new Map<string, string>();
    const storage: KeyValueStorage = {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: (key) => memory.delete(key),
    };
    let save = taught();
    save = take(startDungeon(save, 'tutorial', [], 4));
    save = take(chooseNode(save, save.run!.map[0].id));
    save = take(actInBattle(save, 'defend'));
    const repo = new SaveRepository(storage);
    expect(repo.write(save)).toBe(true);
    const loaded = repo.read();
    expect(loaded.ok).toBe(true);
    if (loaded.ok && loaded.save) {
      expect(loaded.save.run?.battle?.round).toBe(save.run?.battle?.round);
      expect(loaded.save.run?.battle?.rngCursor).toBe(save.run?.battle?.rngCursor);
      expect(loaded.save.run?.battle?.rewardGranted).toBe(false);
    }
    memory.set('yinian.save.v1', '{bad');
    const broken = repo.read();
    expect(broken.ok).toBe(false);
    expect(repo.readBackup()?.run?.battle?.round).toBe(save.run?.battle?.round);
    expect(validateSave({ schemaVersion: 0 }).ok).toBe(false);
  });

  it('pays an ad once and ignores old lives, cancels and rewinds', () => {
    const save = hero();
    const cancel = applyAdReward(save, { status: 'cancelled' }, { saveId: save.saveId, rewardId: 'ad-1', contextId: 's', stones: 8 });
    expect(cancel.ok).toBe(false);
    expect(save.player.spiritStones).toBe(hero().player.spiritStones);
    const paid = applyAdReward(save, { status: 'completed', impressionId: 'local-1' }, { saveId: save.saveId, rewardId: 'ad-1', contextId: 's', stones: 8 });
    expect(paid.ok).toBe(true);
    if (paid.ok) {
      const twice = applyAdReward(paid.save, { status: 'completed', impressionId: 'local-1' }, { saveId: save.saveId, rewardId: 'ad-1', contextId: 's', stones: 8 });
      expect(twice.ok).toBe(false);
    }
    const foreign = applyAdReward(save, { status: 'completed' }, { saveId: 'other-life', rewardId: 'ad-2', contextId: 's', stones: 8 });
    expect(foreign.ok).toBe(false);
    const first = offlineYield(0, 3 * 60 * 60 * 1000);
    expect(first.amount).toBe(18);
    expect(offlineYield(first.nextStamp, first.nextStamp + 10).amount).toBe(0);
    expect(offlineYield(first.nextStamp, first.nextStamp - 1000).amount).toBe(0);
  });
});
