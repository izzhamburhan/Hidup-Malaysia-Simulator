# Plan: keep several lives (starting a new life no longer replaces the old one)

## Why

Starting a new life overwrites the only save. Players want to try another background without losing
the character they have grown. Decided by the developer: at most **3 lives** at once, and signed-in
players get **all** their lives in the cloud.

## Decisions

- **Storage keeps today's save untouched.** `hidup-malaysia:save` stays the *current life*, so every
  existing player's game loads exactly as before: no migration, **`SAVE_VERSION` stays 9**, and the
  engine is not touched. New key `hidup-malaysia:shelf` holds the other lives:
  `{ version: 1, lives: { [lifeId]: <save envelope text> }, deleted: { [lifeId]: <ISO time> } }`.
  `deleted` records local deletions so the cloud can be told (a tombstone), and is tiny.
- **Pure library operations** (`src/lib/lives.ts`): `startNewLife` (shelves the current life, sets the new
  one, refuses when 3 are held), `switchToLife` (swaps current and shelved), `deleteLife` (records a
  tombstone), `adoptCloudLife` (a downloaded life: replaces the same id, otherwise goes to the shelf if there
  is room, otherwise is skipped and counted), plus `loadLibrary` / `saveLibrary` over an injected storage.
  The id of a life is `GameState.id`; the daily-challenge slot is never part of the library.
- **Starting a new life** shelves the current one first. If 3 lives are held, the landing page explains and
  lets the player delete one (with a confirmation); nothing is ever overwritten silently.
- **Landing page**: a "Your lives" list (name, day, cash, time saved) with Continue on the current life,
  Switch on shelved lives, and a delete button with a confirmation. Importing a save still replaces the
  current life only (unchanged, out of scope).
- **Cloud: one Firestore document per life**, `users/{uid}/lives/{lifeId}`, with the same fields as before plus an
  optional `deleted` flag (a tombstone: `save` is empty). The single `users/{uid}` document of the first cloud
  release is abandoned (only the developer's test data used it). `firestore.rules` changes, so the
  developer must publish them again.
- **Sync is per life** (`planSync`, pure, reusing `decideSync`): a life only on one side is uploaded or
  downloaded (added, never replacing another life); the same life on both sides compares save times against
  the last agreed time for that life; both changed is a conflict, asked per life. A cloud tombstone deletes the
  local life unless it was changed after the deletion; a local tombstone deletes the cloud copy unless the
  cloud life changed after it. A cloud life that does not fit in the 3 local slots is left in the cloud and the
  player is told. A newer-version cloud life is never loaded or overwritten.
- **Pushes**: only the current life changes while playing, so the debounced push covers just that life.
  Starting, switching or deleting a life runs a full sync straight away.
- **Delete my cloud data** removes every life document in the cloud and signs out; local lives stay.
- **Local sync state** `hidup-malaysia:cloud` becomes `{ signedIn, lastSynced: { [lifeId]: iso }, lastRunAt }`
  (a missing or old-shaped value reads as never synced, which is safe).

## Out of scope

Renaming lives, reordering, importing into a free slot, syncing the endings collection or settings, and
deleting the Firebase Auth user from the app.

## Assumptions (no answer from the developer)

- When two devices together hold more than 3 lives, each device lists at most 3 and the rest wait in the cloud.
- The same life id on two devices is the same life (ids come from a random seed, so a clash is vanishingly rare).

## Test-first slices

1. `tests/lives.test.ts`: the pure library operations, the cap, tombstones, adopting cloud lives, and
   load/save over a fake storage including broken values.
2. `tests/cloudSync.test.ts` (extended): `planSync` for every case above.
3. `tests/cloudClient.test.ts` (rewritten): per-life push, tombstone, list, pull, delete-all over a fake store.
4. Wiring (no new logic): `useGame` (start shelves, `switchLife`, `deleteLife`, `applyLibrary`), `useCloud`
   (per-life sync, conflict queue), the landing "Your lives" list and the full-slots sheet, EN and BM strings,
   check at 360px.
5. Docs: `firestore.rules`, `docs/contracts/cloud-save.md`, `docs/contracts/save-format.md`, `CLAUDE.md`,
   `AGENTS.md`, status rows.

## Commands

```bash
npx vitest run tests/lives.test.ts tests/cloudSync.test.ts tests/cloudClient.test.ts
npm run check
npm run dev   # then check at 360px: start a second life, switch, delete, sign in on two browsers
```