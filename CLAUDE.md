# HIDUP MALAYSIA: Codebase Handbook (Claude Code)

Owner: Izzham Burhan, TMRND. Repo: https://github.com/izzhamburhan/Hidup-Malaysia-Simulator
Other agent platforms read `AGENTS.md`. This file is the Claude Code entry point. The two files must say the same thing.

## What this is

A mobile-first, choice-based Malaysian life simulator that runs entirely in the browser. The player picks a background and life stage, then lives day by day: study, work, eat, commute, pay bills, date, start side hustles, and deal with whatever Seri Harapan throws at them. There is no backend, no database, no account and no API key. Saves live in the player's LocalStorage.

A pure TypeScript simulation engine (`src/engine/`) owns every rule. Content lives in data catalogues (`src/data/`). React screens (`src/screens/`, `src/components/`) only display state and call the engine. A local MCP server (`mcp/hidup-sim/`) exposes the same engine to agents for balancing and QA.

## Skills

Skills enforce the process gates in `playbook.md`. **Invoke them with the Skill tool before the work they guard; do not skip or rationalise around them.** `SKILLS.md` is the full index.

| Skill | Invoke when |
| --- | --- |
| `hidup-workflow` | Starting any task. The mandatory entry point; classifies the task and routes to the rest. |
| `change-intake-discovery` | A non-trivial change where current behaviour, owning module, contracts, or risks are not yet established. Read-only. |
| `tdd-plan` | Discovery is done; write the plan in `docs/plans/<slug>.md` with test-first slices and exact commands, then continue without waiting for approval. |
| `change-design-spec` | Only when the developer explicitly asks for a design spec on a change. Optional; not a gate. |
| `implementation-gate` | Code edits are imminent. Confirms workspace, green baseline, and edit boundary. |
| `verification-review` | Implementation is done; produces fresh evidence before any completion claim. |
| `completion-checkpoint` | Work is verified; decide commit, push, PR, or leave (Gate 6). Commit and push only when the developer asked or approved. |
| `handoff-summary` | End of any AI-assisted task. |
| `engine-contract-guard` | Any change under `src/engine/`, or to `GameState`, an action, an event, or the public engine API. |
| `save-compat-guard` | Any change to the shape of `GameState`, to `src/engine/save.ts`, or to migrations. |
| `content-guard` | Any change under `src/data/`, UI copy, humour, real-world names, politics, or payroll and calorie claims. |
| `mobile-ui-guard` | Any change under `src/components/` or `src/screens/`, or to `src/App.tsx`. |
| `doc-drift` | Code diverges from the docs, or a change alters layout, rules, contracts, status, commands, or process. |

Skills live in `.claude/skills/` (Claude Code) with a Codex twin in `.codex/skills/`. Edit the Claude copy, then run `npm run skills:sync`; CI runs `npm run skills:check` and fails if the twins differ. When in doubt, invoke `hidup-workflow` first.

## Process

`playbook.md` is the process: gates 0 to 7, git and branch rules, validation commands, Definition of Ready and Done, review checklist, agent roles. The flow is plan, then implement: classify the task, do light read-only discovery, write the TDD plan in `docs/plans/<slug>.md`, set up the workspace and confirm a green baseline, implement test-first, verify with fresh output, settle commit, push, or PR, then hand off. Do not stop to wait for plan approval; the developer reviews the plan and the result asynchronously. A design spec is written only when the developer asks for one, and the developer can ask to approve a specific plan before implementation starts. Do not commit or push without the developer's say-so.

Role agents for delegated work live in `.claude/agents/`: `hm-scout` (read-only discovery), `hm-implementer` (one planned slice, test-first), `hm-reviewer` (one diff, no edits).

## Layout

