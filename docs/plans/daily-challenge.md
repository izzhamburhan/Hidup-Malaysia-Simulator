# Plan: daily challenge

## Why

A reason to come back every day, and something to compare with friends: everyone gets the same
7-day scenario on the same date ("Survive the week on RM50").

## Decisions

- **Seven scenarios** in `src/data/dailyChallenges.ts`: each has new-game options, a
  deterministic `setup(state)` applied once at creation, a goal text, and a pure `won(state)`.
- **Engine** `src/engine/dailyChallenge.ts`: `dailyForDate(dateKey)` picks the scenario and
  seed from the date string (pure hash, so everyone matches); `newDailyGame(dateKey, name,
  appearance)` builds the life (realistic mode, a 7-day chapter) and records the challenge in
  `state.flags` (`daily-id`, `daily-date`, starting net worth and fitness); `dailyStatus(state)`
  reports day, goal met, finished. The date comes from the UI when the game is created, the same
  way the normal new-game seed does; the simulation never reads the clock. **No shape change**
  (flags only), no `SAVE_VERSION` bump.
- **Separate slot, never touches the main life.** New key `hidup-malaysia:daily`;
  `saveGame`, `loadGame` and `clearSave` take an optional key. `useGame` tracks which slot is
  live, autosaves to it, and `exitDaily` reloads the main life when you leave.
- **UI**: a "Today's challenge" card on the landing screen (start, or continue today's run); a
  banner on Home with day n/7, the goal and a tick; when finished, a result with Share.

## Tests (tests/dailyChallenge.test.ts)

1. Same date gives the same scenario and seed; a month of dates uses at least 3 scenarios.
2. `newDailyGame` is deterministic and sets a 7-day chapter and the flags.
3. Every scenario's setup keeps values in bounds and is not already won at the start.
4. `dailyStatus` is null for a normal life; reports finished at day 7.
5. Saving to the daily key leaves the main save untouched.

## Commands

```bash
npx vitest run tests/dailyChallenge.test.ts
npm run check
```