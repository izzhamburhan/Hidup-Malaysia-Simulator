# Design specs

One design spec per non-trivial change, written at Gate 2 with the `change-design-spec` skill
and approved by the developer before the TDD plan is written.

## Naming

`docs/specs/<slug>.md`, where `<slug>` is short, lowercase and hyphenated, and matches the branch
slug and the plan file. For example, branch `feat/engine-overtime-action` has
`docs/specs/overtime-action.md` and `docs/plans/overtime-action.md`.

## Contents

Goal and non-goals; numbered, testable acceptance criteria; contract changes; game rules and
numbers (fictional estimates); save impact (`SAVE_VERSION` and migration); content and honesty
labels; UI at 360px; balance; alternatives considered; rollout. The `change-design-spec` skill has
the full list.

Specs live on the branch with the change. Commit them only when the developer approves committing.
