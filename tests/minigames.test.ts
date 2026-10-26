import { describe, expect, it } from 'vitest';
import { achievements } from '../src/data/achievements';
import { MINIGAMES, MINIGAME_REWARDED_PER_DAY } from '../src/data/minigames';
import { busScore, mathScore, orderScore, pickScore, pourScore, timingScore } from '../src/components/minigames/scoring';
import { performAction } from '../src/engine/simulationEngine';
import { makeGame } from './helpers';

const calm = () => {
  const s = makeGame({ seed: 9 });
  s.stats.happiness = 50;
  s.stats.stress = 50;
  return s;
};

describe('mini-game rewards', () => {
  it('rewards a high score more than a low one', () => {
    const high = performAction(calm(), 'play-minigame', 'teh-tarik:95');
    const low = performAction(calm(), 'play-minigame', 'teh-tarik:10');
    expect(high.feedback.ok, high.feedback.error).toBe(true);
    expect(high.state.stats.happiness).toBeGreaterThan(low.state.stats.happiness);
    expect(high.state.stats.stress).toBeLessThan(low.state.stats.stress);
  });

  it('only rewards the first plays each day', () => {
    let s = calm();
    for (let i = 0; i < MINIGAME_REWARDED_PER_DAY; i++) s = performAction(s, 'play-minigame', 'kejar-bas:100').state;
    const before = s.stats.happiness;
    const extra = performAction(s, 'play-minigame', 'kejar-bas:100');
    expect(extra.feedback.ok).toBe(true);
    expect(extra.state.stats.happiness - before).toBeLessThanOrEqual(1.0001);
  });

  it('keeps the best score per game', () => {
    let s = performAction(calm(), 'play-minigame', 'ingat-order:70').state;
    s = performAction(s, 'play-minigame', 'ingat-order:40').state;
    expect(s.flags['mg-best-ingat-order']).toBe(70);
  });

  it('refuses a bad game or score', () => {
    expect(performAction(calm(), 'play-minigame', 'snake:50').feedback.ok).toBe(false);
    expect(performAction(calm(), 'play-minigame', 'teh-tarik:150').feedback.ok).toBe(false);
    expect(performAction(calm(), 'play-minigame', 'teh-tarik:abc').feedback.ok).toBe(false);
  });

  it('unlocks Pro Gamer Kampung with 90+ in every game', () => {
    const a = achievements.find((x) => x.id === 'pro-gamer-kampung')!;
    const s = calm();
    expect(a.check(s)).toBe(false);
    for (const g of MINIGAMES) s.flags[`mg-best-${g.id}`] = 92;
    expect(a.check(s)).toBe(true);
  });

  it('is deterministic for the same score', () => {
    const a = performAction(calm(), 'play-minigame', 'kejar-bas:77').state;
    const b = performAction(calm(), 'play-minigame', 'kejar-bas:77').state;
    expect(a.stats).toEqual(b.stats);
    expect(a.clock).toEqual(b.clock);
  });
});

describe('mini-game scoring', () => {
  it('bus: catching it is 100, distance closed otherwise', () => {
    expect(busScore(1, 1)).toBe(100);
    expect(busScore(0.5, 1)).toBe(50);
    expect(busScore(0, 1)).toBe(0);
    expect(busScore(2, 1)).toBe(100);
  });
  it('pour: dead centre is 100, outside the zone scores low', () => {
    expect(pourScore([0.7, 0.7, 0.7], 0.7)).toBe(100);
    expect(pourScore([0.1, 0.1, 0.1], 0.7)).toBeLessThan(30);
  });
  it('order: counts items in the right position', () => {
    expect(orderScore(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'])).toBe(100);
    expect(orderScore(['a', 'b', 'c', 'd'], ['a', 'x', 'c', 'y'])).toBe(50);
    expect(orderScore(['a', 'b'], [])).toBe(0);
  });
  it('timing: inside the zone is perfect, far outside is zero', () => {
    expect(timingScore([0.5, 0.55, 0.45], 0.5, 0.08)).toBe(100);
    expect(timingScore([0, 1, 0], 0.5, 0.08)).toBe(0);
    const near = timingScore([0.65, 0.5, 0.5], 0.5, 0.08);
    expect(near).toBeGreaterThan(60);
    expect(near).toBeLessThan(100);
    expect(timingScore([], 0.5, 0.08)).toBe(0);
  });
  it('math: right answers toward the target, wrong ones cost half', () => {
    expect(mathScore(6, 0, 6)).toBe(100);
    expect(mathScore(9, 0, 6)).toBe(100);
    expect(mathScore(3, 0, 6)).toBe(50);
    expect(mathScore(3, 2, 6)).toBe(33);
    expect(mathScore(0, 5, 6)).toBe(0);
  });
  it('pick: share of best replies', () => {
    expect(pickScore(3, 3)).toBe(100);
    expect(pickScore(2, 3)).toBe(67);
    expect(pickScore(0, 3)).toBe(0);
    expect(pickScore(0, 0)).toBe(0);
  });
});
