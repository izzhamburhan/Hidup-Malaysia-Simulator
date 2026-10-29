# Event contract

Events are the surprises and dilemmas of life: a jam on the Seri Harapan bypass, a
cousin's wedding, a boss asking for weekend work. They are data in `src/data/events.ts`, typed by
`GameEventDef` in `src/engine/events.ts`, and resolved only through `resolveEvent` (`engine-api.md`).

## `GameEventDef`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | Unique. The registry throws on a duplicate. |
| `title` | `string` | Short title; may use placeholders. |
| `icon` | `string` | Emoji or icon name shown on the card. |
| `category` | `EventCategory` | `work`, `commute`, `money`, `family`, `social`, `love`, `health`, `study`, `civic`, `festive`, `chaos`, `opportunity`, `world`, `housing`. |
| `text` | `string \| (state, params) => string` | Body text; may use placeholders. |
| `modes` | `GameMode[]?` | `realistic`, `chaotic`. Default: both. |
| `trigger` | `'random' \| 'scheduled'` | Random events are rolled after actions; scheduled events fire on a day (follow-ups, holidays). |
| `contexts` | `EventContext[]?` | `commute`, `work`, `study`, `social`, `home`, `gym`, `food`, `shopping`, `night`, `love`, `family`, `any`. A random event is eligible when one of its contexts matches the action's. |
| `weight` | `number \| (state) => number` | Relative chance among eligible events. Default 1. Chaotic mode multiplies `chaos` events by 2.5. |
| `cooldownDays` | `number?` | Days before it can fire again. Default 14. |
| `once` | `boolean?` | Fires at most once per life. |
| `when` | `(state) => boolean` | Extra eligibility condition. |
| `params` | `(state) => Params` | Extra template values, computed when the event is queued. |
| `choices` | `EventChoice[] \| (state, params) => EventChoice[]` | The options. |

### Placeholders

`{name}` (character), `{partner}` (partner or "your crush"), `{employer}`, `{home}` (home state),
`{friend}` (a random NPC name, drawn with the rng), plus any key from `params`. Unknown keys are
left as `{key}`, which a test should catch.

### `EventChoice`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | Unique within the event. |
| `label` | `string` | Button text; may use placeholders. |
| `hint` | `string?` | Short consequence hint. |
| `cost` | `number \| (state, params) => number` | Cash needed up front. The choice is disabled with "Need RMx cash" if unaffordable. |
| `requires` | `(state, params) => string \| null` | Extra condition; returns the reason it is unavailable. |
| `outcomes` | `EventOutcome[]` | One is picked by `weight` with the rng. |

### `EventOutcome`

| Field | Type | Meaning |
| --- | --- | --- |
| `weight` | `number?` | Default 1. |
| `text` | `string` | Result text; may use placeholders. |
| `effect` | `Effect?` | Declarative bundle applied with `applyEffect` (cash, savings, stats, skills, family, friends, partner, performance, community, minutes, flags, addDebt, memory, post). `effect.minutes` advances time through `advanceTime`. |
| `apply` | `(state, params) => string \| void` | Custom logic through engine helpers; may return an extra line. |
| `followUp` | `{ eventId, inDays }` | Schedules another event at least one day later. |

## Rules

1. **At least one always-available choice.** Every event (and every result of a `choices` function) has a choice with no `requires` and no `cost`, so the player is never stuck. A data test checks static choices; function choices are checked over a few seeded states.
2. **Follow-ups target scheduled events.** `followUp.eventId` and holiday `eventId`s point at an event with `trigger: 'scheduled'`. A data test checks every reference resolves.
3. **Deterministic.** `apply`, `params` and `{friend}` use the rng helpers with `state.rng`. No `Math.random()` or wall clock.
4. **Pure conditions.** `when`, `weight`, `requires` and `cost` read state; they never mutate it or draw from the rng.
5. **Bounded effects.** Effects go through core helpers, so stats stay 0 to 100. A negative `cash` effect larger than the wallet must not drive cash below zero: use `cost` (which blocks the choice) or `addDebt`.
6. **Pending events block actions.** One random event is queued at a time; scheduled events can queue behind it. The UI shows the front event until it is resolved.
7. **Content rules apply.** Text follows `content-guard`: friendly, original, no real politicians (Seri Harapan only), no stereotypes, numbers are fictional estimates.

## The broke safety net

The scheduled `broke` event is queued at day start by `brokeEventDue(state)` (`daily.ts`), a pure
check: cash under RM15, none pending, at least `BROKE_GAP_DAYS` (45) since the last one, not within
`BROKE_AFTER_HELP_DAYS` (30) of the random `family-topup` event, and no income in the last
`BROKE_RECOVERY_DAYS` (7) days (read from `dayReports`). The `family-topup` event (money, random)
fires only with cash under RM50, overdue debt of RM100 or more, no family allowance or family home
support, and a 60-day cooldown. It offers a gift, a small loan or a free "I will manage". The
delivery gig action (`gig-work`, `action-contract.md`) is the third way out. Changing the gap or
the conditions is a balancing change and needs a seeded autopilot comparison.

## Roll rate

After an action of `m` minutes, a random event fires with probability
`min(MAX_EVENT_CHANCE, EVENT_RATE_PER_HOUR[mode] * m / 60)` (currently 0.4 cap; 0.055 per hour
realistic, 0.095 chaotic), and only when nothing is pending. Changing these numbers is a balancing
change and needs an autopilot comparison.
