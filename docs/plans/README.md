# TDD plans

One test-first implementation plan per non-trivial change, written at Gate 3 with the `tdd-plan`
skill from an approved spec, and approved by the developer before any code is edited.

## Naming

`docs/plans/<slug>.md`, using the same `<slug>` as the spec in `docs/specs/<slug>.md` and the
branch name. For example, `docs/plans/overtime-action.md`.

## Contents

Ordered slices. Each slice names the files to touch, the interfaces it consumes and produces, the
failing Vitest test to write first with its command and expected red result, the minimal change
to turn it green, the refactor, and the validation for the slice. Include the extra evidence the
change needs (`playbook.md` §7): migration test, data validation, autopilot numbers, 360px check,
stdio smoke call. The `tdd-plan` skill has the full list.

Plans live on the branch with the change. Commit them only when the developer approves committing.
