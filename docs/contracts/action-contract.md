# Action contract

Actions are everything the player can choose to do: eat, sleep, work a shift, attend class, go
to the gym, apply for a job, take a loan. They live in `src/engine/actions/` (types in
`types.ts`; definitions in `lifeActions.ts`, `workActions.ts`, `peopleActions.ts`,
`ownershipActions.ts`; the combined `actionCatalogue` and `actionById` in `index.ts`), and are
run only by `performAction` and the autopilot (`engine-api.md`).

## `ActionDef`

```ts
type Dyn<T> = T | ((state: GameState, param?: string) => T);

interface ActionDef {
  id: string;                    // unique across the catalogue, kebab-case, e.g. 'work-shift'
  category: ActionCategory;      // 'daily' | 'food' | 'work' | 'career' | 'study' | 'fitness' | 'leisure' | 'social'
                                 // | 'love' | 'family' | 'money' | 'home' | 'transport' | 'hustle' | 'civic'
  icon: string;
  title: Dyn<string>;
  description: Dyn<string>;
  minutes: Dyn<number>;          // clock minutes, including any commute
  cost?: Dyn<number>;            // up-front cash, RM (fictional game estimate); checked before running
  energy?: Dyn<number>;          // estimated energy change shown in the UI (negative = tiring)
  contexts?: EventContext[];     // which random events may follow (events.ts)
  asleep?: boolean;              // time passes asleep (sleep, nap); no random event roll
  confirm?: (state: GameState, param?: string) => string | null;   // major decision: consequence text
  visible?: (state: GameState) => boolean;                        // hide when irrelevant
  available?: (state: GameState, param?: string) => string | null; // null = can do; else the reason
  variants?: (state: GameState) => { param: string; label: string }[]; // e.g. sleep 6/7/8h
  dedicated?: boolean;           // shown on its own screen, not in the generic Act list
  run: (state: GameState, param?: string) => string[] | void;      // mutates the draft; returns feedback lines
}
```

`param` selects an item or variant: a food id, a job listing id, a vehicle id, hours of sleep.
`available` validates it. Shared helpers in `types.ts`: `dyn`, `withinHours`, `hoursLabel`,
`needEnergy`.

## `ActionView` (what `listActions`, `describeAction` and `viewAction` return)

```ts
interface ActionView {
  id: string;
  param?: string;
  category: ActionCategory;
  icon: string;
  title: string;
  description: string;
  minutes: number;
  cost: number;
  energy: number;
  available: boolean;
  reason: string | null;   // why it is unavailable; null when available
  confirm: string | null;  // confirmation text for major decisions; null when none
}
```

## Rules

1. **Availability explains why.** `available` returns `null` or a short, player-facing reason ("Classes are only on weekdays", "Too tired (need 20 energy). Rest or sleep first."). Never `false`, never an empty string. The engine adds the generic reasons itself (chapter ended, event pending, not visible, "Need RMx cash."). The UI shows the reason; there are no dead buttons.
2. **Major decisions confirm the cost.** Quitting a job, dropping out, buying a vehicle or home, taking a loan, moving out, and ending a relationship, and cancelling medical insurance (it stops cover for big hospital bills) set `confirm`, returning text that states the financial consequence (for example "Down payment RM4,200 now, then RM389 a month for 7 years").
3. **`run` mutates only the draft, only through `core.ts` helpers** (`earn`, `spend`, `canAfford`, `addDebt`, `applyStats`, `addSkills`, `applyEffect`, `log`) and the domain modules. It does not advance time; `performAction` does that with `minutes`.
4. **No randomness outside `rng.ts`.** `run` may use `chance`, `randInt`, `pick`, `weightedPick` with the draft.
5. **Affordability.** A `cost` above the wallet makes the action unavailable. Voluntary spending never creates debt; only a loan action does, explicitly, and its `confirm` says so.
6. **Feedback deltas are computed, not written.** `performAction` diffs the state before and after; `run` returns only narrative lines.
7. **Content in catalogues.** Prices, names and item lists come from `src/data/`. Short narrative lines may live in the action file; reusable or long text belongs in a catalogue.
8. **Pure checks.** `visible`, `available`, `confirm`, `variants` and the `Dyn` functions never mutate state or draw from the rng.
9. **Action games are optional data.** An action may have an entry in `ACTION_GAMES`
   (`src/data/minigames.ts`): a game kind and theme, an intro line, and a small bonus. The UI offers
   the game before the action (Settings can turn it off; Skip always does the action as normal) and
   passes the 0-100 score to `performAction` as `options.gameScore`. The bonus is applied by the
   engine (`engine-api.md`), never cash, and never for sleep, money, home or transport actions.

