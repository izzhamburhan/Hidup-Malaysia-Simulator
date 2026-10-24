# Plan: starter quests

## Why

The first few minutes decide whether a new player stays. Today they get a goal line and some
buttons but no clear "do this first". A short quest list with small rewards gives them a path.

## Decisions

- **Six quests** (`src/data/quests.ts`): eat a meal, do some exercise, take a career step (apply
  for a job, have one, or attend a class), reply in a chat, make your place yours (buy decor or
  adopt Oyen), and survive your first day. Each condition is a pure, persistent check of
  `GameState` (counters and existing fields), so a quest never "un-completes" overnight.
- **Rewards are engine rules**: the dedicated action `claim-quest` (param quest id, 1 minute)
  gives RM20 (a fictional "Mak sends a little something" top-up) and happiness +2; refused with a
  reason when the quest is unknown, not done ("Not yet: <hint>") or already claimed. Claims are in
  `state.flags` (`quest-<id>`), so **no shape change**. New achievement *Dah Biasa* for claiming
  all six.
- **Not in daily challenges** (the RM120 would break scenarios like Seminggu RM50): the card is
  hidden and `claim-quest` refuses there.
- **UI**: a "Starter quests n/6" card on Home with a Claim button per finished quest and a Go
  button that opens the right tab otherwise; it disappears once everything is claimed. It replaces
  the earlier "Try Act / Check Money" tab checklist (same purpose, less clutter); the now-unused
  `Settings.visitedTabs` is removed.

## Tests (tests/quests.test.ts)

1. Fresh life: none done; each condition flips when its state is reached.
2. Claim through `performAction`: +RM20, happiness up, flagged; second claim refused; claiming an
   unfinished quest refused with its hint; input not mutated.
3. Refused in a daily-challenge life.
4. Dah Biasa unlocks only when all six are claimed.

## Commands

```bash
npx vitest run tests/quests.test.ts
npm run check
```
