// Recurring money: monthly bills, loan repayments, payroll, EPF dividend and
// the annual tax settlement. One list of commitments feeds both the monthly
// processing and the UI preview, so what the player sees is what gets charged.

import { gymById } from '../data/lifestyle';
import { transportModeInfo } from '../data/vehicles';
import { backgroundById } from '../data/backgrounds';
import { dailyRate, hourlyRate, computePayslip, annualTax } from './payroll';
import { statutory } from '../data/statutory';
import { addDebt, clamp, earn, formatRM, highlight, log, round2, spend, applyStats } from './core';
import { currentHome, vehicleMonthlyCosts } from './living';
import { dateOf, monthKey, yearOf } from './calendar';
import type { GameState } from './types';

export const PHONE_BILL = 45;
export const INSURANCE_MONTHLY = 150;
export const EMPLOYEE_COST = 1900;
/** Fictional EPF dividend used by the game (not a forecast). */
export const EPF_DIVIDEND_RATE = 0.055;
export const SAVINGS_RATE = 0.025;

export interface Commitment {
  id: string;
  label: string;
  amount: number;
  kind: 'housing' | 'bills' | 'transport' | 'debt' | 'lifestyle' | 'family' | 'business';
}

export function monthlyCommitments(state: GameState): Commitment[] {
  const out: Commitment[] = [];
  const home = currentHome(state);
  if (home.rent > 0) out.push({ id: 'rent', label: `Rent: ${home.name}`, amount: home.rent, kind: 'housing' });
  if (home.maintenance > 0) out.push({ id: 'maintenance', label: 'Maintenance fees', amount: home.maintenance, kind: 'housing' });
  if (home.utilities > 0) out.push({ id: 'utilities', label: 'Electricity & water', amount: home.utilities, kind: 'bills' });
  if (home.internet > 0) out.push({ id: 'internet', label: 'Home internet', amount: home.internet, kind: 'bills' });
  out.push({ id: 'phone', label: 'Phone plan', amount: PHONE_BILL, kind: 'bills' });

  const mode = transportModeInfo(state.transport.mode);
  if (mode.monthlyPass) out.push({ id: 'transit-pass', label: 'Public transport pass', amount: mode.monthlyPass, kind: 'transport' });
  for (const [i, c] of vehicleMonthlyCosts(state).entries()) out.push({ id: `vehicle-${i}`, label: c.label, amount: c.amount, kind: 'transport' });

  const gym = gymById(state.fitness.gymId);
  if (state.fitness.gymMember && gym) out.push({ id: 'gym', label: `${gym.name} membership`, amount: gym.monthlyFee, kind: 'lifestyle' });
  if (state.finance.insurance) out.push({ id: 'insurance', label: 'Medical insurance / takaful', amount: INSURANCE_MONTHLY, kind: 'lifestyle' });
  if (state.flags.streaming) out.push({ id: 'streaming', label: 'Streaming subscriptions', amount: 45, kind: 'lifestyle' });
  if (state.finance.parentAllowance > 0) out.push({ id: 'parents', label: 'Allowance for parents', amount: state.finance.parentAllowance, kind: 'family' });

  for (const d of state.finance.debts) {
    if (d.balance <= 0) continue;
    if (d.kind === 'ptptn' && state.education.status === 'studying') continue;
    out.push({ id: `debt-${d.id}`, label: `${d.label} repayment`, amount: Math.min(d.monthlyPayment, round2(d.balance)), kind: 'debt' });
  }
  const staff = state.hustles.reduce((n, h) => n + h.employees, 0);
  if (staff > 0) out.push({ id: 'staff', label: `Staff salaries (${staff})`, amount: staff * EMPLOYEE_COST, kind: 'business' });
  return out;
}

export function monthlyCommitmentTotal(state: GameState): number {
  return round2(monthlyCommitments(state).reduce((s, c) => s + c.amount, 0));
}

/** Expected monthly net income (salary-based) used for affordability checks. */
export function expectedMonthlyNet(state: GameState): number {
  const job = state.career.job;
  if (!job) return 0;
  if (job.schedule === 'parttime') return job.shiftPay * 12;
  const slip = computePayslip({ month: '', employer: '', schedule: job.schedule, basic: job.monthlySalary });
  return slip.net;
}

