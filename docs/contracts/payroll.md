# Payroll contract (simplified simulation)

Modules: `src/engine/payroll.ts` (pure functions) and `src/data/statutory.ts` (rates). The
monthly payroll run is in `src/engine/economy.ts` (`runPayroll`).

**This is a SIMPLIFIED SIMULATION for a game.** It approximates published Malaysian schedules
for Malaysian employees under 60. The official schedules use wage bands, rounding tables, and
rules that change. The game never presents a payslip as an official calculation, and nothing here
is tax or financial advice.

## Official sources

| Scheme | Body | Link |
| --- | --- | --- |
| EPF / KWSP | Kumpulan Wang Simpanan Pekerja | https://www.kwsp.gov.my/ |
| SOCSO and EIS | PERKESO | https://www.perkeso.gov.my/ |
| Income tax, PCB / MTD | LHDN (Inland Revenue Board) | https://www.hasil.gov.my/ |

The links live in the header of `src/data/statutory.ts` and are shown in the payslip view.

## What is simulated

| Item | Game rule |
| --- | --- |
| EPF employee | 11% of gross wage, rounded up to the next ringgit. |
| EPF employer | 13% for monthly wages up to RM5,000; 12% above. Rounded up to the next ringgit. |
| SOCSO | About 0.5% employee and 1.75% employer of wages up to the RM6,000 ceiling (simplified from the band table). |
| EIS | 0.2% employee and 0.2% employer of wages up to the RM6,000 ceiling. |
| PCB / MTD | Annualised estimate: (recurring monthly pay × 12) minus reliefs, taxed on resident progressive bands, divided by 12. One-off bonuses add the extra annual tax they cause in the month paid. Below RM10 a month, no PCB is deducted. |
| Reliefs | Individual RM9,000; EPF relief capped at RM4,000; SOCSO plus EIS relief capped at RM350. |
| Rebate | RM400 when chargeable income is RM35,000 or less. |
| Tax bands | Resident progressive bands in `statutory.tax.bands` (0% to 30%). |
| Interns and part-timers | No EPF in the game. Part-timers pay no SOCSO; interns and part-timers pay no EIS; only full-time staff have PCB. |
| Overtime | 1.5 × the hourly rate, where hourly rate = monthly salary / 26 / 8 (game rule applied to all roles). |
| Daily rate | Monthly salary / 26 (used for unpaid leave). |
| Tax year | `finance.taxYear` tracks gross, PCB paid, EPF and SOCSO/EIS. On 1 January the game computes the annual tax, stores the difference from PCB paid in `finance.pendingTaxSettlement` (refund or top-up), and schedules a simplified `tax-filing` event in early April to settle it. |
| EPF balance | Grows with both shares and a fictional annual dividend (`EPF_DIVIDEND_RATE`, a game rule). Never spendable cash. |
| Unit trust | `finance.unitTrust`: a fictional Seri Harapan fund (`UNIT_TRUST` in `src/data/lifestyle.ts`, a game rule, not real fund data). Deposit and withdraw actions move money between cash and the fund. On 1 January a dividend is reinvested; the rate is drawn from `state.rng` inside a modest range (`dividendMin` to `dividendMax`) and only when the balance is above zero. Never spendable cash until withdrawn. |

## Payslip

`computePayslip(input)` returns a `Payslip` (`types.ts`) with `simplified: true`. Every screen
that shows a payslip or a deduction shows `STATUTORY_DISCLAIMER`:

> Simplified simulation based on published KWSP, PERKESO and LHDN rates. Not an official payslip or tax calculation.

Copy never uses "official", "accurate", "exact", or advice wording about payroll or tax.

## Changing payroll

- Rates and thresholds change only in `src/data/statutory.ts`, with a source link and a note on what was simplified.
- Logic changes go in `payroll.ts` with Vitest tests at the boundaries: RM5,000 (EPF employer rate), RM6,000 (SOCSO/EIS ceiling), RM35,000 chargeable (rebate), each tax band edge, the RM10 PCB floor, and each schedule (full-time, part-time, intern).
- Follow `content-guard` and `engine-contract-guard`. `payroll_calculate` over MCP must return the same result as the engine.
