# HIDUP MALAYSIA: Agent Guide (Codex, Gemini CLI, Copilot, others)

Owner: Izzham Burhan, TMRND. Repo: https://github.com/izzhamburhan/Hidup-Malaysia-Simulator
Claude Code reads `CLAUDE.md`; both files describe the same project and rules. Keep them in sync.

## What this is

A mobile-first, choice-based Malaysian life simulator that runs entirely in the browser. No backend, no database, no account, no API key; saves live in LocalStorage. A pure TypeScript engine (`src/engine/`) owns every rule, content lives in `src/data/`, React screens only display state and call the engine, and a local MCP server (`mcp/hidup-sim/`) exposes the engine to agents for balancing and QA.

Stack: React 19, Vite 8, TypeScript 5.9 strict, Tailwind CSS v4 (`@tailwindcss/vite`), lucide-react, Vitest 5, Node 24.

## Skills

Skills enforce the process gates in `playbook.md`. **Use them (Codex: `$skill-name`) before the work they guard; do not skip or rationalise around them.** `SKILLS.md` is the full index.

| Skill | Invoke when |
| --- | --- |
| `hidup-workflow` | Starting any task. The mandatory entry point; classifies the task and routes to the rest. |
| `change-intake-discovery` | A non-trivial change where current behaviour, owning module, contracts, or risks are not yet established. Read-only. |
| `change-design-spec` | Discovery is done; requirements, acceptance criteria, contract, save and content impact must be decided and approved. |
| `tdd-plan` | The spec is approved; turn it into test-first slices. |
| `implementation-gate` | Code edits are imminent. Confirms workspace, green baseline, and edit boundary. |
| `verification-review` | Implementation is done; produces fresh evidence before any completion claim. |
| `completion-checkpoint` | Work is verified; the developer chooses commit, push, PR, or leave (Gate 6.5). |
| `handoff-summary` | End of any AI-assisted task. |
| `engine-contract-guard` | Any change under `src/engine/`, or to `GameState`, an action, an event, or the public engine API. |
| `save-compat-guard` | Any change to the shape of `GameState`, to `src/engine/save.ts`, or to migrations. |
| `content-guard` | Any change under `src/data/`, UI copy, humour, real-world names, politics, or payroll and calorie claims. |
| `mobile-ui-guard` | Any change under `src/components/` or `src/screens/`, or to `src/App.tsx`. |
| `doc-drift` | Code diverges from the docs, or a change alters layout, rules, contracts, status, commands, or process. |

Skills live in `.codex/skills/` with Claude twins in `.claude/skills/`. The Claude copy is the source of truth: edit it, then run `npm run skills:sync`. CI runs `npm run skills:check` and fails if the twins differ. When in doubt, use `$hidup-workflow` first.

## Process

`playbook.md` is the process: gates 0 to 7, git and branch rules, validation commands, Definition of Ready and Done, review checklist, agent roles. Short version: classify, discover, write the spec, write the TDD plan (the developer approves both), confirm the baseline, implement test-first, verify with fresh output, let the developer choose commit, push, or PR, then hand off. Do not commit or push without the developer's say-so.

## Layout

`src/engine/` pure simulation engine: `types.ts`, `rng.ts` (seeded mulberry32, `state.rng`), `calendar.ts`, `core.ts` (money and stat helpers), `time.ts` (`advanceTime`, the only way the clock moves), `daily.ts`, `economy.ts`, `payroll.ts`, `living.ts`, `career.ts`, `education.ts`, `social.ts`, `holidays.ts`, `business.ts` (side hustles), `events.ts`, `actions/` (catalogue by domain), `progression.ts` (achievements and challenges), `endings.ts`, `newGame.ts` (`newGame`, `SAVE_VERSION`), `save.ts`, and `simulationEngine.ts` (public API: `newGame`, `performAction`, `resolveEvent`, `listActions`, `runAutopilot`). `src/data/` catalogues (universities, courses, companies, jobs, foods, vehicles, housing, lifestyle, statutory, backgrounds, holidays, feed, events, achievements, challenges). `src/components/` and `src/screens/` UI; `src/main.tsx`, `src/App.tsx`. `tests/` Vitest tests. `mcp/hidup-sim/` local stdio MCP server. `docs/contracts/` contracts; `docs/specs/` and `docs/plans/` one file per change (`<slug>.md`). `scripts/` skill sync and parity (Node `.mjs`). `playbook.md` the process. `SKILLS.md` skill index. `.codex/skills/` and `.claude/skills/` skills. `.claude/agents/` role agents (`hm-scout`, `hm-implementer`, `hm-reviewer`). `.github/` CI and PR template. `.mcp.json` registers `hidup-sim`.

## Status

