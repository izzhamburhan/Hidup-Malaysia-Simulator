# Save format contract

Module: `src/engine/save.ts`. Saves live only in the player's browser (LocalStorage). There is no
server copy and no account.

## Keys

| Key | Holds |
| --- | --- |
| `hidup-malaysia:save` | The current life, as a save envelope (JSON). |
| `hidup-malaysia:settings` | Player settings (JSON, the `Settings` type in `src/hooks/useGame.tsx`): reduced motion, analytics opt-out, tutorial seen, sound, vibration, language (`en` or `ms`). Independent of the save. |
| `hidup-malaysia:collection` | Endings found across every life (JSON `EndingCollection`: `{ version: 1, endings: { [id]: { count, firstName } } }`). Read and written by `loadCollection` / `saveCollection` in `save.ts`; a bad value loads as empty, unknown ending ids are dropped. Cleared by "Reset all game data". |
| `hidup-malaysia:daily` | Today's daily-challenge run, a save envelope like `hidup-malaysia:save` but in its own slot so it never replaces the main life. Loaded only when its `flags['daily-date']` is today. A corrupt daily save is backed up and removed without touching the main save. |
| `hidup-malaysia:save:corrupt` | The raw text of the last save that could not be loaded, kept so it is never silently lost. |

No other keys. Adding one updates this table in the same change.

## Envelope

```ts
interface SaveEnvelope {
  version: number;   // SAVE_VERSION the state was written with
  savedAt: string;   // ISO 8601 timestamp; metadata only, never read by the simulation
  state: GameState;  // state.version === version
}
```

`SAVE_VERSION` is defined in `src/engine/newGame.ts` (re-exported by `simulationEngine.ts`).
**Current value: 1.** Key constants in `save.ts`: `SAVE_KEY`, `SETTINGS_KEY`, `CORRUPT_KEY`.

## API (`save.ts`)

```ts
interface StorageLike { getItem(k): string | null; setItem(k, v): void; removeItem(k): void }
type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; state: GameState; savedAt: string; migrated: boolean }
  | { status: 'corrupt'; error: string };

saveGame(storage: StorageLike, state: GameState, savedAt: string): boolean   // false on a failed write
loadGame(storage: StorageLike): LoadResult
clearSave(storage: StorageLike): void
serialize(state, savedAt): string;  deserialize(text): LoadResult           // pure
migrate(raw): GameState;  isValidState(value): value is GameState;  migrations
```

## Writing

- The UI saves after every successful `performAction`, `resolveEvent`, `interact` and `runAutopilot` (autosave), and on new game. The UI supplies `savedAt` (an ISO timestamp).
- Storage is injected: the browser passes `window.localStorage`, tests pass an in-memory store. The engine never touches `localStorage` directly.
- `saveGame` catches write errors (quota, private mode) and returns `false`; the UI shows a warning. It never crashes the game.

## Loading (`loadGame` and `deserialize`)

1. Read `hidup-malaysia:save`. Missing, or storage unavailable: `{ status: 'empty' }`, start the new-game flow.
2. Parse JSON. Missing `state`: corrupt.
3. Take the version from `state.version` (missing means 0, a pre-release save).
4. `migrate`: a version newer than `SAVE_VERSION` throws (never downgrade); otherwise run `migrations[v]` step by step up to `SAVE_VERSION`; a missing step throws.
5. Deep-fill any still-missing fields from `emptyState()` so older saves never crash the UI.
6. `isValidState` checks the essentials (clock, cash, energy, name, mode). Fails: corrupt.
7. Any exception in 2 to 6 becomes `{ status: 'corrupt', error }`.
8. On corrupt, `loadGame` copies the raw text to `hidup-malaysia:save:corrupt` and removes `hidup-malaysia:save`, so the bad save is kept but no longer loaded.

Loading never throws into React. The UI shows a friendly message ("Your save could not be read,
so a copy was kept and a new life is ready") and offers a fresh start.

## Migrations

```ts
// migrations[n] upgrades a save from version n to version n + 1.
export const migrations: Record<number, Migration> = {
  0: (s) => ({ ...s, events: { scheduled: [], ...s.events }, version: 1 }),  // pre-release saves
};
```

- One migration per version step; the chain always runs from the save's version to `SAVE_VERSION`.
- A migration fills new fields with sensible defaults, converts renamed or retyped fields, and sets `version`. It uses no randomness and no wall clock.
- The deep-fill from `emptyState()` is a safety net, not a substitute: renames, retypes and changed meanings need an explicit migration.
- Each migration has a test that loads a fixture of the old shape (kept in `tests/`) and checks the result. Old fixtures are never deleted.

## When to bump

Any change to the shape of `GameState` or anything nested in it: a field added, removed, renamed,
retyped, or made required; a stored union changed; the meaning or unit of a stored number changed.
Bump `SAVE_VERSION` in `newGame.ts` by exactly one, update `emptyState()`, add the migration and its test, and add a row below. See `save-compat-guard`.

## Version history

| Version | Change |
| --- | --- |
| 0 | Pre-release saves without `state.version` or `events.scheduled`; migrated to 1. |
| 1 | Initial save format. |
| 2 | Adds `character.appearance` (pixel characters). |
| 3 | Adds `pet` (Oyen the cat), `null` until the player adopts one. |
| 4 | Adds `decor` (`owned` ids and `placed` by slot) for the Home room. |
| 5 | Widens `Outfit` and `Headwear` with wardrobe unlocks; no data change. |

## Privacy

The save holds only game state: the player-chosen name, choices, and simulated numbers. No
personal data beyond that name, no analytics, nothing sent anywhere.

## Version 2 (pixel characters)

`migrations[1]` upgrades a version-1 save to version 2 by adding `character.appearance`
(`Appearance` in `src/engine/types.ts`). An old save gets a deterministic look from
`randomAppearance(state.seed)`; a save that already holds a valid appearance keeps it.
Appearance is cosmetic and never feeds the simulation. Test: `tests/save.test.ts`
("migrates version-1 saves by adding a pixel character appearance").

## Version 3 (pets)

`migrations[2]` upgrades a version-2 save to version 3 by adding `pet: null` (`Pet` in
`src/engine/types.ts`). Existing lives start without a cat; the player can adopt one from the
Act screen or the `stray-oyen` event. Test: `tests/pet.test.ts` ("migrates a version-2 save to a
life without a pet").

## Version 4 (home decor)

`migrations[3]` upgrades a version-3 save to version 4 by adding `decor: { owned: [], placed: {} }`.
`placed` maps a `DecorSlot` (`wall`, `left`, `right`, `centre`) to an owned id from
`src/data/decor.ts`. Test: `tests/decor.test.ts` ("migrates a version-3 save to empty decor").

## Version 5 (wardrobe)

`Outfit` gains `jersey`, `batik`, `grad-gown`, `chef`, `suit`, and `Headwear` gains `grad-cap`,
`helmet`, `crown`, unlocked by achievements (`lockedOutfits` / `lockedHeadwears` in
`src/data/appearance.ts`). Every version-4 look is still valid, so `migrations[4]` only sets the
version. `isValidAppearance` accepts base and unlockable items. Test: `tests/wardrobe.test.ts`
("migrates a version-4 save without changing the look").
