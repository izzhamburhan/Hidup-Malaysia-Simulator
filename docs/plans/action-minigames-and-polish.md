# Plan: action mini-games, gender, vehicle sprites and landing polish

Branch: `feat/ui-action-minigames-and-polish`. A batch of developer feedback (2026-10-26).

## Goal

1. Today's challenge on the landing page is a slim info strip; tapping it opens a sheet that
   explains it is a separate 7-day run (own save, main life untouched) with a Start/Continue
   button. The landing feature tiles and the in-game daily banner get smaller.
2. Character creation asks for gender (male / female). It is saved on the character and sets the
   default avatar look; nothing else depends on it.
3. Vehicles are drawn as pixel-art sprites per body shape (scooter, motorbike, hatchback, sedan,
   MPV, SUV), coloured per model, instead of generic emoji. No logos, no photos.
4. The Decor / Style / Games buttons on the Home room become a clear toolbar under the room.
5. Many everyday actions (run, gym, sports, work, overtime, hustle, mamak, classes, study,
   assignment, FYP, apply, CV, interview, chats and family calls) open a 5-10 second mini-game
   first. The score nudges the result a little. A Skip button always does the action normally,
   and Settings can turn action games off.

## Non-goals

- No real car photos, logos or brand marks (developer chose pixel art).
- Gender does not change stats, salaries, events, dating prospects or available options.
- No mini-game for sleep, nap, wait, money, shopping, home, transport or civic actions.
- Autopilot, Next, End day and Week never play games and never get a game bonus.
- MCP `sim_perform_action` is unchanged (no `gameScore` input in this change).

## Acceptance criteria

1. `performAction(state, id, param, { gameScore })` applies the bonus listed for `id` in
   `ACTION_GAMES`, scaled by tier: score 0-29 gives nothing, 30-59 a third, 60-89 two thirds,
   90-100 the full bonus. It adds the feedback line `Mini-game: <score>`.
2. Without `gameScore`, with a non-integer or out-of-range score, or for an action with no game,
   the result is identical to today's `performAction(state, id, param)`.
3. Bonuses are bounded: stats, performance, knowledge, CV quality, friends, family and partner
   trust stay 0-100 through the existing `clamp`ed helpers; a bonus never gives cash.
4. `apply-job` with a score raises the new application's `score`; `attend-interview` raises the
   interviewing application's `score` before the interview event resolves.
5. Same state, same action, same score gives the same result (determinism).
6. An unavailable action with a score still fails with its normal reason and does not mutate
   the input state.
7. `Character.gender` is `'male' | 'female' | null`. `newGame` stores `options.gender ?? null`.
   The daily challenge copies the main character's gender.
8. `SAVE_VERSION` is 7. A v6 save migrates with `character.gender = null`; old looks unchanged.
9. `randomAppearance(seed)` without a gender returns exactly what it returns today (NPC faces
   and migrated looks do not change). `randomAppearance(seed, gender)` draws hair, outfit and
   headwear from that gender's default pool; every option stays free to pick in the editor.
10. Every vehicle has a valid `shape` and a `color` (hex); `tests/data.test.ts` checks them.
11. UI: landing strip opens a sheet with Start/Continue; Room toolbar always visible under the
    room; action games open from every action button (tile, list, primary) with Play and Skip;
    Settings → Gameplay has "Mini-games on actions" (default on). Checked at 360px.

## Contract change

- `docs/contracts/engine-api.md`: `performAction` gains an optional fourth argument
  `options?: { gameScore?: number }`.
- `docs/contracts/action-contract.md`: action games section (table in `src/data/minigames.ts`,
  tier rule, never cash, autopilot never plays).
- `docs/contracts/save-format.md`: v7 adds `character.gender`.
- `docs/contracts/data-catalogues.md`: `Vehicle.shape`, `Vehicle.color`; `ACTION_GAMES`,
  `PICK_PROMPTS`, `MEMORY_SETS`.

## Save impact

Shape changes: `Character.gender: Gender | null`. `SAVE_VERSION` 6 → 7. Migration 6 → 7 sets
`character.gender` to `null` when missing (we never guess it from the look). Migration test loads
a v6 fixture.

## Content impact

- New fictional pick-the-best-reply prompts (CV lines, interview answers, friend chats, family
  calls), mini-game item sets (office tasks, hustle orders). Friendly, no stereotypes, no real
  people, halal-friendly emoji only (content test covers the emoji list).
- Vehicle names unchanged; sprites are generic body shapes in game palette, never a logo or
  brand-lookalike grille. Prices still labelled fictional.
- Gender labels: "Male / Lelaki", "Female / Perempuan". No gendered gameplay text.

## UI impact

Landing (strip + sheet, compact tiles), DailyBanner (one line plus "My life" exit while running),
Room (toolbar under the room), CharacterCreation (gender picker, re-rolls look from that pool),
LifeScreen showroom and Dashboard snapshot (vehicle sprite), Overlays (ActionGame sheet),
Minigames (shared game components), Settings (toggle). All at 360px.

## Assumptions (in place of developer answers)

- "Make people not aware of it" about the Decor/Style/Games buttons is read as "people do not
  notice them", so the fix makes them more visible.