```
src/engine/            pure simulation engine (no React, no DOM)
  types.ts             GameState and every shared type
  rng.ts               seeded mulberry32; generator state lives in state.rng
  calendar.ts          day/minute maths, dates, age
  core.ts              money and stat helpers: earn, spend, canAfford, addDebt, applyStats, applyEffect, log
  time.ts              advanceTime: the only way the clock moves
  daily.ts             day start and day end processing
  economy.ts           monthly commitments, bills, payroll run, EPF dividend, tax year
  payroll.ts           simplified EPF, SOCSO, EIS and PCB
  living.ts            housing and transport
  career.ts            listings, applications, interviews, shifts, reviews
  education.ts         enrolment, classes, assignments, GPA, graduation
  social.ts            relationships and the social feed
  holidays.ts          holiday lookups over the simulated calendar
  business.ts          side hustles
  pet.ts               Oyen the cat: adopt, feed, play, daily hunger and mood
  decor.ts             home decor: buy, place, daily comfort bonus
  festive.ts           festive seasons: which is on (nearest wins), greetings, duit raya / angpau, festive outfit unlocks
  quests.ts            starter quests: status, claim reasons, rewards
  chat.ts              chat threads: day's script (pure pick), reply effects, one reply a day
  dailyChallenge.ts    daily challenge: scenario and seed from a date, newDailyGame, dailyStatus
  events.ts            data-driven event engine
  actionGames.ts       action mini-game bonus: score tier scales the ACTION_GAMES bonus (never cash)
  actions/             action catalogue by domain (types.ts, lifeActions, workActions, peopleActions, ownershipActions)
  progression.ts       achievement and challenge checks
  appearance.ts        cosmetic pixel-character looks and moods (own generator, never state.rng)
  endings.ts           chapter endings and the life report
  newGame.ts           newGame, emptyState, SAVE_VERSION, START_DATE
  save.ts              versioned LocalStorage save and migrations
  simulationEngine.ts  public API: newGame, performAction, resolveEvent, listActions, runAutopilot (and helpers)
src/data/              catalogues: universities, courses, companies, jobs, foods, vehicles, housing,
                       lifestyle, statutory, backgrounds, holidays, feed, events, achievements, challenges, appearance, pets, decor, dailyChallenges, minigames, chats, quests, festive
src/components/        UI components
  room/                Home room: activity.ts (action to room/animation mapping, presentation only), Room.tsx
  celebrate/           big-moment banner: celebrations.ts (pure state diff), Celebrate.tsx
  minigames/           Games.tsx (tap race, teh tarik, memory, timing bar, quick maths, pick a reply), the Games picker, ActionGame.tsx (game before an action); scoring.ts (pure, 0-100)
  VehicleSprite.tsx    pixel-art vehicle body shapes painted per model (no logos)
src/screens/           screens
src/main.tsx, src/App.tsx
src/config.ts          public site config: analytics ID, feedback form URL, game URL
src/lib/analytics.ts   privacy-first analytics (UI layer only)
src/lib/sound.ts       synthesised sound effects and vibration (UI layer only, no audio files)
src/lib/shareCard.ts   the share image: pure model plus a canvas renderer (browser only)
src/lib/install.ts     Add to Home Screen prompt, iPhone steps, service worker registration
src/i18n.ts            UI strings in English and Bahasa Malaysia (beta: menus and buttons; content stays English)
tests/                 Vitest tests for the engine and data (tests/*.test.ts)
mcp/hidup-sim/         local stdio MCP server exposing the engine (run with tsx)
docs/contracts/        engine, action, event, save, data, payroll and MCP contracts
docs/plans/            one TDD plan per non-trivial change: <slug>.md
docs/specs/            design specs, only when the developer asks for one: <slug>.md
scripts/               skill sync and parity scripts (Node .mjs, built-ins only)
playbook.md            the process: gates, git rules, validation, Definition of Done
SKILLS.md              index of every skill
.claude/skills/        process and guard skills (Codex twins in .codex/skills/)
.claude/agents/        role agents: hm-scout, hm-implementer, hm-reviewer
.github/               CI workflow and pull request template
.mcp.json              registers the hidup-sim MCP server
```

## Status

