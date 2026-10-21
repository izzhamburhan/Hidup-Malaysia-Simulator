# HIDUP MALAYSIA AI-First TDD Playbook

Owner: Izzham Burhan, TMRND. Applies to every change in this repo, by a human or an AI agent.
The root handbook is `CLAUDE.md` (Claude Code) or `AGENTS.md` (Codex and others). This
playbook is the process; the handbook is the facts (layout, rules, commands, data honesty).

## 1. Purpose

One developer and several AI agents build a life simulator whose rules are subtle (money,
time, payroll, events) and whose content touches real Malaysian names and culture. The
process exists so that:

- the engine stays pure, deterministic, and the single owner of every gameplay rule;
- players' saves keep working across versions;
- content stays honest (fictional estimates labelled, payroll simplified and labelled) and kind;
- the game works on a 360px phone screen;
- AI-written code is test-first, verified with fresh evidence, and reviewed by a person.

## 2. Core principle

Write the test first, make the smallest change that passes, then prove it with fresh
command output. No claim of "done" without evidence from this session.

## 3. The gates

Every non-trivial change passes these gates in order. Each gate has a skill, except
Implementation, which runs under the guard skills. The flow is
**plan, then implement**: the agent writes the plan and carries straight on to implementation.
It does not stop to wait for the developer to approve the plan; the developer reviews the plan
and the result asynchronously.

| Gate | What happens | Skill |
| --- | --- | --- |
| 0. Route | Classify the task and pick the guards | `hidup-workflow` |
| 1. Discovery | Read-only and kept light: owning module, current behaviour, contracts, risks | `change-intake-discovery` |
| 2. Plan | Write `docs/plans/<slug>.md`: acceptance criteria, impact, and test-first slices with exact commands. No approval wait | `tdd-plan` |
| 3. Implementation gate | Set up the workspace, confirm a green baseline, and declare the edit boundary, compared with the plan | `implementation-gate` |
| 4. Implementation | Red, green, refactor, one slice at a time | guards below |
| 5. Verification | Fresh typecheck, tests, build, skill parity, plus extra evidence | `verification-review` |
| 6. Completion | Commit, push, PR, or leave; commit and push only when the developer asked or approved | `completion-checkpoint` |
| 7. Handoff | Honest end-of-task summary | `handoff-summary` |

A design spec is not a gate. The agent writes one (`docs/specs/<slug>.md`, with the
`change-design-spec` skill) only when the developer explicitly asks for a spec on a change. The
developer can also ask to approve the plan before implementation starts on a specific change;
when they do, the agent shows the plan and waits for that approval. Without such a request, the
agent does not wait.

Guards, used whenever their trigger applies:

- `engine-contract-guard`: any change under `src/engine/`, or to `GameState`, an action, an event, or the public engine API.
- `save-compat-guard`: any change to the shape of `GameState`, to `src/engine/save.ts`, or to migrations.
- `content-guard`: any change under `src/data/`, UI copy, humour, real-world names, politics, or payroll and calorie claims.
- `mobile-ui-guard`: any change under `src/components/`, `src/screens/`, or `src/App.tsx`.
- `doc-drift`: any change that alters layout, rules, contracts, status, commands, or this process.

### Red flags: you are about to violate a gate

| Thought | Reality |
| --- | --- |
| "It is small, I will just edit." | Only a typo, comment or doc-wording change may skip gates. Everything else is classified first. |
| "I know this code already." | Re-read it in this session. The engine changes fast. |
| "The tests will pass, I will skip the run." | Claims need fresh output from this session. |
| "The plan is obvious, I will go straight to code." | Every non-trivial change gets a written plan in `docs/plans/<slug>.md` first. It is what the developer reviews afterwards. |
| "I should wait for the developer to approve the plan." | Write the plan and carry on. The developer reviews it asynchronously, unless they asked to approve this particular plan first. |
| "I will write a design spec to be safe." | A spec is written only when the developer asks for one. Put the decisions in the plan. |
| "I will fix the test to match my change." | Changing a test to go green hides a regression. Change a test only when the contract change is stated in the plan. |
| "I'll call `Math.random()` just this once." | It breaks determinism, replays, autopilot balancing and every seeded test. Use `rng.ts` with `state.rng`. |
| "I'll bump `state.clock.minute` directly, it is only five minutes." | Time moves only through `advanceTime`, or day-end processing, needs and bills are skipped. |
| "The button can just set `state.finance.cash`." | The UI never mutates `GameState`. Add or change an action and go through `performAction`. |
| "I'll put this event text in the component." | Content is data. It goes in `src/data/events.ts` (or the right catalogue). |
| "I'll change the save shape without a migration." | Every player's save breaks. Bump `SAVE_VERSION`, add a migration and a migration test. |
| "I'll use a real salary figure as fact." | Numbers are FICTIONAL GAME ESTIMATES, labelled so. Never present them as market data. |
| "The payslip looks official enough." | Payroll is a SIMPLIFIED SIMULATION. Show the disclaimer and the official source links. |
| "A joke about that politician would be funny." | Politics only through fictional parties and politicians in Seri Harapan. No real people, no stereotypes. |
| "Let cash go a bit negative, it is simpler." | Cash is never negative. Obligations create overdue debt; voluntary spending checks `canAfford`. |
| "It looks fine on my desktop." | Check at 360px width. The game is mobile-first. |

