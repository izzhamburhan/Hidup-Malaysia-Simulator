# Plan: pixel characters and organisation badges

Request (2026-10-22): make the game look more fun with a character (pixel art / human), and add
logos for real organisations (PETRONAS, UiTM, UM, KWSP...) if legal.

## Decisions

- **No real logos.** Logos are registered trademarks. Showing them beside fictional salaries,
  events and satire implies endorsement or affiliation the game does not have, and breaks the
  repo's data-honesty rules (real names are catalogue names only). Instead, organisations get a
  neutral **initials badge** (e.g. `UM`, `UiTM`, `EPF`) drawn in the game's own palette, never in
  brand colours or shapes. This is a name, not a logo.
- **Pixel characters** are drawn in code as SVG pixel grids (no external images, no licensing
  questions, tiny bundle cost).

## Goals and acceptance criteria

- The player designs a pixel character at creation: skin tone, hair style and colour, outfit and
  colour, optional headwear (none, tudung, songkok, cap) and glasses. A randomise button.
- The character appears on the play screen, in the header, on the life report share card and on
  the landing "Continue" card. Its face reacts to stats (happy, neutral, tired, stressed, unwell)
  and it gently bobs (respects reduced motion).
- Feed authors, prospects and the partner get deterministic pixel avatars generated from their
  name (same name, same face).
- Job listings, the current job, the study card and the payslip show initials badges.
- Old saves load: `SAVE_VERSION` 1 → 2 adds a deterministic default appearance.

## Contract and save impact

- `Character.appearance: Appearance` added to `GameState` (types.ts). `NewGameOptions.appearance?`.
- `SAVE_VERSION` 2; `migrations[1]` adds an appearance derived from the save's seed.
- New pure helpers: `src/engine/appearance.ts` (`randomAppearance(seed)`, `appearanceFromName(name)`,
  `moodOf(state)`). Catalogue of options in `src/data/appearance.ts`.

## Slices (test-first)

1. `tests/appearance.test.ts`: `randomAppearance` is deterministic and valid against the catalogue;
   `appearanceFromName` is stable per name and differs across names; `moodOf` maps stats to moods;
   `newGame` stores the chosen appearance and falls back to a valid random one.
2. `tests/save.test.ts`: a version-1 fixture without `appearance` migrates to version 2 with a
   valid appearance; current saves round-trip.
3. UI: `PixelAvatar` and `OrgBadge` components; avatar editor in character creation; avatar in
   play scene, header, report card, landing, feed, people tab; badges on career/study/payslip.
   Browser check at 360px: no overflow, no console errors.

## Commands

```bash
npx vitest run tests/appearance.test.ts tests/save.test.ts
npm run check
```

## Out of scope

Animated walk cycles, location backdrops, real logos (by decision above).
