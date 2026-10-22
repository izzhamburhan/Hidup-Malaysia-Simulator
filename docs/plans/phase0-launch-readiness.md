# Plan: Phase 0 launch readiness (analytics, onboarding, feedback, privacy, licence)

Request (2026-10-22): "can we check visitors, clicks, time?" and "proceed" with Phase 0 of the
road to monetisation.

## Decisions

- **Analytics provider: Umami Cloud (free Hobby plan).** Cookie-free, no personal data, shows
  visitors, page views, visit duration ("time"), bounce rate, countries, devices, and custom
  events ("clicks"). The developer creates the account; the game only needs the public
  website ID in `src/config.ts`. Until it is set, nothing loads and nothing is sent.
- **Privacy-first tracking.** Only allow-listed event names and fields; never the character
  name, free text, or money amounts. Respect Do Not Track, skip localhost (`data-domains`), and
  give players an opt-out in Settings. Analytics lives in the UI layer (`src/lib/`); the engine
  stays pure and the save format is unchanged.
- **Feedback without a backend.** A quick in-game rating (emoji) plus "what should we improve"
  chips, sent as analytics events. An optional external form link (`FEEDBACK_FORM_URL`) for
  longer comments. The feedback entry is hidden when neither is configured (no dead buttons).
- **Onboarding.** A five-step "how to play" overlay on the first game, re-openable from the menu.
- **Licence.** Proprietary, all rights reserved, so the public code is visible but not reusable.

## Acceptance criteria

1. `shouldTrack` is false when unconfigured, opted out, Do Not Track, or on localhost.
2. `sanitizeEvent` drops unknown event names and fields, truncates strings, never passes `name`.
3. Tracked: game start (mode, stage, background), actions (id, category, source), event choices,
   routine buttons, tab views, in-game day milestones, chapter end, share, tutorial, feedback.
4. First game shows the tutorial once; the menu can reopen it.
5. Privacy note reachable from the landing page and Settings; opt-out toggle works.
6. 360px: no overflow, no console errors. Engine tests unchanged and green.

## Slices

1. `tests/analytics.test.ts` (red) → `src/config.ts`, `src/lib/analytics.ts` (green).
2. Settings: `analytics` opt-out and `tutorialSeen` (UI settings key, not the save).
3. Hook tracking in `useGame` (one place) and tab views in `GameShell`.
4. `Tutorial`, `FeedbackSheet`, `PrivacyNotice` components; menu, Settings and landing links.
5. `LICENSE`, `package.json` `license`, docs (CLAUDE/AGENTS, README, contract).
6. Verify: `npm run check`, browser run at 360px.

## Commands

```bash
npx vitest run tests/analytics.test.ts
npm run check
```

## Developer follow-up (outside the code)

Create a free Umami Cloud account, add the site `izzhamburhan.github.io`, and paste the
website ID into `src/config.ts` (or tell the agent). Optionally create a Google Form for
long feedback and paste its URL as `FEEDBACK_FORM_URL`.
