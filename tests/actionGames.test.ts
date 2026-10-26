import { describe, expect, it } from 'vitest';
import { ACTION_GAMES, MEMORY_SETS, PICK_PROMPTS } from '../src/data/minigames';
import { actionById } from '../src/engine/actions';
import { actionGameFor, gameTier } from '../src/engine/actionGames';
import { refreshListings } from '../src/engine/career';
import { performAction } from '../src/engine/simulationEngine';
import { at, makeGame } from './helpers';

const runner = () => {
  const s = at(makeGame(), 0, 8);
  s.stats.fitness = 40;
  s.stats.happiness = 50;
  return s;
};

describe('action mini-games', () => {
  it('maps scores to tiers: nothing below 30, then a third, two thirds, full', () => {
    expect([0, 29, 30, 59, 60, 89, 90, 100].map(gameTier)).toEqual([0, 0, 1 / 3, 1 / 3, 2 / 3, 2 / 3, 1, 1]);
  });

  it('a top score adds the full bonus on top of the normal action', () => {
    const plain = performAction(runner(), 'run');
    const played = performAction(runner(), 'run', undefined, { gameScore: 100 });
    const bonus = ACTION_GAMES.run.bonus;
    expect(played.feedback.ok).toBe(true);
    expect(played.state.stats.fitness - plain.state.stats.fitness).toBeCloseTo(bonus.stats!.fitness!, 5);
    expect(played.feedback.lines.join(' ')).toMatch(/Mini-game: 100/);
  });

  it('a low score gives no bonus, and no score is exactly the old result', () => {
    const plain = performAction(runner(), 'run');
    expect(performAction(runner(), 'run', undefined, { gameScore: 20 }).state.stats).toEqual(plain.state.stats);
    expect(performAction(runner(), 'run', undefined, {}).state).toEqual(plain.state);
  });

  it('ignores invalid scores', () => {
    const plain = performAction(runner(), 'run').state;
    for (const gameScore of [-5, 101, 55.5, Number.NaN]) {
      expect(performAction(runner(), 'run', undefined, { gameScore }).state).toEqual(plain);
    }
  });

  it('ignores a score for an action without a game', () => {
    const s = at(makeGame(), 0, 10);
    expect(actionGameFor('water')).toBeNull();
    expect(performAction(s, 'water', undefined, { gameScore: 100 }).state).toEqual(performAction(s, 'water').state);
  });

  it('is deterministic for the same state and score', () => {
    expect(performAction(runner(), 'run', undefined, { gameScore: 75 }).state).toEqual(performAction(runner(), 'run', undefined, { gameScore: 75 }).state);
  });

  it('never gives cash', () => {
    const plain = performAction(runner(), 'run').state;
    expect(performAction(runner(), 'run', undefined, { gameScore: 100 }).state.finance).toEqual(plain.finance);
  });

  it('a polished application raises the new application score', () => {
    const s = makeGame({ seed: 1 });
    s.career.listings = [];
    refreshListings(s);
    const id = s.career.listings[0].id;
    const plain = performAction(s, 'apply-job', id).state.career.applications[0];
    const played = performAction(s, 'apply-job', id, { gameScore: 100 }).state.career.applications[0];
    expect(played.score).toBe(Math.min(100, plain.score + ACTION_GAMES['apply-job'].bonus.applicationScore!));
  });

  it('interview practice raises the score before the interview event resolves', () => {
    const s = makeGame();
    s.clock.minute = 9 * 60;
    s.career.applications.push({ id: 'a1', listingId: 'x', jobId: 'admin', companyId: 'tm', appliedDay: 0, respondDay: 0, status: 'interview', interviewDay: 0, offerSalary: 2500, score: 50 });
    const r = performAction(s, 'attend-interview', 'a1', { gameScore: 95 });
    expect(r.state.career.applications[0].score).toBe(50 + ACTION_GAMES['attend-interview'].bonus.applicationScore!);
    expect(s.career.applications[0].score).toBe(50);
  });

  it('keeps bonuses bounded at 100', () => {
    const s = runner();
    s.stats.fitness = 100;
    s.stats.happiness = 100;
    const r = performAction(s, 'run', undefined, { gameScore: 100 });
    expect(r.state.stats.fitness).toBeLessThanOrEqual(100);
    expect(r.state.stats.happiness).toBeLessThanOrEqual(100);
  });

  it('an unavailable action is still refused with its reason, input untouched', () => {
    const s = at(makeGame(), 0, 10);
    s.stats.energy = 3;
    const before = JSON.stringify(s);
    const r = performAction(s, 'run', undefined, { gameScore: 100 });
    expect(r.feedback.ok).toBe(false);
    expect(r.feedback.error).toMatch(/tired/i);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('every game points at a real action and its theme has content', () => {
    for (const [id, game] of Object.entries(ACTION_GAMES)) {
      expect(actionById(id), id).toBeTruthy();
      if (game.kind === 'pick') expect(PICK_PROMPTS[game.theme as keyof typeof PICK_PROMPTS]?.length, id).toBeGreaterThanOrEqual(4);
      if (game.kind === 'memory') expect(MEMORY_SETS[game.theme as keyof typeof MEMORY_SETS]?.length, id).toBeGreaterThanOrEqual(6);
      expect(Object.keys(game.bonus).length, id).toBeGreaterThan(0);
    }
    for (const prompts of Object.values(PICK_PROMPTS)) {
      for (const p of prompts) {
        expect(p.options.length).toBe(3);
        expect(p.best).toBeGreaterThanOrEqual(0);
        expect(p.best).toBeLessThan(3);
      }
    }
  });

  it('sleep and money actions have no game', () => {
    for (const id of ['sleep', 'nap', 'wait', 'save', 'withdraw', 'pay-debt', 'buy-vehicle', 'move-home']) expect(actionGameFor(id)).toBeNull();
  });
});
