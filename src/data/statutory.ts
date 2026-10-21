// Statutory payroll parameters used by the SIMPLIFIED payroll simulation.
//
// These approximate the published Malaysian schedules for Malaysian employees
// under 60 as understood at the time of writing. The official schedules use
// wage bands and rounding, and rules change. The game NEVER presents a payslip
// as an official calculation. Verify against the sources before relying on any
// number:
//   KWSP/EPF  https://www.kwsp.gov.my/
//   PERKESO   https://www.perkeso.gov.my/  (SOCSO and EIS)
//   LHDN      https://www.hasil.gov.my/    (income tax, PCB/MTD)

export const statutory = {
  epf: {
    employeeRate: 0.11,
    /** Employer share: 13% for monthly wages up to RM5,000, 12% above (simplified). */
    employerRateLow: 0.13,
    employerRateHigh: 0.12,
    employerThreshold: 5000,
    /** Interns and part-timers in the game are treated as not contributing (game rule). */
  },
  socso: {
    /** Approximate combined rates (Employment Injury + Invalidity), simplified from the band table. */
    employeeRate: 0.005,
    employerRate: 0.0175,
    wageCeiling: 6000,
  },
  eis: {
    employeeRate: 0.002,
    employerRate: 0.002,
    wageCeiling: 6000,
  },
  tax: {
    /** Resident individual progressive bands (chargeable income, RM) - simplified. */
    bands: [
      { upTo: 5000, rate: 0 },
      { upTo: 20000, rate: 0.01 },
      { upTo: 35000, rate: 0.03 },
      { upTo: 50000, rate: 0.06 },
      { upTo: 70000, rate: 0.11 },
      { upTo: 100000, rate: 0.19 },
      { upTo: 400000, rate: 0.25 },
      { upTo: 600000, rate: 0.26 },
      { upTo: 2000000, rate: 0.28 },
      { upTo: Infinity, rate: 0.3 },
    ],
    individualRelief: 9000,
    epfReliefCap: 4000,
    socsoEisReliefCap: 350,
    rebateThreshold: 35000,
    rebate: 400,
  },
  /** Overtime multiplier for normal-day overtime (game applies it to all roles). */
  overtimeMultiplier: 1.5,
  /** Working days per month used to derive a daily and hourly rate (game rule). */
  workingDaysPerMonth: 26,
} as const;

export const STATUTORY_DISCLAIMER =
  'Simplified simulation based on published KWSP, PERKESO and LHDN rates. Not an official payslip or tax calculation.';