/** Debt service ratio after a hypothetical extra monthly commitment (game rule, not bank policy). */
export function debtServiceRatio(state: GameState, extraMonthly = 0): number {
  const net = expectedMonthlyNet(state);
  const debts = state.finance.debts.reduce((s, d) => s + (d.balance > 0 ? d.monthlyPayment : 0), 0) + extraMonthly;
  if (net <= 0) return debts > 0 ? Infinity : 0;
  return debts / net;
}

/** Runs on the first day of each month, before the day's other processing. */
export function processMonthStart(state: GameState): void {
  const f = state.finance;
  f.monthSpent = 0;
  f.monthEarned = 0;
  for (const h of state.hustles) {
    h.monthRevenue = 0;
    h.monthExpense = 0;
  }

  // Family allowance for students / young adults at home.
  const bg = backgroundById(state.character.backgroundId);
  if (bg.familyAllowance > 0 && (state.education.status === 'studying' || currentHome(state).familyHome) && !state.career.job) {
    earn(state, bg.familyAllowance);
    log(state, 'money', `Family sent ${formatRM(bg.familyAllowance)} allowance. Terima kasih Mak & Abah!`);
  }

  // Interest accrues on debts before repayments.
  for (const d of f.debts) {
    if (d.balance <= 0) continue;
    if (d.kind === 'ptptn' && state.education.status === 'studying') continue;
    d.balance = round2(d.balance * (1 + d.annualRate / 12));
  }

  let paidTotal = 0;
  for (const c of monthlyCommitments(state)) {
    if (c.kind === 'debt') continue;
    paidTotal += c.amount;
    spend(state, c.amount, c.label, true);
    if (c.id === 'parents') {
      state.counters.helpedParentsTotal = round2(state.counters.helpedParentsTotal + c.amount);
      state.relationships.family = clamp(state.relationships.family + 1.5);
    }
  }

  // Debt repayments: missed amounts roll into overdue debt with a stress hit.
  for (const d of [...f.debts]) {
    if (d.balance <= 0) continue;
    if (d.kind === 'ptptn' && state.education.status === 'studying') continue;
    const due = Math.min(d.monthlyPayment, d.balance);
    const fromCash = Math.min(f.cash, due);
    f.cash = round2(f.cash - fromCash);
    d.balance = round2(d.balance - fromCash);
    f.monthSpent = round2(f.monthSpent + fromCash);
    state.today.spent = round2(state.today.spent + fromCash);
    state.counters.totalSpent = round2(state.counters.totalSpent + fromCash);
    paidTotal += fromCash;
    const missed = round2(due - fromCash);
    if (missed > 0 && d.kind !== 'overdue') {
      d.balance = round2(d.balance - missed);
      addDebt(state, 'overdue', 'Overdue: missed repayments', missed, Math.max(50, missed / 6), 0.18);
      applyStats(state, { stress: 6, reputation: -2 });
      log(state, 'warning', `Missed ${formatRM(missed)} of ${d.label}. It is now overdue debt with late charges.`);
    }
  }
  const cleared = f.debts.filter((d) => d.balance <= 0.5);
  for (const d of cleared) {
    state.counters.debtsCleared += 1;
    log(state, 'milestone', `Paid off ${d.label}! 🎉`);
    highlight(state, `Cleared ${d.label}`);
    if (d.kind === 'car' || d.kind === 'motorcycle') state.flags.vehicleOwnedOutright = true;
  }
  f.debts = f.debts.filter((d) => d.balance > 0.5);

  // Savings account interest (game estimate).
  if (f.savings > 0) f.savings = round2(f.savings * (1 + SAVINGS_RATE / 12));

  if (state.transport.vehicleId) state.transport.vehicleCondition = Math.max(0, state.transport.vehicleCondition - 2);

  state.flags.lastCommitments = Math.round(paidTotal);
  if (typeof state.flags.vehicleValue === 'number') state.flags.vehicleValue = Math.round(state.flags.vehicleValue * 0.99);
  log(state, 'money', `Bills day: ${formatRM(paidTotal)} for rent, bills and repayments.`);
  highlight(state, `Monthly commitments: ${formatRM(paidTotal)}`);
}

