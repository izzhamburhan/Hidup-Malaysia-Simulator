---
name: change-intake-discovery
description: Use when starting a non-trivial HIDUP MALAYSIA change and the current behaviour, owning module, contracts, or risks are not yet established. Light, read-only discovery before the plan or any edit.
---

# Change Intake and Discovery

This is Gate 1 of `playbook.md`. Establish facts before proposing anything. This skill is
read-only: no edits, no branches, no files.

Keep it light. Read enough to write a sound plan: the owner, the current behaviour, and the
contracts and guards involved. Do not survey the whole codebase, and scale the depth to the
size of the change; a one-entry content change needs a few minutes, not a report.

## Required inputs

- `CLAUDE.md` and `playbook.md`.
- The contracts in `docs/contracts/` the request could touch.
- `src/engine/types.ts` and `src/engine/simulationEngine.ts`, then the engine modules involved.
- The catalogues in `src/data/` involved, including their header comments.
- Existing tests for the area in `tests/`.

## Establish

1. **Request, restated.** One or two sentences in your own words.
2. **Owner.** Which engine module, catalogue, screen, or the MCP server owns this. Gameplay rules belong in the engine; content belongs in `src/data/`; the UI only displays and calls the engine. If it fits none, say so.
3. **Current behaviour.** What the code does today, with `path:line` references. A seeded Vitest run or a `hidup-sim` MCP call (`sim_new_game`, `sim_perform_action`, `sim_autopilot`) is a good read-only way to observe behaviour.
4. **Contracts touched.** Engine API, `ActionDef`, `GameEventDef`, `GameState` fields, catalogue types, MCP tools. Name the contract file for each.
5. **Save impact.** Would the `GameState` shape change? If yes, `save-compat-guard` applies.
6. **Content impact.** Real names, fictional numbers, payroll or calorie claims, humour, politics. If any, `content-guard` applies.
7. **UI impact.** Which screens change, and whether a major decision needs a confirmation.
8. **Risks.** Determinism, negative cash, stats out of range, time moving outside `advanceTime`, events that can trap the player, balance drift.
9. **Open questions.** Only those the developer can resolve. Ask a question only when it genuinely blocks the plan (you cannot pick a sensible default). Otherwise choose the most reasonable answer, mark it as an assumption, and carry it into the plan, where the developer will see it.

## Delegation

For wide searches, dispatch `hm-scout` agents in parallel (one per area: engine, data, UI,
tests) with self-contained briefs. They report facts with `path:line`; you draw the conclusions.

## Exit condition

Summarise the findings in chat as a short discovery note (owner, current behaviour, contracts,
save, content and UI impact, risks, assumptions). Do not wait for a go-ahead: continue straight
to `tdd-plan`, which turns these findings and the developer's request into the plan.

Only if the developer explicitly asked for a design spec on this change, write it first with
`change-design-spec`, then continue to `tdd-plan`. If the developer explicitly said the change
needs no plan file, go to `implementation-gate` instead.

## Common mistakes

- Proposing a solution before the owner is known.
- Reading the screen but not the engine action behind it.
- Missing that a new field on `GameState` is a save-format change.
- Treating an assumption as a finding. Mark assumptions as assumptions.
