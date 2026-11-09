# Cloud save and lives contract

Two related things, both UI layer only (the simulation engine imports none of it and `SAVE_VERSION` is
unaffected):

1. **Several lives** on one device: starting a new life never replaces an old one.
2. **Optional Google sign-in** that keeps every life in the cloud. **Guest play is the default and is
   unchanged:** no sign-in is required, nothing is uploaded and no Firebase code loads for a guest.

Code: `src/lib/lives.ts` (library rules and storage), `src/lib/cloudSync.ts` (pure sync decisions),
`src/lib/cloud.ts` (client over an injected store), `src/lib/cloudScheduler.ts` (debounced push),
`src/lib/firebaseClient.ts` (the real Firebase adapter, loaded with dynamic `import()`),
`src/hooks/useGame.tsx` (start, switch, delete, `applyLibrary`), `src/hooks/useCloud.tsx` (wiring),
`src/components/AccountCard.tsx`, `src/components/GoogleButton.tsx`, `src/components/UserAvatar.tsx`,
`src/screens/Landing.tsx` (UI). Rules: `firestore.rules`. Config: `FIREBASE_CONFIG` in `src/config.ts`.

## Lives on this device

- `hidup-malaysia:save` is the **current life** (unchanged, so existing saves load as before).
- `hidup-malaysia:shelf` holds the others: `{ version: 1, lives: { [lifeId]: <save envelope text> }, deleted: { [lifeId]: <ISO time> } }`.
  `deleted` remembers local deletions so the cloud can be told.
- A life's id is `GameState.id`. The daily-challenge slot is never part of the library.
- **At most `MAX_LIVES` = 3** lives at once (current plus shelved).
- Starting a new life shelves the current one first (`startNewLife`). When three are held it is refused;
  the landing page then asks the player to delete one, with a confirmation. Nothing is overwritten silently.
- `switchToLife` swaps the current and a shelved life. `deleteLife` removes a life and records a deletion time.
- Importing a save still replaces the current life only (unchanged).
- The library is written shelf first, then the current life, so an interrupted write can duplicate a life
  (harmless, same id) but never lose one. A broken or missing shelf reads as empty.

## What is stored in the cloud

Firestore documents `users/{uid}/lives/{lifeId}` (the Google user id; no email or name is stored):

| Field | Meaning |
| --- | --- |
| `save` | The same envelope text LocalStorage holds. A string, because Firestore rejects nested arrays. |
| `savedAt`, `version`, `lifeId`, `day`, `name` | A summary of the save, used to decide a sync without parsing it. `lifeId` equals the document id. |
| `deleted` (optional) | `true` for a deletion marker: `save` is empty and `savedAt` is the deletion time. |

Measured size: about 47 KB per life after three in-game years (about 10 KB gzipped), far below Firestore's
1 MiB document limit; the rules refuse a `save` of 900,000 characters or more. Only lives are synced:
never the daily-challenge slot, settings or the endings collection.

## Local sync key

`hidup-malaysia:cloud` holds `{ signedIn, lastSynced: { [lifeId]: <iso> }, lastRunAt }`: whether to restore
the session quietly, the save time both sides last agreed on for each life, and when a sync last finished.
A missing, broken or old-shaped value means signed out and never synced. Cleared by "Reset all game data".

## Sync rules (`planSync`, per life)

Inputs: every local life, local deletions, every cloud entry, the last agreed time per life, the app's
`SAVE_VERSION`. Output: one action per life, sorted by id.

1. Only here: **upload**. Only in the cloud: **download** (added to the shelf, never replacing another life).
2. On both sides: `decideSync` on that life. A cloud save from a newer app version is **refused**; the same save
   time is **same**; otherwise compare each side with the last agreed time: only local changed, **upload**; only
   cloud changed, **download**; both changed or never synced and different, **conflict**.
3. A cloud deletion marker removes the local life (**delete-local**) unless it was changed after the deletion
   (then it is uploaded again). A local deletion removes the cloud life (**delete-cloud**, a marker is written)
   unless the cloud life changed after it (then it is downloaded again).
4. An unreadable cloud document is left alone (**corrupt**).

A conflict is never resolved silently: the player picks "keep this device" or "use the cloud" for each life, one
at a time, and the sheet says the other copy is replaced.

Applying a sync: downloaded lives go through `adoptCloudLife` (the same life is replaced where it is; a new life
goes to the shelf if there is room, otherwise it is **skipped** and stays in the cloud, and the player is told). If a
device ends with lives but no current one, the most recently saved life becomes current. Everything is written with
one `applyLibrary` call so the screen and LocalStorage agree.

## Behaviour

- Downloads go through `deserialize`, so older cloud saves are migrated like any load; a corrupt or too-new cloud
  save is reported and never replaces a local one.
- While playing only the current life changes, so the debounced push (about 20 seconds after the last autosave, one
  at a time, flushed when the tab is hidden) uploads just that life. A brand-new life uploads straight away.
  Starting, switching or deleting a life runs a full sync at once. No push while signed out, in the daily slot,
  before the first sync finished, or while a conflict is open.
- Errors (offline, blocked pop-up, bad save) come back as values and show a message with the technical reason; the
  local game is never affected and never crashes.
- Sign out cancels pending pushes and forgets the per-life sync state. "Delete my cloud data" deletes every
  document of the user (lives and deletion markers), then signs out; lives on this device are untouched.

## Privacy and security

- The Firebase web config is public by design; `firestore.rules` is what protects data: a signed-in player can
  read, write and delete only `users/{their uid}/lives/*`, only the allowed fields, everything else is denied.
  Players who turn on real-player friends also get a public friend card, a friend code, friend links, an inbox and
  chats; those documents and their rules are in `friends-online.md`. "Delete my cloud data" removes them too.
- Only Authentication (Google) and Firestore are used. **Firebase Analytics is never imported**; analytics stays the
  opt-out Umami setup in `analytics.md`.
- The player's Google name and profile picture address come from the sign-in session and are shown on this device
  only (corner avatar, account sheet, Settings). They are never written to Firestore or LocalStorage by us.
- The landing page shows the welcome dock (a darker band inside the hero, `WelcomeDock`) with "Sign in with Google"
  and "Continue as guest". Choosing guest only sets `Settings.cloudPromptDismissed`: the band folds away and a small
  "G Sign in" pill stays at the hero's top-left, opposite the EN/BM toggle. Signed in, that spot holds a pill with your
  Google picture and first name (tap it for the account sheet).
- The privacy note and Settings explain the optional upload and the delete button.

## Tests

`tests/lives.test.ts` (library rules, cap, tombstones, storage), `tests/cloudSync.test.ts` (`decideSync`, `planSync`,
summaries, initials), `tests/cloudClient.test.ts` (per-life push, list, pull, delete-all, local state, failures),
`tests/cloudScheduler.test.ts` (debounce, flush, overlap, cancel). The React wiring (`useGame`, `useCloud`, screens)
has no unit tests; it is checked by hand in the browser.
