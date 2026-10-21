---
name: hidup-workflow
description: Use when starting any conversation or task in the HIDUP MALAYSIA repo, before responding, reading files, planning, reviewing, editing, or running commands. This is the mandatory entry skill that routes work through AGENTS.md, playbook.md, the lifecycle skills, and the repo guard skills.
---

# HIDUP MALAYSIA Workflow

Start every task here. Do not read code, answer questions, review diffs, edit files, or run
commands until you have classified the task and chosen the guardrails.

## Read first

1. Read `AGENTS.md`.
2. Read `playbook.md` for anything beyond a trivial typo, comment, or doc-wording change.
3. Run `git status --short` and `git branch --show-current` so you know the state of the checkout. If the folder is not a git repository yet, say so and carry on read-only until the developer decides.

## Classify the task

Put the prompt into one bucket (the same list as `playbook.md` §4):

- trivial doc, comment, or wording change
- question or clarification
- discovery or code inspection
- requirements, design, or planning
- review
- bug investigation or fix
- implementation or refactor
- content-only change (catalogue entries, event text, copy)
- balancing (numbers in catalogues or engine constants)
- handoff or delivery summary

If more than one applies, start with the earliest workflow stage. Only the trivial bucket may
shorten the flow, unless the developer explicitly names a gate to skip.

## Route to the lifecycle skill

For any non-trivial feature, bug, refactor, content or balancing change, the flow is **plan,
then implement**. Use the skill for the current gate (`playbook.md` §3):

| Gate | Stage | Skill |
| --- | --- | --- |
| 1 | Discovery (read-only, kept light) | `change-intake-discovery` |
| 2 | Plan: write `docs/plans/<slug>.md` with test-first slices and exact commands | `tdd-plan` |
| 3 | Implementation gate: workspace, green baseline, edit boundary compared with the plan | `implementation-gate` |
| 4 | Implementation: red, green, refactor, one slice at a time | the guards below |
| 5 | Fresh evidence before any "done" claim | `verification-review` |
| 6 | What happens to the changes | `completion-checkpoint` |
| 7 | End-of-task summary | `handoff-summary` |

Do not stop after the plan to wait for approval. The developer reviews the plan and the result
asynchronously, so carry on from Gate 2 to Gate 3 in the same turn. Two exceptions, both only
when the developer asks for them on a specific change:

- **A design spec.** Use `change-design-spec` to write `docs/specs/<slug>.md` before the plan. Never write a spec unprompted.
- **Plan approval.** Show the plan and wait for the developer's approval before Gate 3.

## Invoke the guards

| Trigger | Guard |
| --- | --- |
| Anything under `src/engine/`; `GameState`, an action, an event, or the public engine API | `engine-contract-guard` |
| The shape of `GameState`, `src/engine/save.ts`, migrations | `save-compat-guard` |
| Anything under `src/data/`; UI copy, humour, real names, politics, payroll or calorie claims | `content-guard` |
| Anything under `src/components/`, `src/screens/`, or `src/App.tsx` | `mobile-ui-guard` |
| Layout, rules, contracts, status, commands, or process | `doc-drift` |

A change often needs several guards: a new action touches the engine, its copy, and a screen.

## Role agents

Delegated work goes to a named role agent (`playbook.md` §11): `hm-scout` for read-only
discovery, `hm-implementer` for one planned slice, `hm-reviewer` for one diff. Give each a
self-contained brief. The session keeps every decision, question, and the final evidence.

## Commit and push gate

- Do not commit unless the developer asked for it or approved it.
- Do not push unless the developer asked for it or approved it.
- Before asking, report changed files, validation results, skipped checks, known risks, and the proposed commit message.
- If a git command fails inside an agent sandbox (lock file, permission error, network), retry that command once outside the sandbox. Never delete lock files or edit git config to work around it.

## Hard rules

- Do not skip discovery, the written plan, or verification for non-trivial work.
- Do not wait for plan approval unless the developer asked to approve this plan.
- Do not edit before the active gate allows edits.
- Keep facts in `AGENTS.md`, `playbook.md` and `docs/contracts/`; do not copy them into skills.

## Red flags: you are about to skip this entry point

| Thought | Reality |
| --- | --- |
| "This is just a question." | Questions about the code still need the right context and guard. |
| "I already know this repo." | The engine changes fast. Check the current state. |
| "It is only content, gates are overkill." | Content touches real names and honesty labels. Classify first and run `content-guard`. |
| "It is small, gates are overkill." | Classify first. Only the trivial bucket may shorten the flow. |
| "Skip the process, we are in a hurry." | Time pressure is not permission. Ask which gate the developer wants shortened. |
