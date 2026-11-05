// Hari Gaji: the payday planner. When a salary or allowance lands the player splits it into
// needs, wants and savings (a common 50/30/20-style rule of thumb, simplified for the game).
// Savings move at once (emergency fund first), wants spending is tracked across the pay cycle,
// and the cycle is graded on the next payday. Pure engine code: no randomness, no wall clock.

import {
  BASIC_MEAL_RM, BASIC_SNACK_RM, BUDGET_GRADES, EMERGENCY_MIN, EMERGENCY_MONTHS, NOT_WANT_ACTIONS, WANT_ACTIONS, WANT_CATEGORIES, WANT_WARNINGS,
} from '../data/budget';
import { foodById } from '../data/foods';
import { monthKey } from './calendar';
import { applyStats, formatRM, highlight, log, round2 } from './core';
import { monthlyCommitmentTotal } from './economy';
import type { BudgetResult, BudgetSplit, BudgetState, GameState, PaydaySource } from './types';

export const emptyBudget = (): BudgetState => ({ pending: null, cycle: null, lastSplit: null, autoPlan: false, planned: 0, streak: 0, history: [] });

/** Hand-made plans needed before auto-plan is offered. */
export const AUTO_PLAN_AFTER = 3;
const MAX_HISTORY = 6;

export const SPLIT_REASON = 'Needs, wants and savings must add up to 100%, in steps of 5.';
export const NOTHING_PENDING_REASON = 'No pay to plan yet. Your next gaji or allowance opens the planner.';
export const AUTO_REASON = `Plan ${AUTO_PLAN_AFTER} paydays by hand first.`;

/** Parse "N-W-S" (optionally followed by "|auto"). Each part 0-100 in steps of 5, summing to 100. */
export function parseSplit(param: string | undefined): BudgetSplit | null {
  const m = /^(\d{1,3})-(\d{1,3})-(\d{1,3})(\|auto)?$/.exec(param ?? '');
  if (!m) return null;
  const [needs, wants, save] = [m[1], m[2], m[3]].map(Number);
  if ([needs, wants, save].some((v) => v > 100 || v % 5 !== 0)) return null;
  if (needs + wants + save !== 100) return null;
  return { needs, wants, save };
}

export const wantsAuto = (param: string | undefined) => !!param?.endsWith('|auto');

/** Emergency fund goal: a few months of commitments, never below the floor (game rule). */
export function emergencyTarget(state: GameState): number {
  return Math.max(EMERGENCY_MIN, Math.round(EMERGENCY_MONTHS * monthlyCommitmentTotal(state)));
}

/** Why plan-budget cannot run with this param right now, or null. */
export function planReason(state: GameState, param: string | undefined): string | null {
  if (!state.finance.budget.pending) return NOTHING_PENDING_REASON;
  if (!parseSplit(param)) return SPLIT_REASON;
  if (wantsAuto(param) && state.finance.budget.planned < AUTO_PLAN_AFTER) return AUTO_REASON;
  return null;
}

/**
 * Pay just landed. Closes (grades) any open cycle, then either applies the saved split at once
 * (auto-plan) or leaves the payday pending for the player. Returns feedback lines.
 */
export function openPayday(state: GameState, income: number, source: PaydaySource): string[] {
  const value = round2(income);
  if (value <= 0) return [];
  const b = state.finance.budget;
  const lines = closeCycle(state);
  b.pending = { day: state.clock.day, income: value, source };
  if (b.autoPlan && b.lastSplit) {
    lines.push(...applyPlan(state, b.lastSplit, true));
  } else {
    log(state, 'money', `${source === 'salary' ? 'Gaji' : 'Allowance'} of ${formatRM(value)} is in. Plan it: needs, wants and savings.`);
    highlight(state, 'Hari gaji: plan your money');
  }
  return lines;
}

/** Split the pending payday. Callers check planReason() first. */
export function applyPlan(state: GameState, split: BudgetSplit, auto = false): string[] {
  const f = state.finance;
  const b = f.budget;
  const pending = b.pending;
  if (!pending) return [];
  const income = pending.income;
  const lines: string[] = [];

  // Pay yourself first: the savings share leaves the wallet now, emergency fund first.
  const toSave = round2(Math.max(0, Math.min(Math.round((income * split.save) / 100), f.cash)));
  const toEmergency = round2(Math.max(0, Math.min(toSave, emergencyTarget(state) - f.emergencyFund)));
  const toSavings = round2(toSave - toEmergency);
  f.cash = round2(f.cash - toSave);
  f.emergencyFund = round2(f.emergencyFund + toEmergency);
  f.savings = round2(f.savings + toSavings);

  const needsBudget = Math.round((income * split.needs) / 100);
  const wantsBudget = Math.round((income * split.wants) / 100);
  b.cycle = {
    startDay: pending.day,
    source: pending.source,
    income,
    split: { ...split },
    saved: toSave,
    needsBudget,
    wantsBudget,
    wantsSpent: 0,
    spentAtStart: state.counters.totalSpent,
    dipped: 0,
    warned: 0,
  };
  b.pending = null;
  b.lastSplit = { ...split };
  b.planned += 1;

  if (toSave > 0) {
    const parts = [toEmergency > 0 ? `${formatRM(toEmergency)} to the emergency fund` : '', toSavings > 0 ? `${formatRM(toSavings)} to savings` : ''].filter(Boolean);
    lines.push(`Paid yourself first: ${parts.join(' and ')}.`);
  } else {
    lines.push('Nothing saved this payday.');
  }
  lines.push(`Needs ${formatRM(needsBudget)} · Wants ${formatRM(wantsBudget)} until the next payday.`);
  const commitments = monthlyCommitmentTotal(state);
  if (commitments > needsBudget) lines.push(`Heads up: your monthly commitments (${formatRM(commitments)}) are more than your needs share. Cheaper rent, transport or a smaller loan would free up room.`);
  if (split.save < 10) lines.push('Tip: saving even 10% every month adds up to more than a full month of pay each year.');
  if (split.wants > 40) lines.push('Tip: a big wants share is fine for a month, but it leaves little room for surprises.');
  applyStats(state, { stress: -2 });
  log(state, 'money', `${auto ? 'Auto-plan' : 'Payday plan'}: ${split.needs}/${split.wants}/${split.save} (needs/wants/savings) of ${formatRM(income)}.`);
  return lines;
}

