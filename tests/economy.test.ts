import { describe, expect, it } from 'vitest';
import { monthlyCommitmentTotal, monthlyCommitments, processMonthStart, runPayroll } from '../src/engine/economy';
import { advanceTime } from '../src/engine/time';
import { addDebt, spend, totalDebt } from '../src/engine/core';
import { at, makeGame } from './helpers';

describe('economy', () => {
  it('lists rent, bills and loan repayments as monthly commitments', () => {
    const s = makeGame({ backgroundId: 'renter' });
    const ids = monthlyCommitments(s).map((c) => c.id);
    expect(ids).toContain('rent');
    expect(ids).toContain('phone');
    expect(ids.some((i) => i.startsWith('debt-'))).toBe(true);
  });

  it('charges commitments on the 1st of the month', () => {
    const s = makeGame({ backgroundId: 'renter' });
    s.finance.cash = 5000;
    const due = monthlyCommitmentTotal(s);
    at(s, 27, 23); // 31 Jan 2027, 11 PM
    advanceTime(s, 120);
    expect(s.clock.day).toBe(28); // 1 Feb
    expect(s.finance.cash).toBeLessThan(5000 - due + 1);
  });

  it('turns unpaid obligations into overdue debt instead of negative cash', () => {
    const s = makeGame({ backgroundId: 'renter' });
    s.finance.cash = 10;
    processMonthStart(s);
    expect(s.finance.cash).toBeGreaterThanOrEqual(0);
    expect(s.finance.debts.some((d) => d.kind === 'overdue')).toBe(true);
  });

  it('never lets voluntary spending go below zero', () => {
    const s = makeGame();
    s.finance.cash = 5;
    expect(() => spend(s, 10, 'gadget')).toThrow();
    expect(s.finance.cash).toBe(5);
  });

  it('pays salary on the last day of the month into cash and EPF separately', () => {
    const s = makeGame({ lifeStage: 'working', jobId: 'swe' });
    const cash0 = s.finance.cash;
    const epf0 = s.finance.epfBalance;
    runPayroll(s, 27);
    const slip = s.finance.payslips[0];
    expect(slip).toBeDefined();
    expect(s.finance.cash).toBeCloseTo(cash0 + slip.net, 2);
    expect(s.finance.epfBalance).toBeCloseTo(epf0 + slip.epfEmployee + slip.epfEmployer, 2);
    expect(s.finance.taxYear.pcbPaid).toBe(slip.pcb);
  });

  it('accrues interest and reduces loan balances with repayments', () => {
    const s = makeGame();
    s.finance.cash = 10000;
    addDebt(s, 'personal', 'Test loan', 1200, 100, 0.12);
    processMonthStart(s);
    const loan = s.finance.debts.find((d) => d.label === 'Test loan')!;
    expect(loan.balance).toBeCloseTo(1200 * 1.01 - 100, 1);
    expect(totalDebt(s)).toBeGreaterThan(0);
  });
});
