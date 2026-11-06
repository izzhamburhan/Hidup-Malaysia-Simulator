# Analytics contract

Analytics exists to learn whether people enjoy the game (visits, return rate, which features
are used, where players drop off). It must never identify a player.
are used, where players drop off, roughly how the money side plays out). It must never identify
a player.

## Where it lives

- `src/config.ts`: `UMAMI_WEBSITE_ID` (empty = analytics fully off), `UMAMI_SCRIPT_URL`,
  `ANALYTICS_DOMAINS`, `TRACK_ACTIONS`, `FEEDBACK_FORM_URL`, `GAME_URL`. All public values.
  `ANALYTICS_DOMAINS`, `TRACK_ACTIONS` (default `false`), `FEEDBACK_FORM_URL`, `GAME_URL`. All public values.
- `src/lib/analytics.ts`: `shouldTrack`, `sanitizeEvent`, `initAnalytics`, `track`. UI layer only;
  `src/engine/` never imports it, and nothing is stored in the save.
- Calls: `src/hooks/useGame.tsx` (central gameplay events), `GameShell` (tab views),
  `Tutorial`, `FeedbackSheet`, `ReportScreen` (share).
- `src/lib/analyticsSnapshot.ts`: `lifeSnapshot`, `bandOf`, `statBand`: what a milestone event says about a life.
- `src/lib/sessionStats.ts`: the in-memory tally behind the `session` event.
- Calls: `src/hooks/useGame.tsx` (milestones, session, life, problem), `src/hooks/useCloud.tsx` (account,
  problem), `CharacterCreation` (create), `Landing` (guest), `GameShell` (tab views), `Tutorial`, `FeedbackSheet`,
  `ReportScreen` (share).

## Cloudflare Web Analytics

`CLOUDFLARE_BEACON_TOKEN` in `src/config.ts` (empty = not loaded). The beacon (`cloudflareBeaconAttrs`) adds page views,
referrers, countries, devices and Core Web Vitals with no event cap. It has no custom events, so nothing from the allow-list
below goes to it. It loads only under the Gate below and is cookie-free. Umami stays the only sink for events.

## Gate

An event is sent only when all of these hold: a website ID is configured, the player has not
opted out (Settings → Privacy), the browser does not send Do Not Track, and the host is not
localhost. Umami also enforces `data-domains`.

## What may and may not be sent

- **Allowed:** the character's game choices (home state, background, life stage, mode), game content ids (action,
  event, job, housing), counts, flags, and **coarse money bands** (`rm0-100`, `rm2k-10k`, `rm10k-plus`, `neg`, `none`).
  A field whose name ends in `_band` is accepted only as a short lowercase label, so a number can never pass as money.
- **Never:** the character name, free text, exact money amounts, save contents, timestamps, error text, or anything
  typed by the player. `sanitizeEvent` drops every field that is not on the allow-list.
- **No new data store.** Everything goes through Umami events. Umami itself adds country, region, device, browser, OS,
  language, screen size and referrer to each event; we do not collect those ourselves.

## Events (allow-list)

| Event | Fields | When |
| --- | --- | --- |
| `game_start` | `mode`, `stage`, `background` | New life created |
| `action` | `id`, `category`, `source` (`primary`, `tile`, `list`) | A successful action (if `TRACK_ACTIONS`) |
| `create` | `source` (`open`) | The character creation screen opened (drop-off before `game_start`) |
| `action` | `id`, `category`, `source` (`primary`, `tile`, `list`) | A successful action, only if `TRACK_ACTIONS` (off by default) |
| `session` | `actions`, `events`, `games`, `days`, `minutes`, `top1` to `top3` (action ids), `mix` (`food:5 work:3`) | The tab is hidden, if anything happened; replaces per-action events |
| `event_choice` | `id` (event id), `source` (choice id) | An event resolved |
| `routine` | `source` (`next`, `end_day`, `week`), `days` | Time controls |
| `tab_view` | `tab` | Tab change |
| `day_reached` | `day`, `mode` | In-game day 1, 3, 7, 14, 30, 60, 90, 180, 365 |
| `day_reached` | `day` plus the life snapshot (below) | In-game day 1, 3, 7, 14, 30, 60, 90, 180, 365 |
| `chapter_end` | `ending`, `day` | Ending locked in |
| `life` | `source` (`new_extra`, `switch`, `delete`), `lives` | A second life started, switched or deleted |
| `account` | `source` (`signin`, `signin_fail`, `signout`, `guest`, `delete_cloud`) | Google sign-in choices |
| `problem` | `source` (`save_failed`, `save_corrupt`, `cloud_<reason>`) | A technical failure, counted once per streak |
| `share` | `source` (`native`, `clipboard`, `image`, `image_download`, `daily`, `daily_clipboard`), `ending` | Result shared |
| `tutorial` | `step`, `ok` | Tutorial finished or skipped |
| `feedback` | `rating` (1 to 4) or `topic` | Quick feedback |
| `save_import` | `ok` | Backup imported |
| `reset` | none | All data reset |
| `install` | `source` (`banner`, `settings`, or with `_ios` for the iPhone steps), `ok` | Add to Home Screen offered or accepted |

`sanitizeEvent` drops any other event or field, keeps numbers and booleans, and reduces
strings to at most 40 safe characters. Never add a field carrying the character name, free
text, money amounts, or anything typed by the player. Tests: `tests/analytics.test.ts`.
### Life snapshot (on `day_reached`)

`mode`, `stage`, `background`, `home_state` (the character's chosen state), `residence`, `cash_band`, `savings_band`
(savings plus emergency fund), `epf_band`, `debt_band` (`none` or a band), `networth_band`, `employed`, `job` (job id or
`none`), `edu` (education status), `housing`, `vehicle`, `partner` (relationship stage or `none`), `pet`,
`health_band`, `happiness_band`, `stress_band` (`low`, `mid`, `high`), `lang`, `installed` (home-screen app),
`signed_in`, `lives`. Band edges (fictional game money): cash 0/100/500/1k/3k/10k, savings 0/500/2k/10k/50k/150k,
EPF 0/1k/5k/20k/50k/150k, debt 0/1k/10k/30k/100k, net worth 0/1k/5k/20k/50k/150k.

`sanitizeEvent` drops any other event or field, keeps numbers and booleans, and reduces strings to at most 40 safe
characters. Tests: `tests/analytics.test.ts`, `tests/analyticsSnapshot.test.ts`, `tests/sessionStats.test.ts`.

## Built-in metrics (from Umami itself)

Visitors, visits, page views, visit duration, bounce rate, referrers, countries, browsers,
devices. Umami is cookie-free and does not store IP addresses.
Visitors, visits, page views, visit duration, bounce rate, referrers, countries (and, depending on the plan, regions),
browsers, devices, operating systems, languages, screen sizes. Umami is cookie-free and does not store IP addresses.
The real player's location comes only from Umami's own report; the `home_state` field is the character's game choice.