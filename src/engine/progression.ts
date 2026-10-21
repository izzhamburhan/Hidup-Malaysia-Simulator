// Achievements and challenges: checked after every action and event.

import { achievements, challenges, MAX_ACTIVE_CHALLENGES } from '../data/achievements';
import { applyStats, highlight, log } from './core';
import type { GameState } from './types';

export function checkAchievements(state: GameState): string[] {
  const unlocked: string[] = [];
  for (const a of achievements) {
    if (state.achievements[a.id] !== undefined) continue;
    if (a.check(state)) {
      state.achievements[a.id] = state.clock.day;
      unlocked.push(a.id);
      log(state, 'milestone', `🏆 Achievement unlocked: ${a.title}`);
      highlight(state, `Achievement: ${a.title}`);
    }
  }
  return unlocked;
}

const REWARDS: Record<string, (s: GameState) => void> = {
  'save-10k-28': (s) => applyStats(s, { happiness: 10 }),
  'promo-3y': (s) => applyStats(s, { reputation: 5 }),
  'car-no-drain': (s) => applyStats(s, { happiness: 8 }),
  'gym-streak': (s) => applyStats(s, { fitness: 5 }),
  cgpa: (s) => applyStats(s, { reputation: 10 }),
  'hustle-success': (s) => applyStats(s, { happiness: 10 }),
  'pay-off-loan': (s) => applyStats(s, { stress: -15 }),
  'festive-no-debt': (s) => {
    s.relationships.family = Math.min(100, s.relationships.family + 8);
  },
  balance: (s) => applyStats(s, { health: 10 }),
  'emergency-6': (s) => applyStats(s, { stress: -10 }),
};

export function updateChallenges(state: GameState): string[] {
  const done: string[] = [];
  const c = state.challenges;
  for (const id of [...c.active]) {
    const def = challenges.find((x) => x.id === id);
    if (!def) {
      c.active = c.active.filter((x) => x !== id);
      continue;
    }
    const { current, target } = def.progress(state);
    if (current >= target) {
      c.active = c.active.filter((x) => x !== id);
      c.completed[id] = state.clock.day;
      REWARDS[id]?.(state);
      log(state, 'milestone', `🎯 Challenge complete: ${def.title}! Reward: ${def.reward}.`);
      highlight(state, `Challenge complete: ${def.title}`);
      done.push(id);
    } else if (def.failed?.(state)) {
      c.active = c.active.filter((x) => x !== id);
      c.failed.push(id);
      log(state, 'warning', `Challenge missed: ${def.title}. Life goes on.`);
    }
  }
  return done;
}

export function canStartChallenge(state: GameState, id: string): string | null {
  const c = state.challenges;
  if (c.active.includes(id)) return 'Already active.';
  if (c.completed[id] !== undefined) return 'Already completed.';
  if (c.failed.includes(id)) return 'Already attempted.';
  if (c.active.length >= MAX_ACTIVE_CHALLENGES) return `Max ${MAX_ACTIVE_CHALLENGES} active challenges.`;
  return challenges.some((x) => x.id === id) ? null : 'Unknown challenge.';
}
