---
name: handoff-summary
description: Use when an AI-assisted task in the HIDUP MALAYSIA repo is ending, to produce the required honest handoff summary - what changed, tests and results, save compatibility, content honesty, risks, and what still needs the developer.
---

# Handoff Summary

Every AI-assisted task ends with a concise, honest summary. Use this shape.

## Cover

- **Summary.** The player-visible change in plain language, then the technical change.
- **Plan.** The path to `docs/plans/<slug>.md` (and `docs/specs/<slug>.md` if the developer asked for a spec), and where the result differs from the plan, so the developer can review both together.
- **Files changed.** Path and reason for each.
- **Tests.** Added or updated tests, the commands run, and pass, fail, or blocked for each. Include counts from the fresh run.
- **Verification evidence.** Typecheck, tests, build, skill parity, and the extra evidence for this kind of change (migration test, 360px check, data validation, autopilot numbers, stdio smoke call): which ran, which were skipped, and why.
- **Git status.** Branch or worktree, whether the work is committed, whether it is pushed, PR status, and any approval still needed from the developer.
- **Save compatibility.** `SAVE_VERSION` before and after, and what the migration does; or "shape unchanged".
- **Contracts.** Changes to the engine API, actions, events, catalogue types, or MCP tools; or "none".
- **Content and honesty.** New real names, fictional numbers, payroll or calorie text, humour; how each is labelled; or "no content change".
- **Docs and skills.** Which docs and skills were updated, or "none needed".
- **Risks and follow-ups.** Known risks (balance, edge cases, untested screens), or "none known".

## Rules

- Be specific. Do not hide failed or skipped validation; say what was skipped and why.
- Say plainly whether commit and push are pending the developer's approval.
- If someone else continues the work, give actionable notes: action ids, event ids, seeds that reproduce a case, MCP calls to try, known gaps.
- Balancing changes include the before and after numbers, not just "feels better".
