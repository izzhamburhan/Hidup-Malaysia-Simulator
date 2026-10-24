# Plan: room decor shop

## Why

Money needs a fun sink, and the Pou-style room should feel like *your* place. Buy decor, see it in
the room, get a small comfort bonus.

## Decisions

- **Shape change: yes.** `GameState.decor: { owned: string[]; placed: Partial<Record<DecorSlot, string>> }`.
  `SAVE_VERSION` 3 to 4; migration 3 -> 4 sets `{ owned: [], placed: {} }`; fixture test;
  `save-format.md` history updated.
- **Catalogue** `src/data/decor.ts` (fictional prices): 16 items over four slots: `wall`, `left`,
  `right`, `centre`. Generic items only, no brands.
- **Rules** `src/engine/decor.ts`: `buyDecor` (spend, own, place in its slot), `placeDecor` (swap
  to an owned item), `decorDayEnd` (happiness +0.4 per placed item, at most +1.6 a day). No
  randomness. Decor moves with you when you move home.
- **Actions** (category `home`, `dedicated`, so they live in the shop, not the Act list):
  `buy-decor` (param item id; reasons: already owned, cannot afford; confirm at RM500+),
  `place-decor` (param id; reason: not owned / already placed).
- **Achievement** `rumahku-syurgaku`: all four slots filled.
- **UI**: a "Decorate" button on the room (home rooms only) opens a shop sheet grouped by slot
  with Buy / Use buttons (locked ones show their reason). Placed items replace that slot's emoji in
  the living room and bedroom. New activity `decorate`.

## Tests (tests/decor.test.ts)

1. v3 save migrates to v4 with empty decor.
2. `buy-decor` costs the price, owns and places the item; the input state is unchanged.
3. Buying an owned item, or one you cannot afford, is refused with a reason.
4. `place-decor` swaps the slot to another owned item.
5. Day end: placed decor lifts happiness versus none, capped.
6. Every decor id is unique and every slot has at least three items.

## Commands

```bash
npx vitest run tests/decor.test.ts
npm run check
```
