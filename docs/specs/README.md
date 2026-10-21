# Design specs

Design specs are **optional**. A spec is written only when the developer explicitly asks for one
on a change, using the `change-design-spec` skill. It is not one of the gates in `playbook.md`
§3; without a request, the decisions go straight into the plan in `docs/plans/<slug>.md`, so most
changes have no spec at all.

When a spec is requested, it is written after discovery and before the plan, and the plan is then
built from it. Asking for a spec does not, on its own, mean the developer wants to approve it
before work continues; the agent waits only if the developer asked to approve it.

## Naming

`docs/specs/<slug>.md`, where `<slug>` is short, lowercase and hyphenated, and matches the branch
slug and the plan file. For example, branch `feat/engine-overtime-action` has
`docs/plans/overtime-action.md` and, if a spec was requested, `docs/specs/overtime-action.md`.

## Contents

Goal and non-goals; numbered, testable acceptance criteria; contract changes; game rules and
numbers (fictional estimates); save impact (`SAVE_VERSION` and migration); content and honesty
labels; UI at 360px; balance; alternatives considered; rollout. The `change-design-spec` skill has
the full list.

Specs live on the branch with the change. Like the code, they are committed only when the
developer asks for or approves a commit.
