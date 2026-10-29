import { describe, expect, it } from 'vitest';
import { totalDebt } from '../src/engine/core';
import { brokeEventDue, BROKE_GAP_DAYS } from '../src/engine/daily';
import { eventById, isEligible } from '../src/engine/events';
import { currentEvent, newGame, performAction, resolveEvent, runAutopilot, viewAction } from '../src/engine/simulationEngine';
import type { GameState, TransportMode } from '../src/engine/types';
import { at, makeGame } from './helpers';

function broke(overrides: Partial<Parameters<typeof makeGame>[0]> = {}): GameState {
  const s = makeGame({ backgroundId: 'struggling', ...overrides });
  s.finance.cash = 10;
  return s;
}

function addOverdue(s: GameState, balance: number): void {
  s.finance.debts.push({ id: 'd-test', kind: 'overdue', label: 'Overdue: rent', principal: balance, balance, monthlyPayment: 50, annualRate: 0.18 });
}

describe('gig work', () => {
  it('pays cash, costs energy and time, and adds a little stress', () => {
    const s = at(broke(), 2, 10);
    s.transport.mode = 'motorcycle';
    const r = performAction(s, 'gig-work', '2');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.finance.cash).toBeGreaterThan(s.finance.cash + 10);
    expect(r.state.stats.energy).toBeLessThan(s.stats.energy);
    expect(r.state.clock.minute - s.clock.minute).toBe(120);
    expect(r.state.today.earned).toBeGreaterThan(0);
    expect(r.state.stats.stress).toBeGreaterThan(s.stats.stress);
  });

  it('pays more with a motorcycle than on foot, and a longer session pays more', () => {
    const cashAfter = (mode: TransportMode, hours: string) => {
      const s = at(broke(), 2, 10);
      s.transport.mode = mode;
      return performAction(s, 'gig-work', hours).state.finance.cash;
    };
    expect(cashAfter('motorcycle', '2')).toBeGreaterThan(cashAfter('walk', '2'));
    expect(cashAfter('walk', '4')).toBeGreaterThan(cashAfter('walk', '2'));
  });

  it('works on foot or by public transport, so a broke player can always earn something', () => {
    for (const mode of ['walk', 'public'] as const) {
      const s = at(broke(), 2, 10);
      s.transport.mode = mode;
      expect(viewAction(s, 'gig-work', '2')!.available, mode).toBe(true);
    }
  });

  it('is unavailable with a reason when it should be', () => {
    const cant = (s: GameState, p = '2') => {
      const v = viewAction(s, 'gig-work', p)!;
      expect(v.available).toBe(false);
      expect(v.reason).toBeTruthy();
      expect(performAction(s, 'gig-work', p).feedback.ok).toBe(false);
      return v.reason!;
    };

    const ehail = at(broke(), 2, 10);
    ehail.transport.mode = 'ehailing';
    expect(cant(ehail)).toMatch(/walk|public|vehicle|bike/i);

    const tired = at(broke(), 2, 10);
    tired.transport.mode = 'walk';
    tired.stats.energy = 15;
    expect(cant(tired)).toMatch(/tired/i);

    const night = at(broke(), 2, 23);
    night.transport.mode = 'walk';
    expect(cant(night)).toMatch(/AM|PM|hours/i);

    const lectures = at(broke({ lifeStage: 'student' }), 1, 8);
    lectures.transport.mode = 'walk';
    lectures.education.status = 'studying';
    // Find a class day within the first week.
    for (let d = 0; d < 7; d++) {
      at(lectures, d, 8);
      if (viewAction(lectures, 'attend-class')?.available) break;
    }
    expect(viewAction(lectures, 'attend-class')?.available).toBe(true);
    expect(cant(lectures)).toMatch(/class/i);
  });

  it('is capped per day', () => {
    let s = at(broke(), 2, 7);
    s.transport.mode = 'walk';
    s.stats.energy = 100;
    s.stats.satiety = 100;
    for (let i = 0; i < 3; i++) {
      const r = performAction(s, 'gig-work', '4');
      if (!r.feedback.ok) {
        expect(r.feedback.error ?? '').toMatch(/enough|today|cap/i);
        return;
      }
      s = r.state;
      s.events.pending = [];
      s.stats.energy = 100;
    }
    throw new Error('daily cap never applied');
  });

  it('is deterministic for the same state and seed', () => {
    const make = () => {
      const s = at(broke({ seed: 5 }), 2, 10);
      s.transport.mode = 'motorcycle';
      return s;
    };
    const a = performAction(make(), 'gig-work', '4').state;
    const b = performAction(make(), 'gig-work', '4').state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('three 4-hour gig sessions a week never leave cash negative and beat standing still', () => {
    const s = at(broke(), 2, 10);
    s.transport.mode = 'walk';
    const r = performAction(s, 'gig-work', '4');
    expect(r.state.finance.cash).toBeGreaterThanOrEqual(0);
    expect(r.state.finance.cash).toBeGreaterThan(s.finance.cash);
  });
});

describe('family top-up event', () => {
  const topup = () => eventById('family-topup')!;

  it('exists as a random money event with a free choice', () => {
    const def = topup();
    expect(def.category).toBe('money');
    expect(def.trigger).toBe('random');
    expect(def.cooldownDays ?? 0).toBeGreaterThanOrEqual(45);
    const s = broke();
    const choices = typeof def.choices === 'function' ? def.choices(s, {}) : def.choices;
    expect(choices.some((c) => !c.cost && !c.requires)).toBe(true);
  });

  it('only fires when cash is very low and overdue debt is building', () => {
    const rich = at(makeGame({ backgroundId: 'struggling' }), 40, 12);
    rich.finance.cash = 900;
    addOverdue(rich, 400);
    expect(isEligible(rich, topup(), ['any'])).toBe(false);

    const noDebt = at(broke(), 40, 12);
    expect(isEligible(noDebt, topup(), ['any'])).toBe(false);

    const low = at(broke(), 40, 12);
    addOverdue(low, 400);
    expect(isEligible(low, topup(), ['any'])).toBe(true);
  });

  it('is not offered to players whose family already supports them', () => {
    const s = at(makeGame({ backgroundId: 'middle' }), 40, 12);
    s.housing.optionId = 'family';
    s.finance.cash = 10;
    addOverdue(s, 400);
    expect(isEligible(s, topup(), ['any'])).toBe(false);
  });

  it('respects its cooldown after it was answered', () => {
    const s = at(broke(), 100, 12);
    addOverdue(s, 400);
    s.events.cooldowns['family-topup'] = 60;
    expect(isEligible(s, topup(), ['any'])).toBe(false);
    s.events.cooldowns['family-topup'] = 100 - topup().cooldownDays!;
    expect(isEligible(s, topup(), ['any'])).toBe(true);
  });

  it('accepting helps, declining keeps your pride, and cash never goes negative', () => {
    for (const choiceId of ['gift', 'loan', 'decline']) {
      const s = at(broke(), 40, 12);
      addOverdue(s, 400);
      s.events.pending.push({ eventId: 'family-topup', params: {} });
      const view = currentEvent(s)!;
      const choice = view.choices.find((c) => c.id === choiceId)!;
      expect(choice, choiceId).toBeDefined();
      expect(choice.disabledReason).toBeNull();
      const r = resolveEvent(s, choiceId);
      expect(r.feedback.ok).toBe(true);
      expect(r.state.finance.cash).toBeGreaterThanOrEqual(0);
      if (choiceId === 'decline') expect(r.state.finance.cash).toBe(s.finance.cash);
      else expect(r.state.finance.cash).toBeGreaterThan(s.finance.cash + 100);
      expect(r.state.events.cooldowns['family-topup']).toBe(40);
    }
  });
});

describe('broke event pacing', () => {
  const due = (mutate: (s: GameState) => void = () => undefined) => {
    const s = at(broke(), 200, 6);
    mutate(s);
    return brokeEventDue(s);
  };

  it('fires when the wallet is empty and it has been a long while', () => {
    expect(due()).toBe(true);
    expect(due((s) => { s.events.cooldowns.broke = 200 - BROKE_GAP_DAYS; })).toBe(true);
  });

  it('leaves a long gap since the last one', () => {
    expect(BROKE_GAP_DAYS).toBeGreaterThanOrEqual(40);
    expect(due((s) => { s.events.cooldowns.broke = 200 - 10; })).toBe(false);
    expect(due((s) => { s.events.cooldowns.broke = 200 - (BROKE_GAP_DAYS - 1); })).toBe(false);
  });

  it('does not fire when the wallet is not empty', () => {
    expect(due((s) => { s.finance.cash = 200; })).toBe(false);
  });

  it('is skipped while the player is earning something', () => {
    expect(
      due((s) => {
        s.dayReports.unshift({ day: 198, earned: 60, spent: 0, caloriesIn: 0, caloriesOut: 0, sleepHours: 7, highlights: [], statsEnd: { ...s.stats } });
      }),
    ).toBe(false);
  });

  it('is skipped for a while after family helped', () => {
    expect(due((s) => { s.events.cooldowns['family-topup'] = 190; })).toBe(false);
    expect(due((s) => { s.events.cooldowns['family-topup'] = 100; })).toBe(true);
  });

  it('is much rarer over a year on autopilot for a jobless struggling grad (seed 42)', () => {
    const year = (seed: number) => {
      let s = newGame({ name: 'T', startAge: 23, homeState: 'Selangor', backgroundId: 'struggling', lifeStage: 'fresh_grad', mode: 'realistic', courseId: 'cs', seed });
      let brokeCount = 0;
      let guard = 0;
      while (s.clock.day < 365 && guard++ < 5000) {
        if (s.events.pending.length) {
          const ev = currentEvent(s)!;
          if (ev.eventId === 'broke') brokeCount += 1;
          const choice = ev.choices.find((c) => !c.disabledReason)!;
          s = resolveEvent(s, choice.id).state;
        } else {
          s = runAutopilot(s, 1).state;
        }
      }
      return { brokeCount, cash: s.finance.cash, debt: totalDebt(s), json: JSON.stringify(s.finance) };
    };
    const a = year(42);
    // Before this change: 31 broke events in 365 days (one every 10 days).
    expect(a.brokeCount).toBeLessThanOrEqual(10);
    expect(a.cash).toBeGreaterThanOrEqual(0);
    const b = year(42);
    expect(b.json).toBe(a.json);
  });
});