## 4. Task buckets

Classify before acting. If more than one applies, start at the earliest stage.

- trivial doc, comment or wording change (the only bucket that may shorten the flow)
- question or clarification
- discovery or code inspection
- requirements, design or planning
- review
- bug investigation or fix
- implementation or refactor
- content-only change (catalogue entries, event text, copy)
- balancing (numbers in catalogues or engine constants)
- handoff or delivery summary

Content-only and balancing changes still pass the gates, but the plan can be short: the list
of entries or numbers, the honesty labels, and the tests that prove the catalogue is valid
(and, for balancing, an autopilot run before and after). The developer may explicitly shorten a
named gate ("no plan file needed, it is one new food"). Never assume it.

## 5. Context to read before any change

1. `CLAUDE.md` or `AGENTS.md`.
2. This playbook, for anything beyond a trivial change.
3. The contracts in `docs/contracts/` that the change touches.
4. The engine modules involved, starting from `src/engine/simulationEngine.ts` and `src/engine/types.ts`.
5. The catalogues in `src/data/` involved, with their header comments (honesty labels).
6. Existing tests for the area in `tests/`.

## 6. Git and branches

- Base branch: `main`. Work happens on a branch, never directly on `main`.
- Branch names: `feat/<area>-<slug>`, `fix/<area>-<slug>`, `content/<slug>` (content-only), `docs/<slug>`, `chore/<slug>`. Areas: `engine`, `save`, `data`, `ui`, `mcp`, `payroll`, `events`, `career`, `education`, `social`, `living`, `economy`.
- Commits: Conventional Commits with the area as scope, for example `feat(engine): add overtime action`, `fix(save): migrate v1 hustles`, `content(events): add Seri Harapan pasar malam`, `docs(contracts): clarify event follow-ups`. Do not commit or push unless the developer asked or approved.
- Worktrees are optional: `git worktree add .worktrees/<branch> -b <branch> main` gives a separate checkout when several agents work in parallel (`.worktrees/` is gitignored). Run `npm install` inside a new worktree.
- Pull requests: open with `gh pr create`; the body follows `.github/pull_request_template.md`.
- If a git command fails inside an agent sandbox (lock file, permission, network), retry once outside the sandbox; never delete lock files or edit git config to work around it.
- Plan files live in the branch: `docs/plans/<slug>.md`. A design spec, `docs/specs/<slug>.md`, exists only when the developer asked for one, and lives in the branch too. Both are committed with the change, under the same commit rules as the code.

## 7. Minimum validation

Run from the repo root (or the worktree). All must pass before a completion claim.

```bash
npm run typecheck
npm test
npm run build
npm run skills:check
```

`npm run check` runs all four. Plus, when relevant:

| Change | Extra evidence |
| --- | --- |
| Engine change (`src/engine/`) | A new or updated Vitest test that failed first; a determinism check (same seed, same result) when randomness or ordering is involved |
| `GameState` shape change | `SAVE_VERSION` bumped; a migration test that loads a fixture of the previous version |
| UI change | Run `npm run dev` and check the screen at 360px width: layout, bottom nav, no dead buttons, confirmations for major decisions |
| Content change (`src/data/`) | The data validation tests (`tests/data.test.ts`, `tests/events.test.ts`) pass (unique ids, references resolve, honesty labels present) |
| Balancing change | An autopilot run (`runAutopilot` in a test, or `sim_autopilot` over MCP) before and after, with the numbers in the handoff |
| MCP change (`mcp/hidup-sim/`) | A real stdio smoke call: start `npm run mcp`, list tools, call the changed tool |
| Skill change | `npm run skills:sync`, then `npm run skills:check` |

