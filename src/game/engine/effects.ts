import { ACHIEVEMENT_MAP, ITEM_MAP, NPC_MAP } from '../content';
import type { Effect, SaveData } from '../types';
import { countList, payItem, addToList } from './inventory';
import { grantCultivation } from './stats';

export interface EffectContext {
  scope: 'town' | 'run';
}

function clampRelation(value: number): number {
  return Math.max(-100, Math.min(100, value));
}

export function applyEffects(save: SaveData, effects: Effect[], context: EffectContext): string[] {
  const deltas: string[] = [];
  for (const effect of effects) {
    if (effect.op === 'stones') {
      save.player.spiritStones = Math.max(0, save.player.spiritStones + effect.amount);
      deltas.push(`灵石 ${effect.amount > 0 ? '+' : ''}${effect.amount}`);
    } else if (effect.op === 'cultivation') {
      if (effect.grantId && save.ledger.storyGrants.includes(effect.grantId)) continue;
      if (context.scope === 'run' && save.run) {
        save.run.cultivation += effect.amount;
        deltas.push(`本局修为 +${effect.amount}`);
      } else {
        const note = grantCultivation(save.player, effect.amount);
        deltas.push(`修为 +${note.accepted}`);
        deltas.push(...note.notes);
      }
      if (effect.grantId) save.ledger.storyGrants.push(effect.grantId);
    } else if (effect.op === 'item') {
      if (effect.grantId && save.ledger.storyGrants.includes(effect.grantId)) continue;
      const name = ITEM_MAP[effect.itemId]?.name ?? effect.itemId;
      if (effect.persist || context.scope === 'town') {
        addToList(save.player.inventory, effect.itemId, effect.qty, 'permanent');
      } else if (save.run) {
        addToList(save.run.loot, effect.itemId, effect.qty, 'run');
      }
      if (effect.grantId) save.ledger.storyGrants.push(effect.grantId);
      deltas.push(`${name} +${effect.qty}`);
      if (ITEM_MAP[effect.itemId]?.quality === 'spirit' && ITEM_MAP[effect.itemId]?.type === 'treasure' && (effect.persist || context.scope === 'town')) {
        unlockAchievement(save, 'ach_treasure');
      }
    } else if (effect.op === 'learn') {
      const item = ITEM_MAP[effect.itemId];
      if (!item) continue;
      if (item.type === 'technique' && !save.player.learnedTechniqueIds.includes(effect.itemId)) {
        save.player.learnedTechniqueIds.push(effect.itemId);
        deltas.push(`学会${item.name}`);
      }
      if (item.type === 'heart' && !save.player.learnedHeartIds.includes(effect.itemId)) {
        save.player.learnedHeartIds.push(effect.itemId);
        deltas.push(`学会${item.name}`);
      }
    } else if (effect.op === 'equip') {
      if (effect.slot === 'technique') save.player.equipment.techniqueId = effect.itemId;
      if (effect.slot === 'heart') save.player.equipment.heartId = effect.itemId;
    } else if (effect.op === 'relation') {
      const current = save.world.relations[effect.npcId]?.value ?? 0;
      const next = clampRelation(current + effect.amount);
      save.world.relations[effect.npcId] = { value: next, lastReason: effect.reason };
      if (!save.world.metNpcs.includes(effect.npcId)) save.world.metNpcs.push(effect.npcId);
      deltas.push(`${NPC_MAP[effect.npcId]?.name ?? '人物'} ${effect.amount > 0 ? '+' : ''}${effect.amount}`);
    } else if (effect.op === 'renown') {
      save.world.renown[effect.factionId] = (save.world.renown[effect.factionId] ?? 0) + effect.amount;
    } else if (effect.op === 'flag') {
      save.world.flags[effect.flag] = effect.value ?? true;
    } else if (effect.op === 'counter') {
      save.world.counters[effect.key] = (save.world.counters[effect.key] ?? 0) + effect.amount;
    } else if (effect.op === 'codex') {
      if (!save.codex.entries.includes(effect.entryId)) save.codex.entries.push(effect.entryId);
    } else if (effect.op === 'clue') {
      if (!save.world.clues.some((clue) => clue.id === effect.clueId)) save.world.clues.push({ id: effect.clueId, text: effect.text });
    } else if (effect.op === 'feedback') {
      save.world.feedback = effect.text;
    } else if (effect.op === 'runHp' && save.run) {
      save.run.hp = Math.max(1, Math.min(save.run.maxHp, save.run.hp + effect.amount));
      deltas.push(`气血 ${effect.amount > 0 ? '+' : ''}${effect.amount}`);
    } else if (effect.op === 'runHpPct' && save.run) {
      const heal = Math.max(1, Math.round(save.run.maxHp * (effect.amount / 100)));
      const before = save.run.hp;
      save.run.hp = Math.min(save.run.maxHp, save.run.hp + heal);
      deltas.push(`气血 +${save.run.hp - before}`);
    } else if (effect.op === 'runMp' && save.run) {
      save.run.mp = Math.max(0, Math.min(save.run.maxMp, save.run.mp + effect.amount));
      deltas.push(`灵力 +${effect.amount}`);
    } else if (effect.op === 'dao') {
      save.player.daoYun += effect.amount;
    } else if (effect.op === 'achievement') {
      unlockAchievement(save, effect.id);
    } else if (effect.op === 'unlock') {
      if (!save.world.unlockedLocations.includes(effect.locationId)) save.world.unlockedLocations.push(effect.locationId);
    } else if (effect.op === 'meet') {
      if (!save.world.metNpcs.includes(effect.npcId)) save.world.metNpcs.push(effect.npcId);
      if (!save.world.relations[effect.npcId]) save.world.relations[effect.npcId] = { value: 0, lastReason: effect.reason };
    } else if (effect.op === 'quest') {
      const existing = save.world.quests.find((quest) => quest.id === effect.questId);
      if (existing) {
        existing.title = effect.title;
        existing.detail = effect.detail;
        existing.status = effect.status;
      } else {
        save.world.quests.push({ id: effect.questId, title: effect.title, detail: effect.detail, status: effect.status });
      }
    } else if (effect.op === 'battle' || effect.op === 'endRun') {
      continue;
    }
  }
  return deltas.filter(Boolean);
}

export function unlockAchievement(save: SaveData, id: string): void {
  if (!ACHIEVEMENT_MAP[id]) return;
  if (save.codex.achievements[id]?.claimed) return;
  save.codex.achievements[id] = { unlocked: true, claimed: true };
  if (!save.ledger.storyGrants.includes(`ach:${id}`)) {
    save.ledger.storyGrants.push(`ach:${id}`);
    save.player.daoYun += 1;
  }
}

export function rememberStory(save: SaveData, eventId: string, choiceId: string, summary: string): void {
  save.codex.stories.push({ eventId, choiceId, summary });
  if (save.codex.stories.length > 80) save.codex.stories.splice(0, save.codex.stories.length - 80);
}

export function playerHas(save: SaveData, itemId: string, qty: number): boolean {
  return countList(save.player.inventory, itemId) >= qty;
}

export function consumeOrFail(save: SaveData, itemId: string, qty: number): boolean {
  return payItem(save, itemId, qty);
}