- "Card in the main dashboard too big" is read as the landing daily card and feature tiles, plus
  the in-game daily banner.
- Old lives get gender `null` (shown as "not set"); no prompt to choose it later.
- Game bonuses are small fictional game values (see the table in `src/data/minigames.ts`).
- Action games do not count toward the 3 rewarded Games-button plays a day.

## As built (differences from the slices below)

- Gender is picked with two buttons at the top of character creation. Picking one re-rolls the
  look from that gender's pool. It is not forced: starting without a pick stores `null`.
- The six game components live in `src/components/minigames/Games.tsx`; `Minigames.tsx` (the
  room's Games picker) now reuses them. The action game sheet is `ActionGame.tsx`, mounted in
  `GameShell.tsx`. `useGame` routes `request` (and `confirmPending`) through it when the action has
  a game and the setting is on.
- `ActionCard` takes an optional `art` node (the vehicle sprite). Unavailable cards with art fade
  instead of going grey, so the paint colour still shows.
- The landing daily strip sits under "Start a new life". The in-run banner gained a "My life"
  button while the run is still going.
- Dashboard's snapshot tile shows the owned vehicle's sprite; Life → Transport shows it large.
- 23 actions have games (the table in `src/data/minigames.ts`); `self-study` was added for a
  small stress relief.

## Slices

### Slice 1: gender in the engine and save v7

Files: `src/engine/types.ts`, `src/engine/newGame.ts`, `src/engine/save.ts`,
`src/engine/appearance.ts`, `src/data/appearance.ts`, `src/engine/dailyChallenge.ts`,
`tests/save.test.ts`, `tests/appearance.test.ts`.

- Produces: `type Gender = 'male' | 'female'`; `Character.gender: Gender | null`;
  `NewGameOptions.gender?: Gender`; `genderLooks: Record<Gender, {...}>`;
  `randomAppearance(seed, gender?)`; `newDailyGame(date, name, appearance, challengeId?, gender?)`.
- Red first: `save.test.ts` "migrates a v6 save to v7 with gender null" (fails: version 6);
  `appearance.test.ts` "gendered looks come from that gender's pool" and "ungendered look is
  unchanged" (fails: no second argument).
- Command: `npx vitest run tests/save.test.ts tests/appearance.test.ts`.

### Slice 2: action games in the engine

Files: `src/data/minigames.ts`, `src/engine/actionGames.ts` (new),
`src/engine/simulationEngine.ts`, `tests/actionGames.test.ts` (new).

- Produces: `ActionGameKind = 'tap' | 'timing' | 'memory' | 'pour' | 'math' | 'pick'`;
  `ACTION_GAMES: Record<string, { kind; theme; bonus: ActionGameBonus }>`;
  `actionGameFor(actionId)`, `gameTier(score)`, `applyActionGame(draft, id, param, score)`;
  `performAction(state, id, param, options?)`.
- Red first: "run with score 100 adds fitness bonus", "score 20 gives no bonus", "no score is
  identical", "invalid score ignored", "apply-job raises application score", "unavailable action
  with score still refused", "deterministic with same score", "every ACTION_GAMES id is a real
  action and every pick/memory theme has content".
- Command: `npx vitest run tests/actionGames.test.ts`.

### Slice 3: vehicle shapes

Files: `src/data/vehicles.ts`, `tests/data.test.ts`, `src/components/VehicleSprite.tsx` (new).

- Red first: `data.test.ts` "every vehicle has a body shape and colour".
- Command: `npx vitest run tests/data.test.ts`.

### Slice 4: game scoring helpers

Files: `src/components/minigames/scoring.ts`, `tests/minigames.test.ts`.

- Produces: `timingScore(offsets: number[])`, `mathScore(correct, wrong, target)`,
  `pickScore(correct, total)`.
- Red first: scoring tests for each (perfect = 100, miss = 0, bounded 0-100).
- Command: `npx vitest run tests/minigames.test.ts`.

### Slice 5: UI

Files: `src/hooks/useGame.tsx` (game step in `request`/`confirmPending`, `act(..., score)`,
setting `actionGames`), `src/components/minigames/Minigames.tsx` (export shared games, themed),
`src/components/minigames/ActionGame.tsx` (new sheet), `src/components/Overlays.tsx` or
`GameShell.tsx` (mount), `src/screens/Landing.tsx`, `src/components/DailyBanner.tsx`,
`src/components/room/Room.tsx`, `src/screens/CharacterCreation.tsx`,
`src/screens/LifeScreen.tsx`, `src/screens/Dashboard.tsx`, `src/screens/SettingsScreen.tsx`,
`src/i18n.ts`.

- Validation: `npm run typecheck`, `npm run build`, `npm run dev` and a 360px check of Landing,
  creation, Home toolbar, an action game (run, apply, study, call friend), showroom.

### Slice 6: docs

`docs/contracts/*` above, `CLAUDE.md` and `AGENTS.md` (status rows, SAVE_VERSION 7, test counts,
`actionGames.ts` in layout), `docs/plans/README.md` untouched.

## Validation

```bash
npm run check
```

Scope boundary: no change to `mcp/`, events catalogue, payroll, economy or balancing numbers
outside the new bonus table.