| System | State |
| --- | --- |
| Engine core (types, rng, calendar, core, time, daily) | done: seeded RNG, shared clock, passive needs, day/month/year processing |
| Economy and payroll | done: monthly commitments, overdue debt, payslips (EPF/SOCSO/EIS/PCB simplified), EPF dividend, tax year + e-filing event |
| Living (housing, transport) | done: 6 rentals incl. campus hostel, 3 properties with DSR check, 5 commute modes, 13 vehicles with loans, each drawn as a pixel-art body shape in its own colour (no logos or photos) |
| Career | done: 47 jobs and 24 example employers, weekly job board, applications, interview event, offers/negotiation, shifts, overtime, leave, reviews, promotions |
| Education | done: 40 institutions, 27 courses, classes, assignments, exams/GPA/CGPA, FYP, probation, graduation, PTPTN-style loan |
| Social and feed | done: prospects, dating stages to marriage, breakups, family/friends drift, fictional feed with likes and invites |
| Events | done: 97 events (random + scheduled), modes, contexts, cooldowns, follow-ups, safety net |
| Actions catalogue | done: 99 actions across 15 categories with availability reasons and confirmations |
| Achievements and endings | done: 43 achievements, 10 challenges, 10 endings, life report, share image (1080x1350 PNG drawn on the device) and share text |
| State flags | done: official flags of all 13 states and 3 federal territories (Wikimedia Commons, credited), flag grid in character creation, flag in the game header |
| Festive seasons | done: 11 seasons on the simulated calendar (CNY, Raya, Aidiladha, Wesak, Kaamatan, Gawai, Merdeka, Malaysia Day, Deepavali, Christmas, New Year); room garland, festive-greet once a season (duit raya / angpau: single receives, married gives), 4 festive outfits |
| Install | done: network-first service worker, "Get the app" card after day 1 and in Settings, iPhone steps |
| Starter quests | done: 6 quests for a new life (eat, move, career step, chat, me time, survive day one), RM20 each via claim-quest, shown as the room's goal; not in daily challenges |
| Chat | done: partner, Geng Lepak (friends) and family threads on the Feed tab; 16 scripted conversations, pick one of 3 replies, real effects on trust, friends and family, one reply per thread a day |
| Bahasa Malaysia | beta: EN/BM switch on the landing screen and in Settings; menus, buttons, Home, room, daily banner and settings translated; stories, events and catalogue names still English |
| Daily challenge | done: 7 scenarios, one per date and the same for everyone (date picks scenario and seed), 7-day run in its own save slot; a slim strip on the landing page opens an explainer sheet with Start/Continue; a compact in-run banner with goal, "My life" exit and Share |
| Ending collection | done: endings found across all lives (own LocalStorage key), Goals gallery with hints, "new ending found" on the Report |
| Mini-games | done: Kejar Bas, Teh Tarik and Ingat Order from the room's Games button; score becomes a capped mood reward (first 3 plays a day). Action games: 23 everyday actions (run, workout, gym, sports, work, overtime, hustle, mamak, classes, study, assignment, FYP, self-study, CV, apply, interview, friend, partner and family chats) open a 5-10 second game first (tap race, timing bar, memory, pour, quick maths, pick a reply); the score adds a small capped bonus through `performAction` options, Skip does the action as normal, and Settings can turn them off |
| Gender | done: male or female at character creation (save v7); sets the starting look and hides the other gender's traditional wear (tudung, baju kurung, cheongsam, songkok, baju Melayu; `suitsGender` in `src/data/appearance.ts`, enforced by the change-outfit action); nothing else in the simulation reads it |
| Wardrobe | done: change outfit, colour, headwear and glasses from the room; 5 outfits and 3 headwear unlocked by achievements |
| Home decor | done: 16 decor items in four slots, bought from the room's Decorate button, shown in the living room and bedroom, small daily comfort bonus |
| Pets | done: Oyen the cat (adopt from Act or a stray event), feed and play, daily hunger and mood, shown in the Home room |
| Save and migrations | done: SAVE_VERSION 8 (v2 adds the pixel character appearance, v3 the pet, v4 home decor, v5 wardrobe unlocks, v6 festive outfits, v7 gender, v8 unit trust and skill mastery), migration chain, corrupt-save quarantine, export/import |
| Public engine API (`simulationEngine.ts`) | done: performAction, resolveEvent, listActions, runAutopilot, interact, endChapter |
| Data catalogues | done (balance values are fictional estimates; tune freely) |
| UI (screens, components) | done: Pou-style Home room (big centred character, room follows the activity, an animation after every action, round one-tap buttons, a Decor / Style / Games toolbar under the room, synthesised sound effects and vibration with toggles, confetti and a fanfare for big moments), pixel-art characters (player editor, mood faces, name-seeded NPC faces), neutral organisation badges, Act/Money/Life/Feed tabs, Goals, Report, Settings; checked at 360px |
| MCP server `hidup-sim` | done: 8 tools, stdio smoke-tested |
| Tests | done: 36 Vitest files, 244 tests |

## Commands

Node 24. Run from the repo root.

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

Run one test file with `npx vitest run tests/<file>.test.ts`.

## Analytics, feedback and privacy

