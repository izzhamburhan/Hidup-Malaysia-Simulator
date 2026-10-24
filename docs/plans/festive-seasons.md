# Plan: festive seasons

## Why

Malaysia's festivals are the best moments to post about and a reason to log in that week. The
game has festival days and events, but the room and wardrobe ignore them.

## Decisions

- **Twelve seasons** (`src/data/festive.ts`): CNY, Raya Aidilfitri, Raya Aidiladha, Wesak,
  Kaamatan, Gawai, Merdeka, Malaysia Day, Deepavali, Christmas, New Year. Each is a window from 3
  days before to 4 days after its date on the game's **simulated** calendar (the same pinned dates
  as `src/data/holidays.ts`; Kaamatan 30 May and Gawai 1 June are fixed dates). Respectful,
  inclusive copy; everyone can join every festival.
- **Engine** (`src/engine/festive.ts`): `festiveSeason(state)` (pure), and the dedicated action
  `festive-greet` once per season per year: family +4, friends +3, happiness +4. On Raya and CNY
  it also brings duit raya or angpau: single players receive RM30, married players give RM50
  (`spend`, refused with a reason if they cannot afford it). Done-flags in `state.flags`.
- **Festive outfits**: cheongsam (CNY), kurta (Deepavali), Christmas sweater, Merdeka tee. They
  unlock for good once you greet in that season, shown in the wardrobe with the festival name.
  `Outfit` widens, so `SAVE_VERSION` 5 to 6 with an identity migration and a fixture test.
- **UI**: a festive garland across the living room and bedroom during the season, and the greet
  action first among the Home round buttons.
- No festive daily challenge: the daily challenge uses the real date while festivals here use the
  simulated calendar, so a "festive" daily would claim a wrong real-world date.

## Tests (tests/festive.test.ts)

1. In season on the date and a few days around it, not a week later; every season has decor.
2. Greeting through `performAction`: relationships up, flagged, second greet refused.
3. Raya single receives RM30; married gives RM50; refused when married and broke.
4. The festive outfit unlocks after greeting, not before.
5. v5 save migrates to v6 unchanged.

## Commands

```bash
npx vitest run tests/festive.test.ts
npm run check
```