---
name: tdd-plan
description: Use when HIDUP MALAYSIA discovery is done and a feature, bug fix, refactor, content, balancing, or test-only change needs a written test-first plan before editing. Writes docs/plans/<slug>.md, then continues to implementation without waiting for approval.
---

# TDD Implementation Plan

This is Gate 2 of `playbook.md`. Turn the developer's request and the discovery findings into a
written plan of small, independently testable, test-first slices. Do not edit production code
while writing the plan.

The flow is plan, then implement. Once the plan is written, carry straight on to
`implementation-gate`. Do not ask the developer to approve the plan and do not wait for a reply;
the developer reviews the plan and the result asynchronously.

## Required inputs

- The developer's request, and the discovery note from `change-intake-discovery`.
- The design spec in `docs/specs/<slug>.md`, only if the developer asked for one on this change.
- `CLAUDE.md`, `playbook.md` §7 (minimum validation and extra evidence) and §8 (Definition of Ready), and the existing tests for the area.

## Plan contents

Write `docs/plans/<slug>.md` (see `docs/plans/README.md`). Start with a short header that makes
the plan ready for implementation (`playbook.md` §8):

- **Goal and non-goals**, in a sentence or two each.
- **Acceptance criteria.** Numbered and testable. Include the unavailable case (with the reason text the player sees) and the boundary cases that apply (zero cash, stats at 0 or 100, last day of month, pending event).
- **Contract change.** Engine API, action, event, catalogue type, save, or MCP tool, and the `docs/contracts/` file it touches; or "none".
- **Save impact.** Whether the `GameState` shape changes, the new `SAVE_VERSION`, and what the migration fills in; or "shape unchanged".
- **Content impact.** Real names, fictional numbers, payroll or calorie claims, humour, and the label each carries; or "no content change".
- **UI impact.** Screens touched and what happens at 360px; or "no UI change".
- **Assumptions.** Anything you decided in place of an answer from the developer, so they can spot it when they review.

Then, for every slice, give:

1. exact files to create, modify, and test;
2. interfaces consumed and produced (function signatures, types, catalogue entries);
3. the failing test to write first, by file and test name;
4. the command and the expected red result, for example
   `npx vitest run tests/economy.test.ts -t "overdue debt"` failing on an assertion;
5. the minimal implementation to turn it green;
6. the refactor after green, if any;
7. validation commands for the slice and a review checkpoint.

Keep the plan proportionate. A content-only or balancing change can have a short header and one
or two slices.

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

Self-review the plan for coverage of the request (and of the spec, if there is one),
placeholders, signature consistency, and unbounded scope. Tell the developer in one or two lines
where the plan is and what it covers, then continue with `implementation-gate` in the same turn.

Wait for approval only when the developer asked to approve the plan on this change. In that
case, show the plan and stop until they reply.

If implementation later shows the plan was wrong, update the plan file so it matches what was
built, and say so in the handoff.

## Common mistakes

- Asking "shall I go ahead?" after writing the plan. Carry on unless the developer asked to approve it.
- Writing "add tests" without naming the test and its expected failure.
- Tests that call `Math.random` or depend on the wall clock.
- Slices that leave the suite red between steps.
- Forgetting the migration test, the stdio smoke call, or the 360px check.
- Leaving an assumption unstated, so the developer cannot spot it in review.
