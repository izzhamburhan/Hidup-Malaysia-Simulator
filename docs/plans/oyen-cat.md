# Plan: Oyen the cat

## Why

A Pou-style care loop: something small to look after that gives a reason to open the game every
day. A ginger cat called Oyen is a very Malaysian joke and easy to share.

## Decisions

- **Shape change: yes.** `GameState.pet: Pet | null` (`name`, `species: 'cat'`, `adoptedDay`,
  `fullness` 0-100, `mood` 0-100, `lastFedDay`, `lastPlayedDay`, `timesFed`). `SAVE_VERSION`
  2 to 3; migration 2 -> 3 sets `pet: null`; fixture test; `save-format.md` history updated.
- **Rules in the engine** (`src/engine/pet.ts`): `adoptPet`, `feedPet`, `playWithPet`,
  `petDayEnd` (called from `processDayEnd`). Each day fullness falls 45 and mood falls 8 (20 when
  hungry). A happy cat (mood 70+) gives the player stress -2 and happiness +1 a day; a starving
  cat (fullness 0) costs happiness -2 and logs a nudge. The cat never dies or leaves: neglect only
  makes it sulk. All bounded with `clamp`; no randomness.
- **Prices are data** in `src/data/pets.ts` (fictional estimates): adoption with vet check
  RM80, a meal of cat food RM6.
- **Actions** (category `home`): `adopt-cat` (only without a pet, confirm with the cost),
  `feed-pet` (unavailable with a reason when full), `play-pet`.
- **Event** `stray-oyen` (random, home/commute, only without a pet, cooldown 20 days): adopt
  (costs the vet check) or the free "give water, say bye" choice.
- **Achievement** `hamba-kucing`: keep the cat's mood at 90 or more.
- **UI**: Oyen sits on the room floor with a mood bubble; tapping him plays. `feed-pet` joins the
  Home quick actions when he is hungry. New activities `petfeed` and `petplay` (room, motion,
  sound).

## Tests (tests/pet.test.ts)

1. A v2 save migrates to v3 with `pet: null`.
2. `adopt-cat` through `performAction`: costs RM80, Oyen arrives, input state not mutated.
3. `feed-pet` fills him and costs RM6; refused with a reason when full.
4. Day end: fullness and mood fall; a happy cat lowers the player's stress compared with no cat;
   a starving cat lowers happiness. Values stay within 0-100.
5. `stray-oyen` has a free choice, and its adopt choice gives a pet.
6. Same seed and actions give the same pet state.

## Commands

```bash
npx vitest run tests/pet.test.ts tests/save.test.ts
npm run check
```
