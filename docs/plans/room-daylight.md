# Plan: the room's day or night follows the clock only

Request (2026-10-29): "when we do a task at night, the room becomes morning, and then back to
night. Make the task not affect day or night; only time should." Bug fix, UI layer only.

## Cause

Each room in `src/components/room/activity.ts` carries its own fixed lighting: the bedroom is a
dark night palette and every other room (kitchen, park, office, street with a ☀️ on the wall) is
a bright daytime palette. An action at night plays for 2.6 s in its own room, so the scene turns
bright, then the idle room at night (the dark bedroom) comes back. Only the small sky badge reads
`state.clock.minute`.

## Goal and non-goals

- Goal: what the room looks like in time terms (light level, sky badge, outdoor sky item) comes
  only from `state.clock.minute`. An action may change where the character is, never when.
- Non-goals: no engine, save or content change; the "lights down" overlay while the sleep
  animation plays stays (it is lights off, not the time of day); the idle room choice (bedroom
  from 21:00 to 06:00) stays.

## Acceptance criteria

1. A pure `daylight(minute)` returns `morning` (5:00-11:00), `day` (11:00-16:00), `dusk`
   (16:00-19:30) or `night` (19:30-5:00), the same bands the sky badge already used.
2. No room definition carries a time of day: the bedroom gets a neutral palette like the others,
   and outdoor rooms have no fixed sun or cloud that would contradict the clock.
3. `Room.tsx` draws one lighting layer from `daylight(state.clock.minute)` over whichever room
   is showing (night darkens, dusk warms), so at night every room, idle or animated, looks night.
4. The goal card and sky badge stay above the lighting layer, so text keeps its contrast.

## Slices

1. Red: `tests/activity.test.ts` covers `daylight` bands and boundaries, and asserts no room is
   flagged `dark` and outdoor rooms take their sky item from the time.
   `npx vitest run tests/activity.test.ts` fails: `daylight` is not exported.
2. Green: add `daylight`, `skyIcon` and the outdoor sky item in `activity.ts`; neutral bedroom;
   `Room.tsx` uses them and adds the lighting layer.
3. Validate: `npm run check`; check the room at 360px in the dev server at night and by day.

## Commands

```bash
npx vitest run tests/activity.test.ts
npm run check
```
## Follow-up (2026-10-29): too dark at night

Feedback after release: night was too dark and the character looked murky. Night tint drops from
45% to 30%, and both the tint and a new warm lamp glow (`lampOn`: night and not sleeping) sit
behind Oyen and the character, so the room dims while they stay clear. Test: `lampOn` in
`tests/activity.test.ts`. Checked with headless Edge screenshots at 360px: 1 PM living room,
8:30 PM living room, 9:35 PM bedroom, and a run at 10:20 PM in the park.
