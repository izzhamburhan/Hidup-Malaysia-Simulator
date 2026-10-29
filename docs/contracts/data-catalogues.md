# Data catalogues contract

All game content lives in `src/data/`. Engine modules import catalogues; components display what
the engine returns. Each file starts with a header comment stating its honesty label, and keeps it.

## Honesty labels

| Label | Meaning | Required wording in the header |
| --- | --- | --- |
| **Real name** | A real institution or company used as a name only. No vacancies, rankings, entry requirements, fees, salaries or practices are implied. | "used as catalogue entries only" / "used ONLY as example employers" |
| **Fictional estimate** | A number chosen for game balance: salary, tuition, price, rent, deposit, vehicle or running cost, calories. | "FICTIONAL GAME ESTIMATES" (calories: "ROUGH ESTIMATES ... Not nutrition advice") |
| **Simulated** | A simplified model of a real system or calendar. | "SIMPLIFIED" (payroll) / "SIMULATED" (holidays) |
| **Fictional** | Invented content: NPCs, feed posts, Seri Harapan, events, achievements. | "Fictional" |
| **Game rule** | A balance value with no real-world counterpart. | "game balance" / "game rule" |

## Catalogue files

| File | Main exports | Type | Labels |
| --- | --- | --- | --- |
| `universities.ts` | `universities`, `universityById` | `University` | Real name; tuition is a fictional estimate; `strengths` and `industryLinks` are game flavour, not quality claims |
| `courses.ts` | `courses`, `courseById` | `Course` | Generic fields of study; skill gains are game rules |
| `companies.ts` | `companies`, `companyById`, `industryLabels` | `Company`, `Industry` | Real name; pay factors are fictional balance values |
| `jobs.ts` | `jobs`, `jobById` | `Job` | Salary ranges and shift pay are fictional estimates; not offers from any company |
| `foods.ts` | `foods`, `foodById`, `portions` | `Food` | Calories are rough estimates (not nutrition advice); prices are fictional estimates |
| `vehicles.ts` | `vehicles`, `vehicleById`, `transportModes`, `transportModeInfo`, `VEHICLE_SHAPES` | `Vehicle`, `TransportModeInfo`, `VehicleShape` | All prices and running costs are fictional estimates; not dealer prices or official road tax or insurance. Each vehicle has a generic body `shape` and paint `color` for the pixel sprite (`VehicleSprite`); never a logo, badge or photo |
| `minigames.ts` | `MINIGAMES`, `MAMAK_MENU`, `MINIGAME_REWARDS`, `ACTION_GAMES`, `PICK_PROMPTS`, `MEMORY_SETS` | `Minigame`, `ActionGame`, `ActionGameBonus`, `PickPrompt` | Rewards and action-game bonuses are small fictional game values, never cash; prompts are original and fictional |
| `housing.ts` | `housingOptions`, `housingById`, `properties`, `propertyById` | `HousingOption`, `Property` | Rents, deposits and prices are fictional estimates; the "2 + 1" deposit is a game rule, not a legal requirement |
| `lifestyle.ts` | `gyms`, `shopItems`, `hustleDefs`, `homeStates`, `npcNames`, `traits`, `interests` | `Gym`, `ShopItem`, `HustleDef` | Prices are fictional estimates; NPC names are fictional |
| `lifestyle.ts` | `gyms`, `shopItems`, `lifestyleUpgrades`, `UNIT_TRUST`, `SEDEKAH`, `hustleDefs`, `homeStates`, `npcNames`, `traits`, `interests` | `Gym`, `ShopItem`, `LifestyleUpgrade`, `HustleDef` | Prices are fictional estimates; NPC names are fictional. The unit trust is a fictional Seri Harapan fund (never a real fund, never a return promise); sedekah gives to a fictional community fund with a daily cap |
| `statutory.ts` | `statutory`, `STATUTORY_DISCLAIMER` | `const` object | Simulated (simplified payroll) with official source links; see `payroll.md` |
| `backgrounds.ts` | `backgrounds`, `backgroundById`, `lifeStages`, `lifeStageById` | `Background`, `LifeStageDef` | Game rules |
| `holidays.ts` | `holidays`, `holidayOn`, `holidayStartingOn` | `Holiday` | Simulated calendar with fixed dates; not the real calendar |
| `malaysia.ts` | `MALAYSIA`, `mapStateByName`, `MAP_COLS`, `MAP_ROWS`, `DEFAULT_RESIDENCE` | `MapState` | The 16 states and territories (names match `STATE_FLAGS`) as a stylised pixel-tile map, not to scale and not a statement about borders. `costFactor` and `payFactor` are fictional game estimates relative to Selangor (1.0), never statistics; blurbs are friendly place, food and nature flavour |
| `feed.ts` | `friendPosts`, `worldPosts`, `invitePosts` | string and post templates | Fictional NPCs and fictional Seri Harapan outlets. The feed generator (`generateFeedPosts`, `social.ts`) never repeats a post text within the last 8 generated posts, picking through `rng.ts`; keep each pool larger than 8 (a pool with no fresh text skips that post). The `scroll-feed` action calls `refreshFeed` for up to 3 more friend or town posts (never invitations) under the same rule, and says "You're all caught up" when none is fresh |
| `events.ts` | `events` | `GameEventDef[]` | Fictional; see `event-contract.md` |
| `achievements.ts` | `achievements`, `challenges`, `MAX_ACTIVE_CHALLENGES` | `Achievement`, `Challenge` | Fictional; conditions are pure functions of `GameState`, evaluated by `src/engine/progression.ts` |

When a file is added, renamed, or changes its main type, update this table (`doc-drift`).

## Integrity rules (checked by `tests/data.test.ts`, `tests/events.test.ts` and `data_validate`)

- Ids are unique within each catalogue (and across event ids).
- Cross-references resolve: job `industries` exist in `companies.ts`; university `fields` match `courses.ts` fields; holiday `eventId`s and event `followUp`s point at scheduled events; background and life-stage ids used by `newGame` exist.
- Numbers are in range: prices and salaries are positive; `salaryRange[0] <= salaryRange[1]`; calories positive; stat nudges small enough to keep a single item from swinging a stat by more than the plan for that change allows.
- Every event has at least one always-available choice.
- Every catalogue file keeps its honesty header.

## Tone

Content follows `content-guard`: original, friendly, recognisably Malaysian humour; no
defamation; politics only through fictional parties and politicians in Seri Harapan; no ethnic or
religious stereotypes; every life path and ending is valid.

## Appearance and badges

| File | Contents | Honesty label |
| --- | --- | --- |
| `src/data/appearance.ts` | Skin tones, hair styles and colours, outfits, outfit colours, headwear (with random weights) for pixel characters | Cosmetic only; options are free to mix and are never tied to background, stats or outcomes |
| `src/data/companies.ts` `badge` | 2 to 5 capital letters per company, shown by `OrgBadge` | A neutral name badge, never a logo, brand colour or lookalike |

Universities use their `short` name for the badge; statutory bodies (EPF, SOCSO, EIS, PCB) use
their common abbreviations. No image of any real logo is stored or drawn.
