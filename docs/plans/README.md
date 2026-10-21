# TDD plans

One test-first implementation plan per non-trivial change, written at Gate 2 with the `tdd-plan`
skill, before any code is edited. The plan starts from the developer's request and the discovery
findings (and from the design spec, in the rare case the developer asked for one).

The flow is plan, then implement. The agent writes the plan and carries on to the implementation
gate without waiting for approval; the developer reviews the plan and the result asynchronously.
The agent waits for approval only when the developer asked to approve the plan on that change.

## Naming

`docs/plans/<slug>.md`, using the same `<slug>` as the branch name (and as the spec in
`docs/specs/<slug>.md`, if there is one). For example, `docs/plans/overtime-action.md`.

## Contents

A short header first: goal and non-goals, numbered testable acceptance criteria, contract change,
save impact, content impact, UI impact, and any assumptions made in place of answers from the
developer. Then ordered slices. Each slice names the files to touch, the interfaces it consumes
and produces, the failing Vitest test to write first with its command and expected red result,
the minimal change to turn it green, the refactor, and the validation for the slice. Include the
extra evidence the change needs (`playbook.md` §7): migration test, data validation, autopilot
numbers, 360px check, stdio smoke call. The `tdd-plan` skill has the full list.

If implementation shows the plan was wrong, update the plan so it matches what was built.

Plans live on the branch with the change. Like the code, they are committed only when the
developer asks for or approves a commit.
