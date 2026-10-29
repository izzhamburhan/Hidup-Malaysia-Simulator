# HIDUP MALAYSIA 🇲🇾

**Can you build the life you want in Malaysia?**

HIDUP MALAYSIA is a mobile-first, choice-based life simulator that runs entirely in the browser. You start as a student, a fresh graduate, a working adult, an experienced professional, an entrepreneur or an early retiree. From there you manage study, work, money, housing, transport, food, fitness, love, family, side hustles and civic life. Every action costs time and changes something else.

It needs no backend, no account, no API keys and no database. Saves live in your browser's LocalStorage.

**Play it:** https://hidupmalaysia.com/

On a phone, open the link, then use **Add to Home Screen** (Safari share menu, or the Chrome menu) to install it like an app.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

Other commands:

```bash
npm run typecheck  # tsc -b (strict)
npm test           # Vitest engine tests
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run check      # typecheck + tests + build + skill parity
npm run mcp        # start the hidup-sim MCP server on stdio
```

Requires Node 20 or newer (developed on Node 24).

## How to play

Everything for a normal day is on the **Home** screen:

- **The big button** does the most sensible thing right now: go to work, attend class, eat, go to an interview, apply for the best job, or sleep.
- **Six tiles** change with the time of day and your situation (meals, gym, mamak, study, side hustle, nap).
- **Next / End day / Week** let time pass on your routine. They stop whenever an event needs your decision.

The other tabs (Act, Money, Life, Feed) are for deeper decisions: moving house, buying a car, the job board, payslips, dating, side hustles.

1. **Create a life.** Design your pixel character (skin tone, hair, outfit, tudung, songkok, cap, glasses), then pick a name, a mode (Realistic or Chaotic), a life stage, a background, your home state, and your university, course or job.
2. **Act.** Every action takes game time: eating takes 20 minutes, a workday about 9 hours plus your commute, sleep several hours. The clock only moves when you act or wait.
3. **Watch the 1st and the last day of each month.** Bills, rent and loan repayments are charged on the 1st. Salaries arrive on the last day of the month with a payslip.
4. **Decide.** Random and dated events (traffic jams, kenduri, Hari Raya, a recruiter, a scam SMS, a breakup talk) pause the game until you choose.
5. **Use routine mode** on the Home tab to live a normal day or week automatically. It stops when something needs you.
6. **Finish the chapter** (1, 3 or 5 years). You get a life report, one of ten endings and a shareable result card. Then you can keep going.

## What works

| System | What you can do |
| --- | --- |
| Shared simulation | One state, one clock and one wallet. Passive hunger and tiredness, a forced sleep at 0 energy, end-of-day reports and seeded randomness. |
| Modes | Realistic, or Chaotic: the same engine with more absurd events, rolled more often. |
| Education | 40 Malaysian universities and colleges and 27 courses. Classes, study, assignments, final exams, GPA and CGPA, Dean's List, probation, final-year project, graduation, internships, scholarships and a PTPTN-style loan. |
| Career | A weekly job board with real company names (as examples only) and fictional listings. Eligibility and match scores, applications, interview events, offers and salary negotiation. Also shifts, overtime, annual leave, absences, twice-yearly reviews, increments, promotions, resigning, CV polishing, courses and networking. |
| Payroll & money | Payslips with EPF, SOCSO, EIS and a PCB estimate, plus employer contributions. Wallet, savings and emergency fund are kept apart from EPF. Debts with interest, early repayment, overdue debt when you can't pay, buy-now-pay-later, insurance, a tax year and an e-filing event. |
| Housing | Family home, campus hostel, rented room, shared house, apartment and condo. Deposits, refunds, utilities and commutes. You can buy property after a down payment and debt-service check. |
| Transport | Walking, public transport, motorcycle, car or e-hailing. A driving licence and renewals. 8 vehicles with hire purchase, running costs, servicing, breakdowns, summonses and selling. |
| Food & fitness | 21 Malaysian foods with portion sizes and estimated calories, plus water. Gym memberships and day passes, runs, badminton, futsal, football, workout streaks, and sleep debt. |
| Relationships & family | Meet people, start talking, date, define the relationship, propose and choose a wedding budget. Misunderstandings, crises and breakups happen too. Being single is a full, valid path. Family calls, balik kampung, allowances for parents, and friends who drift if you ignore them. |
| Leisure | Mobile and PC gaming, reading, movies, shopping, concerts, photography, road trips, mamak and karaoke. |
| Side hustles | Freelance dev, tuition, an online shop, a kuih business, content creation and photography. Growth is gradual and revenue swings. You can hire staff and register a company. |
| Civic life | Gotong-royong, town halls run by a fictional council, volunteering, reporting potholes, paying summonses, and a fictional election with fictional parties. |
| Events | 96 data-driven events with conditions, contexts, weights, cooldowns, follow-ups and both modes. Includes festive and holiday events on a simulated calendar. |
| Social feed | A fictional feed with likes, invitations you can accept, and an optional comparison-anxiety mechanic. |
| Progression | 39 achievements, 10 life challenges (up to 3 active), 10 endings, a life report, and native share with a clipboard fallback. |
| Saves | Autosave after every action. Resume, new game with confirmation, export and import, reset, versioned migrations, and a corrupt save set aside instead of crashing. |

