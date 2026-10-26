// Daily challenge lives: the same scenario and seed for everyone on a given date.
// The caller passes the date; the simulation itself never reads the clock.

import { DAILY_CHALLENGES, dailyChallengeById, type DailyChallenge } from '../data/dailyChallenges';
import { netWorth } from './core';
import { newGame } from './newGame';
import { seedFromString } from './rng';
import type { Appearance, GameState, Gender } from './types';

export const DAILY_DAYS = 7;

export function dailyForDate(dateKey: string): { def: DailyChallenge; seed: number } {
  const def = DAILY_CHALLENGES[seedFromString(`daily-pick|${dateKey}`) % DAILY_CHALLENGES.length];
  return { def, seed: seedFromString(`daily|${dateKey}`) };
}

/** `challengeId` overrides the date's pick (used by tests). */
export function newDailyGame(dateKey: string, name: string, appearance: Appearance, challengeId?: string, gender?: Gender | null): GameState {
  const picked = dailyForDate(dateKey);
  const def = dailyChallengeById(challengeId) ?? picked.def;
  const s = newGame({ ...def.options, name, appearance, gender: gender ?? undefined, mode: 'realistic', seed: picked.seed, chapterYears: DAILY_DAYS / 365 });
  s.chapterDays = DAILY_DAYS;
  def.setup?.(s);
  s.flags['daily-id'] = def.id;
  s.flags['daily-date'] = dateKey;
  s.flags['daily-start-worth'] = Math.round(netWorth(s));
  s.flags['daily-start-fitness'] = s.stats.fitness;
  return s;
}

export interface DailyStatus {
  def: DailyChallenge;
  date: string;
  day: number;
  won: boolean;
  finished: boolean;
}

export function dailyStatus(s: GameState): DailyStatus | null {
  const def = dailyChallengeById(s.flags['daily-id']);
  if (!def) return null;
  return { def, date: String(s.flags['daily-date'] ?? ''), day: Math.min(DAILY_DAYS, s.clock.day), won: def.won(s), finished: s.clock.day >= DAILY_DAYS };
}