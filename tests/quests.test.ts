import { describe, expect, it } from 'vitest';
import { achievements } from '../src/data/achievements';
import { QUESTS, QUEST_REWARD } from '../src/data/quests';
import { newDailyGame } from '../src/engine/dailyChallenge';
import { questKey, questStatus } from '../src/engine/quests';
import { performAction } from '../src/engine/simulationEngine';
import { makeGame } from './helpers';

describe('starter quests', () => {
  it('start undone and complete from persistent state', () => {
    const s = makeGame({ seed: 4 });
    expect(questStatus(s)!.every((q) => !q.done && !q.claimed)).toBe(true);
    s.counters.mealsEaten = 1;
    s.counters.workouts = 1;
    s.flags['chat-family-day'] = 0;
    s.decor.owned.push('cactus');
    s.clock.day = 1;
    s.career.applications.push({} as never);
    expect(questStatus(s)!.every((q) => q.done)).toBe(true);
  });

  it('claims once through the engine', () => {
    const s = makeGame({ seed: 4 });
    s.counters.mealsEaten = 1;
    const cash = s.finance.cash;
    const happy = s.stats.happiness;
    const before = JSON.stringify(s);
    const r = performAction(s, 'claim-quest', 'eat');
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    expect(r.state.finance.cash).toBeCloseTo(cash + QUEST_REWARD.cash, 2);
    expect(r.state.stats.happiness).toBeGreaterThan(happy - 1);
    expect(r.state.flags[questKey('eat')]).toBeDefined();
    const again = performAction(r.state, 'claim-quest', 'eat');
    expect(again.feedback.ok).toBe(false);
    expect(again.feedback.error).toMatch(/already/i);
    const early = performAction(s, 'claim-quest', 'move');
    expect(early.feedback.ok).toBe(false);
    expect(early.feedback.error).toContain(QUESTS.find((q) => q.id === 'move')!.hint);
  });

  it('does not apply in a daily challenge', () => {
    const d = newDailyGame('2027-01-04', 'D', makeGame().character.appearance);
    d.counters.mealsEaten = 1;
    expect(questStatus(d)).toBeNull();
    expect(performAction(d, 'claim-quest', 'eat').feedback.ok).toBe(false);
  });

  it('Dah Biasa needs every quest claimed', () => {
    const a = achievements.find((x) => x.id === 'dah-biasa')!;
    const s = makeGame();
    for (const q of QUESTS.slice(1)) s.flags[questKey(q.id)] = 0;
    expect(a.check(s)).toBe(false);
    s.flags[questKey(QUESTS[0].id)] = 0;
    expect(a.check(s)).toBe(true);
  });
});