# Plan: quick wins from the game review

Request (2026-10-29): the developer picked the "quick fixes" batch from the whole-game review
(three reviewers plus 360px screenshots, checked against Nielsen's heuristics and mobile game UX
guidance). Bug fix and UI polish.

## Goal and non-goals

- Goal: fix the five highest-impact, low-effort findings.
- Non-goals: Home layout, BM coverage, modal keyboard support (next batch, "UX cleanup");
  balance and new content (later batches). No save shape change.

## Acceptance criteria

1. Routine (Next, End day, Week, autopilot) job-hunts for an unemployed non-student: it attends a
   scheduled interview on its day, and otherwise sends at most one application a day to the
   best-paying listing the player is eligible for. Offers stay the player's decision.
2. The Money tab's grouped rows read "Move cash to savings", "Withdraw from savings", "Top up
   emergency fund" (same names as the Act tab), not "Move … to savings".
3. A money value never wraps (no lone minus sign on its own line).
4. Common controls are at least 44px tall: amount and sleep pills, tabs, quest Claim and Go, feed
   like and invite, the modal close button, the header avatar and menu, language toggles.
5. The "why locked" text under Home tiles is 11px and may wrap to two lines; header meter labels
   and wardrobe unlock text go up a size.

## Contract, save, content, UI impact

- Contract: the routine contract in `docs/contracts/engine-api.md` gains job hunting.
- Save: none. Uses existing `state.flags` (a once-a-day flag, like `routineGrow`).
- Content: copy reused from the Act tab.
- UI: sizes only; checked with headless Edge screenshots at 360px.

## Slices

1. Red: `tests/play.test.ts`: routine attends a same-day interview; routine applies to an
   eligible listing once a day; a 60-day autopilot for a fresh graduate sends applications.
   `npx vitest run tests/play.test.ts` fails (routine never applies).
2. Green: `chooseRoutineStep` in `src/engine/simulationEngine.ts`.
3. UI: shared `variantTitle` for the Money tab; `KeyValue` value `whitespace-nowrap`; 44px
   controls; text sizes.
4. Validate: `npm run check`; screenshots at 360px of Home, Act, Money, Feed.

## As built

- `listingsByMatch` (`career.ts`) ranks listings the player fully qualifies for first, then by
  match; both the routine and the Home suggestion use it. Without this the routine sent a fresh
  graduate's first application to an internship.
- Day-30 fresh-graduate run (seed 7): 0 applications before, 6 after, with 3 offers waiting.
- Checked with headless Edge screenshots at 360px (Home, Act, Money, Life, Feed).
- Edits on this machine sometimes came back with the old line re-inserted next to the new one;
  every changed file was scanned for stale and duplicate lines before the final check.

## Commands

```bash
npx vitest run tests/play.test.ts
npm run check
```