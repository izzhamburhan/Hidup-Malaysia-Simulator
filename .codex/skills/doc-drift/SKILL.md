---
name: doc-drift
description: Use when HIDUP MALAYSIA code or behaviour diverges from CLAUDE.md, AGENTS.md, SKILLS.md, playbook.md or a contract in docs/contracts/, and after any change that alters layout, rules, contracts, status, commands, tech stack, or process. Keeps the docs and skills current.
---

# Doc Drift

Docs that disagree with the code mislead the developer and every agent. After a change, and
whenever you notice a mismatch, reconcile them.

## What to check

| If the change alters | Update |
| --- | --- |
| The public engine API, `ActionDef`, `GameEventDef`, `ActionFeedback` | `docs/contracts/engine-api.md`, `action-contract.md`, `event-contract.md` |
| The `GameState` shape, `SAVE_VERSION`, storage keys | `docs/contracts/save-format.md` (version history) |
| A catalogue file, its type, or its honesty label | `docs/contracts/data-catalogues.md` |
| Payroll rates, rules, or sources | `docs/contracts/payroll.md`, and the header of `src/data/statutory.ts` |
| An MCP tool, its arguments or result | `docs/contracts/mcp-hidup-sim.md`; `.mcp.json` if the command changed |
| Layout, commands, rules, data honesty, status | `CLAUDE.md` and `AGENTS.md` (they must say the same) |
| Process, gates, validation, agent roles | `playbook.md`, and the lifecycle skills that mention them |
| A skill added, renamed, or retargeted | `SKILLS.md`, the skills tables in `CLAUDE.md` and `AGENTS.md`, then `npm run skills:sync` and `npm run skills:check` |
| A role agent | `.claude/agents/`, and `playbook.md` §11 |

## Procedure

1. List the statements in the docs that the change makes untrue or incomplete.
2. Fix them in the same change, not a follow-up.
3. Keep facts in the handbooks and contracts. Skills point to them; they do not copy them.
4. Keep `CLAUDE.md` and `AGENTS.md` consistent: the same project, rules, commands, and status.
5. If a doc statement is wrong and you cannot tell which side is right, ask the developer.

## Common mistakes

- Updating `CLAUDE.md` but not `AGENTS.md`.
- Editing a `.codex/skills/` file by hand; it is regenerated from `.claude/skills/`.
- Changing a type in code but not the contract that describes it.
- Copying a command into several skills so they drift apart.
