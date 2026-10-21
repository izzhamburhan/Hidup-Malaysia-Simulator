---
name: engine-contract-guard
description: Use when a HIDUP MALAYSIA change touches src/engine/, GameState, an action definition, an event definition, or the public engine API in simulationEngine.ts. Keeps the engine pure, deterministic, bounded, and the only owner of gameplay rules.
---

# Engine Contract Guard

The engine is the single owner of every gameplay rule. The UI and the MCP server depend on its
contract. Check every item while writing the plan, before edits, and again at verification.
The facts live in `AGENTS.md` (Engine rules) and `docs/contracts/` (`engine-api.md`,
`action-contract.md`, `event-contract.md`); read the ones the change touches.

## Purity

- No React, DOM, `window`, `document`, `fetch` or Node-only imports in `src/engine/`. Only `save.ts` touches storage, through the `Storage`-like object it is given.
- Engine modules import catalogues from `src/data/`; they do not hard-code content text or prices.

## Central action resolution

- Gameplay changes happen only inside `performAction` and `resolveEvent`. They clone the input, mutate the draft, and return a new state. The input state is never mutated; a test proves it.
- Draft mutations go through `core.ts` helpers (`earn`, `spend`, `canAfford`, `addDebt`, `applyStats`, `addSkills`, `applyEffect`, `log`) so counters, day trackers and bounds stay consistent.
- Time moves only through `advanceTime` in `time.ts`. Nothing else writes `state.clock`.
- While `state.events.pending` is not empty, actions are refused with a reason. Energy at or below 0 forces sleep.

## Determinism

- Every random draw uses `rng.ts` (`nextRandom`, `chance`, `randInt`, `randRange`, `pick`, `weightedPick`) with `state.rng`. No `Math.random()`, `Date.now()`, or argument-less `new Date()`.
- Iteration order that affects outcomes is stable (arrays, not object key order that can change).
- A seeded test proves: same state, same action, same seed gives the same result.

## Bounds and money

- Stats stay within 0 to 100 (`clamp` via `applyStats`).
- Wallet cash is never negative. Voluntary purchases check `canAfford` and are unavailable with a reason when unaffordable. Obligations (bills, fines, rent) call `spend(..., true)` so a shortfall becomes overdue debt.
- EPF is never spendable cash; nothing moves `epfBalance` into `cash` except a rule the plan names explicitly.

## Actions (`docs/contracts/action-contract.md`)

- Each `ActionDef` has a unique id, category, icon, title, description and minutes. Whenever it can be unavailable, `available` returns `null` or a human-readable reason (never `false` or an empty string).
- Major decisions (quitting, buying a vehicle or home, taking a loan, dropping out, moving out) set `confirm`, which returns text stating the financial consequence.
- Feedback deltas come from diffing the state before and after, not from hand-written numbers.

## Events (`docs/contracts/event-contract.md`)

- Event ids are unique. Every event has at least one choice with no `requires` and no `cost`.
- `followUp.eventId` points at an event with `trigger: 'scheduled'`. Holiday `eventId`s too.
- `apply` and `when` use the rng helpers and core helpers; `when` and `weight` never mutate state.

## Checks

1. Grep the diff in `src/engine/` for `Math.random`, `Date.now`, `new Date()`, `from 'react'`, `window.`, `document.`, `state.clock.` assignments outside `time.ts`.
2. Confirm a test exercises the change through the public API (`performAction`, `resolveEvent`, `runAutopilot`) with a fixed seed.
3. Confirm the not-mutated-input test still passes.
4. If `GameState` changed shape, run `save-compat-guard`.
5. If the public API or a contract changed, update `docs/contracts/` and check the MCP server still compiles and its smoke call works.

## Red flags

| Thought | Reality |
| --- | --- |
| "I'll compute this in the component." | Gameplay rules live in the engine. The UI displays. |
| "`Math.random()` is fine for flavour text." | Flavour changes the rng sequence for everything after it. Use `pick(state, ...)`. |
| "I'll set the clock forward to skip the night." | Use `advanceTime(state, minutes, { asleep: true })`. |
| "Cash can dip below zero for a moment." | It must not, even mid-action. Check or convert to overdue debt. |
| "This event only fires when they are rich, so no free choice is needed." | Every event needs an always-available choice. |
