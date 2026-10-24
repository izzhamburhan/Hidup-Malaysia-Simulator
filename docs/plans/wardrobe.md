# Plan: wardrobe with unlockable outfits

## Why

Pou-style dress-up, and a visible reward for achievements: new outfits and headwear that unlock
when you earn them, and a way to change your look mid-game (today it is fixed at creation).

## Decisions

- **Shape change: yes (union widened).** `Outfit` gains `jersey`, `batik`, `grad-gown`, `chef`,
  `suit`; `Headwear` gains `grad-cap`, `helmet`, `crown`. Old saves are already valid, so
  `SAVE_VERSION` 4 to 5 with an identity migration (documented, fixture test) to keep the chain
  honest for the widened union.
- **Unlocks are data** in `src/data/appearance.ts`: `lockedOutfits` / `lockedHeadwears`, each naming
  an achievement id. Base items stay as they are, so character creation and `randomAppearance`
  never produce a locked item. `isValidAppearance` accepts both.
- **Changing your look is an action** (engine, `src/engine/actions/wardrobeActions.ts`):
  `change-outfit`, dedicated, param `outfit:<id>`, `headwear:<id>`, `color:<n>` or `glasses:on|off`.
  A locked item is refused with "Unlock with the achievement <title>". Takes 2 minutes.
  Appearance stays cosmetic and never feeds the simulation.
- **UI**: a Wardrobe button on the room opens a sheet with a live preview, outfits, colours,
  headwear and glasses; locked items show a padlock and the achievement name. New pixel art for
  each new item. New activity `dressup` ("Lawa!").

## Tests (tests/wardrobe.test.ts)

1. A v4 save migrates to v5 unchanged apart from the version.
2. Base outfit change through `performAction`; the input is not mutated.
3. A locked outfit is refused naming its achievement, then allowed once the achievement is earned.
4. Headwear unlock works the same; an out-of-range colour is refused.
5. Every unlock names a real achievement; `isValidAppearance` accepts locked items;
   `randomAppearance` never yields one over 300 seeds.

## Commands

```bash
npx vitest run tests/wardrobe.test.ts
npm run check
```
