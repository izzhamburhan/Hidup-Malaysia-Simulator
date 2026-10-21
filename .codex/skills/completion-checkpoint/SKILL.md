---
name: completion-checkpoint
description: Use when HIDUP MALAYSIA work is finished and verified and the next step is deciding what happens to the changes - commit, push, open a pull request, or leave them. Replaces any generic finish-the-branch menu.
---

# Completion Checkpoint

This is Gate 6 of `playbook.md`. It decides what happens to verified changes, and it is the
only completion menu to use. Do not show a generic "merge locally / create PR / keep / discard" menu.

<HARD-GATE>
Do not commit, push, or open a pull request until the developer has picked an option below.
</HARD-GATE>

The plan-then-implement flow removes the wait for plan approval, not this one: commit and push
still happen only when the developer asked for them or approved them. If the developer already
asked for a specific option earlier in the task (for example "commit and open a PR when done"),
that request is their pick; confirm it in one line and carry it out instead of showing the menu.

## Before the menu

1. **Verification is green.** `verification-review` passed in this session. If not, report the failures and stop; no menu until it is green.
2. **Read the real names:** `git branch --show-current`, the target branch (`main` unless the task says otherwise), and `git status --short`.
3. **Draft the commit message** in Conventional Commits style with the area as scope, for example `feat(engine): add overtime action` or `content(events): add pasar malam event`. Match `git log --oneline -n 20`.

## The menu

Present exactly these four options with the real names filled in, then wait. Use the question
tool when the platform has one (`AskUserQuestion` in Claude Code); otherwise print it and wait.

```text
Implementation complete and verified. What would you like to do next?

1. Commit <branch> locally only (no push yet)
2. Commit and push <branch> to origin (no PR yet)
3. Commit, push, and open a pull request from <branch> against <target-branch>
4. Leave uncommitted / as-is, I will handle it later
```

## After the answer

- **1:** stage the specific files in the edit boundary (never `git add -A` blindly), commit with the drafted message, report the commit hash.
- **2:** do 1, then `git push -u origin <branch>`. Never force-push.
- **3:** do 2, then `gh pr create --base <target> --title "<commit subject>"` with a body following `.github/pull_request_template.md`. Print the PR URL.
- **4:** change nothing. Remind the developer which files are modified.

Never commit `node_modules/`, `dist/`, `.env` files, `*.tsbuildinfo`, `.worktrees/` or other
ignored or generated files. If a git command fails inside an agent sandbox, retry once outside
it; do not delete lock files.

Finish with `handoff-summary` (Gate 7).
