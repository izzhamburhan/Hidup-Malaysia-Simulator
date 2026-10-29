# Plan: UI v4, visual polish

Request (2026-10-29): after v3, the developer chose four v4 parts from the three-skill review
(frontend-design, Apple UI designer, Impeccable): a pixel display font, songket edges and card
tiers, payday and day-end moments, and a header that follows the time of day.

Versions: `ui-v3-ux-cleanup` (live) is the revert point; this ships as `ui-v4-visual-polish`.

## Goal and non-goals

- Goal: the chrome matches the pixel-art room and the songket palette, and the big moments of a
  day feel like moments. Same layout and flows as v3.
- Non-goals: body font change, new screens, BM translation, balance or content. No save change.

## Assets

- Pixelify Sans (OFL-1.1, Copyright 2021 The Pixelify Sans Project Authors), latin 400 and 700,
  self-hosted in `public/fonts/` with its licence `public/fonts/PixelifySans-OFL.txt`. Taken from
  the `@fontsource/pixelify-sans` 5.3.0 package (Google Fonts source). No network font loading.

## Acceptance criteria (by group; one implementer each, own worktree)

### V4-A Display font and header (`index.css`, `GameShell.tsx`, `Landing.tsx`, `Celebrate.tsx`, `SettingsScreen.tsx`)
1. `@font-face` for Pixelify Sans (400, 700, `font-display: swap`, relative URLs that work under
   the Vite relative base and offline via the service worker); a `font-pixel` utility.
2. Clock and wallet in the pixel face, wallet the more prominent; landing H1 and big-moment
   titles in the pixel face. Body text unchanged. Text stays at least as large and readable.
3. Settings → Credits names Pixelify Sans, its authors and the OFL, next to the flag credits.
4. Header background tint follows `daylight(state.clock.minute)` (morning, day, dusk, night),
   subtly, keeping text contrast at AA; the wallet flashes green or red briefly when it changes
   (no flash with reduced motion).

### V4-B Songket edges and card tiers (`index.css`, `ui.tsx`, cards that are "hero" moments)
5. A songket edge utility (a thin patterned band, reusing the existing `.songket` motif) used on
   hero cards: the Home goal card, the collapsed starter quests card, offer rows, and section
   titles get a small songket accent. Pattern as edge, never as a fill behind text.
6. Two card tiers: a `hero` Card variant (tinted, songket edge, slightly stronger shadow) and the
   plain card (lighter: no border, spacing does the grouping). Props stay backward compatible.

### V4-C Moments (`Overlays.tsx` day report, payday feedback, `Celebrate.tsx` if needed)
7. The day report reveals its parts in a short stagger (income, spending, then mood/stats).
8. Payday shows a quick coin count-up of the net pay.
9. Both are skipped (shown instantly) when the reducedMotion setting or prefers-reduced-motion is on.

## As built

- Pixelify Sans draws "5" close to "S"/"8" at 16px (seen in a 3x zoom of the header: the
  game held RM405.00, the header looked like RM408.00). Money and time must be unambiguous, so
  the clock and wallet stay in the plain display font; the pixel face is used for the landing
  title and celebration titles only. Header tint and wallet flash ship as planned.

## Validation

`npm run check` in each worktree; after merge `npm run check`, headless Edge 360x640 screenshots
of Landing, Home (morning and night), Money and the day report; contrast checked on tinted
headers; tag `ui-v4-visual-polish`.
