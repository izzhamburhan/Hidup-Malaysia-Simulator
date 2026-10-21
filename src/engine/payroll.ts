// Simplified Malaysian payroll simulation: EPF/KWSP, SOCSO/PERKESO, EIS/SIP and
// an annualised PCB/MTD estimate. Pure functions; parameters live in
// data/statutory.ts. Never presented as an official calculation.

import { statutory } from '../data/statutory';
import { round2 } from './core';
import type { JobSchedule, Payslip } from './types';

export interface PayInput {
  month: string;
  employer: string;
  schedule: JobSchedule;
  basic: number;
  overtime?: number;
  bonus?: number;
  allowance?: number;
  unpaidLeave?: number;
}

export function epfContributions(wage: number, schedule: JobSchedule): { employee: number; employer: number } {
  // Interns and part-timers are treated as non-contributing in the game.
  if (schedule !== 'fulltime' || wage <= 0) return { employee: 0, employer: 0 };
  const e = statutory.epf;
  const employerRate = wage <= e.employerThreshold ? e.employerRateLow : e.employerRateHigh;
  // The official schedule rounds contributions up to the next ringgit.
  return { employee: Math.ceil(wage * e.employeeRate), employer: Math.ceil(wage * employerRate) };
}

export function socsoContributions(wage: number, schedule: JobSchedule): { employee: number; employer: number } {
  if (schedule === 'parttime' || wage <= 0) return { employee: 0, employer: 0 };
  const s = statutory.socso;
  const insured = Math.min(wage, s.wageCeiling);
  return { employee: round2(insured * s.employeeRate), employer: round2(insured * s.employerRate) };
}

export function eisContributions(wage: number, schedule: JobSchedule): { employee: number; employer: number } {
  if (schedule !== 'fulltime' || wage <= 0) return { employee: 0, employer: 0 };
  const s = statutory.eis;
  const insured = Math.min(wage, s.wageCeiling);
  return { employee: round2(insured * s.employeeRate), employer: round2(insured * s.employerRate) };
}

/** Progressive tax on annual chargeable income, before rebates. */
export function progressiveTax(chargeable: number): number {
  let remaining = Math.max(0, chargeable);
  let lower = 0;
  let tax = 0;
  for (const band of statutory.tax.bands) {
    const width = band.upTo - lower;
    const taxable = Math.min(remaining, width);
    tax += taxable * band.rate;
    remaining -= taxable;
    lower = band.upTo;
    if (remaining <= 0) break;
  }
  return round2(tax);
}

export interface AnnualTaxInput {
  grossIncome: number;
  epfEmployee: number;
  socsoEis: number;
  extraRelief?: number;
}

export function chargeableIncome(input: AnnualTaxInput): number {
  const t = statutory.tax;
  const relief =
    t.individualRelief +
    Math.min(input.epfEmployee, t.epfReliefCap) +
    Math.min(input.socsoEis, t.socsoEisReliefCap) +
    (input.extraRelief ?? 0);
  return Math.max(0, round2(input.grossIncome - relief));
}

export function annualTax(input: AnnualTaxInput): number {
  const chargeable = chargeableIncome(input);
  let tax = progressiveTax(chargeable);
  if (chargeable <= statutory.tax.rebateThreshold) tax = Math.max(0, tax - statutory.tax.rebate);
  return round2(tax);
}

/** Monthly PCB estimate: annualise this month's recurring pay and divide by 12. */
export function estimatePcb(monthlyRecurring: number, epfEmployeeMonthly: number, socsoEisMonthly: number, oneOff = 0): number {
  const base = annualTax({
    grossIncome: monthlyRecurring * 12,
    epfEmployee: epfEmployeeMonthly * 12,
    socsoEis: socsoEisMonthly * 12,
  });
  let pcb = base / 12;
  if (oneOff > 0) {
    const withBonus = annualTax({
      grossIncome: monthlyRecurring * 12 + oneOff,
      epfEmployee: epfEmployeeMonthly * 12,
      socsoEis: socsoEisMonthly * 12,
    });
    pcb += withBonus - base;
  }
  // PCB below RM10 is not deducted in practice; the game mirrors that simplification.
  return pcb < 10 ? 0 : round2(pcb);
}

export function computePayslip(input: PayInput): Payslip {
  const overtime = round2(input.overtime ?? 0);
  const bonus = round2(input.bonus ?? 0);
  const allowance = round2(input.allowance ?? 0);
  const unpaidLeave = round2(input.unpaidLeave ?? 0);
  const basic = round2(input.basic);
  const gross = round2(Math.max(0, basic + overtime + bonus + allowance - unpaidLeave));
  const recurring = Math.max(0, basic + overtime + allowance - unpaidLeave);

  const epf = epfContributions(gross, input.schedule);
  const socso = socsoContributions(recurring, input.schedule);
  const eis = eisContributions(recurring, input.schedule);
  const recurringEpf = epfContributions(recurring, input.schedule).employee;
  const pcb = input.schedule === 'fulltime' ? estimatePcb(recurring, recurringEpf, socso.employee + eis.employee, bonus) : 0;

  const net = round2(gross - epf.employee - socso.employee - eis.employee - pcb);
  return {
    month: input.month,
    employer: input.employer,
    gross,
    basic,
    overtime,
    bonus,
    allowance,
    unpaidLeave,
    epfEmployee: epf.employee,
    socsoEmployee: socso.employee,
    eisEmployee: eis.employee,
    pcb,
    zakatOrOther: 0,
    net,
    epfEmployer: epf.employer,
    socsoEmployer: socso.employer,
    eisEmployer: eis.employer,
    simplified: true,
  };
}

/** Hourly rate used for overtime (game rule: monthly / 26 days / 8 hours). */
export function hourlyRate(monthlySalary: number): number {
  return round2(monthlySalary / statutory.workingDaysPerMonth / 8);
}

export function dailyRate(monthlySalary: number): number {
  return round2(monthlySalary / statutory.workingDaysPerMonth);
}
