# Engine API contract

Module: `src/engine/simulationEngine.ts`. This is the only engine surface the UI and the
`hidup-sim` MCP server call. Everything else in `src/engine/` is internal (the UI may also use
pure read helpers such as `formatRM` and the calendar formatters, and `save.ts` for storage).

## Functions

```ts
interface EngineResult { state: GameState; feedback: ActionFeedback }
interface AutopilotResult extends EngineResult { daysSimulated: number; interrupted: boolean }

newGame(options: NewGameOptions): GameState                       // from newGame.ts, re-exported
performAction(state: GameState, actionId: string, param?: string, options?: { gameScore?: number }): EngineResult
resolveEvent(state: GameState, choiceId: string): EngineResult
listActions(state: GameState): ActionView[]
runAutopilot(state: GameState, days: number): AutopilotResult

// Helpers on the same surface
describeAction(state, def, param?): ActionView
viewAction(state, actionId, param?): ActionView | null              // for dedicated screens
currentEvent(state): EventView | null                               // the front pending event
interact(state, kind: 'like' | 'invite' | 'challenge' | 'setting', id, value?): EngineResult  // instant, no game time
endChapter(state): GameState                                        // lock in the top-ranked ending
continueAfterEnding(state): GameState                               // keep living for another 365 days
SAVE_VERSION, PASS_OUT_MINUTES                                      // constants
```

`NewGameOptions`, `GameState` and `ActionFeedback` are defined in `src/engine/types.ts`;
`ActionDef` and `ActionView` in `src/engine/actions/types.ts` (`action-contract.md`); `EventView`
in `src/engine/events.ts` (`event-contract.md`).

### `newGame(options)`

- Builds a complete `GameState` with `version = SAVE_VERSION`, starting on `START_DATE`.
- `options.seed` sets `state.seed` and the initial `state.rng`. The engine never reads the clock;
  when the caller wants a fresh random life it supplies the seed.
- Applies the background and life stage from `src/data/backgrounds.ts`, and enrols or employs
  the character when the options say so.

### `performAction(state, actionId, param?, options?)`

1. Look up the action; unknown id returns `ok: false`, "Unknown action."
2. `describeAction` decides availability. The action is refused, with the **same** input state
   and `ok: false` plus the reason, when: the chapter has ended, an event is pending, the action
   is not visible, `available(state, param)` returns a reason, or `cost` is unaffordable.
3. `structuredClone` the state; all work happens on the draft. Snapshot it.
4. `run(draft, param)` mutates the draft through `core.ts` helpers and domain modules.
   Then, when `options.gameScore` is an integer 0 to 100 and the action has an entry in
   `ACTION_GAMES` (`src/data/minigames.ts`), `applyActionGame` (`src/engine/actionGames.ts`) adds
   that entry's bonus scaled by tier (0-29 none, 30-59 a third, 60-89 two thirds, 90-100 full)
   and the feedback line `Mini-game: <score>`. Bonuses go through clamped helpers and never give
   cash. No score, an invalid score, or an action without a game leaves the result exactly as
   without `options`. Autopilot and the routine step never pass a score.
5. `advanceTime(draft, minutes, { asleep })`; `counters.actions` increments.
6. Unless the action is asleep, roll a random event for its contexts and minutes (`rollRandomEvent`).
7. If energy is at or below 0 (and the action was not sleep), the player passes out:
   `advanceTime` asleep for `PASS_OUT_MINUTES` (6 hours), with a feedback line and a warning log.
8. Post-process: `checkAchievements`, `updateChallenges`, and offer the chapter ending once
   `clock.day >= chapterDays`.
9. `feedback.deltas` are computed by diffing the snapshot with the draft (time, cash, savings,
   debt, EPF, stats, family, friends, partner trust, work performance, calories, skills).

### `resolveEvent(state, choiceId)`

Clones, resolves the front pending event on the draft (`resolvePendingEvent`), post-processes,
and diffs for deltas. An unknown, unaffordable or blocked choice, or no pending event, returns
`ok: false` with the reason and the input state unchanged.

### `listActions(state)`

Returns an `ActionView` for every visible, non-`dedicated` action, one per variant when the
action has `variants`. Unavailable actions are included with `available: false` and a `reason`
(for example "Deal with the current event first."). Pure: no state change, no rng draw.

### `runAutopilot(state, days)`