/** RM of a spend that counts as wants (game rule; see src/data/budget.ts). */
export function wantPortion(actionId: string, category: string, param: string | undefined, amount: number): number {
  if (amount <= 0 || NOT_WANT_ACTIONS.includes(actionId)) return 0;
  if (actionId === 'eat') {
    const food = foodById((param ?? '').split(':')[0]);
    const basic = food && !food.meal ? BASIC_SNACK_RM : BASIC_MEAL_RM;
    return round2(Math.max(0, amount - basic));
  }
  return WANT_CATEGORIES.includes(category) || WANT_ACTIONS.includes(actionId) ? round2(amount) : 0;
}

const DIP_ACTIONS = ['withdraw', 'emergency-withdraw', 'unit-trust-withdraw'];

/**
 * Record what an action spent from wallet cash (`amount`) against the open cycle, and money pulled
 * back out of savings (`dipped`). Returns warning lines when wants cross 80% and then 100%.
 */
export function trackSpend(state: GameState, actionId: string, category: string, param: string | undefined, amount: number, dipped = 0): string[] {
  const cycle = state.finance.budget.cycle;
  if (!cycle) return [];
  if (dipped > 0 && DIP_ACTIONS.includes(actionId)) cycle.dipped = round2(cycle.dipped + dipped);
  const want = wantPortion(actionId, category, param, amount);
  if (want <= 0) return [];
  cycle.wantsSpent = round2(cycle.wantsSpent + want);
  if (cycle.wantsBudget <= 0) return [];
  const used = (cycle.wantsSpent / cycle.wantsBudget) * 100;
  const level = [...WANT_WARNINGS].reverse().find((w) => used >= w) ?? 0;
  if (level <= cycle.warned) return [];
  cycle.warned = level;
  const left = round2(cycle.wantsBudget - cycle.wantsSpent);
  if (level >= 100) {
    log(state, 'warning', `Wants budget used up (${formatRM(cycle.wantsSpent)} of ${formatRM(cycle.wantsBudget)}).`);
    return [`💸 You're over your wants budget by ${formatRM(-left)}. More fun now comes out of needs or savings.`];
  }
  return [`🟡 ${Math.round(used)}% of your wants budget is gone. ${formatRM(left)} left until the next payday.`];
}

/** Grade and close the open cycle (called on the next payday). Returns feedback lines. */
export function closeCycle(state: GameState): string[] {
  const b = state.finance.budget;
  const c = b.cycle;
  if (!c) return [];
  const wantsOk = c.wantsSpent <= c.wantsBudget;
  const savingsOk = c.saved > 0 && c.dipped <= 0;
  const grade: BudgetResult['grade'] = wantsOk && savingsOk ? 'A' : wantsOk || savingsOk ? 'B' : 'C';
  const result: BudgetResult = {
    month: monthKey(state, c.startDay),
    income: c.income,
    split: c.split,
    saved: c.saved,
    wantsSpent: c.wantsSpent,
    wantsBudget: c.wantsBudget,
    dipped: c.dipped,
    grade,
  };
  b.history.unshift(result);
  if (b.history.length > MAX_HISTORY) b.history.length = MAX_HISTORY;
  b.cycle = null;
  if (grade === 'C') {
    b.streak = 0;
    applyStats(state, { stress: 2 });
  } else {
    b.streak += 1;
    applyStats(state, grade === 'A' ? { happiness: 3, stress: -3 } : { happiness: 1, stress: -1 });
  }
  const g = BUDGET_GRADES[grade];
  log(state, grade === 'C' ? 'warning' : 'milestone', `Budget report ${result.month}: ${grade} (${g.title}). ${g.line}`);
  highlight(state, `Budget grade ${grade}: ${g.title}`);
  return [`📊 Last pay cycle: ${grade}. ${g.line}`];
}

export interface BudgetView {
  pending: BudgetState['pending'];
  cycle: BudgetState['cycle'];
  /** Wants spent / wants budget (0 when there is no cycle or no wants budget). */
  wantsUsed: number;
  /** All spending since the cycle opened (wants included), from counters.totalSpent. */
  spentInCycle: number;
  emergencyTarget: number;
  /** Months of commitments the emergency fund covers. */
  emergencyMonths: number;
  commitments: number;
  autoAllowed: boolean;
  last: BudgetResult | null;
}

/** Read-only summary for the UI. */
export function budgetView(state: GameState): BudgetView {
  const b = state.finance.budget;
  const c = b.cycle;
  const commitments = monthlyCommitmentTotal(state);
  return {
    pending: b.pending,
    cycle: c,
    wantsUsed: c && c.wantsBudget > 0 ? c.wantsSpent / c.wantsBudget : 0,
    spentInCycle: c ? round2(Math.max(0, state.counters.totalSpent - c.spentAtStart)) : 0,
    emergencyTarget: emergencyTarget(state),
    emergencyMonths: commitments > 0 ? round2(state.finance.emergencyFund / commitments) : 0,
    commitments,
    autoAllowed: b.planned >= AUTO_PLAN_AFTER,
    last: b.history[0] ?? null,
  };
}
