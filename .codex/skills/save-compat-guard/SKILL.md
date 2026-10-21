---
name: save-compat-guard
description: Use when a HIDUP MALAYSIA change adds, removes, renames, or retypes a GameState field, or touches src/engine/save.ts, SAVE_VERSION, migrations, or the LocalStorage keys. Keeps every existing player's save loading and the app crash-free on bad saves.
---

# Save Compatibility Guard

Players keep their lives in LocalStorage. A careless shape change wipes them or crashes the
app. The facts live in `AGENTS.md` (Save and versioning) and `docs/contracts/save-format.md`.

## Is this a shape change?

Yes if any of these change in `src/engine/types.ts`: a field added, removed, renamed, retyped, or
made required on `GameState` or anything nested in it (finance, career, events, settings, and so
on); a union widened or narrowed that saves store (for example a new `DebtKind`); the meaning of
a stored number (units, scale). Adding a catalogue entry is not a shape change, unless saves
store something that must now resolve against it.

## When the shape changes

1. Bump `SAVE_VERSION` in `src/engine/newGame.ts` by exactly one; `newGame` then produces the new version.
2. Update `emptyState()` in `newGame.ts` so the new fields have defaults (`save.ts` deep-fills missing fields from it, as a safety net only).
3. Add a migration to `migrations` in `src/engine/save.ts` from the previous version to the new one. It fills new fields with sensible defaults, converts renamed or retyped fields, and never uses randomness or the wall clock.
4. Add a fixture of the previous shape in `tests/` and a test that loads it, migrates it, and checks the new fields. Keep old fixtures; the chain must migrate from version 1 to current.
5. Update `docs/contracts/save-format.md` (version history) in the same change.

## Never crash on a bad save

- Unparseable JSON, a missing envelope, an unknown future version, or a migration that throws: back up the raw text to `hidup-malaysia:save:corrupt`, return "no save" with a reason, and let the UI show a clear message and a fresh start.
- Loading never throws into React. A test covers each of: invalid JSON, wrong envelope, future version.
- Settings (`hidup-malaysia:settings`) load independently; a bad settings value falls back to defaults.

## Storage rules

- Keys are exactly those in the contract. Do not add keys without updating it.
- Store only what the game needs. No personal data beyond the player-chosen name.
- `save.ts` receives a `Storage`-like object; tests use an in-memory one. Wrap storage access in try/catch (private mode and quota errors).
- `savedAt` is metadata only; the simulation never reads it.

## Checks

1. Diff `src/engine/types.ts`. If it changed, decide "shape change: yes/no" and write it in the plan.
2. If yes: version bumped, migration added, migration test added and green, contract updated.
3. Run the corrupt-save tests.
4. Report the old and new `SAVE_VERSION` in the handoff.

## Red flags

| Thought | Reality |
| --- | --- |
| "It is an optional field, old saves are fine." | Code that reads it will meet `undefined`. Migrate it to a default and test. |
| "Nobody has a save yet." | Players will. The chain starts at version 1 and stays intact. |
| "I'll just reset the save if it fails." | Back it up to the corrupt key first, and tell the player. |
| "I'll skip the fixture, the migration is obvious." | The fixture is the only proof old saves load. |