Lives up to `days` routine days on a fixed policy defined in the engine (eat when hungry, go to an
interview on its day, work or attend class on the right days, study, job-hunt when unemployed and
not studying (at most one application a day, 9 AM to 5 PM, to the best-matching listing, while
fewer than 3 are active and no offer is waiting), gym, keep in touch with a partner, sleep at night,
chill otherwise). It never chooses for the player: offers are never accepted or declined, and it **stops early** when an event becomes pending or
the chapter ends, and reports `interrupted: true`. Refused (same state, `ok: false`) when an event
is already pending or the chapter has ended. Used by tests and `sim_autopilot` for balancing.

## Guarantees

| Guarantee | Meaning |
| --- | --- |
| Input never mutated | Every function returns a new state; the argument is untouched. A test deep-compares the input before and after. |
| Deterministic | All randomness comes from `rng.ts` with `state.rng`. Same state, same call, same result. No `Math.random()`, `Date.now()` or argument-less `new Date()`. |
| Time only via `advanceTime` | No function writes `state.clock` except through `advanceTime` (`time.ts`). |
| Pending events block actions | While an event is pending, `performAction` and `runAutopilot` refuse and only `resolveEvent` changes state. |
| Energy at or below 0 forces sleep | The player passes out for `PASS_OUT_MINUTES`. |
| Bounded values | Stats 0 to 100; wallet cash never negative (obligation shortfalls become overdue debt); EPF never spendable. |
| No throws for player mistakes | Unavailable actions and choices return `ok: false` with a readable `error`. Throws are reserved for programmer errors (for example a duplicate catalogue id). |
| Pure TypeScript | No React, DOM or network. Saving is the UI's job, through `save.ts` (`save-format.md`). |

## Feedback

`ActionFeedback` (`types.ts`): `ok`, `title`, `lines` (player-facing text), `deltas`
(`{ label, value, unit? }` with unit `RM`, `min`, `pt` or `kcal`), and `error` when `ok` is false.
The UI shows it as is; it never computes its own deltas.

## One-tap play helpers

Added for the Home play screen (plan: `docs/plans/one-tap-play-and-pages.md`).

| Function | Module | Contract |
| --- | --- | --- |
| `chooseRoutineStep(state)` | `simulationEngine.ts` | Pure. Returns the routine's next move: `{ kind: 'action', id, param?, once? }`, `{ kind: 'sleep' }` (sleep until about 7 AM, at least 6 h), `{ kind: 'wake' }` (before 6 AM: sleep until 7 AM) or `{ kind: 'wait' }` (one hour). Only returns actions whose `describeAction` view is available. |
| `chooseRoutineStep(state)` | `simulationEngine.ts` | Pure. Returns the routine's next move: `{ kind: 'action', id, param?, once? }`, `{ kind: 'sleep' }` (sleep until about 7 AM, at least 6 h), `{ kind: 'wake' }` (before 6 AM: sleep until 7 AM) or `{ kind: 'wait' }` (one hour). Only returns actions whose `describeAction` view is available. Job listings are ranked by `listingsByMatch` (`career.ts`), the same ranking `bestListing` uses. |
| `runRoutineStep(state)` | `simulationEngine.ts` | The "Next" button. Same result shape and guarantees as `performAction` (input not mutated, deterministic, events roll, achievements update). Fails with the engine's reason when an event is pending or the chapter has ended. `runAutopilot` is built from the same chooser. |
| `primaryAction(state)` | `insights.ts` | Pure. The single most sensible available `ActionView` right now (rest when exhausted, eat when starving, interview, offer, work or class, sleep at night, assignment, side hustle, best job application), or `null` when the routine step is the best move. |
| `quickActions(state)` | `insights.ts` | Pure. At most six unique `ActionView`s for the play tiles, available ones first. Meal tiles carry the dish's emoji. |
| `mealFor(state)`, `bestListing(state)` | `insights.ts` | Pure helpers: a time-appropriate meal; the highest-match job listing the player can apply for now. |

## Pixel characters

`NewGameOptions.appearance?: Appearance` sets the player's look; an invalid or missing value
falls back to `randomAppearance(seed)`. Helpers in `src/engine/appearance.ts` (pure, cosmetic,
own generator, never touch `state.rng`): `randomAppearance(seed)`, `appearanceFromName(name)`
(stable NPC faces), `isValidAppearance(value)`, `moodOf(state)` (`happy`, `neutral`, `tired`,
`stressed`, `unwell` from health, energy, stress and happiness).