Anonymous, cookie-free usage stats via Umami Cloud, off until `UMAMI_WEBSITE_ID` is set in
`src/config.ts`. `src/lib/analytics.ts` sends only allow-listed events and fields (never the
character name, free text or money), respects Do Not Track, skips localhost, and players can opt
out in Settings → Privacy. The engine never imports analytics and the save is untouched.
In-game quick feedback (emoji rating and improvement chips) is sent the same way; an optional
`FEEDBACK_FORM_URL` adds a long-form link. Contract: `docs/contracts/analytics.md`.

## Deployment

Live: https://hidupmalaysia.com/ (custom domain on Cloudflare Registrar; DNS: four A records to GitHub Pages plus a www CNAME, DNS only; `public/CNAME` keeps it on every deploy; the old github.io address forwards). Every push to `main` runs `.github/workflows/deploy.yml` (npm ci, typecheck, test, build) and force-pushes `dist/` to the `gh-pages` branch, which GitHub Pages serves. The Vite base is relative (`./`), so the build works under the repository sub-path. `public/manifest.webmanifest`, the PNG icons and the network-first service worker `public/sw.js` (registered in production only) make it installable and playable offline; Home offers "Get the app" after day 1 (`src/lib/install.ts`).

## Engine rules

1. **Pure engine.** `src/engine/` is plain TypeScript. No React, no DOM, no `window`, no network. The single exception is `save.ts`, which reads and writes a `Storage`-like object passed in by the caller (LocalStorage in the browser, an in-memory store in tests).
2. **Central action resolution.** The UI never mutates `GameState`. Every gameplay change goes through `performAction` or `resolveEvent` in `simulationEngine.ts`. These clone the state, mutate the draft through the `core.ts` helpers, advance time through `advanceTime`, roll events, update achievements and challenges, offer the chapter ending, and return a new state with feedback. The UI then autosaves.
3. **Time moves only through `advanceTime`** (`time.ts`). Nothing else writes `state.clock`.
4. **Determinism.** All randomness goes through `rng.ts` helpers (`nextRandom`, `chance`, `randInt`, `randRange`, `pick`, `weightedPick`) using `state.rng`. Never `Math.random()`, `Date.now()` or `new Date()` without an argument in simulation logic. Same state, same action, same seed gives the same result. Wall-clock metadata (`createdAt`, `savedAt`) never feeds the simulation.
5. **Bounded values.** Stats are 0 to 100 (`clamp`). Wallet cash is never negative: voluntary spending checks `canAfford` first; obligations call `spend(..., allowDebt = true)` so a shortfall becomes overdue debt. EPF is never spendable cash.
6. **Pending events block actions.** While `state.events.pending` is not empty, only `resolveEvent` may change the state. Energy at or below 0 forces sleep.
7. **Content is data.** Text, prices, events, foods, jobs and the like live in `src/data/`, not in components or engine logic. Events are data in `src/data/events.ts` with conditions, weights, cooldowns, contexts and modes.
8. **Availability explains itself.** An action or choice that cannot be taken returns a human-readable reason; the UI shows it instead of a dead button.

Contracts for all of this are in `docs/contracts/`. Change the contract first, then the code, in the same change.

## Data honesty

- **Real names are catalogue names only.** Real universities and companies appear as names. Their presence implies no vacancies, rankings, entry requirements, fees, salaries or practices.
- **No real logos or brand marks.** Organisations are shown with a neutral initials badge (`OrgBadge`: game palette, plain text, one shape for all), never a logo, brand colour or lookalike. Logos are trademarks and would imply endorsement.
- **State flags.** State and federal territory flags are the one exception to "no real marks": official files from Wikimedia Commons in `public/flags/`, unmodified, licence-checked and credited in `src/data/stateFlags.ts` and Settings → Credits (CC BY-SA files keep their author credit), shown for identification only with no implied endorsement. Never hand-draw or alter them.
- **Numbers are fictional game estimates.** Salaries, tuition, prices, rents, deposits, vehicle and running costs are FICTIONAL GAME ESTIMATES chosen for balance, and every catalogue file says so in its header comment. UI copy never presents them as market data.
- **Calories are rough estimates** for gameplay, not medical or nutrition advice.
- **Payroll is a SIMPLIFIED SIMULATION** of EPF/KWSP, SOCSO/PERKESO, EIS and PCB/LHDN. Rates live in `src/data/statutory.ts` with links to the official sources. A payslip always shows `STATUTORY_DISCLAIMER` and is never presented as official. See `docs/contracts/payroll.md`.
- **Holiday dates are a simulated calendar.** Lunar and Islamic festivals are pinned to fixed dates in `src/data/holidays.ts`; they are not the real calendar.
- **Humour and politics.** Humour is original, friendly and recognisably Malaysian. No defamation of real people. Politics appears only through fictional parties and politicians in the fictional town of Seri Harapan. No ethnic or religious stereotypes. Being single, never marrying, never buying a house and every ending are valid outcomes, not failures.
- **Halal-friendly.** No pig or pork, alcohol or gambling imagery anywhere (emoji included); `tests/content.test.ts` enforces the emoji list.
- **Privacy.** Store only what the game needs, and only locally. No accounts, ads, tracking cookies, paid APIs or real social media in v1. The only analytics allowed is the cookie-free, opt-out, allow-listed kind in `docs/contracts/analytics.md`.

