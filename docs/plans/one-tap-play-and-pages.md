# Plan: one-tap play screen and GitHub Pages deploy

Request (2026-10-21): playing needs too many taps and too much tab-hopping. Make the game
playable from one screen, and deploy it to GitHub Pages so it can be played on a phone.

## Goals

- Home becomes the play screen: one primary button that does the sensible next thing, six
  one-tap tiles that change with the time of day and the player's situation, and time controls
  (Next activity, End day, 1 week). Tabs stay for deep management.
- The app installs to a phone home screen (web manifest, icons, theme colour).
- Every push to `main` builds, tests and publishes `dist/` to the `gh-pages` branch.

## Slices (test-first)

1. **Engine: routine step.** Extract the routine chooser from `runAutopilot` into
   `chooseRoutineStep(state)` and add `runRoutineStep(state)` (one step, same feedback shape as
   `performAction`). Tests in `tests/play.test.ts`: a step advances time and changes state; a
   working adult's morning step is the work shift; a pending event blocks the step; same seed gives
   the same result.
2. **Engine: play suggestions.** Add `primaryAction(state)` and `quickActions(state)` in
   `src/engine/insights.ts` (pure). Tests: workday morning → `work-shift`; unemployed → `apply-job`
   on the best listing; hungry → an `eat` action; late night → `sleep`; interview day →
   `attend-interview`; quick actions return at most 6 views, available ones first, no duplicates.
3. **UI: PlayScreen.** Replace the dashboard top with a time-of-day scene card, primary button,
   6 tiles, time controls and a short activity ticker. Keep stats/snapshot/upcoming below in a
   compact form. Toast shorter. Browser check at 360px: no overflow, no console errors, a day can
   be played with only Home taps.
4. **PWA basics.** `public/manifest.webmanifest`, 192/512 PNG icons and an apple-touch icon,
   iOS meta tags, `.nojekyll`.
5. **Deploy.** `.github/workflows/deploy.yml`: on push to `main`, `npm ci`, typecheck, test,
   build, then publish `dist/` to `gh-pages` with plain git and `GITHUB_TOKEN`. Seed the branch
   once from local. Verify the live URL returns 200.

## Commands

```bash
npx vitest run tests/play.test.ts
npm run check
```

## Out of scope

Offline service worker, story-card mode, balance changes.