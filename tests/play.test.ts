import { describe, expect, it } from 'vitest';
import { chooseRoutineStep, runAutopilot, runRoutineStep } from '../src/engine/simulationEngine';
import { primaryAction, primaryStep, quickActions } from '../src/engine/insights';
import { companyById } from '../src/data/companies';
import { jobEligibility, refreshListings } from '../src/engine/career';
import { jobById } from '../src/data/jobs';
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

  it('job-hunts when unemployed: one application a day to the best match', () => {
    const s = at(makeGame(), 0, 10);
    s.stats.satiety = 90;
    refreshListings(s);
    const step = chooseRoutineStep(s);
    expect(step).toMatchObject({ kind: 'action', id: 'apply-job', once: 'routineApply' });
    // Eligible listings come first: no internship applications from a graduate.
    const listing = s.career.listings.find((l) => step.kind === 'action' && l.id === step.param)!;
    expect(jobEligibility(s, jobById(listing.jobId)!).ok).toBe(s.career.listings.some((l) => jobEligibility(s, jobById(l.jobId)!).ok));
    const r = runRoutineStep(s);
    expect(r.state.career.applications).toHaveLength(1);
    // Already applied today: the routine moves on to something else.
    expect(chooseRoutineStep(r.state)).not.toMatchObject({ id: 'apply-job' });
  });

  it('goes to an interview on its day', () => {
    const s = at(makeGame(), 0, 9);
    s.stats.satiety = 90;
    s.career.applications.push({ id: 'a1', listingId: 'x', jobId: 'admin', companyId: 'tm', appliedDay: 0, respondDay: 0, status: 'interview', interviewDay: 0, offerSalary: 2500, score: 80 });
    expect(chooseRoutineStep(s)).toMatchObject({ kind: 'action', id: 'attend-interview', param: 'a1' });
  });

  it('leaves job offers to the player', () => {
    const s = at(makeGame(), 0, 10);
    s.stats.satiety = 90;
    refreshListings(s);
    s.career.applications.push({ id: 'a1', listingId: 'x', jobId: 'admin', companyId: 'tm', appliedDay: 0, respondDay: 0, status: 'offer', offerSalary: 2500, score: 80 });
    const step = chooseRoutineStep(s);
    expect(step).not.toMatchObject({ id: 'apply-job' });
    expect(step).not.toMatchObject({ id: 'accept-offer' });
  });

  it('a fresh graduate on autopilot sends applications', () => {
    let s = makeGame({ seed: 3 });
    for (let i = 0; i < 30 && s.clock.day < 21; i++) {
      if (s.events.pending.length) s.events.pending = [];
      s = runAutopilot(s, 21 - s.clock.day).state;
    }
    expect(s.career.applications.length).toBeGreaterThan(0);
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

  it('primary action: one offer names the company and salary, not a bare "Accept offer"', () => {
    const s = at(makeGame(), 0, 10);
    s.stats.satiety = 90;
    s.career.applications.push({ id: 'a1', listingId: 'x', jobId: 'admin', companyId: 'tm', appliedDay: 0, respondDay: 0, status: 'offer', offerSalary: 2500, score: 80 });
    const p = primaryAction(s);
    expect(p).toMatchObject({ id: 'accept-offer', param: 'a1' });
    expect(p?.title).toContain(companyById('tm')!.name);
    expect(p?.title).toContain('2,500');
    const step = primaryStep(s);
    expect(step).toMatchObject({ kind: 'action' });
  });

  it('primary action: several offers point at comparing them in Life, never a blind accept', () => {
    const s = at(makeGame(), 0, 10);
    s.stats.satiety = 90;
    s.career.applications.push(
      { id: 'a1', listingId: 'x', jobId: 'admin', companyId: 'tm', appliedDay: 0, respondDay: 0, status: 'offer', offerSalary: 2500, score: 80 },
      { id: 'a2', listingId: 'y', jobId: 'admin', companyId: 'tm', appliedDay: 0, respondDay: 0, status: 'offer', offerSalary: 2800, score: 70 },
    );
    expect(primaryAction(s)?.id).not.toBe('accept-offer');
    expect(primaryStep(s)).toMatchObject({ kind: 'navigate', tab: 'life' });
    const step = primaryStep(s);
    expect(step?.kind === 'navigate' && step.title).toContain('2');
  });

  it('primary step does not mutate the state', () => {
    const s = at(makeGame(), 0, 10);
    s.career.applications.push({ id: 'a1', listingId: 'x', jobId: 'admin', companyId: 'tm', appliedDay: 0, respondDay: 0, status: 'offer', offerSalary: 2500, score: 80 });
    const before = JSON.stringify(s);
    primaryStep(s);
    expect(JSON.stringify(s)).toBe(before);
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
