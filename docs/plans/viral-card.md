# Viral Hari Ini card

Branch: `feat/ui-viral-card`. Classification: implementation (UI + content). Guards: `content-guard`, `mobile-ui-guard`, `doc-drift`. No engine or save change.

## Goal

A once-a-day, dismissible "Viral Hari Ini" sheet on the dashboard (never the landing page): a pixel-art picture and a short funny Malaysian line. The player can **Save** it (PNG), **Put in room** (wall poster) or **Skip**. A small Viral button reopens it and a collection shelf lists past ones.

Non-goals (later): weekly drafting agent, remote `feed.json`, Threads trend input, per-topic analytics.

## Acceptance criteria

1. The sheet opens at most once per real day (device-local date), only when an item the player has not seen exists, only on the Home dashboard, and never while a tutorial, event, day report or payday sheet is open.
2. Settings has a "Viral card" switch (default on). Off means no auto pop-up; the Viral button still works.
3. The item for a day is chosen by date (deterministic, unseen first, then rotate). No `Math.random`.
4. Save downloads a PNG drawn on the device; the picture is pixel art (low-res canvas, nearest-neighbour upscale).
5. Put in room stores the item id in the viral store and the Home room shows it on the wall instead of the wall emoji; clearing it restores the emoji.
6. Every item has English and Bahasa Malaysia text and passes the content checks: no pork, alcohol or gambling emoji, no real people, no politics, no brand marks, dated tag text is not a claim of fact.
7. Works at 360px, buttons at least 44px, Esc and Skip close it.
8. Nothing is sent over the network and no analytics event carries the text.

## Contract / save / content / UI impact

- Contract: none (UI layer only). `docs/contracts/` gets no change; `CLAUDE.md` Layout and Status rows are updated (doc-drift).
- Save: `GameState` untouched, `SAVE_VERSION` stays 11. New LocalStorage key `hidup-malaysia:viral` (`{ lastShown, seen[], poster }`), one new Settings field `viralCard`.
- Content: `src/data/viral.ts`, 10 items, header says fictional and original. One item uses the owner's own cat image, pixelated at build time into `public/viral/`.
- UI: `ViralSheet`, a Viral button near the room toolbar, wall poster in `Room`, Settings switch, EN and BM strings.

## Assumptions (made in place of answers)

- "Once per day" is the player's local calendar date (`todayKey()`).
- The supplied image looks Minecraft-like. It ships pixelated at 192x108 and is flagged to the owner; items 2 to 10 use scenes drawn in code in our own style.
- Ten hand-written items to start; the date-based picker leaves room for the feed later.

## Slices (test first)

1. **Pure picker and store** (`src/lib/viral.ts`, `tests/viral.test.ts`)
   Red: `npx vitest run tests/viral.test.ts` fails (module missing). Covers `pickViral(items, today, seen)`, `shouldShowViral(store, today, enabled)`, `markShown`, `setPoster`, load/save with bad JSON.
2. **Catalogue** (`src/data/viral.ts`, extend `tests/content.test.ts` or add to `tests/viral.test.ts`)
   Red: unique ids, both languages, no haram emoji, no real-person list words, scene ids exist.
3. **Pixel renderer** (`src/lib/viralCard.ts`): pure scene model, canvas drawing for the picture and the PNG. Model tested; canvas is browser only.
4. **UI**: `ViralSheet`, hook in `GameShell`, Room poster, Settings switch, strings (`tests/i18n.test.ts` keeps EN/BM parity).
5. **Docs**: `CLAUDE.md` + `AGENTS.md` layout and status, plan matches build.

Evidence at the end: `npm run check`, 360px look in `npm run dev`.
## As built (differences from the plan)

- The "Viral button" is a menu entry ("Viral today") in the header menu, not a button beside the room toolbar: four toolbar buttons would not fit at 360px. It reopens the wall poster's card, else the latest seen card, else today's pick.
- The auto pop-up also waits while a payday is pending, as well as for the tutorial, a day report, an event or an ending.
- "Earlier cards" is a row of topic chips inside the sheet (not a separate shelf screen).
- English sheet title is "Viral Today" (Bahasa Malaysia "Viral Hari Ini"): the i18n test requires Malay and English to differ.
- 360px check: not done in a browser in this session (see handoff).

## Update: pictures

- The owner's cat picture is the first card only (pixelated 270x152 for the game, original kept for Save).
- Six more cards each have their own pixel illustration drawn in code (`src/lib/viralSprites.ts`): tabung (payday), umbrella (emergency fund), teh tarik (small treats), bed (sleep), water (hot weather), traffic (leave early). Lines are light game tips, not financial or medical advice.
- One picture, one card: a test keeps two cards from sharing a picture.
- Cards after these: either a new ready-made picture, or a new sprite plus scene.
