# Plan: Malaysia map (Jelajah, my map, moving state, balik kampung route)

Request (2026-10-29): "add a Malaysia map". The developer chose all four uses: Jelajah Malaysia
trips with stamps, a "My Malaysia" map, moving to another state, and a balik kampung route.

## Decisions

- The map is a stylised pixel-tile map in the game's art style (`src/data/malaysia.ts`): each state
  is a cluster of tiles on a 26 x 12 grid, labelled "not to scale". No third-party map files, no
  claim about exact borders, and it matches the pixel room.
- Cost and pay factors per state are fictional game estimates relative to Selangor (1.0), the
  baseline the game's prices were tuned for; existing saves migrate to Selangor or their home state
  (when living with family), so nobody's numbers change on load.
- Save v9 (done in the base commit): `location.state` and `travel.stamps`, with migration and test.

## Groups (one implementer each, own worktree based on the base commit)

### MAP1 Jelajah and balik kampung (engine, data, achievements)
1. `src/engine/geography.ts` (pure): tile centroids, `travelBetween(from, to)` returning minutes,
   fictional cost and mode (road within the Peninsula or within Borneo; flight across the sea).
2. Action `trip-state` (param = state name): weekend or leave-day only, costs money and time by
   `travelBetween(location.state, target)`, gives mood, records `travel.stamps[state]` the first
   time; not to your own residence state. Plain-English reasons when unavailable.
3. Achievements: first stamp, 8 stamps, all 16 ("Jelajah Malaysia").
4. Balik kampung uses `travelBetween(location.state, homeState)` for cost and minutes (a short hop
   when you live in your home state), and a long-distance festive trip can trigger a traffic-jam
   event (with a free choice).

### MAP2 Moving to another state (engine, balance)
5. Action `move-state` (param = state name): a major decision with a confirm stating moving cost,
   that rent and prices follow the new state's cost factor, and that a full-time job is resigned
   (no remote work in v1); unavailable while studying in class weeks, with a reason.
6. Rent and everyday prices use the residence state's `costFactor`; new job offers use its
   `payFactor`; an existing salary does not change until a new job.
7. Balance: seeded runs show a KL move earns more and costs more; a Kelantan move costs less and
   earns less; net effect within a sensible band.

### MAP3 Map screen (UI)
8. `PixelMap` component draws the tiles, with markers for residence, home state (kampung), campus
   state (university) and stamped states; tap a state to open a sheet with its flag (existing
   `public/flags`), name, blurb, and "Go on a trip" / "Move here" through `viewAction` for
   `trip-state` / `move-state` (hidden when the action does not exist yet), plus the balik kampung
   route drawn from residence to home state.
9. A "Map" tab on Life; 360px, accessible (each state a button with its name), reduced-motion safe.

## Validation

Each group test-first, `npm run check` green, content-guard on new copy, balance numbers for MAP2.
After merge: full check, seeded autopilot sanity, 360px screenshots of the map and a state sheet.
