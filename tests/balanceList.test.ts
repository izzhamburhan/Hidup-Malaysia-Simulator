import { describe, expect, it } from 'vitest';
import { monthKey } from '../src/engine/calendar';
import { monthlyCommitmentTotal } from '../src/engine/economy';
import { chooseRoutineStep, performAction, runRoutineStep } from '../src/engine/simulationEngine';
import type { GameState } from '../src/engine/types';
import { at, makeGame } from './helpers';

/** An evening in the middle of the month with work done and nothing else pressing. */
function richMorning(cash: number): GameState {
  const s = at(makeGame({ lifeStage: 'working', backgroundId: 'middle', seed: 7 }), 40, 20);
  s.finance.cash = cash;
  s.stats.satiety = 90;
  return s;
}

const bufferOf = (s: GameState) => Math.max(1000, 3 * monthlyCommitmentTotal(s));

describe('routine saves the surplus', () => {
  it('moves cash above the buffer into savings, in RM50 steps, and keeps the buffer', () => {
    const s = richMorning(20000);
    const step = chooseRoutineStep(s);
    expect(step).toMatchObject({ kind: 'action', id: 'save', once: 'routineSaved' });
    const r = runRoutineStep(s);
    expect(r.feedback.ok).toBe(true);
    const moved = r.state.finance.savings - s.finance.savings;
    expect(moved).toBeGreaterThan(0);
    expect(moved % 50).toBe(0);
    expect(r.state.finance.cash).toBeGreaterThanOrEqual(bufferOf(s));
    expect(r.state.finance.cash).toBeLessThan(bufferOf(s) + 50);
    expect(r.state.finance.cash + r.state.finance.savings).toBeCloseTo(s.finance.cash + s.finance.savings, 2);
  });

  it('only once a month', () => {
    const s = richMorning(20000);
    let t = runRoutineStep(s).state;
    expect(t.flags.routineSaved).toBe(40);
    t.finance.cash = 20000;
    expect(chooseRoutineStep(t)).not.toMatchObject({ id: 'save' });
    // Next calendar month it saves again.
    let nextDay = 41;
    while (monthKey(t, nextDay) === monthKey(t, 40)) nextDay++;
    at(t, nextDay, 20);
    expect(chooseRoutineStep(t)).toMatchObject({ id: 'save' });
  });

  it('does nothing when cash is at or below the buffer', () => {
    const s = richMorning(0);
    s.finance.cash = bufferOf(s) + 40;
    expect(chooseRoutineStep(s)).not.toMatchObject({ id: 'save' });
    s.finance.cash = 300;
    expect(chooseRoutineStep(s)).not.toMatchObject({ id: 'save' });
  });

  it('never touches EPF or unit trust, and is deterministic', () => {
    const s = richMorning(20000);
    s.finance.epfBalance = 5000;
    const a = runRoutineStep(s);
    const b = runRoutineStep(s);
    expect(a.state).toEqual(b.state);
    expect(a.state.finance.epfBalance).toBe(5000);
    expect(a.state.finance.unitTrust).toBe(s.finance.unitTrust);
  });

  it('does not save while an overdue debt is open', () => {
    const s = richMorning(20000);
    s.finance.debts.push({ id: 'd-x', kind: 'overdue', label: 'Overdue: rent', principal: 100, balance: 100, monthlyPayment: 50, annualRate: 0.18 });
    expect(chooseRoutineStep(s)).not.toMatchObject({ id: 'save' });
  });
});

describe('free self-study slows near the top', () => {
  const gain = (start: number) => {
    const s = at(makeGame({ lifeStage: 'fresh_grad' }), 3, 10);
    s.skills.tech = start;
    s.stats.energy = 90;
    const r = performAction(s, 'self-study', 'tech');
    expect(r.feedback.ok).toBe(true);
    return r.state.skills.tech - start;
  };

  it('gains shrink as the skill approaches 100', () => {
    const low = gain(10);
    const mid = gain(60);
    const high = gain(90);
    expect(low).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(high);
    expect(high).toBeGreaterThan(0);
    expect(high).toBeLessThan(0.4);
  });

  it('a year of one study session a day cannot max a skill from 40', () => {
    let s = at(makeGame({ lifeStage: 'fresh_grad' }), 3, 10);
    s.skills.tech = 40;
    for (let i = 0; i < 365; i++) {
      s.stats.energy = 90;
      at(s, 3, 10);
      s = performAction(s, 'self-study', 'tech').state;
    }
    expect(s.skills.tech).toBeLessThan(100);
    expect(s.mastery.tech ?? 0).toBe(0);
  });

  it('paid courses are unchanged by the free-study curve', () => {
    const s = at(makeGame({ lifeStage: 'fresh_grad' }), 3, 10);
    s.skills.tech = 90;
    s.finance.cash = 5000;
    s.stats.energy = 90;
    const v = performAction(s, 'online-course', 'tech');
    expect(v.feedback.ok).toBe(true);
    // The shared curve only (4 x (1 - 90/130)), no extra free-study slowdown.
    expect(v.state.skills.tech - 90).toBeCloseTo(4 * (1 - 90 / 130), 1);
  });
});