| System | State |
| --- | --- |
| Engine core (types, rng, calendar, core, time, daily) | done: seeded RNG, shared clock, passive needs, day/month/year processing |
| Economy and payroll | done: monthly commitments, overdue debt, payslips (EPF/SOCSO/EIS/PCB simplified), EPF dividend, tax year + e-filing event |
| Living (housing, transport) | done: 6 rentals incl. campus hostel, 3 properties with DSR check, 5 commute modes, 8 vehicles with loans |
| Career | done: weekly job board, applications, interview event, offers/negotiation, shifts, overtime, leave, reviews, promotions |
| Education | done: 24 institutions, 14 courses, classes, assignments, exams/GPA/CGPA, FYP, probation, graduation, PTPTN-style loan |
| Social and feed | done: prospects, dating stages to marriage, breakups, family/friends drift, fictional feed with likes and invites |
| Events | done: 96 events (random + scheduled), modes, contexts, cooldowns, follow-ups, safety net |
| Actions catalogue | done: 89 actions across 15 categories with availability reasons and confirmations |
| Achievements and endings | done: 39 achievements, 10 challenges, 10 endings, life report, share card |
| Save and migrations | done: SAVE_VERSION 1, migration chain, corrupt-save quarantine, export/import |
| Public engine API (`simulationEngine.ts`) | done: performAction, resolveEvent, listActions, runAutopilot, interact, endChapter |
| Data catalogues | done (balance values are fictional estimates; tune freely) |
| UI (screens, components) | done: landing, creation, Home/Act/Money/Life/Feed tabs, Goals, Report, Settings; checked at 360px |
| MCP server `hidup-sim` | done: 8 tools, stdio smoke-tested |
| Tests | done: 12 Vitest files, 92 tests |

## Commands

```bash
npm install
npm run dev            # Vite dev server
npm run typecheck      # tsc -b
npm test               # vitest run
npm run build          # tsc -b && vite build
npm run check          # typecheck + test + build + skills:check
npm run skills:sync    # regenerate .codex/skills from .claude/skills
npm run skills:check   # fail if the skill twins differ
npm run mcp            # start the hidup-sim MCP server on stdio
```

One test file: `npx vitest run tests/<file>.test.ts`.

## Rules

1. The engine is pure TypeScript: no React, DOM, `window` or network. Only `save.ts` touches storage, through a `Storage`-like object passed in.
2. The UI never mutates `GameState`. Every gameplay change goes through `performAction` or `resolveEvent`, which clone the state, mutate the draft through `core.ts` helpers, advance time with `advanceTime`, roll events, update achievements and challenges, offer the chapter ending, and return a new state with feedback. The UI autosaves.
3. Time moves only through `advanceTime`.
4. All randomness uses the `rng.ts` helpers and `state.rng`. Never `Math.random()`, `Date.now()` or argument-less `new Date()` in simulation logic. Same state, action and seed give the same result.
5. Stats are 0 to 100. Wallet cash is never negative; shortfalls on obligations become overdue debt. EPF is never spendable cash.
6. Pending events block actions. Energy at or below 0 forces sleep.
7. Content lives in `src/data/`, never in components or engine logic. Events are data with conditions, weights, cooldowns, contexts and modes.
8. Unavailable actions and choices give a reason; no dead buttons.
9. Any `GameState` shape change bumps `SAVE_VERSION` (in `newGame.ts`), adds a migration in `save.ts` and a migration test. Corrupt saves never crash the app (backed up to `hidup-malaysia:save:corrupt`).
10. Contracts live in `docs/contracts/`. Change the contract first, then the code, in the same change.
11. Mobile-first: test at 360px width, bottom navigation, no dead buttons.
12. No backend, accounts, analytics, paid APIs or real social media in v1. No secrets are needed; never add one.

## Data honesty

Real universities and companies are catalogue names only: no implied vacancies, rankings, fees, salaries or practices. Salaries, tuition, prices, rents and vehicle costs are FICTIONAL GAME ESTIMATES and labelled so. Calories are rough estimates, not medical or nutrition advice. Payroll (EPF/KWSP, SOCSO/PERKESO, EIS, PCB/LHDN) is a SIMPLIFIED SIMULATION with rates and official links in `src/data/statutory.ts`; a payslip is never presented as official. Holiday dates are a simulated calendar. Humour is original, friendly and recognisably Malaysian; no defamation of real people; politics only via fictional parties and politicians in the fictional town of Seri Harapan; no ethnic or religious stereotypes; being single and every ending are valid outcomes.

## Save format

LocalStorage key `hidup-malaysia:save` holds `{ version, savedAt, state }`; settings under `hidup-malaysia:settings`; corrupt saves are copied to `hidup-malaysia:save:corrupt`. `SAVE_VERSION` is currently 1. Contract: `docs/contracts/save-format.md`.

## MCP server

`hidup-sim` (`mcp/hidup-sim/server.ts`), registered in `.mcp.json` with command `npx` and args `["tsx", "mcp/hidup-sim/server.ts"]`. Tools: `sim_new_game`, `sim_list_actions`, `sim_perform_action`, `sim_resolve_event`, `sim_autopilot`, `sim_state_summary`, `payroll_calculate`, `data_validate`. In-memory sessions keyed by session id, no network, no file writes, wraps the real engine. Contract: `docs/contracts/mcp-hidup-sim.md`.

## Adding content

Events go in `src/data/events.ts` (unique id, at least one always-available choice, follow-ups point at scheduled events), foods in `src/data/foods.ts`, jobs in `src/data/jobs.ts`, universities in `src/data/universities.ts`, achievements and challenges in `src/data/achievements.ts` (pure conditions, evaluated by `src/engine/progression.ts`). Every id is unique and every cross-reference resolves; `tests/data.test.ts`, `tests/events.test.ts` and `data_validate` enforce it. Follow `content-guard`. `CLAUDE.md` § Adding content has the field-by-field detail.

## Secrets

None. No API keys, tokens or environment variables.
