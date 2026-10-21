import { describe, expect, it } from 'vitest';
import { chooseRoutineStep, runRoutineStep } from '../src/engine/simulationEngine';
import { primaryAction, quickActions } from '../src/engine/insights';
import { refreshListings } from '../src/engine/career';
import { at, makeGame } from './helpers';

describe('routine step (Next button)', () => {
  it('advances time and reports what happened', () => {
    const s = makeGame();
    const r = runRoutineStep(s);
    expect(r.feedback.ok).toBe(true);
    expect(r.state.clock.day * 1440 + r.state.clock.minute).toBeGreaterThan(s.clock.minute);
    expect(r.feedback.title.length).toBeGreaterThan(0);
  });

  it('sends a working adult to work on a weekday morning', () => {
    const s = makeGame({ lifeStage: 'working', jobId: 'swe' });
    s.stats.satiety = 90;
    expect(chooseRoutineStep(s)).toMatchObject({ kind: 'action', id: 'work-shift' });
    const r = runRoutineStep(s);
    expect(r.state.career.workedToday).toBe(true);
  });

  it('sleeps late at night', () => {
    const s = at(makeGame(), 0, 23);
    s.stats.satiety = 90;
    expect(chooseRoutineStep(s).kind).toBe('sleep');
    const r = runRoutineStep(s);
    expect(r.state.clock.day).toBe(1);
  });

  it('is blocked by a pending event', () => {
    const s = makeGame();
    s.events.pending.push({ eventId: 'burnout' });
    expect(runRoutineStep(s).feedback.ok).toBe(false);
  });

  it('is deterministic', () => {
    expect(runRoutineStep(makeGame({ seed: 9 })).state).toEqual(runRoutineStep(makeGame({ seed: 9 })).state);
  });
});

describe('play suggestions', () => {
  it('primary action: go to work on a workday morning', () => {
    const s = makeGame({ lifeStage: 'working', jobId: 'swe' });
    s.stats.satiety = 90;
    expect(primaryAction(s)?.id).toBe('work-shift');
  });

  it('primary action: apply for the best job when unemployed', () => {
    const s = makeGame();
    s.stats.satiety = 90;
    refreshListings(s);
    const p = primaryAction(s);
    expect(p?.id).toBe('apply-job');
    expect(p?.available).toBe(true);
  });

  it('primary action: eat when hungry', () => {
    const s = makeGame();
    s.stats.satiety = 10;
    expect(primaryAction(s)?.id).toBe('eat');
  });

  it('primary action: sleep late at night', () => {
    const s = at(makeGame(), 0, 23);
    s.stats.satiety = 90;
    expect(primaryAction(s)?.id).toBe('sleep');
  });

  it('primary action: attend an interview on its day', () => {
    const s = at(makeGame(), 0, 9);
    s.stats.satiety = 90;
    s.career.applications.push({ id: 'a1', listingId: 'x', jobId: 'admin', companyId: 'tm', appliedDay: 0, respondDay: 0, status: 'interview', interviewDay: 0, offerSalary: 2500, score: 80 });
    expect(primaryAction(s)).toMatchObject({ id: 'attend-interview', param: 'a1' });
  });

  it('quick actions: at most 6, unique, available first', () => {
    for (const hour of [7, 12, 19, 23]) {
      const s = at(makeGame({ lifeStage: 'working', jobId: 'swe' }), 0, hour);
      const tiles = quickActions(s);
      expect(tiles.length).toBeGreaterThanOrEqual(4);
      expect(tiles.length).toBeLessThanOrEqual(6);
      const keys = tiles.map((t) => `${t.id}:${t.param ?? ''}`);
      expect(new Set(keys).size).toBe(keys.length);
      const firstLocked = tiles.findIndex((t) => !t.available);
      if (firstLocked >= 0) expect(tiles.slice(firstLocked).every((t) => !t.available)).toBe(true);
    }
  });
});