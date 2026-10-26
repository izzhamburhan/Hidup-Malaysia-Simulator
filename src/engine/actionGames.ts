// Action games: the UI may run a quick mini-game before an everyday action and pass its
// 0-100 score to performAction. The score scales a small bonus from ACTION_GAMES. No score,
// an invalid score or an action without a game leaves the action exactly as it was.

import { ACTION_GAMES, type ActionGame } from '../data/minigames';
import { addSkills, adjustFamily, adjustFriends, adjustPartner, applyStats, clamp, round2 } from './core';
import type { GameState } from './types';

export function actionGameFor(actionId: string): ActionGame | null {
  return ACTION_GAMES[actionId] ?? null;
}

export function isGameScore(score: unknown): score is number {
  return typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= 100;
}

/** Share of the full bonus: 0-29 nothing, 30-59 a third, 60-89 two thirds, 90-100 all of it. */
export function gameTier(score: number): number {
  if (score >= 90) return 1;
  if (score >= 60) return 2 / 3;
  if (score >= 30) return 1 / 3;
  return 0;
}

/** Applies the scaled bonus to the draft after the action ran. Returns feedback lines. */
export function applyActionGame(s: GameState, actionId: string, param: string | undefined, score: number | undefined): string[] {
  const game = actionGameFor(actionId);
  if (!game || !isGameScore(score)) return [];
  const k = gameTier(score);
  const line = [`Mini-game: ${score}${k === 1 ? ' — terbaik!' : k === 0 ? ' (no bonus this time)' : ''}`];
  if (k === 0) return line;
  const b = game.bonus;
  const scale = <T extends string>(o: Partial<Record<T, number>>) => Object.fromEntries(Object.entries(o).map(([key, v]) => [key, (v as number) * k])) as Partial<Record<T, number>>;
  if (b.stats) applyStats(s, scale(b.stats));
  if (b.skills) addSkills(s, scale(b.skills));
  if (b.performance && s.career.job) s.career.job.performance = round2(clamp(s.career.job.performance + b.performance * k));
  if (b.knowledge) s.education.knowledge = round2(clamp(s.education.knowledge + b.knowledge * k));
  if (b.cvQuality) s.career.cvQuality = round2(clamp(s.career.cvQuality + b.cvQuality * k));
  if (b.applicationScore) {
    const app = s.career.applications.find((a) => a.id === param) ?? s.career.applications.find((a) => a.listingId === param);
    if (app) app.score = round2(clamp(app.score + b.applicationScore * k));
  }
  if (b.friends) adjustFriends(s, b.friends * k);
  if (b.family) adjustFamily(s, b.family * k);
  if (b.partnerTrust) adjustPartner(s, b.partnerTrust * k);
  return line;
}
