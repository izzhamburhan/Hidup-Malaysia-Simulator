import { describe, expect, it } from 'vitest';
import { currentEvent, resolveEvent, runAutopilot, performAction } from '../src/engine/simulationEngine';
import type { GameMode, GameState, LifeStage } from '../src/engine/types';
import { makeGame } from './helpers';

/** Live `days` days on routine, resolving events with the first available choice. */
function live(state: GameState, days: number): GameState {
  let s = state;
  const target = s.clock.day + days;
  let guard = 0;
  while (s.clock.day < target && guard++ < days * 8) {
    let ev = currentEvent(s);
    while (ev) {
      const choice = ev.choices.find((c) => !c.disabledReason)!;
      s = resolveEvent(s, choice.id).state;
      ev = currentEvent(s);
    }
    s = runAutopilot(s, Math.min(7, target - s.clock.day)).state;
  }
  return s;
}

function invariants(s: GameState) {
  expect(s.finance.cash).toBeGreaterThanOrEqual(0);
  for (const [k, v] of Object.entries(s.stats)) {
    expect(v, k).toBeGreaterThanOrEqual(0);
    expect(v, k).toBeLessThanOrEqual(100);
  }
  for (const v of Object.values(s.skills)) expect(v).toBeLessThanOrEqual(100);
  expect(s.clock.minute).toBeGreaterThanOrEqual(0);
  expect(s.clock.minute).toBeLessThan(1440);
  for (const d of s.finance.debts) expect(d.balance).toBeGreaterThan(0);
}

describe('long-run simulation', () => {
  const cases: [LifeStage, GameMode, string][] = [
    ['student', 'realistic', 'struggling'],
    ['fresh_grad', 'chaotic', 'middle'],
    ['working', 'realistic', 'renter'],
    ['experienced', 'chaotic', 'connected'],
    ['entrepreneur', 'realistic', 'changer'],
    ['retired', 'chaotic', 'middle'],
  ];

  for (const [stage, mode, bg] of cases) {
    it(`${stage} / ${mode} survives 120 days with valid state`, () => {
      const s = live(makeGame({ lifeStage: stage, mode, backgroundId: bg, universityId: 'utm', courseId: 'cs', jobId: 'swe' }), 120);
      expect(s.clock.day).toBeGreaterThanOrEqual(120);
      invariants(s);
      expect(s.events.history.length).toBeGreaterThan(0);
    });
  }

  it('a working adult gets paid every month and builds EPF', () => {
    const s = live(makeGame({ lifeStage: 'working', jobId: 'swe' }), 95);
    expect(s.finance.payslips.length).toBeGreaterThanOrEqual(3);
    expect(s.finance.epfBalance).toBeGreaterThan(12000);
  });

  it('a student completes a semester and gets a GPA', () => {
    const s = live(makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'bba' }), 100);
    expect(s.education.gpaHistory.length).toBeGreaterThanOrEqual(1);
  });

  it('is fully deterministic for the same seed and inputs', () => {
    const a = live(makeGame({ seed: 7, mode: 'chaotic' }), 40);
    const b = live(makeGame({ seed: 7, mode: 'chaotic' }), 40);
    expect(b).toEqual(a);
  });

  it('different seeds lead to different lives', () => {
    const a = live(makeGame({ seed: 1 }), 30);
    const b = live(makeGame({ seed: 2 }), 30);
    expect(JSON.stringify(a.events.history)).not.toBe(JSON.stringify(b.events.history));
  });

  it('chaotic mode surfaces chaos events', () => {
    let s = makeGame({ mode: 'chaotic', lifeStage: 'working', jobId: 'swe', seed: 5 });
    s = live(s, 90);
    const chaos = s.events.history.filter((h) => ['boss-quick-call', 'friend-otw', 'mamak-habit', 'battery-dies-late', 'cat-keyboard', 'viral-video', 'auntie-network', 'office-surprise-kenduri', 'teambuilding-rest-day', 'race-lane-mixup'].includes(h.eventId));
    expect(chaos.length).toBeGreaterThan(0);
  });

  it('overtime pays out on the next payslip', () => {
    let s = makeGame({ lifeStage: 'working', jobId: 'swe' });
    s = performAction(s, 'work-shift').state;
    while (s.events.pending.length) s = resolveEvent(s, currentEvent(s)!.choices.find((c) => !c.disabledReason)!.id).state;
    const r = performAction(s, 'overtime', '2');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.career.job!.overtimeHoursThisMonth).toBe(2);
  });
});
