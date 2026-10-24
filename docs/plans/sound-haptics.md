# Plan: sound effects and vibration

## Why

Taps feel silent. A short sound per action and a light phone buzz make every action land.

## Decisions

- **UI only.** `src/lib/sound.ts`, like `analytics.ts`: never imported by the engine, nothing saved
  in `GameState`. Two new `Settings` flags, `sound` and `vibration`, both on by default, with
  toggles in Settings → Gameplay & accessibility.
- **Synthesised, no audio files.** Each sound is a few Web Audio oscillator notes, so there is
  nothing to license and nothing to download. `SOUNDS: Record<Activity, Note[]>` is pure data; one
  recipe per activity in `src/components/room/activity.ts`, plus `error` for a locked action.
- **When.** On every new `lastActivity` (any tab), and a soft error sound when a tap is refused.
  The audio context is created lazily on the first tap and resumed on any pointer down, so
  mobile autoplay rules are respected. `navigator.vibrate` where the browser supports it (Android
  Chrome; iOS Safari has no vibration API, so it silently does nothing).
- Reduced motion does not mute sound; sound has its own toggle.

## Scope

- `src/lib/sound.ts` (new): `SOUNDS`, `playActivity`, `playError`, `buzz`, `unlockAudio`.
- `src/hooks/useGame.tsx`: `Settings.sound`, `Settings.vibration`; play on `played()` and on a
  refused action.
- `src/screens/SettingsScreen.tsx`: two toggles.
- `tests/sound.test.ts` (new): every `Activity` has a non-empty recipe with sane frequencies and
  lengths; `sound.ts` imports cleanly without `window`.

## Commands

```bash
npx vitest run tests/sound.test.ts
npm run check
```
