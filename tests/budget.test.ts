import { describe, expect, it } from 'vitest';
import { BUDGET_PRESETS, BUDGET_TIPS, NOT_WANT_ACTIONS, WANT_ACTIONS } from '../src/data/budget';
import { actionById } from '../src/engine/actions';
import { budgetView, emergencyTarget, openPayday, parseSplit, trackSpend } from '../src/engine/budget';
import { monthlyCommitmentTotal, processMonthStart, runPayroll } from '../src/engine/economy';
import { SAVE_VERSION } from '../src/engine/newGame';
import { migrate } from '../src/engine/save';
import { performAction, viewAction } from '../src/engine/simulationEngine';
import type { GameState } from '../src/engine/types';
import { at, makeGame } from './helpers';

const worker = () => makeGame({ lifeStage: 'working', jobId: 'swe' });

/** A worker whose January salary has just landed (day 27 is 31 January). */
function paid(): GameState {
  const s = worker();
  runPayroll(s, 27);
  return s;
}

function planned(split = '50-30-20'): GameState {
  return performAction(paid(), 'plan-budget', split).state;
}

describe('budget save v10', () => {
  it('migrates a v9 save to v10 with an empty budget', () => {
    const old = JSON.parse(JSON.stringify(makeGame())) as Record<string, unknown>;
    const finance = old.finance as Record<string, unknown>;
    delete finance.budget;
    old.version = 9;
    const migrated = migrate(old);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.finance.budget).toEqual({ pending: null, cycle: null, lastSplit: null, autoPlan: false, planned: 0, streak: 0, history: [] });
  });

  it('new games start with an empty budget', () => {
    expect(makeGame().finance.budget.planned).toBe(0);
  });
});

describe('budget catalogue', () => {
  it('presets sum to 100 in steps of 5, ids unique', () => {
    for (const p of BUDGET_PRESETS) {
      expect(p.split.needs + p.split.wants + p.split.save, p.id).toBe(100);
      for (const v of Object.values(p.split)) expect(v % 5, p.id).toBe(0);
    }
    expect(new Set(BUDGET_PRESETS.map((p) => p.id)).size).toBe(BUDGET_PRESETS.length);
    expect(new Set(BUDGET_TIPS.map((t) => t.id)).size).toBe(BUDGET_TIPS.length);
  });

  it('want and not-want actions exist in the catalogue', () => {
    for (const id of [...WANT_ACTIONS, ...NOT_WANT_ACTIONS]) expect(actionById(id), id).toBeTruthy();
  });
});

describe('payday opens the planner', () => {
  it('salary payday sets a pending plan', () => {
    const s = paid();
    const net = s.finance.payslips[0].net;
    expect(s.finance.budget.pending).toEqual({ day: s.clock.day, income: net, source: 'salary' });
  });

  it('a family allowance sets a pending plan', () => {
    const s = makeGame({ lifeStage: 'student', backgroundId: 'middle' });
    processMonthStart(s);
    expect(s.finance.budget.pending?.source).toBe('allowance');
    expect(s.finance.budget.pending?.income).toBe(300);
  });

  it('zero income opens nothing', () => {
    const s = worker();
    openPayday(s, 0, 'salary');
    expect(s.finance.budget.pending).toBeNull();
  });
});