## 8. Definition of Ready

A change is ready for the implementation gate when its plan in `docs/plans/<slug>.md` covers
the following. Nobody needs to sign the plan off first; the developer reviews it alongside the
result.

- The owning module or catalogue is named.
- Acceptance criteria are written and testable.
- The contract change (engine API, action, event, save, catalogue type, MCP tool) is stated, or "none".
- Save impact is known: does the `GameState` shape change, and what does the migration do?
- Content impact is known: which real names, numbers, humour or claims are involved, and how they are labelled.
- UI impact is known: which screens, and what happens at 360px.
- Assumptions made in place of answers from the developer are written down.
- The test-first slices name their failing tests and exact commands.

## 9. Definition of Done

- The plan in `docs/plans/<slug>.md` matches what was built, or explains where it differs.
- A failing test was written first and seen failing.
- Typecheck, tests, build and skill parity pass, shown with fresh output.
- The extra evidence from §7 for this kind of change is in the handoff.
- The engine stays pure and deterministic; time moves only through `advanceTime`; the UI does not mutate state.
- Any `GameState` shape change has a version bump, a migration and a migration test.
- Content is in `src/data/`, labelled honestly, and passes `content-guard`.
- UI works at 360px with no dead buttons.
- Contracts in `docs/contracts/`, `CLAUDE.md`, `AGENTS.md` and `SKILLS.md` are current.
- The developer chose the completion option and received the handoff summary.

## 10. Review checklist

- Does the diff match the plan (and the spec, if the developer asked for one), no more and no less? Where it differs, does the plan say why?
- Does every new engine behaviour have a test (happy path, unavailable case with its reason, boundary)?
- Any `Math.random`, `Date.now`, argument-less `new Date()`, React or DOM import in `src/engine/`?
- Does anything write `state.clock` outside `advanceTime`, or mutate `GameState` outside the engine?
- Can cash go negative, a stat leave 0 to 100, or EPF be spent?
- Did the `GameState` shape change? If yes: version bump, migration, migration test.
- Is content in catalogues, labelled (real name / fictional estimate / simulated), kind, and free of real political figures and stereotypes?
- Do new actions explain unavailability, and do major decisions confirm with the financial consequence?
- Does every new event have an always-available choice, and do follow-ups target scheduled events?
- Does the UI work at 360px with the bottom nav, readable contrast, and no dead buttons?
- Are docs, contracts and skills in sync with the code?

## 11. Agent roles

The session the developer starts is the **orchestrator**. It runs every gate, asks the
developer every question, writes the plan (and a spec when the developer asks for one), runs
the final verification, and holds commit and push approval. Work that needs no such judgment
can go to a **role agent**:

| Role | Agent | Model | Used for |
| --- | --- | --- | --- |
| Orchestrator | the session | the session's model | Gates, questions, decisions, plan (and spec on request), final evidence, completion menu, handoff |
| Scout | `hm-scout` | haiku | Read-only discovery: find code, contracts, catalogue entries, tests, call sites; one scout per area, in parallel |
| Implementer | `hm-implementer` | sonnet | One TDD plan slice, test-first, inside the named workspace; fixes from review |
| Reviewer | `hm-reviewer` | sonnet | One slice's diff or the whole branch against the plan (and spec, if one exists), contracts and guards; validation runs on a brief |

Rules:

- **Name the role every time.** Do not dispatch a bare general-purpose agent for this work.
- **Briefs are self-contained.** A role agent sees none of the conversation: give it the task, the workspace path, the plan text, the acceptance criteria, the guard skills that apply, and the report shape.
- **Role agents report; they do not decide.** They never ask the developer, pass a gate on the orchestrator's behalf, commit or push. Questions come back in the report.
- **The session runs the final evidence.** A role agent's test run informs a review but is never the evidence for a pass claim.
- **Escalate, do not swap.** After two failed attempts at the same slice, re-dispatch the same role with more effort, or do the work in the session.
- **Do not hand off judgment.** Scouts gather facts; the orchestrator draws conclusions.

## 12. Enforcement

- CI (`.github/workflows/ci.yml`) runs typecheck, tests, build and the skill-parity check on every push to `main` and every pull request.
- Skills exist for Claude Code (`.claude/skills/`) and Codex (`.codex/skills/`). Edit the Claude copy, then run `npm run skills:sync`. CI fails if the twins differ.
- `CLAUDE.md` and `AGENTS.md` must describe the same project and rules.
