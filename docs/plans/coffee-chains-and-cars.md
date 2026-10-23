# Plan: Malaysian coffee chains and more car models

Request (2026-10-23): add real coffee chains (ZUS Coffee, Kopi Kenangan, Chagee) as places to buy
a drink, and more real car models (Proton, Perodua, Honda) to buy. Content-only change.

## Decisions

- **Real names, same pattern as existing companies/universities.** ZUS Coffee, Kopi Kenangan and
  Chagee appear as a drink item (something you buy) and as an employer (`industry: 'retail'`,
  fictional pay factor, neutral initials badge). No logos, no exact trademarked menu-item names
  (generic "iced latte" / "milk tea" descriptors only), no implied vacancies or endorsement.
- **Owning a coffee shop stays fictional, not a named franchise.** Letting the player literally
  "buy a ZUS Coffee franchise" would imply a real business/licensing relationship the game can't
  represent honestly. Instead, add a new side hustle, a generic "specialty kopi kiosk" (flavour
  text nods at the real kiosk trend without naming a brand as the owned business). It uses the
  existing hustle -> hire staff -> register company progression already in `business.ts`; no
  engine change needed.
- **More cars** extend the existing fictional price curve in `vehicles.ts`: Perodua Bezza (used,
  budget), Perodua Alza (new MPV), Proton X50 and X70 (new SUVs), Honda City (new sedan).

## Scope (content-only; no engine or UI code changes)

- `src/data/companies.ts`: new `Industry` value `'retail'` + label; 3 new companies.
- `src/data/jobs.ts`: add `'retail'` to the existing `barista` and `retail` jobs' industries; new
  full-time `store-supervisor` job with a 5-rung ladder.
- `src/data/foods.ts`: 3 new drink items.
- `src/data/lifestyle.ts`: 1 new `HustleDef` (`kopi-kiosk`).
- `src/data/vehicles.ts`: 5 new vehicles.
- `tests/data.test.ts`: assert the new companies, foods, job and vehicles exist with the right
  shape (reuses existing integrity checks for uniqueness and cross-references).

## Commands

```bash
npx vitest run tests/data.test.ts
npm run check
```
