# Analytics contract

Analytics exists to learn whether people enjoy the game (visits, return rate, which features
are used, where players drop off). It must never identify a player.

## Where it lives

- `src/config.ts`: `UMAMI_WEBSITE_ID` (empty = analytics fully off), `UMAMI_SCRIPT_URL`,
  `ANALYTICS_DOMAINS`, `TRACK_ACTIONS`, `FEEDBACK_FORM_URL`, `GAME_URL`. All public values.
- `src/lib/analytics.ts`: `shouldTrack`, `sanitizeEvent`, `initAnalytics`, `track`. UI layer only;
  `src/engine/` never imports it, and nothing is stored in the save.
- Calls: `src/hooks/useGame.tsx` (central gameplay events), `GameShell` (tab views),
  `Tutorial`, `FeedbackSheet`, `ReportScreen` (share).

## Gate

An event is sent only when all of these hold: a website ID is configured, the player has not
opted out (Settings → Privacy), the browser does not send Do Not Track, and the host is not
localhost. Umami also enforces `data-domains`.

## Events (allow-list)

| Event | Fields | When |
| --- | --- | --- |
| `game_start` | `mode`, `stage`, `background` | New life created |
| `action` | `id`, `category`, `source` (`primary`, `tile`, `list`) | A successful action (if `TRACK_ACTIONS`) |
| `event_choice` | `id` (event id), `source` (choice id) | An event resolved |
| `routine` | `source` (`next`, `end_day`, `week`), `days` | Time controls |
| `tab_view` | `tab` | Tab change |
| `day_reached` | `day`, `mode` | In-game day 1, 3, 7, 14, 30, 60, 90, 180, 365 |
| `chapter_end` | `ending`, `day` | Ending locked in |
| `share` | `source` (`native`, `clipboard`), `ending` | Result shared |
| `tutorial` | `step`, `ok` | Tutorial finished or skipped |
| `feedback` | `rating` (1 to 4) or `topic` | Quick feedback |
| `save_import` | `ok` | Backup imported |
| `reset` | none | All data reset |

`sanitizeEvent` drops any other event or field, keeps numbers and booleans, and reduces
strings to at most 40 safe characters. Never add a field carrying the character name, free
text, money amounts, or anything typed by the player. Tests: `tests/analytics.test.ts`.

## Built-in metrics (from Umami itself)

Visitors, visits, page views, visit duration, bounce rate, referrers, countries, browsers,
devices. Umami is cookie-free and does not store IP addresses.
