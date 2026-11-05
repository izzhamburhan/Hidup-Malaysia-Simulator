# Plan: Hari Gaji payday planner (50/30/20 budgeting)

Branch: `feat/hari-gaji` (from `main`).

## Goal

Teach basic personal finance through play. When a salary (or a student's family allowance) lands,
the player splits it into **needs**, **wants** and **savings**, the way many Malaysians plan their
gaji. The savings share moves straight away ("pay yourself first"), filling the emergency fund
first, then savings. Over the pay cycle the game tracks spending on wants, warns at 80% and 100%,
and grades the cycle on the next payday. Good months build a streak with small mood rewards.

## Non-goals

- No separate wallets: needs and wants are tracked budgets, not locked pots (v1).
- No change to how bills, payroll, EPF or the routine savings sweep work.
- No blocking: an unplanned payday never stops the player or autopilot.
- Part-time shift pay and hustle income do not open the planner (no single payday).

## Acceptance criteria

1. On a full-time or intern payday (`runPayroll`) with net pay > 0, `finance.budget.pending` is set to `{ day, income: net, source: 'salary' }`, and a log line and highlight invite the player to plan.
2. A month-start family allowance does the same with `source: 'allowance'`.
3. `plan-budget` with param `N-W-S` (integers, multiples of 5, each 0 to 100, sum 100) and a pending payday:
   - moves `round(income × S%)` from cash, capped at cash, into the emergency fund until it reaches its target (3 × monthly commitments, at least RM1,500), and the rest into savings;
   - opens a cycle with the needs and wants budgets in RM and clears `pending`;
   - returns lines that explain what happened, plus a tip when needs < monthly commitments, savings < 10% or wants > 40%.
4. `plan-budget` is unavailable, with a reason, when nothing is pending ("No pay to plan yet. Your next gaji or allowance opens the planner.") or the split is invalid ("Needs, wants and savings must add up to 100%, in steps of 5."). The input state is never mutated.
5. `plan-budget` with the suffix `|auto` also turns on auto-plan, which is allowed only after 3 hand-made plans ("Plan 3 paydays by hand first."). With auto-plan on, the next payday applies the last split at once.
6. Spending on wants through actions is tracked: the `leisure`, `love` and `social` categories and the listed want actions count in full, and a meal counts only the part above RM12. Weddings do not count. When wants spending crosses 80% and then 100% of the wants budget, the action feedback says so, once each.
7. Withdrawing from savings, the emergency fund or the unit trust during a cycle adds to `dipped`.
8. On the next payday the open cycle is graded: A means wants ≤ budget and nothing dipped (with savings > 0); B means one of those; C means neither. A or B adds 1 to the streak; C resets it. A gives happiness +3 and stress −3, B gives +1 and −1, and C gives stress +2 with a gentle line. The result is kept in `history` (newest first, at most 6).
9. The `budget-auto` action with param `off` turns auto-plan off.
10. Achievements: `first-budget` (one plan made) and `cekap-bajet` (a streak of 3).
11. A v9 save migrates to v10 with an empty budget state. Cash never goes negative; the same seed and actions give the same state.
12. UI: a payday sheet opens on its own when a plan is pending, once no event or day report is showing, and "Later" dismisses it for that payday. It shows the pay with a count-up, preset cards, ± steppers per bucket, a live stacked bar, a bills marker inside needs, an emergency-fund meter and one tip. The Money tab shows a "Plan your gaji" card while pending and a cycle progress card while a cycle is open. EN and BM strings are added. Checked at 360px.

## Contract change

- New `GameState` field `finance.budget: BudgetState` (`docs/contracts/save-format.md`).
- New actions `plan-budget` and `budget-auto`, both dedicated (`docs/contracts/action-contract.md`).
- New pure helper `budgetView(state)` exported from `src/engine/budget.ts` (`docs/contracts/engine-api.md`).
- New catalogue `src/data/budget.ts` (`docs/contracts/data-catalogues.md`).

## Save impact

`SAVE_VERSION` goes from 9 to 10. Migration `9` adds `finance.budget = emptyBudget()`. The test migrates a v9 fixture.

## Content impact

- 50/30/20 is presented as a common rule of thumb, not financial advice.
- Thresholds (the RM12 basic meal, the emergency target) are game rules.
- Tips are original and friendly, with no real banks, funds or brands.
- The `data/budget.ts` header carries the disclaimer. `content-guard` applies.

## UI impact

- New `src/components/PaydaySheet.tsx` (bottom sheet via `Modal`), mounted in `GameShell`.
- Budget cards in `MoneyScreen`.
- i18n keys in EN and BM.
- 360px check.

## Assumptions (developer's "go with recommendations")

- Tracked budget, not locked pots.
- Manual planning for the first 3 paydays, then auto-plan is offered.
- Allowance paydays are included, because students are a big audience.
- The emergency fund is filled first, with a target of 3 months of commitments (at least RM1,500).
- Wants classification is by action category plus an id list in data. Event costs count as needs (surprises).

## Slices

### S1: Types, save v10, migration

- Files: `src/engine/types.ts` (`BudgetSplit`, `BudgetCycle`, `BudgetResult`, `BudgetState`, `Finance.budget`), `src/engine/budget.ts` (`emptyBudget`), `src/engine/newGame.ts` (v10, field), `src/engine/save.ts` (migration 9).
- Red: `tests/budget.test.ts` › "migrates a v9 save to v10 with an empty budget". Run `npx vitest run tests/budget.test.ts` and expect a failure on the version or the missing field.
- Green: add the migration. Then run `npx vitest run tests/save.test.ts`, which must stay green.

### S2: Data catalogue

- Files: `src/data/budget.ts`, which holds `BUDGET_PRESETS` (balanced 50/30/20, saver 50/20/30, tight 70/20/10, enjoy 50/45/5), `WANT_CATEGORIES`, `WANT_ACTIONS`, `NOT_WANT_ACTIONS`, `BASIC_MEAL_RM`, `EMERGENCY_MONTHS`, `EMERGENCY_MIN` and `BUDGET_TIPS`.
- Red: `tests/budget.test.ts` › "presets sum to 100 and want actions exist". Expect a failure on the missing module.
- Green: write the catalogue. `tests/content.test.ts` must stay green (emoji list).

### S3: Payday opens the planner

- Files: `src/engine/budget.ts` (`openPayday(state, income, source)`, `closeCycle`), `src/engine/economy.ts` (call it in `runPayroll` and the allowance branch).
- Red: "salary payday sets a pending plan" and "allowance sets a pending plan". Expect `pending` to be null.
- Green: implement `openPayday`, close any open cycle, and apply the plan at once when auto-plan is on.

### S4: The plan-budget and budget-auto actions

- Files: `src/engine/actions/ownershipActions.ts` (two dedicated actions), `src/engine/budget.ts` (`parseSplit`, `applyPlan`).
- Red tests:
  - "50-30-20 moves 20% into the emergency fund first"
  - "rejects a bad split with a reason, state unchanged"
  - "no pending gives the reason"
  - "auto needs 3 plans"
  - "auto-plan applies the last split next payday"
- Green: implement.

### S5: Wants tracking and grading

- Files: `src/engine/simulationEngine.ts` (`execute()`: spend delta from `def.run`, passed to `trackSpend`), `src/engine/budget.ts` (`trackSpend`, `gradeCycle`).
- Red tests:
  - "leisure spend counts as wants and warns at 80% and 100%"
  - "a meal counts only above RM12"
  - "withdraw adds to dipped"
  - "next payday grades A, B or C and updates the streak and history"
  - "determinism: same seed, same actions, same budget"
- Green: implement.

### S6: Achievements and view helper

- Files: `src/data/achievements.ts` (`first-budget`, `cekap-bajet`), `src/engine/budget.ts` (`budgetView`).
- Red: "achievements unlock" and "budgetView reports wants used and emergency-fund months".
- Green: implement. Then run `npx vitest run tests/data.test.ts tests/progression.test.ts`.

### S7: UI

- Files: `src/components/PaydaySheet.tsx`, `src/screens/GameShell.tsx`, `src/screens/MoneyScreen.tsx`, `src/i18n.ts`.
- Red: the `tests/i18n.test.ts` parity checks enforce the new keys.
- Green: build the UI. Manual check at 360px with `npm run dev`.

### S8: Docs and MCP smoke

- Update the contracts listed above.
- Update `CLAUDE.md` and `AGENTS.md`: status rows, action and achievement counts, `SAVE_VERSION` 10, the layout line for `budget.ts`, and test counts.
- MCP smoke: `sim_new_game`, then `sim_autopilot` for 35 days, then `sim_perform_action plan-budget 50-30-20`.

## Validation

Run `npm run check` (typecheck, test, build, skills:check). Record an autopilot balance comparison of cash, savings and emergency fund for a fresh grad over 60 days, with and without planning.

Scope boundary: no changes to payroll maths, events, bills, the routine sweep, the cloud save code or analytics.
## As built (differences from the slices above)

- `src/data/budget.ts` also has `BASIC_SNACK_RM` (RM4): snacks and drinks (`meal: false`) count as wants above RM4, meals above RM12.
- The stepper maths live in `src/components/paydaySplit.ts` (`stepSplit`, tested in `tests/budget.test.ts`); the Money tab card is its own component, `src/components/BudgetCard.tsx`.
- `tests/malaysiaMap.test.ts` no longer pins `SAVE_VERSION` to 9; it checks that the v8 save migrates to the current version.
- Contract notes: `action-contract.md` rule 14, `engine-api.md` "Hari Gaji payday planner", `data-catalogues.md` row, `save-format.md` rows 8 to 10 (8 and 9 were missing from the table).
- Autopilot balance (renter, SWE job, 180 days, seeds 42 and 7): wallet plus savings plus emergency fund ends at about RM21k with or without planning; 50/30/20 puts RM3.1k to RM3.6k in the emergency fund (target reached) and grades AAAAA (the routine buys no wants). Cash never negative.
