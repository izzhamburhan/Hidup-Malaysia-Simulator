# Plan: share card image

## Why

Free marketing: players post their life result. Text shares look plain on Threads, Instagram and
TikTok; a picture with their pixel character travels much better.

## Decisions

- **A 1080x1350 PNG** (portrait, fits Instagram and Threads) drawn on a canvas in the browser:
  game palette, songket pattern, the player's pixel character (same sprite as in game, via a new
  `avatarCells` export from `PixelAvatar.tsx`), ending icon and title, who / career / net worth /
  love / home, and `hidupmalaysia.com`. No network, no upload: the image is made on the device.
- **Pure model, thin renderer.** `shareCardModel(report)` in `src/lib/shareCard.ts` returns the
  text lines (unit-tested); `renderShareCard` draws them (browser only).
- **Sharing**: the phone share sheet with the image when `navigator.canShare({ files })` allows,
  otherwise the image downloads. The existing text share stays as a second button.
- Numbers on the card are the game's fictional values, labelled as a game result.
- UI only. No engine or save change.

## Tests (tests/shareCard.test.ts)

1. The model has the ending, name and age, a formatted net worth, the game URL, and lines short
   enough to fit the card.
2. `avatarCells` stays inside its grid.

## Commands

```bash
npx vitest run tests/shareCard.test.ts
npm run check
```
