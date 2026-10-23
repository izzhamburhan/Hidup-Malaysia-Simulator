# Plan: Pou-style room on Home, with action animations

## Why

Players tap a tile and only a toast changes, which feels flat. The developer asked for a
character animation per action (run, eat, and so on) and a Home layout like Pou: the character
big in the middle of a room, big round buttons underneath.

## Decisions

- **UI only.** No `GameState` change, no save migration, no engine edit. The room and the
  animation are presentation of actions the engine already resolved.
- **Activity mapping is presentation, not rules.** `src/components/room/activity.ts` maps an
  action id (falling back to its category from `actionById`) to an `Activity` (sleep, eat, run,
  workout, sport, work, study, social, love, family, play, money, home, travel, civic, build,
  idle). Each activity names a room scene and a short bubble. Pure function, unit-tested.
- **Which action played.** `useGame` keeps a UI-only `lastActivity` `{ id, param, seq }`, set
  after a successful `act`, and after `step` from `chooseRoutineStep(current)` (already an
  exported, read-only engine helper) read before the step runs. End day / Week set `sleep`.
  Never saved.
- **Rooms.** Bedroom, kitchen, park, gym, office, campus, mamak, living room, street. Drawn
  with CSS gradients and emoji props, no image assets, no real brands. Idle room: bedroom from
  21:00 to 06:00, living room otherwise; an activity's room shows while it plays (about 2.4 s),
  then the idle room returns.
- **Animations** are CSS keyframes on a wrapper around `PixelAvatar` plus floating props
  (food, Zzz, sweat, hearts, coins, notes). Reduced motion (setting or OS) shows the props
  still, with no movement.
- **Layout.** Home becomes: status line and goal on top of the room, the room card with the
  big centred character, a row of big round action buttons (the existing quick actions; locked
  ones are greyed and explain why on tap, as now), the primary "do this next" button, time
  controls, then the existing chips, ticker and details. Bottom nav untouched.

## Scope

- `src/components/room/activity.ts` (new): `Activity`, `activityFor(id, param?)`, `ROOM_FOR`.
- `src/components/room/Room.tsx` (new): room backdrop, character, animation overlay.
- `src/index.css`: keyframes for the activities.
- `src/hooks/useGame.tsx`: `lastActivity` in the API.
- `src/screens/Dashboard.tsx`: Pou layout using `Room` and round buttons.
- `tests/activity.test.ts` (new).

## Test-first slices

1. `tests/activity.test.ts`: every action id in `actionCatalogue` maps to a known activity
   with a room; run maps to `run`/park, eat to `eat`/kitchen, sleep to `sleep`/bedroom,
   work-shift to `work`/office, attend-class to `study`/campus, unknown ids to `idle`.
   Red, then implement `activity.ts`, green.
2. `useGame` `lastActivity` + `Room` + Dashboard layout + CSS. Typecheck and full suite.
3. Browser check at 360px: tap eat, run, sleep, Next; reduced motion on.

## Commands

```bash
npx vitest run tests/activity.test.ts
npm run check
npm run dev
```

## Out of scope

Partner chat thread (separate slice). Animations on the Act/Life tabs.