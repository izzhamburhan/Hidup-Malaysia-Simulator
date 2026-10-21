---
name: tdd-plan
description: Use when a HIDUP MALAYSIA design spec is approved and a feature, bug fix, refactor, content, balancing, or test-only change needs a test-first implementation plan before editing.
---

# TDD Implementation Plan

Convert the approved spec into small, independently testable, test-first slices. Do not edit
production code while writing the plan.

## Required inputs

- The approved spec in `docs/specs/<slug>.md`.
- `AGENTS.md`, `playbook.md` §7 (minimum validation and extra evidence), and the existing tests for the area.

## Plan contents

Write `docs/plans/<slug>.md` (see `docs/plans/README.md`). For every slice give:

1. exact files to create, modify, and test;
2. interfaces consumed and produced (function signatures, types, catalogue entries);
3. the failing test to write first, by file and test name;
4. the command and the expected red result, for example
   `npx vitest run tests/economy.test.ts -t "overdue debt"` failing on an assertion;
5. the minimal implementation to turn it green;
6. the refactor after green, if any;
7. validation commands for the slice and a review checkpoint.

## Slice order

Order slices so each leaves the suite green:

1. types and contracts (`src/engine/types.ts`, `docs/contracts/`);
2. save version and migration, with the migration test, when the shape changes;
3. data catalogues, with `tests/data.test.ts`;
4. engine logic through `core.ts` helpers, tested through `performAction` or `resolveEvent` with a fixed seed;
5. the public API and the MCP tool, with a stdio smoke step;
6. UI, with a manual 360px check step;
7. docs (`CLAUDE.md`, `AGENTS.md`, `SKILLS.md`, contracts).

## Tests to include

- Determinism: the same seed and the same actions give the same state.
- Bounds: cash never negative, stats within 0 to 100, EPF not spendable.
- Unavailable paths return a reason, and the input state is not mutated.
- Events: an always-available choice exists; follow-ups target scheduled events.
- Balancing: an autopilot comparison with the numbers recorded.

Include the global constraints: pure engine, time only through `advanceTime`, content in
`src/data/`, and the scope boundary (files that must not change).

## Exit condition

Self-review for spec coverage, placeholders, signature consistency, and unbounded scope. Get
explicit developer approval of the plan, then continue with `implementation-gate`.

## Common mistakes

- Writing "add tests" without naming the test and its expected failure.
- Tests that call `Math.random` or depend on the wall clock.
- Slices that leave the suite red between steps.
- Forgetting the migration test, the stdio smoke call, or the 360px check.
