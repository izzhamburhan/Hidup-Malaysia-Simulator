import { describe, expect, it } from 'vitest';
import { listActions, performAction, viewAction } from '../src/engine/simulationEngine';
import { advanceTime } from '../src/engine/time';
import { at, makeGame } from './helpers';

describe('central action resolution', () => {
  it('does not mutate the input state', () => {
    const s = makeGame();
    const snapshot = JSON.stringify(s);
    const r = performAction(s, 'eat', 'nasi-lemak');
    expect(r.feedback.ok).toBe(true);
    expect(JSON.stringify(s)).toBe(snapshot);
    expect(r.state).not.toBe(s);
  });

  it('eating costs money, takes time and logs estimated calories', () => {
    const s = makeGame();
    const r = performAction(s, 'eat', 'nasi-lemak:regular');
    expect(r.state.finance.cash).toBe(s.finance.cash - 6);
    expect(r.state.food.caloriesIn).toBe(650);
    expect(r.state.clock.minute).toBe(s.clock.minute + 20);
    expect(r.feedback.deltas.find((d) => d.label === 'Cash')?.value).toBe(-6);
  });

  it('applies portion sizes', () => {
    const r = performAction(makeGame(), 'eat', 'nasi-lemak:large');
    expect(r.state.food.caloriesIn).toBe(Math.round(650 * 1.4));
  });

  it('explains why an action is unavailable', () => {
    const s = makeGame();
    const sleep = viewAction(s, 'sleep', '8')!;
    expect(sleep.available).toBe(false);
    expect(sleep.reason).toMatch(/Bedtime/);
    const r = performAction(s, 'sleep', '8');
    expect(r.feedback.ok).toBe(false);
    expect(r.state).toBe(s);
  });

  it('sleep restores energy and short sleep makes you tired tomorrow', () => {
    const s = at(makeGame(), 0, 23);
    s.stats.energy = 20;
    const r = performAction(s, 'sleep', '5');
    expect(r.state.stats.energy).toBeGreaterThan(60);
    expect(r.state.flags.tiredDay).toBe(1);
  });

  it('blocks actions while an event is pending', () => {
    const s = makeGame();
    s.events.pending.push({ eventId: 'burnout' });
    const r = performAction(s, 'water');
    expect(r.feedback.ok).toBe(false);
    expect(r.feedback.error).toMatch(/event/);
  });

  it('forces sleep when energy runs out', () => {
    const s = at(makeGame(), 0, 10);
    s.stats.energy = 3;
    const r = performAction(s, 'run');
    expect(r.feedback.ok).toBe(false); // too tired to run
    s.stats.energy = 20;
    const ok = performAction(s, 'run');
    expect(ok.feedback.ok).toBe(true);
  });

  it('work shift is only available on workdays in the morning, and absence is penalised', () => {
    const s = makeGame({ lifeStage: 'working', jobId: 'swe' });
    expect(viewAction(s, 'work-shift')!.available).toBe(true);
    const worked = performAction(s, 'work-shift');
    expect(worked.state.career.workedToday).toBe(true);
    expect(worked.state.clock.minute).toBeGreaterThan(17 * 60);

    const skip = makeGame({ lifeStage: 'working', jobId: 'swe' });
    skip.career.job!.startDay = -100;
    const perf = skip.career.job!.performance;
    at(skip, 0, 12);
    advanceTime(skip, 13 * 60);
    expect(skip.career.job!.absencesThisMonth).toBe(1);
    expect(skip.career.job!.performance).toBeLessThan(perf);
  });

  it('lists only visible non-dedicated actions with availability', () => {
    const s = makeGame();
    const views = listActions(s);
    expect(views.length).toBeGreaterThan(20);
    expect(views.find((v) => v.id === 'eat')).toBeUndefined();
    expect(views.find((v) => v.id === 'attend-class')).toBeUndefined();
    expect(views.every((v) => v.available || v.reason)).toBe(true);
  });

  it('major purchases require confirmation text and affordability checks', () => {
    const s = makeGame();
    const car = viewAction(s, 'buy-vehicle', 'myvi')!;
    expect(car.confirm).toMatch(/Down payment/);
    expect(car.available).toBe(false); // no job -> no loan
    const house = viewAction(s, 'buy-property', 'terrace')!;
    expect(house.available).toBe(false);
  });

  it('buying a car on a loan adds a debt and monthly running costs', () => {
    const s = makeGame({ lifeStage: 'working', jobId: 'swe' });
    s.finance.cash = 20000;
    const r = performAction(s, 'buy-vehicle', 'axia');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.transport.vehicleId).toBe('axia');
    expect(r.state.finance.debts.some((d) => d.kind === 'car')).toBe(true);
  });
});