describe('plan-budget', () => {
  it('parses splits strictly', () => {
    expect(parseSplit('50-30-20')).toEqual({ needs: 50, wants: 30, save: 20 });
    expect(parseSplit('50-30-20|auto')).toEqual({ needs: 50, wants: 30, save: 20 });
    expect(parseSplit('50-30-25')).toBeNull();
    expect(parseSplit('52-28-20')).toBeNull();
    expect(parseSplit('abc')).toBeNull();
    expect(parseSplit(undefined)).toBeNull();
  });

  it('50-30-20 moves 20% into the emergency fund first, then savings', () => {
    const s = paid();
    const income = s.finance.budget.pending!.income;
    s.finance.emergencyFund = emergencyTarget(s) - 100;
    const before = { cash: s.finance.cash, ef: s.finance.emergencyFund, sav: s.finance.savings };
    const r = performAction(s, 'plan-budget', '50-30-20');
    expect(r.feedback.ok).toBe(true);
    const f = r.state.finance;
    const toSave = Math.round(income * 0.2);
    expect(f.emergencyFund).toBeCloseTo(before.ef + 100, 2);
    expect(f.savings).toBeCloseTo(before.sav + toSave - 100, 2);
    expect(f.cash).toBeCloseTo(before.cash - toSave, 2);
    expect(f.budget.pending).toBeNull();
    expect(f.budget.cycle).toMatchObject({ saved: toSave, wantsBudget: Math.round(income * 0.3), needsBudget: Math.round(income * 0.5), wantsSpent: 0, dipped: 0 });
    expect(f.budget.planned).toBe(1);
    expect(f.budget.lastSplit).toEqual({ needs: 50, wants: 30, save: 20 });
  });

  it('never moves more than the cash above the wallet floor', () => {
    const s = paid();
    s.finance.cash = 100;
    const r = performAction(s, 'plan-budget', '50-30-20');
    expect(r.state.finance.cash).toBe(100); // the floor stays in the wallet
    expect(r.state.finance.budget.cycle!.saved).toBe(0);
  });

  it('rejects a bad split with a reason, state unchanged', () => {
    const s = paid();
    const copy = structuredClone(s);
    const r = performAction(s, 'plan-budget', '60-30-20');
    expect(r.feedback.ok).toBe(false);
    expect(r.feedback.error).toBe('Needs, wants and savings must add up to 100%, in steps of 5.');
    expect(s).toEqual(copy);
  });

  it('with nothing pending gives the reason', () => {
    const v = viewAction(worker(), 'plan-budget', '50-30-20')!;
    expect(v.available).toBe(false);
    expect(v.reason).toBe('No pay to plan yet. Your next gaji or allowance opens the planner.');
  });

  it('warns when needs are below the monthly commitments', () => {
    const s = paid();
    s.finance.budget.pending!.income = Math.max(200, monthlyCommitmentTotal(s));
    const r = performAction(s, 'plan-budget', '20-60-20');
    expect(r.feedback.lines.join(' ')).toMatch(/commitments/i);
  });

  it('auto-plan needs 3 hand-made plans', () => {
    const s = paid();
    expect(viewAction(s, 'plan-budget', '50-30-20|auto')!.reason).toBe('Plan 3 paydays by hand first.');
    s.finance.budget.planned = 3;
    expect(viewAction(s, 'plan-budget', '50-30-20|auto')!.available).toBe(true);
  });

  it('auto-plan applies the last split on the next payday, and budget-auto turns it off', () => {
    const s = paid();
    s.finance.budget.planned = 3;
    let st = performAction(s, 'plan-budget', '50-20-30|auto').state;
    expect(st.finance.budget.autoPlan).toBe(true);
    const saved = st.finance.savings + st.finance.emergencyFund;
    runPayroll(st, 55); // 28 February
    expect(st.finance.budget.pending).toBeNull();
    expect(st.finance.budget.cycle!.split).toEqual({ needs: 50, wants: 20, save: 30 });
    expect(st.finance.savings + st.finance.emergencyFund).toBeGreaterThan(saved);
    expect(st.finance.budget.history).toHaveLength(1);
    st = performAction(st, 'budget-auto', 'off').state;
    expect(st.finance.budget.autoPlan).toBe(false);
  });
});

describe('wants tracking and grading', () => {
  it('leisure spend counts as wants and warns at 80% then 100%, once each', () => {
    const s = planned();
    const budget = s.finance.budget.cycle!.wantsBudget;
    expect(trackSpend(s, 'movie', 'leisure', undefined, budget * 0.5)).toEqual([]);
    expect(trackSpend(s, 'movie', 'leisure', undefined, budget * 0.35).join(' ')).toMatch(/85% of your wants budget/);
    expect(trackSpend(s, 'movie', 'leisure', undefined, 1)).toEqual([]);
    expect(trackSpend(s, 'movie', 'leisure', undefined, budget * 0.2).join(' ')).toMatch(/over/i);
    expect(trackSpend(s, 'movie', 'leisure', undefined, 1)).toEqual([]);
  });

  it('needs do not count; a meal counts only above RM12, a snack above RM4', () => {
    const s = planned();
    trackSpend(s, 'set-transport', 'transport', undefined, 200);
    expect(s.finance.budget.cycle!.wantsSpent).toBe(0);
    trackSpend(s, 'eat', 'food', 'banana-leaf', 14);
    expect(s.finance.budget.cycle!.wantsSpent).toBe(2);
    trackSpend(s, 'eat', 'food', 'bubble-tea:regular', 13);
    expect(s.finance.budget.cycle!.wantsSpent).toBe(11);
    trackSpend(s, 'wedding', 'love', undefined, 20000);
    expect(s.finance.budget.cycle!.wantsSpent).toBe(11);
  });

  it('nothing is tracked without an open cycle', () => {
    const s = worker();
    expect(trackSpend(s, 'movie', 'leisure', undefined, 30)).toEqual([]);
    expect(s.finance.budget.cycle).toBeNull();
  });

  it('a real meal through performAction is tracked', () => {
    const s = at(planned(), 28, 12);
    const r = performAction(s, 'eat', 'banana-leaf');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.finance.budget.cycle!.wantsSpent).toBe(2);
  });

  it('withdrawing savings during a cycle counts as dipping', () => {
    const s = planned();
    s.finance.savings = 1000;
    const r = performAction(s, 'withdraw', '100');
    expect(r.state.finance.budget.cycle!.dipped).toBe(100);
  });

  it('grades A, B and C on the next payday and keeps the streak', () => {
    const a = planned();
    const happy = a.stats.happiness;
    runPayroll(a, 55);
    expect(a.finance.budget.history[0]).toMatchObject({ grade: 'A', month: '2027-01' });
    expect(a.finance.budget.streak).toBe(1);
    expect(a.stats.happiness).toBeGreaterThan(happy);

    const b = planned();
    b.finance.budget.cycle!.wantsSpent = b.finance.budget.cycle!.wantsBudget + 1;
    runPayroll(b, 55);
    expect(b.finance.budget.history[0].grade).toBe('B');
    expect(b.finance.budget.streak).toBe(1);

    const c = planned();
    c.finance.budget.streak = 2;
    c.finance.budget.cycle!.wantsSpent = c.finance.budget.cycle!.wantsBudget + 1;
    c.finance.budget.cycle!.dipped = 50;
    runPayroll(c, 55);
    expect(c.finance.budget.history[0].grade).toBe('C');
    expect(c.finance.budget.streak).toBe(0);
  });

  it('saving nothing cannot earn an A', () => {
    const s = planned('50-50-0');
    runPayroll(s, 55);
    expect(s.finance.budget.history[0].grade).toBe('B');
  });

  it('keeps at most 6 results', () => {
    const s = planned();
    const cycle = s.finance.budget.cycle!;
    for (let i = 0; i < 8; i++) {
      s.finance.budget.cycle = { ...cycle };
      openPayday(s, 3000, 'salary');
    }
    expect(s.finance.budget.history).toHaveLength(6);
  });

  it('is deterministic', () => {
    const run = () => performAction(at(planned(), 28, 12), 'eat', 'banana-leaf').state.finance.budget;
    expect(run()).toEqual(run());
  });
});

