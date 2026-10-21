---
name: implementation-gate
description: Use when HIDUP MALAYSIA code edits are imminent, right after the plan is written (Gate 3). Sets up the workspace, confirms a green baseline, and declares the exact edit boundary, compared with the plan, before any file is changed.
---

# Implementation Gate

This is Gate 3 of `playbook.md`. It comes straight after the plan (`tdd-plan`, Gate 2). No file
other than the plan is edited until this gate passes. It has two parts: set up the workspace,
then confirm readiness.

<HARD-GATE>
Do not edit code until the workspace is ready, the baseline is known, and the edit boundary
below is declared and checked against the plan.
</HARD-GATE>

This gate does not wait for the developer to approve the plan. Wait only if the developer asked
to approve this plan; otherwise run the gate and start implementing.

## Part 1: Workspace

1. Use the workspace the developer asked for. If they did not say, use the default: **a branch in the current checkout**. A worktree under `.worktrees/` is the alternative, and is the better choice when several agents work in the same repo at once. Say which one you chose.
2. Pick the branch name from `playbook.md` §6 (`feat/<area>-<slug>`, `fix/<area>-<slug>`, `content/<slug>`, `docs/<slug>`, `chore/<slug>`). Base is `main`. Use the same `<slug>` as the plan.
3. Branch: `git switch -c <branch> main`. The plan file written at Gate 2 (and the spec, if one was requested) is untracked and comes along with you. Any other uncommitted change in the checkout is a blocker; stop and ask, offering a worktree instead.
4. Worktree: `git worktree add .worktrees/<branch> -b <branch> main`, then `npm install` inside it, and move the plan file (and spec, if any) into the worktree's `docs/`. Work only inside that path.
5. Reuse an existing branch or worktree for the same task instead of creating a second one.
6. If the folder is not a git repository yet, do not run `git init` yourself; ask the developer.

## Part 2: Readiness (immediately before edits)

1. `git status --short` in the workspace is clean apart from the plan (and spec), or the dirt is the declared task. Report whether `main` has moved on.
2. Run the baseline from `playbook.md` §7 (`npm run typecheck`, `npm test`, `npm run build`, `npm run skills:check`). Report any failure that exists **before** your change; do not fix unrelated failures silently.
3. Declare the **edit boundary**: the exact files you will create or modify, and the files that must not change. Compare it with the plan in `docs/plans/<slug>.md`. If they differ, update the plan first so the developer's asynchronous review sees the real scope.
4. Name the guards that apply to the boundary (`engine-contract-guard`, `save-compat-guard`, `content-guard`, `mobile-ui-guard`, `doc-drift`) and re-read them.

## Delegation

When the developer wants subagent-driven implementation, give each plan slice to
`hm-implementer` with the workspace path, the slice text, the acceptance criteria and the
guards, then have `hm-reviewer` review the slice before the next one starts.

## Output

Report: workspace path and branch, base state, baseline result, the edit boundary, and the
guards. Then start the first red test from the plan (Gate 4, Implementation).

## Common mistakes

- Editing on `main` because "it is quick".
- Skipping the baseline, then being unable to tell which failures are new.
- Stopping to ask for plan approval the developer did not ask for.
- Letting the boundary grow during implementation without updating the plan.
