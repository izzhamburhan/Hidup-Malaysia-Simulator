# Plan: richer, still private analytics (money bands, home state, session summary)

## Why

Today Umami records which actions are used and when players reach milestone days, but it cannot answer
"how much do players have saved by day 30?" or "which home states do players pick and what happens next?".
Per-action events also eat the free Umami quota. The developer agreed to: money in **bands**, character
choices (home state, background, stage), a **session summary** instead of one event per action, feature and
account counts, and technical-health counts.

## Decisions

- **Rule change (developer-approved):** analytics may carry the character's game choices and **coarse bands**
  of money (for example `rm2k-10k`). It still never carries the character name, free text, exact money, save
  contents, timestamps or anything identifying. `CLAUDE.md`, `AGENTS.md`, `docs/contracts/analytics.md` and the
  privacy note change in the same patch.
- **No new data store.** Everything goes through the existing Umami events, so the gate (configured, not opted
  out, not Do Not Track, not localhost) is unchanged. Umami already attaches country, region, device, browser, OS,
  language, screen size and referrer to every event by itself; we only add the in-game side and `lang`, `installed`
  (home-screen app) and `signed_in`.
- **`day_reached` gains the snapshot** (one event per milestone day instead of two): `mode`, `stage`, `background`,
  `home_state`, `residence`, `cash_band`, `savings_band`, `epf_band`, `debt_band`, `networth_band`, `employed`,
  `job`, `edu`, `housing`, `vehicle`, `partner`, `pet`, `health_band`, `happiness_band`, `stress_band`, `lang`,
  `installed`, `signed_in`, `lives`. A pure function `lifeSnapshot(state, ctx)` builds it.
- **Bands:** fixed edges, labels like `rm0-100`, `rm10k-plus`, `neg`, `none`. The sanitiser accepts any field ending in
  `_band` only as a short lowercase label, so a number can never slip through as money.
- **Session summary** (`session` event, sent when the tab is hidden, at most once per hide, never when empty):
  `actions`, `events`, `games`, `days`, `minutes`, `top1` to `top3` (most-used action ids) and `mix` (top action
  categories with counts). `TRACK_ACTIONS` becomes `false` by default (the per-action event stays available).
- **New small events:** `create` (`source: open`, for the drop-off before a life starts), `account` (`source`:
  `signin`, `signout`, `guest`, `delete_cloud`), `life` (`source`: `new_extra`, `switch`, `delete`, with `lives`),
  `problem` (`source`: `save_failed`, `save_corrupt`, `cloud_<reason>`; never error text).
- **Two small fixes found in testing:** the account sheet inherited white text from the landing banner (the name was
  unreadable), and a Firestore "permission denied" showed as "could not reach the cloud". It now says the cloud
  rules are not set up.
- **Engine, save format and `SAVE_VERSION` untouched.** UI layer and docs only.

## Out of scope

Reading players' saves from Firestore (needs its own notice and consent), a separate analytics database, geolocation
by us (Umami's IP-based region report is used as is).

## Test-first slices

1. `tests/analyticsSnapshot.test.ts`: band edges and labels, and that the snapshot carries the choices and bands but
   never the name or an exact amount.
2. `tests/sessionStats.test.ts`: counting, top-3 ordering and ties, mix string, minutes, empty returns null, reset.
3. `tests/analytics.test.ts` (extended): the new events and fields pass, numbers in `_band` fields and unknown
   money fields are dropped, strings stay short and safe.
4. Wiring (no new logic): `useGame` (snapshot on milestones, session counters and flush, `life`, `problem`),
   `CharacterCreation` (`create`), `useCloud` (`account`, `problem`, permission message), `Landing` (`guest`), config
   `TRACK_ACTIONS = false`, account sheet text colour, strings.
5. Docs: analytics contract, `CLAUDE.md`, `AGENTS.md`, privacy note, status.

## Commands

```bash
npx vitest run tests/analyticsSnapshot.test.ts tests/sessionStats.test.ts tests/analytics.test.ts
npm run check
```