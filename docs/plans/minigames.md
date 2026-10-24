# Plan: mini-games

## Why

Pou-style quick games: something hands-on between turns, with a small in-game reward.

## Decisions

- **Three games, about 10 seconds each** (UI components in `src/components/minigames/`):
  - *Kejar Bas*: tap as fast as you can to catch the bus before it leaves.
  - *Teh Tarik*: hold to pour, release in the green zone; three pours.
  - *Ingat Order*: remember a mamak order, then tap it back in order.
  Each ends with a 0-100 score from a pure scoring helper (`scoring.ts`, unit-tested).
- **Rewards are engine rules.** The score goes to the dedicated action `play-minigame`
  (param `<game>:<score>`, 10 minutes). Tier 0-3 by score; happiness +2/+4/+6/+8 and stress
  -1/-2/-3/-4. Only the first 3 plays a day are rewarded (after that it is "just for fun",
  happiness +1). Best score per game is kept in `state.flags` (`mg-best-<id>`), so **no shape
  change and no save bump**. Invalid game or score is refused with a reason.
- **Data** `src/data/minigames.ts`: game ids, names, icons, blurbs, mamak menu, reward table.
- **Achievement** `pro-gamer-kampung`: 90+ in all three games.
- **UI**: a Games button on the Home room opens a picker; the game runs full-screen in a sheet,
  then shows the score and the reward. Randomness inside a game (the mamak order) is UI-only
  input, like a player's choice; the engine stays deterministic for a given score.

## Tests

- `tests/minigames.test.ts`: tier rewards through `performAction`; daily cap; best score kept;
  invalid params refused; achievement condition; same state + same score gives the same result.
- Scoring helpers: bus catch percentage, pour accuracy, order matching.

## Commands

```bash
npx vitest run tests/minigames.test.ts
npm run check
```