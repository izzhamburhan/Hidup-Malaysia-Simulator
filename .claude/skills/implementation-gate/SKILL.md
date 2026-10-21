---
name: implementation-gate
description: Use when HIDUP MALAYSIA code edits are imminent, and also at Gate 1.5 to set up the workspace. Confirms the workspace, a green baseline, and the exact edit boundary before any file is changed.
---

# Implementation Gate

No file is edited until this gate passes. It has two parts: set up the workspace, then confirm readiness.

<HARD-GATE>
Do not edit code until the workspace is ready, the baseline is known, and the edit boundary
below is declared and accepted.
</HARD-GATE>

## Part 1: Workspace (Gate 1.5, before the first file is written)

1. Ask once per task, with the question tool, which workspace the developer wants. Default: **a branch in the current checkout**. Alternative: a worktree under `.worktrees/`, recommended when several agents work in parallel.
2. Pick the branch name from `playbook.md` §6 (`feat/<area>-<slug>`, `fix/<area>-<slug>`, `content/<slug>`, `docs/<slug>`, `chore/<slug>`). Base is `main`.
3. Branch: `git switch -c <branch> main`. A dirty checkout is a blocker; stop and ask, offering the worktree instead.
4. Worktree: `git worktree add .worktrees/<branch> -b <branch> main`, then `npm install` inside it. Work only inside that path.
5. Reuse an existing branch or worktree for the same task instead of creating a second one.
6. If the folder is not a git repository yet, do not run `git init` yourself; ask the developer.

## Part 2: Readiness (immediately before edits)

1. `git status --short` in the workspace is clean, or the dirt is the declared task. Report whether `main` has moved on.
2. Run the baseline from `playbook.md` §7 (`npm run typecheck`, `npm test`, `npm run build`, `npm run skills:check`). Report any failure that exists **before** your change; do not fix unrelated failures silently.
3. Declare the **edit boundary**: the exact files you will create or modify, and the files that must not change. Compare it with the approved plan.
4. Name the guards that apply to the boundary (`engine-contract-guard`, `save-compat-guard`, `content-guard`, `mobile-ui-guard`, `doc-drift`) and re-read them.

## Delegation

When the developer wants subagent-driven implementation, give each plan slice to
`hm-implementer` with the workspace path, the slice text, the acceptance criteria and the
guards, then have `hm-reviewer` review the slice before the next one starts.

## Output

Report: workspace path and branch, base state, baseline result, the edit boundary, and the
guards. Then start the first red test from the plan.

## Common mistakes

- Editing on `main` because "it is quick".
- Skipping the baseline, then being unable to tell which failures are new.
- Letting the boundary grow during implementation without updating the plan.
