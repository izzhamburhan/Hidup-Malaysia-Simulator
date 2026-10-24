# Plan: Add to Home Screen

## Why

The game is already an installable web app (manifest and icons) but nobody knows. Installed
players come back more: one tap from the home screen, full screen, works offline.

## Decisions

- **Service worker** `public/sw.js`, network-first: always fetches the live site (so each deploy
  reaches players at once) and only falls back to the cached copy when offline. Same-origin GET
  only; old caches are cleared on activate. Registered in production, never on localhost.
- **`src/lib/install.ts`**: captures the browser's `beforeinstallprompt`, `promptInstall()`,
  `isStandalone()`, iPhone detection, and a pure `shouldOfferInstall` (after day 1, not installed,
  not dismissed, and either the prompt is available or it is an iPhone).
- **UI**: a "Get the app" card on Home with Install and Not now (`Settings.installDismissed`);
  iPhones get the three Safari steps instead (Safari has no install prompt). Settings has an
  Install entry while it applies. BM strings included.
- **Analytics**: new allow-listed event `install` (`source`, `ok`); contract updated.
- No engine or save change.

## Tests (tests/install.test.ts)

`shouldOfferInstall` cases, iPhone/iPad detection, and that the shipped worker is network-first.
Browser: a simulated prompt on an Android user agent and the steps on an iPhone user agent.