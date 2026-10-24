# Plan: ending collection

## Why

Replay value: every life ends in one of 10 endings. Show which ones you have found across all
your lives, with "???" and a hint for the rest, so there is always a reason to try another life.

## Decisions

- **Across lives, so not in the life save.** A new LocalStorage key
  `hidup-malaysia:collection` holds `{ version: 1, endings: { [id]: { count, firstName } } }`.
  Read and written only by `save.ts` (`loadCollection`, `saveCollection`), with a pure
  `recordEnding(collection, endingId, name)`. A bad value falls back to an empty collection and
  never crashes. `GameState` is unchanged; no `SAVE_VERSION` bump. Contract keys updated.
  "Reset all game data" clears it too.
- **Recorded when the player locks in an ending** (`finishChapter` in `useGame`).
- **Hints are data**: `EndingDef.hint` in `src/engine/endings.ts`.
- **UI**: an "Ending collection" grid on the Goals screen (found / 10), and the Report screen
  says "New ending found! n/10" the first time.

## Tests (tests/collection.test.ts)

1. `recordEnding` adds a first find and counts repeats, without mutating its input.
2. Round trip through an in-memory storage.
3. Corrupt JSON, wrong shape, or unknown ending ids load as an empty / cleaned collection.
4. Every ending has a hint.

## Commands

```bash
npx vitest run tests/collection.test.ts
npm run check
```