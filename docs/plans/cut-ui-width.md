# Plan: cut UI width (reduce decision paralysis before adding chat)

Request (2026-10-23): the developer worries the app is too wide — too many tabs and
categories for a new player to know what to do. Chosen priority: cut width first, chat
feature after. Nothing here removes a feature; it only reorders and defaults what is shown.

## Current surface (confirmed by reading the code)

- 5 main tabs (Home, Act, Money, Life, Feed).
- Life has 9 fixed sub-tabs (Career, Study, Food, Fitness, People, Home, Transport, Hustle, Shop).
- Act has 15 categories (plus "All"), with an "only available now" filter that defaults off.
- Home already has the one-tap play screen and a one-time tutorial (Phase 0); this plan adds a
  second, lighter layer for players who do open the other tabs.

## Decisions

- **Reorder, never hide.** Hiding a Life sub-tab could remove the only way to reach a feature
  (e.g. the Study tab's "enrol" flow when not studying, or Hustle's "start something" list).
  Instead, sort the sub-tabs by relevance to the player's current state, so the two or three
  that matter today sit first in the scrollable row.
- **Act's "only available now" filter defaults on.** It already exists; defaulting it to true
  hides locked items on first view without removing the toggle or any action.
- **A small "getting started" checklist on Home**, separate from the one-time tutorial. It
  tracks whether the player has opened each of the other four tabs at least once, UI-only
  (`Settings`, localStorage, same place as `tutorialSeen`) — no `GameState` change, no save
  migration. It disappears once all four are visited, or after day 7.

## Scope

- `src/engine/insights.ts`: pure `rankLifeTabs(state): LifeTabId[]` (new, exported `LifeTabId`
  type). No change to existing exports.
- `src/screens/LifeScreen.tsx`: order `SUBS` by `rankLifeTabs`; default `sub` to the top-ranked
  one instead of the hardcoded `'career'`.
- `src/screens/ActScreen.tsx`: `onlyAvailable` default `true`.
- `src/hooks/useGame.tsx`: `Settings.visitedTabs: Partial<Record<Tab, true>>`, default `{}`;
  mark visited in the existing tab-change path.
- `src/screens/GameShell.tsx` / `Dashboard.tsx`: mark a tab visited in `go()`; small checklist
  card on Home.
- `tests/insights.test.ts` (new): `rankLifeTabs` puts Career first when unemployed and not
  studying; puts Study first while studying; puts Hustle above Shop once a hustle exists.

## Commands

```bash
npx vitest run tests/insights.test.ts
npm run check
```

## Out of scope (next slice, after this)

The partner chat thread (separate plan, once this ships).