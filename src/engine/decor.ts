// Home decor rules: buy, place, and a small daily comfort bonus. No randomness.

import { DECOR_COMFORT, decorById } from '../data/decor';
import { applyStats, spend } from './core';
import type { GameState } from './types';

export function buyDecor(state: GameState, id: string): void {
  const item = decorById(id);
  if (!item || state.decor.owned.includes(id)) return;
  spend(state, item.price, item.name);
  state.decor.owned.push(id);
  state.decor.placed[item.slot] = id;
}

export function placeDecor(state: GameState, id: string): void {
  const item = decorById(id);
  if (!item || !state.decor.owned.includes(id)) return;
  state.decor.placed[item.slot] = id;
}

export function decorDayEnd(state: GameState): void {
  const placed = Object.values(state.decor.placed).filter(Boolean).length;
  if (placed) applyStats(state, { happiness: Math.min(DECOR_COMFORT.max, placed * DECOR_COMFORT.perItem) });
}