10. **Gig work is income, not payroll.** `gig-work` (2h or 4h variants, `workActions.ts`) pays
    fictional net cash per hour through `earn`, by commute mode (`GIG_RATE_PER_HOUR`: motorcycle,
    car, walk, public; e-hailing mode has no gig), with a small seeded variation, energy, stress and
    time costs, a cap of `GIG_MAX_HOURS_PER_DAY` hours a day, and no overlap with class or a
    full-time shift before 5 PM. It names no brand and never appears on a payslip.

11. **Moving state is a major decision.** `move-state` (param = state name) confirms its moving
    cost, that rent and bills follow the new state's fictional cost factor, that new job offers
    follow its pay factor, and that a job is resigned (no remote work in v1). Details in
    `engine-api.md`, "Moving to another state".

12. **Trips and balik kampung use the map.** `src/engine/geography.ts` (pure) turns the stylised
    map in `src/data/malaysia.ts` into `travelBetween(from, to)`: `{ mode: 'road' | 'flight', minutes
    (one way), cost (fictional RM, return journey) }`. Road inside the Peninsula or inside Borneo
    (Labuan counts as Borneo), a flight across the sea, a short local hop (45 minutes, RM20) inside
    one state. Time is about 60 minutes of road per map tile; flights are 150 minutes plus 8 per
    tile. `tripMinutes(travel, stay)` is there-and-back plus `stay`, between 480 and 840 minutes, so
    a trip always fits in one day of game time.
    - `trip-state` (param = a state name from `MALAYSIA`, `dedicated`, opened from the map) is a
      day trip: weekends, public holidays or an annual-leave day, leaving 6-11 AM, at least 25
      energy and enough cash for the `travelBetween` fare. It takes `tripMinutes(travel, 240)`,
      raises happiness, lowers stress, counts a trip, and the first visit to a state records
      `travel.stamps[state] = day` and a memory. It is unavailable, with a reason, for an unknown
      state, the state you live in (`location.state`), a working weekday, a late start or too
      little cash.
    - `balik-kampung` costs `travelBetween(location.state, homeState).cost` (motorcycle on the road
      costs 60%, living with family costs nothing) and takes `tripMinutes(travel, 360)`, so living
      in your home state is a short, cheap hop and living across the sea is a long flight.
    - Jelajah Malaysia achievements (`jelajah-first`, `jelajah-8`, `jelajah-all`) count
      `geography.visitedStates`: trip stamps plus the state you live in.

13. **Ramadan is festive only.** The `ramadan` season (`src/data/festive.ts`, own `window` on the
    simulated calendar: 21 February to 17 March, anchored on Hari Raya Aidilfitri, ending where the
    Raya season starts) has a crescent and stars garland, festive wishes with no packet, and two
    actions in `peopleActions.ts`, both visible only during the season. `pasar-ramadan` (category
    `food`) is open 4-7 PM, costs `PASAR_RAMADAN.price` (fictional estimate, `canAfford` checked),
    adds a little satiety and happiness, and has a small seeded chance of a fun find line.
    `buka-puasa` (category `social`) is open 6:30-8:30 PM, is free, and raises friends, family
    (and a partner's trust and satisfaction), happiness and calm. Each is once a day (flags
    `pasar-ramadan-day`, `buka-puasa-day`) and explains itself when unavailable. There is no fasting
    mechanic, no rule about eating, and the game never assumes the player or any NPC observes.

## Tests

Each new action has tests for: the happy path through `performAction` with a fixed seed, at least
one unavailable case with its reason, the input state not mutated, and bounds (cash, stats) after
the action.