## Honesty about data

- **Names, not logos.** Organisations appear as neutral initials badges in the game's own colours. No real logo or brand mark is used.
- **Real names, fictional numbers.** Universities and companies are real names used as catalogue entries. They do not imply vacancies, fees, rankings or practices. Salaries, tuition, rents, vehicle prices and other costs are **fictional game estimates**.
- **Payroll is a simplified simulation.** It approximates published rates: EPF 11% employee and 13%/12% employer, SOCSO and EIS up to a RM6,000 ceiling, and an annualised PCB using resident tax bands, reliefs and the rebate. It is **not an official calculation**. Check [KWSP](https://www.kwsp.gov.my/), [PERKESO](https://www.perkeso.gov.my/) and [LHDN](https://www.hasil.gov.my/) for real figures. Rates live in `src/data/statutory.ts`.
- **Calories are rough estimates.** The game is not a medical or nutrition tool.
- **Holiday dates use a simulated calendar.** Lunar and Islamic festivals are pinned to fixed dates.
- **Politics are fictional.** The parties and the town of Seri Harapan are made up. Real people are never the target of jokes.

## Analytics and feedback (setup)

The game can show you visitors, visit time, and which buttons and features players use, without
cookies or personal data. It is off until you connect it:

1. Create a free account at https://cloud.umami.is (Hobby plan).
2. Add a website: name `Hidup Malaysia`, domain `hidupmalaysia.com`.
3. Copy the **Website ID** and paste it into `UMAMI_WEBSITE_ID` in `src/config.ts`, then push to `main`.
4. Optional: create a Google Form for longer feedback and paste its link into `FEEDBACK_FORM_URL`.

The Umami dashboard then shows visitors, visit duration, bounce rate, countries and devices,
plus game events such as `game_start`, `action`, `day_reached`, `share` and `feedback`
(see `docs/contracts/analytics.md`). Players can switch stats off in Settings → Privacy.

## Licence

Proprietary, all rights reserved (see `LICENSE`). The code is public to read, not to reuse.

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which installs, typechecks, tests and builds the game, then publishes `dist/` to the `gh-pages` branch. GitHub Pages serves that branch at the URL above. The build uses a relative base path, so it works under the repository sub-path.

## Architecture

```
src/engine/   Pure TypeScript simulation (no React): state, clock, economy, payroll, career,
              education, social, events, actions, progression, endings, save
src/data/     Content catalogues (universities, jobs, foods, vehicles, housing, events, ...)
src/hooks/    useGame: React bridge, autosave, feedback
src/screens/  Landing, character creation, game shell and tabs
src/components/ UI primitives, action cards, overlays
tests/        Vitest engine tests
mcp/hidup-sim/  Local MCP server exposing the engine to agents
docs/contracts/ Engine, action, event, save, data, payroll and MCP contracts
```

Every gameplay change goes through `performAction(state, actionId, param)` or `resolveEvent(state, choiceId)`. The engine clones the state, changes the copy with shared helpers, moves time only through `advanceTime`, rolls events, checks achievements, and returns a feedback summary worked out by comparing the state before and after. Randomness uses a seeded generator kept in the state, so the same state and the same action always give the same result.

See [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md) for the handbook, [playbook.md](playbook.md) for the process, [SKILLS.md](SKILLS.md) for agent skills, and [docs/contracts](docs/contracts) for contracts.

## Agent tooling

- `.claude/skills/` holds the process and guard skills, and `.codex/skills/` holds their generated Codex twins. Run `npm run skills:sync` and `npm run skills:check`.
- `.mcp.json` registers the `hidup-sim` MCP server. Its tools: `sim_new_game`, `sim_list_actions`, `sim_perform_action`, `sim_resolve_event`, `sim_autopilot`, `sim_state_summary`, `payroll_calculate` and `data_validate`.

## Roadmap

- Balancing pass with more simulated playthroughs (use the MCP server or `tests/simulation.test.ts`).
- City-specific scenarios (KL, Penang, JB, Kuching, Kota Kinabalu) and commute differences.
- Investments (ASB-style unit trusts, stocks) as an optional system.
- Kids and parenting, ageing parents, retirement withdrawals from EPF.
- More events (target 150+), localisation (Bahasa Malaysia UI), and sound.
- Optional cloud saves or leaderboards, only if a backend becomes necessary.
