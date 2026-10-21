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
| `vehicles.ts` | `vehicles`, `vehicleById`, `transportModes`, `transportModeInfo` | `Vehicle`, `TransportModeInfo` | All prices and running costs are fictional estimates; not dealer prices or official road tax or insurance |
| `housing.ts` | `housingOptions`, `housingById`, `properties`, `propertyById` | `HousingOption`, `Property` | Rents, deposits and prices are fictional estimates; the "2 + 1" deposit is a game rule, not a legal requirement |
| `lifestyle.ts` | `gyms`, `shopItems`, `hustleDefs`, `homeStates`, `npcNames`, `traits`, `interests` | `Gym`, `ShopItem`, `HustleDef` | Prices are fictional estimates; NPC names are fictional |
| `statutory.ts` | `statutory`, `STATUTORY_DISCLAIMER` | `const` object | Simulated (simplified payroll) with official source links; see `payroll.md` |
| `backgrounds.ts` | `backgrounds`, `backgroundById`, `lifeStages`, `lifeStageById` | `Background`, `LifeStageDef` | Game rules |
| `holidays.ts` | `holidays`, `holidayOn`, `holidayStartingOn` | `Holiday` | Simulated calendar with fixed dates; not the real calendar |
| `feed.ts` | `friendPosts`, `worldPosts`, `invitePosts` | string and post templates | Fictional NPCs and fictional Seri Harapan outlets |
| `events.ts` | `events` | `GameEventDef[]` | Fictional; see `event-contract.md` |
| `achievements.ts` | `achievements`, `challenges`, `MAX_ACTIVE_CHALLENGES` | `Achievement`, `Challenge` | Fictional; conditions are pure functions of `GameState`, evaluated by `src/engine/progression.ts` |

When a file is added, renamed, or changes its main type, update this table (`doc-drift`).

## Integrity rules (checked by `tests/data.test.ts`, `tests/events.test.ts` and `data_validate`)

- Ids are unique within each catalogue (and across event ids).
- Cross-references resolve: job `industries` exist in `companies.ts`; university `fields` match `courses.ts` fields; holiday `eventId`s and event `followUp`s point at scheduled events; background and life-stage ids used by `newGame` exist.
- Numbers are in range: prices and salaries are positive; `salaryRange[0] <= salaryRange[1]`; calories positive; stat nudges small enough to keep a single item from swinging a stat by more than the spec allows.
- Every event has at least one always-available choice.
- Every catalogue file keeps its honesty header.

## Tone

Content follows `content-guard`: original, friendly, recognisably Malaysian humour; no
defamation; politics only through fictional parties and politicians in Seri Harapan; no ethnic or
religious stereotypes; every life path and ending is valid.
