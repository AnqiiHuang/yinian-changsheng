import type { AdProvider, AdResult, SaveData } from '../game/types';

export const unavailableAds: AdProvider = {
  async isAvailable() {
    return false;
  },
  async showRewarded(): Promise<AdResult> {
    return { status: 'unavailable', reason: '当前版本未接入广告' };
  },
};

export interface AdRewardRequest {
  saveId: string;
  rewardId: string;
  contextId: string;
  stones: number;
}

export function applyAdReward(save: SaveData, result: AdResult, request: AdRewardRequest): { ok: true; save: SaveData } | { ok: false; reason: string } {
  if (request.saveId !== save.saveId) return { ok: false, reason: '这是上一人生的广告回调' };
  if (result.status !== 'completed') return { ok: false, reason: result.reason ?? '广告没有完整观看' };
  if (save.ledger.claimedRewardIds.includes(request.rewardId)) return { ok: false, reason: '这份额外奖励已经领过' };
  const next = structuredClone(save);
  next.ledger.claimedRewardIds.push(request.rewardId);
  next.player.spiritStones += Math.max(0, Math.floor(request.stones));
  return { ok: true, save: next };
}
