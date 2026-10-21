---
name: mobile-ui-guard
description: Use when a HIDUP MALAYSIA change touches src/components/, src/screens/, src/App.tsx, or styling. Keeps the UI mobile-first at 360px, with bottom navigation, no dead buttons, readable contrast, confirmations for major decisions, and no state mutation outside the engine.
---

# Mobile UI Guard

Most players are on a phone. The UI shows engine state and calls the engine; it owns no rules.
The facts live in `AGENTS.md` (Engine rules) and `docs/contracts/engine-api.md`.

## The UI does not own gameplay

- Components never mutate `GameState`. They call `performAction(state, id, param)` or `resolveEvent(state, choiceId)`, replace the state with the returned one, show the feedback, and autosave.
- Action lists come from `listActions(state)` (or `viewAction` for dedicated screens); the UI renders what the engine returns and shows `ActionView.reason` when `available` is false.
- No gameplay numbers or rules in components. No `Math.random()` for outcomes. Text comes from catalogues or the engine's feedback.
- While an event is pending, the event card is shown and other actions are disabled with that reason.

## Layout at 360px

- Design and check at 360px wide first, then larger. No horizontal scroll, no clipped text, no overlapping controls.
- Navigation is a bottom nav bar, reachable with a thumb, with labels as well as icons.
- Tap targets are at least 44 by 44 px with spacing between them.
- Long lists scroll inside the screen; the bottom nav and any primary button stay reachable. Respect the safe-area inset.
- Numbers use `formatRM` and readable time and date helpers from the engine.

## No dead buttons

- Every visible button does something. If an action is unavailable, it is disabled and the reason is shown (inline or on tap), never silently ignored.
- Loading or empty states say what is happening.

## Major decisions

- Actions whose `ActionView.confirm` is set (quit job, buy vehicle or home, take a loan, drop out, move out, end a relationship) open a confirmation showing that text, including the financial consequence, with a clear cancel.
- Respect the `confirmMajor` setting only where the plan says it may be skipped.

## Accessibility

- Text contrast meets WCAG AA (4.5:1 for body text, 3:1 for large text and icons that carry meaning). Do not rely on colour alone for good or bad changes; use a sign or icon too.
- Buttons and icon-only controls have accessible names (`aria-label`). lucide-react icons that are decorative are `aria-hidden`.
- Honour the `reducedMotion` setting and `prefers-reduced-motion`.
- Honour the `comparisonAnxiety` setting where the feed or comparisons appear.

## Checks

1. `npm run dev`, open the changed screens in a 360px-wide viewport (browser device toolbar).
2. Tap every new control. Confirm unavailable ones explain why.
3. Trigger a major decision and confirm the dialog shows the cost.
4. Check contrast of new colours and the accessible names of new icon buttons.
5. Grep the diff for direct state writes (`state.` assignments, `setState` with a mutated object) in components.
6. Run `content-guard` on any new copy.

## Red flags

| Thought | Reality |
| --- | --- |
| "It looks fine on my monitor." | Check at 360px. |
| "I'll just hide the button when it is unavailable." | Hiding is fine only if the engine says it is not visible. Otherwise disable it and show the reason. |
| "I'll update the cash in the component for snappier feedback." | The engine owns state. Show the returned feedback instead. |
| "Confirmation dialogs slow players down." | Major decisions need them, with the cost shown. |
