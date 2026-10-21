---
name: change-design-spec
description: Use when HIDUP MALAYSIA discovery is done and requirements, acceptance criteria, the engine or data contract, save impact, content honesty, or UI behaviour need to be decided and approved before planning.
---

# Requirements and Design Spec

Turn discovery into one reviewable spec. Do not edit production code while writing it.

## Required inputs

- The discovery note from `change-intake-discovery`.
- `CLAUDE.md`, `playbook.md` (§8 Definition of Ready), and the contracts in `docs/contracts/` the change touches.

## Spec contents

Write `docs/specs/<slug>.md` (see `docs/specs/README.md`):

1. **Goal and non-goals.**
2. **Acceptance criteria.** Numbered, each one testable. Include the unavailable case (with the reason text the player sees) and boundary cases (zero cash, stats at 0 or 100, last day of month, pending event).
3. **Contract.** For each new or changed engine function, action, event, catalogue type, or MCP tool: the exact shape, following the contract files. Say which contract file changes and how.
4. **Game rules and numbers.** Time cost, money cost, energy and stat deltas, randomness (which `rng.ts` helper, which probabilities). Numbers are fictional game estimates; say so.
5. **Save impact.** `GameState` fields added, removed or changed; the new `SAVE_VERSION`; what the migration fills in for old saves. "None" if the shape is unchanged.
6. **Content and honesty.** New text, real names, humour, payroll or calorie claims, and the label each one carries. Politics only through fictional Seri Harapan.
7. **UI.** Screens touched, where the control lives at 360px, the confirmation text for major decisions (with the financial consequence), and how unavailability is shown.
8. **Balance.** Expected effect on a typical run; for balancing changes, the autopilot scenario to compare before and after.
9. **Alternatives considered** and why the chosen design wins, briefly.
10. **Rollout.** What happens to existing saves and to the MCP tools' outputs.

## Review

For risky specs (save format, the public engine API, payroll), ask `hm-reviewer` for an
independent read of the spec before showing it to the developer.

## Exit condition

Self-review for placeholders, contradictions, and untestable criteria. Show the spec to the
developer, get explicit approval, and only then continue with `tdd-plan`. Commit the spec only
when the developer approves committing.

## Common mistakes

- Acceptance criteria that cannot fail.
- Putting text or numbers in the engine or a component instead of a catalogue.
- Forgetting the migration when a field is added to `GameState`.
- A major decision with no confirmation, or a confirmation that hides the cost.
- Numbers presented as real-world facts.