describe('budgetView and achievements', () => {
  it('reports wants used and emergency fund months', () => {
    const s = planned();
    s.finance.budget.cycle!.wantsSpent = s.finance.budget.cycle!.wantsBudget / 2;
    const v = budgetView(s);
    expect(v.wantsUsed).toBeCloseTo(0.5, 5);
    expect(v.emergencyTarget).toBe(emergencyTarget(s));
    expect(v.emergencyMonths).toBeGreaterThanOrEqual(0);
    expect(v.autoAllowed).toBe(false);
  });

  it('unlocks first-budget after a plan and cekap-bajet after a streak of 3', () => {
    const s = planned();
    expect(s.achievements['first-budget']).toBeDefined();
    s.finance.budget.streak = 3;
    const r = performAction(s, 'budget-auto', 'off');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.achievements['cekap-bajet']).toBeDefined();
  });
});

import { stepSplit } from '../src/components/paydaySplit';

describe('payday stepper maths', () => {
  const base = { needs: 50, wants: 30, save: 20 };
  it('wants is the flex bucket and the total stays 100', () => {
    expect(stepSplit(base, 'save', 1)).toEqual({ needs: 50, wants: 25, save: 25 });
    expect(stepSplit(base, 'needs', -1)).toEqual({ needs: 45, wants: 35, save: 20 });
    expect(stepSplit(base, 'wants', 1)).toEqual({ needs: 45, wants: 35, save: 20 });
    expect(stepSplit(base, 'wants', -1)).toEqual({ needs: 55, wants: 25, save: 20 });
    expect(stepSplit({ needs: 50, wants: 0, save: 50 }, 'save', 1)).toEqual({ needs: 45, wants: 0, save: 55 });
    expect(stepSplit({ needs: 0, wants: 0, save: 100 }, 'save', 1)).toEqual({ needs: 0, wants: 0, save: 100 });
    expect(stepSplit({ needs: 50, wants: 50, save: 0 }, 'save', -1)).toEqual({ needs: 50, wants: 50, save: 0 });
  });
});

import { cashFloor, savingsNow } from '../src/engine/budget';
import { surplusToSave } from '../src/engine/simulationEngine';

describe('cash floor and sweep (fix)', () => {
  it('a plan leaves the wallet its floor when cash is short', () => {
    const s = paid();
    const income = s.finance.budget.pending!.income;
    s.finance.cash = 984;
    const split = { needs: 50, wants: 20, save: 30 };
    const floor = cashFloor(income, split);
    expect(savingsNow(s, income, split)).toBe(984 - floor);
    const r = performAction(s, 'plan-budget', '50-20-30');
    expect(r.state.finance.cash).toBe(floor);
    expect(r.state.finance.cash).toBeGreaterThanOrEqual(100);
    expect(r.feedback.lines.join(' ')).toMatch(/stays in the wallet/);
  });

  it('with plenty of cash the full savings share moves', () => {
    const s = paid();
    const income = s.finance.budget.pending!.income;
    expect(savingsNow(s, income, { needs: 50, wants: 30, save: 20 })).toBe(Math.round(income * 0.2));
  });

  it('the routine sweep waits while a payday is pending', () => {
    const s = paid();
    s.finance.cash = 50000;
    expect(surplusToSave(s)).toBe(0);
    s.finance.budget.pending = null;
    expect(surplusToSave(s)).toBeGreaterThan(0);
  });
});
