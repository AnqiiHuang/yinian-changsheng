const HOUR = 60 * 60 * 1000;

export function offlineYield(lastClaim: number, now: number, capHours = 8, perHour = 6): { amount: number; nextStamp: number } {
  const delta = Math.max(0, Math.min(now - lastClaim, capHours * HOUR));
  const wholeHours = Math.floor(delta / HOUR);
  return { amount: wholeHours * perHour, nextStamp: lastClaim + wholeHours * HOUR };
}