## Save and versioning

- LocalStorage key `hidup-malaysia:save` holds `{ version, savedAt, state }`. Settings live under `hidup-malaysia:settings`; endings found across lives under `hidup-malaysia:collection`; today's daily-challenge run under `hidup-malaysia:daily` (its own slot, never the main life).
- `SAVE_VERSION` lives in `src/engine/newGame.ts` (currently 8; re-exported by `simulationEngine.ts`) and is the `GameState.version` of new games. Migrations live in `src/engine/save.ts`.
- Any change to the shape of `GameState` bumps `SAVE_VERSION`, adds a migration from the previous version, and adds a Vitest test that migrates a fixture of the old shape.
- A corrupt or unreadable save never crashes the app: the raw text is backed up to `hidup-malaysia:save:corrupt` and the player gets a clear message and a fresh start.
- Full contract: `docs/contracts/save-format.md`.

## MCP server (`hidup-sim`)

`mcp/hidup-sim/server.ts` is a local stdio MCP server that wraps the real engine so agents can play, balance and QA the game without a browser. It is registered in `.mcp.json` as server `hidup-sim` with command `npx` and args `["tsx", "mcp/hidup-sim/server.ts"]`; `npm run mcp` starts it by hand.

Tools: `sim_new_game`, `sim_list_actions`, `sim_perform_action`, `sim_resolve_event`, `sim_autopilot`, `sim_state_summary`, `payroll_calculate`, `data_validate`. Sessions are kept in memory, keyed by session id. The server makes no network calls and writes no files. It imports the engine; it never re-implements rules. The tool contract is `docs/contracts/mcp-hidup-sim.md`.

Use it for balancing questions ("how much cash does a fresh grad in KL have after six months on autopilot?"), for reproducing a bug with a fixed seed, and as the stdio smoke test when the engine API changes.

## Adding content

Follow `content-guard` for every item, and add or update a test.

- **An event.** Add a `GameEventDef` to `src/data/events.ts` with a unique `id`, `title`, `icon`, `category`, `text`, `trigger`, and `choices`. Random events also set `contexts`, `weight`, `cooldownDays`, and optionally `modes`, `once`, `when`. Give at least one choice with no `requires` and no `cost` so the player is never stuck. A `followUp` must point at an event with `trigger: 'scheduled'`. See `docs/contracts/event-contract.md`.
- **A food.** Add a `Food` to `src/data/foods.ts`: rough calories per serving, a fictional price, satiety, energy, health and happiness nudges, minutes, and `meal`.
- **A job.** Add a `Job` to `src/data/jobs.ts` with fictional `salaryRange` (or `shiftPay` for part-time), schedule, qualification, fields, skills, and industries that exist in `src/data/companies.ts`.
- **A university.** Add a `University` to `src/data/universities.ts`: a real name is fine, but tuition is a fictional estimate, and `strengths` and `industryLinks` are game flavour, never quality claims. Fields must match courses in `src/data/courses.ts`.
- **An achievement or challenge.** Add an `Achievement` (or `Challenge`) to `src/data/achievements.ts` with a unique id, title, description and a condition that is a pure function of `GameState` (no mutation, no randomness). `src/engine/progression.ts` (`checkAchievements`, `updateChallenges`) evaluates them after each action and event.

Every catalogue id is unique and every cross-reference resolves; `tests/data.test.ts`, `tests/events.test.ts` and the `data_validate` MCP tool enforce this.

## Secrets

None. The game needs no API keys, tokens or environment variables. Never add one in v1; if a change seems to need one, stop and ask the developer.
