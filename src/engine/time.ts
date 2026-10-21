// The shared clock. Time only moves through advanceTime, which applies passive
// needs (hunger, tiredness, sleep recovery) and runs day boundaries.

import { applyStats, round2 } from './core';
import { MINUTES_PER_DAY } from './calendar';
import { processDayEnd, processDayStart } from './daily';
import type { GameState } from './types';

export interface AdvanceOptions {
  asleep?: boolean;
}

/** Passive per-hour changes. Energy recovers while asleep. */
export const PASSIVE = {
  awake: { energy: -1.2, satiety: -5 },
  asleep: { energy: 11.5, satiety: -1.5, stress: -0.6 },
} as const;

export function advanceTime(state: GameState, minutes: number, opts: AdvanceOptions = {}): void {
  let remaining = Math.max(0, Math.round(minutes));
  while (remaining > 0) {
    const toMidnight = MINUTES_PER_DAY - state.clock.minute;
    const step = Math.min(remaining, toMidnight);
    applyPassive(state, step, !!opts.asleep);
    if (opts.asleep) state.today.sleepMinutes += step;
    state.clock.minute += step;
    remaining -= step;
    if (state.clock.minute >= MINUTES_PER_DAY) {
      processDayEnd(state);
      state.clock.day += 1;
      state.clock.minute = 0;
      processDayStart(state);
    }
  }
}

function applyPassive(state: GameState, minutes: number, asleep: boolean): void {
  const hours = minutes / 60;
  if (asleep) {
    const recovery = state.stats.satiety < 10 ? 0.7 : 1;
    applyStats(state, {
      energy: PASSIVE.asleep.energy * hours * recovery,
      satiety: PASSIVE.asleep.satiety * hours,
      stress: PASSIVE.asleep.stress * hours,
    });
    return;
  }
  const hungry = state.stats.satiety < 15;
  // Staying awake very long drains faster.
  const awakeFor = Number(state.flags.awakeMinutes ?? 0) + minutes;
  state.flags.awakeMinutes = awakeFor;
  const marathon = awakeFor > 18 * 60 ? 2 : 1;
  applyStats(state, {
    energy: PASSIVE.awake.energy * hours * marathon * (hungry ? 1.6 : 1),
    satiety: PASSIVE.awake.satiety * hours,
    happiness: hungry ? -0.8 * hours : 0,
    stress: hungry ? 0.6 * hours : 0,
  });
  state.stats.energy = round2(state.stats.energy);
}

/** Minutes until a given clock minute (today or tomorrow). */
export function minutesUntil(state: GameState, targetMinute: number): number {
  const diff = targetMinute - state.clock.minute;
  return diff > 0 ? diff : diff + MINUTES_PER_DAY;
}
