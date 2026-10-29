# Plan: UI v3, UX cleanup

Request (2026-10-29): review the UI with three design skills (Impeccable audit and critique,
Anthropic frontend-design, Apple UI designer), keep numbered versions to revert to, and build
the functional fixes as v3. Visual identity changes are v4, after the developer has seen them.

Versions (git tags): `ui-v1-before-ux-fixes` (bb3c59d), `ui-v2-quick-wins` (3a4e47c, live),
`ui-v3-ux-cleanup` (this plan), `ui-v4-visual-polish` (later).

Review scores before v3: Impeccable audit 14/20, Nielsen heuristics 28/40 (both "Good").

## Goal and non-goals

- Goal: the core loop is reachable one-handed above the nav, decisions are clear (offers, confirms,
  locked reasons), sheets behave like sheets, text is readable. The look does not change.
- Non-goals: fonts, songket edges, card tiers, payday animation (v4); full BM translation (own
  batch); balance and new content (later batches). No save shape change.

## Acceptance criteria (by group; each group is one implementer in its own worktree)

### G1 Home and header (`Dashboard.tsx`, `GameShell.tsx`, `Room.tsx`, `StarterQuests.tsx`, `insights.ts`)
1. A sticky primary action bar sits just above the bottom nav on Home (safe-area aware): the big
   next-step button plus Next / End day / Week, always reachable without scrolling at 360x640.
2. With several offers the primary action is not a blind "Accept offer": it names the company and
   salary for one offer, and with 2+ offers it points to comparing them on Life > Career.
3. Header fits one line at 360px: short date ("Day 31 · 3 Feb 2027"), no truncation; age moves
   to the menu or details.
4. Header meters in danger show a sign (icon or "!"), not colour alone; meters have aria labels.
5. Home goal card shows a chevron when tappable; "Quest done! Tap to claim" claims directly.
6. Home is calmer: Starter quests collapse to one summary line that expands.
7. Text floors: no text under 11px on Home and the header; `Dashboard.tsx:193` sub-label solid teal.

### G2 Career offers (`LifeScreen.tsx`)
8. When any offer or interview exists, Applications render first on Life > Career.
9. Each offer is one compact row with company, role and salary, and a Respond control that opens
   a sheet with Accept (primary, cost shown by the existing confirm), Negotiate and Decline.
10. Expired and rejected applications collapse under "Past (n)".

### G3 Sheets and overlays (`ui.tsx`, `ActionGame.tsx`, `Overlays.tsx`)
11. Modal: Escape closes when dismissable, focus moves into the sheet and returns to the trigger,
    Tab stays inside, `aria-labelledby` the title, `max-h-[90dvh]`, bottom safe-area padding, a
    grabber handle on bottom sheets. Events stay non-dismissable.
12. Mini-game: tapping the backdrop during a game no longer cancels the action; it does nothing
    (Skip stays the explicit way out).
13. Toast sits above the nav including the safe-area inset; error toasts stay at least 5 s.
14. Red Pill text meets 4.5:1; `Overlays.tsx:182` label at least 11px.

### G4 Act, Money, Landing, feed (`ActScreen.tsx`, `ActionCard.tsx`, `ownershipActions.ts`, `Landing.tsx`, feed code)
15. Cancelling medical insurance asks for confirmation with the consequence (engine `confirm`).
16. A row of variant pills with some greyed shows why (first unavailable reason) under the row.
17. Act: categories collapse to their title with a count; the few suggested actions sit on top;
    the "only show what I can do" toggle is a 44px target.
18. Landing language toggle no longer overlaps the hero eyebrow.
19. The social feed does not repeat the same post text within a short window (seeded, deterministic).

## Contract, save, content, UI impact

- Contract: `action-contract.md` if insurance gains `confirm` (pattern already exists). Feed
  de-duplication stays inside the engine's feed generator; document in the relevant contract.
- Save: none.
- Content: no new copy beyond labels (Respond, Past, Compare offers).
- UI: verified with headless Edge screenshots at 360x640 after merge.

## Validation

Each group: `npm run typecheck`, `npm test`, `npm run build` in its worktree; engine changes test
first (G1 primary action with several offers, G4 insurance confirm and feed de-dup).
After merging all groups: `npm run check`, 360px screenshots of every tab, tag `ui-v3-ux-cleanup`.