# Plan: Cloudflare Web Analytics beside Umami

Task bucket: implementation (small, UI-layer only). Guards: doc-drift. No engine, save or content change.

## Why
Umami Cloud free plan (about 100k events a month) is reaching its limit. Cloudflare Web Analytics is free,
cookie-free and has no event cap, but records page views and Core Web Vitals only. Run both: Cloudflare for
traffic and speed, Umami for the custom events (`session`, `create`, milestones, feedback).

## Acceptance criteria
- `CLOUDFLARE_BEACON_TOKEN` in `src/config.ts`; empty means the Cloudflare beacon never loads.
- The beacon loads only under the same gate as Umami: opted in, no Do Not Track, allowed host, not localhost.
- Umami keeps working unchanged; Umami ID empty no longer blocks Cloudflare, and the reverse.
- No new events or fields; allow-list untouched.
- Contract, README, CLAUDE.md and AGENTS.md updated.

## Slices (test first)
1. `tests/analytics.test.ts`: pure `cloudflareBeaconAttrs(token)` returns the script src and `data-cf-beacon` JSON, and null for an empty token. Red, then add it.
2. `initAnalytics` loads Umami and Cloudflare independently using `shouldTrack` with each one's own configured flag.
3. Docs: `docs/contracts/analytics.md`, README, CLAUDE.md, AGENTS.md.

## Commands
`npx vitest run tests/analytics.test.ts`, then `npm run check`.