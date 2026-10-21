---
name: change-intake-discovery
description: Use when starting a non-trivial HIDUP MALAYSIA change and the current behaviour, owning module, contracts, or risks are not yet established. Read-only discovery before any spec, plan, or edit.
---

# Change Intake and Discovery

Establish facts before proposing anything. This skill is read-only: no edits, no branches, no files.

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
9. **Open questions.** Only those the developer can resolve. Ask them one at a time with the question tool.

## Delegation

For wide searches, dispatch `hm-scout` agents in parallel (one per area: engine, data, UI,
tests) with self-contained briefs. They report facts with `path:line`; you draw the conclusions.

## Exit condition

Report the findings in chat as a short discovery note (owner, current behaviour, contracts,
save, content and UI impact, risks, open questions) and wait for the developer's go-ahead. Then
continue with `change-design-spec`, or `implementation-gate` if the developer says the change is
small enough to skip the spec and plan.

## Common mistakes

- Proposing a solution before the owner is known.
- Reading the screen but not the engine action behind it.
- Missing that a new field on `GameState` is a save-format change.
- Treating an assumption as a finding. Mark assumptions as assumptions.
