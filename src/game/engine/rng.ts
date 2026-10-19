export function uid(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${rand}${Date.now().toString(36).slice(-3)}`;
}

export function unit(seed: number, cursor: number): number {
  let x = Math.imul(seed ^ Math.imul(cursor + 1, 0x6d2b79f5), 0x9e3779b1);
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export function draw(seed: number, cursor: number): { value: number; cursor: number } {
  return { value: unit(seed, cursor), cursor: cursor + 1 };
}

export function intRange(seed: number, cursor: number, min: number, max: number): { value: number; cursor: number } {
  const next = draw(seed, cursor);
  const span = max - min + 1;
  return { value: min + Math.floor(next.value * span), cursor: next.cursor };
}

export function weightedIndex(weights: number[], seed: number, cursor: number): { index: number; cursor: number } {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const next = draw(seed, cursor);
  if (total <= 0) return { index: 0, cursor: next.cursor };
  let mark = next.value * total;
  for (let i = 0; i < weights.length; i += 1) {
    mark -= weights[i];
    if (mark <= 0) return { index: i, cursor: next.cursor };
  }
  return { index: weights.length - 1, cursor: next.cursor };
}

export function shuffle<T>(list: T[], seed: number, cursor: number): { list: T[]; cursor: number } {
  const copy = [...list];
  let next = cursor;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const rolled = intRange(seed, next, 0, i);
    next = rolled.cursor;
    const swap = copy[i];
    copy[i] = copy[rolled.value];
    copy[rolled.value] = swap;
  }
  return { list: copy, cursor: next };
}
