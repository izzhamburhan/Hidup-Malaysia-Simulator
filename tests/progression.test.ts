import { describe, expect, it } from 'vitest';
import { canStartChallenge, checkAchievements, updateChallenges } from '../src/engine/progression';
import { endChapter, interact } from '../src/engine/simulationEngine';
import { endings, lifeReport, rankEndings, shareText } from '../src/engine/endings';
import { makeGame } from './helpers';

describe('achievements and challenges', () => {
  it('unlocks achievements once when conditions are met', () => {
    const s = makeGame();
    s.finance.savings = 1500;
    expect(checkAchievements(s)).toContain('saver-1k');
    expect(checkAchievements(s)).not.toContain('saver-1k');
    expect(s.achievements['saver-1k']).toBe(0);
  });

  it('limits active challenges and completes them with a reward', () => {
    let s = makeGame();
    s = interact(s, 'challenge', 'pay-off-loan').state;
    s = interact(s, 'challenge', 'gym-streak').state;
    s = interact(s, 'challenge', 'save-10k-28').state;
    expect(canStartChallenge(s, 'balance')).toMatch(/Max/);
    s.counters.debtsCleared = 1;
    const stress = s.stats.stress;
    expect(updateChallenges(s)).toContain('pay-off-loan');
    expect(s.stats.stress).toBeLessThan(stress);
    expect(s.challenges.active).not.toContain('pay-off-loan');
  });

  it('fails deadline challenges', () => {
    const s = makeGame({ startAge: 27 });
    s.challenges.active.push('save-10k-28');
    s.clock.day = 400;
    updateChallenges(s);
    expect(s.challenges.failed).toContain('save-10k-28');
  });
});

describe('endings', () => {
  it('ranks every ending and always produces a report', () => {
    const s = makeGame();
    expect(rankEndings(s)).toHaveLength(endings.length);
    const report = lifeReport(s);
    expect(report.name).toBe('Tester');
    expect(shareText(report)).toMatch(/HIDUP MALAYSIA/);
  });

  it('recognises burnout and financial stability', () => {
    const burned = makeGame();
    burned.stats.stress = 95;
    burned.stats.health = 20;
    burned.counters.burnouts = 2;
    expect(rankEndings(burned)[0].id).toBe('burned');

    const stable = makeGame();
    stable.finance.savings = 60000;
    stable.finance.emergencyFund = 15000;
    stable.stats.stress = 60; // not "balanced"
    expect(rankEndings(stable)[0].id).toBe('stable');
  });

  it('locks an ending and blocks further actions until a new chapter', () => {
    const s = endChapter(makeGame());
    expect(s.ending).not.toBeNull();
  });
});
