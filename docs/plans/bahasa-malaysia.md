# Plan: Bahasa Malaysia toggle (beta)

## Why

Reach more Malaysian players by letting them play in Bahasa Malaysia.

## Decisions

- **Beta scope.** The game has thousands of content strings (events, actions, items, feed posts)
  in `src/data/` and the action catalogue. Translating all of them in one pass would be poor
  quality, so this slice translates the UI chrome only: navigation, header meters, menu, Home
  buttons and chips, the room's buttons, the landing screen, the daily banner, the Act filter and
  Settings. Stories, events and catalogue names stay English, and Settings says so.
- **`src/i18n.ts`**: an English dictionary (the source of keys) and a complete Bahasa Malaysia
  dictionary typed against it, `translate(lang, key, vars)` with `{placeholder}` filling and an
  English fallback. `useT()` reads `Settings.language` (UI-only setting, default `en`).
- **Switch** on the landing screen (EN / BM) and in Settings; `<html lang>` follows it.
- No engine, `GameState` or save change.

## Tests (tests/i18n.test.ts)

1. Every English key exists in Bahasa Malaysia, non-empty, with the same placeholders.
2. Placeholders fill; English is the fallback.

Browser: switch to BM on landing, check Home and every tab at 360px for overflow, switch back.

## Next

Translate content in batches (actions first, then the most common events), each with its own
plan, keeping `src/data/` as the single source.

## Commands

```bash
npx vitest run tests/i18n.test.ts
npm run check
```