/** Runs on the last day of each month. Pays full-time / intern salaries with a payslip. */
export function runPayroll(state: GameState, day = state.clock.day): void {
  const job = state.career.job;
  if (!job || job.schedule === 'parttime') return;
  const month = monthKey(state, day);
  const date = dateOf(state.startDate, day);
  const daysInMonth = date.getUTCDate();
  const monthStartDay = day - daysInMonth + 1;
  const employedDays = Math.min(daysInMonth, day - Math.max(job.startDay, monthStartDay) + 1);
  if (employedDays <= 0) return;

  const basic = round2((job.monthlySalary * employedDays) / daysInMonth);
  const overtime = job.schedule === 'fulltime' ? round2(job.overtimeHoursThisMonth * hourlyRate(job.monthlySalary) * statutory.overtimeMultiplier) : 0;
  const unpaidLeave = round2(Math.min(basic, job.absencesThisMonth * dailyRate(job.monthlySalary)));
  let bonus = 0;
  if (date.getUTCMonth() === 11 && job.schedule === 'fulltime' && day - job.startDay > 90) {
    const months = job.performance >= 80 ? 2 : job.performance >= 65 ? 1 : job.performance >= 50 ? 0.5 : 0;
    bonus = round2(job.monthlySalary * months);
    if (bonus > 0) highlight(state, `Year-end bonus: ${months} month(s)!`);
  }
  const slip = computePayslip({
    month,
    employer: state.career.job ? companyLabel(state) : '',
    schedule: job.schedule,
    basic,
    overtime,
    bonus,
    unpaidLeave,
  });
  earn(state, slip.net);
  const f = state.finance;
  f.epfBalance = round2(f.epfBalance + slip.epfEmployee + slip.epfEmployer);
  f.epfEmployerTotal = round2(f.epfEmployerTotal + slip.epfEmployer);
  f.taxYear.grossIncome = round2(f.taxYear.grossIncome + slip.gross);
  f.taxYear.pcbPaid = round2(f.taxYear.pcbPaid + slip.pcb);
  f.taxYear.epfEmployee = round2(f.taxYear.epfEmployee + slip.epfEmployee);
  f.taxYear.socsoEis = round2(f.taxYear.socsoEis + slip.socsoEmployee + slip.eisEmployee);
  f.payslips.unshift(slip);
  if (f.payslips.length > 12) f.payslips.length = 12;

  job.overtimeHoursThisMonth = 0;
  job.daysWorkedThisMonth = 0;
  job.absencesThisMonth = 0;
  log(state, 'money', `Gaji masuk! Net pay ${formatRM(slip.net, 2)} (gross ${formatRM(slip.gross, 2)}). Payslip saved.`);
  highlight(state, `Salary credited: ${formatRM(slip.net)}`);
}

function companyLabel(state: GameState): string {
  return String(state.flags.employerName ?? 'Employer');
}

/** Runs on 1 January: EPF dividend and closing the previous tax year. */
export function processNewYear(state: GameState): void {
  const f = state.finance;
  if (f.epfBalance > 0) {
    const dividend = round2(f.epfBalance * EPF_DIVIDEND_RATE);
    f.epfBalance = round2(f.epfBalance + dividend);
    log(state, 'money', `EPF dividend credited: ${formatRM(dividend)} (fictional ${(EPF_DIVIDEND_RATE * 100).toFixed(1)}% game rate).`);
  }
  const ty = f.taxYear;
  if (ty.grossIncome > 0) {
    const due = annualTax({ grossIncome: ty.grossIncome, epfEmployee: ty.epfEmployee, socsoEis: ty.socsoEis });
    f.pendingTaxSettlement = round2(due - ty.pcbPaid);
    // e-Filing season: the game schedules it for early April of the new year.
    const year = yearOf(state);
    const april = Math.round((Date.UTC(year, 3, 2) - Date.parse(`${state.startDate}T00:00:00Z`)) / 86400000);
    state.events.scheduled.push({ eventId: 'tax-filing', day: Math.max(state.clock.day + 1, april) });
  }
  f.taxYear = { year: yearOf(state), grossIncome: 0, pcbPaid: 0, epfEmployee: 0, socsoEis: 0 };
}
