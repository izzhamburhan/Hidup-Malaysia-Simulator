import { describe, expect, it } from 'vitest';
import { annualTax, chargeableIncome, computePayslip, eisContributions, epfContributions, estimatePcb, progressiveTax, socsoContributions } from '../src/engine/payroll';

describe('payroll (simplified simulation)', () => {
  it('uses 11% employee EPF and 13%/12% employer EPF around the RM5,000 threshold', () => {
    expect(epfContributions(4000, 'fulltime')).toEqual({ employee: 440, employer: 520 });
    expect(epfContributions(5000, 'fulltime')).toEqual({ employee: 550, employer: 650 });
    expect(epfContributions(6000, 'fulltime')).toEqual({ employee: 660, employer: 720 });
  });

  it('rounds EPF up to the next ringgit and skips interns / part-timers', () => {
    expect(epfContributions(3333, 'fulltime').employee).toBe(367);
    expect(epfContributions(1200, 'intern')).toEqual({ employee: 0, employer: 0 });
    expect(epfContributions(1200, 'parttime')).toEqual({ employee: 0, employer: 0 });
  });

  it('caps SOCSO and EIS at the RM6,000 wage ceiling', () => {
    expect(socsoContributions(10000, 'fulltime')).toEqual(socsoContributions(6000, 'fulltime'));
    expect(eisContributions(10000, 'fulltime')).toEqual({ employee: 12, employer: 12 });
    expect(socsoContributions(4000, 'fulltime')).toEqual({ employee: 20, employer: 70 });
  });

  it('applies progressive bands', () => {
    expect(progressiveTax(5000)).toBe(0);
    expect(progressiveTax(20000)).toBe(150);
    expect(progressiveTax(35000)).toBe(600);
    expect(progressiveTax(50000)).toBe(1500);
  });

  it('applies reliefs and the RM400 rebate for low chargeable income', () => {
    const input = { grossIncome: 36000, epfEmployee: 3960, socsoEis: 300 };
    expect(chargeableIncome(input)).toBe(36000 - 9000 - 3960 - 300);
    expect(annualTax(input)).toBe(0); // 22,740 chargeable -> RM232 tax - RM400 rebate
    expect(annualTax({ grossIncome: 90000, epfEmployee: 9900, socsoEis: 350 })).toBeGreaterThan(4000);
  });

  it('builds a consistent payslip where net = gross - employee deductions', () => {
    const slip = computePayslip({ month: '2027-01', employer: 'Test', schedule: 'fulltime', basic: 5000, overtime: 200 });
    expect(slip.gross).toBe(5200);
    expect(slip.net).toBeCloseTo(slip.gross - slip.epfEmployee - slip.socsoEmployee - slip.eisEmployee - slip.pcb, 2);
    expect(slip.epfEmployer).toBeGreaterThan(0);
    expect(slip.simplified).toBe(true);
  });

  it('deducts no PCB on low salaries and more PCB with a bonus', () => {
    expect(estimatePcb(2500, 275, 15)).toBe(0);
    const normal = estimatePcb(7000, 770, 49);
    const withBonus = estimatePcb(7000, 770, 49, 14000);
    expect(withBonus).toBeGreaterThan(normal);
  });

  it('subtracts unpaid leave from gross', () => {
    const slip = computePayslip({ month: 'x', employer: 'x', schedule: 'fulltime', basic: 2600, unpaidLeave: 100 });
    expect(slip.gross).toBe(2500);
  });
});
