// Seeded PRNG (mulberry32). The generator state lives in GameState.rng so the
// same state + action always produces the same outcome.

import type { GameState } from './types';

export function nextRandom(state: GameState): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function chance(state: GameState, p: number): boolean {
  return nextRandom(state) < p;
}

export function randInt(state: GameState, min: number, max: number): number {
  return min + Math.floor(nextRandom(state) * (max - min + 1));
}

export function randRange(state: GameState, min: number, max: number): number {
  return min + nextRandom(state) * (max - min);
}

export function pick<T>(state: GameState, items: readonly T[]): T {
  return items[Math.floor(nextRandom(state) * items.length)];
}

export function weightedPick<T>(state: GameState, items: readonly T[], weight: (item: T) => number): T | null {
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  if (total <= 0) return null;
  let roll = nextRandom(state) * total;
  for (const item of items) {
    roll -= Math.max(0, weight(item));
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

export function seedFromString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
