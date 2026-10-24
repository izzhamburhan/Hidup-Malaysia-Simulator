# Plan: big-moment celebrations

## Why

A promotion or graduation currently lands as one log line. Big moments should feel big.

## Decisions

- **UI only, detected from state.** `celebrationsBetween(prev, next)` in
  `src/components/celebrate/celebrations.ts` is a pure diff of two states: new achievement, new
  completed challenge, new job, promotion (same company, new title), graduation, engagement,
  marriage, first owned home, first vehicle. Biggest first. No engine, `GameState` or save change.
- **Never blocks play.** A banner with confetti and a short fanfare over the top of the screen,
  `pointer-events: none` except its own close button, gone after about 3 s. Several at once
  (a week on autopilot) show the biggest with "+N more".
- A new game or a loaded save never celebrates (the diff resets when `createdAt` changes).
- Fanfare follows the Sound setting; confetti stops under reduced motion.

## Scope

- `src/components/celebrate/celebrations.ts`, `Celebrate.tsx` (new); `src/index.css` confetti.
- `src/screens/GameShell.tsx`: mount `<Celebrate />`.
- `tests/celebrations.test.ts` (new).

## Commands

```bash
npx vitest run tests/celebrations.test.ts
npm run check
```
