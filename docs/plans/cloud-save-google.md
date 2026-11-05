# Plan: optional Google sign-in with cloud save (guest stays the default)

## Why

Saves live only in one browser's LocalStorage. Clear site data, change phone or browser and the
life is gone. Players asked for a way to keep progress. Guest play must stay exactly as it is.

## Decisions

- **Provider: Firebase on the free Spark plan** (Authentication with Google, Cloud Firestore in
  `asia-southeast1`). No server of ours. Supabase was rejected: its free projects pause after about
  a week of inactivity, which would make cloud saves fail for a quiet game.
- **Guest is the default and unchanged.** No sign-in prompt blocks play. LocalStorage stays the
  source the game reads and writes; the cloud is a copy.
- **What is stored**: one Firestore document `users/{uid}` with `save` (the same JSON envelope string
  the game already writes), `savedAt`, `version`, `lifeId`, `day`, `name`. The save is stored as a
  string on purpose: Firestore rejects nested arrays, which `GameState` contains. Measured size: about
  47 KB after 3 in-game years (10 KB gzipped), far under the 1 MiB document limit. Only the main
  life syncs; the daily-challenge slot never does. We store the Google user id as the key and read
  no email or name for storage (the display name is shown locally only).
- **Sync rules** (pure function `decideSync`, in `src/lib/cloudSync.ts`):
  - no cloud save: upload; no local save: download;
  - same life, only one side changed since the last sync: newer side wins;
  - both changed since the last sync, or different lives: ask the player ("Use this device" or
    "Use cloud save", with day, name and time shown). Nothing is overwritten silently.
- **Writes are debounced** (about 20 s after the last autosave, plus when the tab is hidden), so a
  busy player stays far below the free quotas. No sync in the middle of an event the player cannot undo
  beyond what autosave already does.
- **Engine untouched, `SAVE_VERSION` stays 9.** All code is UI layer (`src/lib/`, `src/hooks/`,
  `src/screens/`, `src/components/`). A cloud save older than the app goes through the existing
  `deserialize` migrations on download; a cloud save from a newer app version is refused with a
  message, never loaded.
- **Firebase loads lazily** (dynamic `import()`), only when the player taps Sign in or is already
  signed in, so guests pay nothing in bundle size or network.
- **No Firebase Analytics.** The Firebase snippet includes `getAnalytics`; we do not import it. The
  privacy rule (cookie-free, allow-listed Umami only) is unchanged for analytics.
- **Security**: `firestore.rules` in the repo: a signed-in user may read and write only
  `users/{their uid}`, `save` must be a string under 900,000 characters, nothing else is allowed. The
  Firebase web config is public by design (identifies the project; rules protect the data) and lives in
  `src/config.ts`.
- **Player controls** in Settings: Account card with Sign in with Google, Sync now, Last synced,
  Sign out, and "Delete my cloud data" (deletes the document, with a confirmation; local save stays).
- **Docs change**: `CLAUDE.md` and `AGENTS.md` "no account" becomes "optional Google sign-in for
  cloud save; guest is the default"; new contract `docs/contracts/cloud-save.md`; privacy contract,
  Settings privacy notice and `save-format.md` updated.

## Out of scope

- Leaderboards, friends, multi-device live sync, email login, deleting the Firebase Auth user from
  the app (the player can remove it from their Google account permissions).
- The daily-challenge slot, the endings collection and settings are not synced in this change
  (endings collection is a possible follow-up).

## Assumptions (no answer from the developer yet)

- Popup sign-in (`signInWithPopup`) first. Installed iPhone home-screen apps can block popups; if
  testing shows it, a redirect fallback is a follow-up, and the sign-in card says to use the browser.
- Authorised domain `hidupmalaysia.com` and the Firestore rules are added by the developer in the
  Firebase console (the repo ships `firestore.rules` to paste).

## Test-first slices

1. **Decision logic** (`tests/cloudSync.test.ts`): `decideSync` for every case above, plus
   `cloudMeta` summary and "newer app version" refusal. Red first.
2. **Cloud client** (`tests/cloudClient.test.ts`): `src/lib/cloud.ts` takes an injected store
   (`get`, `set`, `delete`); tests use an in-memory fake: upload writes the envelope string and
   metadata, download validates through `deserialize`, corrupt cloud data is rejected and never
   replaces the local save, delete removes the document.
3. **Debounced push** (`tests/cloudScheduler.test.ts`, fake timers): many autosaves cause one write;
   a write on `visibilitychange` hidden; no write while signed out or in the daily slot.
4. **Hook and UI**: `useGame` wiring (sign in, pull on sign in, push after autosave, conflict sheet),
   `AccountCard` in Settings, small "Save to the cloud" card on Landing, EN and BM strings, check at
   360px. Component logic stays thin; decisions live in slice 1.
5. **Docs, rules, config**: contract, `firestore.rules`, `CLAUDE.md`, `AGENTS.md`, privacy text,
   `src/config.ts` (`FIREBASE_CONFIG`, `CLOUD_SAVE_ENABLED`).

## Commands

```bash
npx vitest run tests/cloudSync.test.ts tests/cloudClient.test.ts tests/cloudScheduler.test.ts
npm run check
npm run dev   # then check at 360px, signed out and signed in
```