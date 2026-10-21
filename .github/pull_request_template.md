## Summary

<!-- The player-visible change in plain language, then the technical change. Link the plan: docs/plans/<slug>.md. Link the design spec (docs/specs/<slug>.md) only if one was written. -->

## Area(s) touched

<!-- e.g. engine (economy), data (events), ui (screens/Home), save, mcp, docs -->

## Contract changes

<!-- Engine API, ActionDef, GameEventDef, catalogue types, MCP tools. Name the docs/contracts/ file updated. "None" if none. -->

## Save version change

<!-- SAVE_VERSION before -> after, and what the migration does. "None: GameState shape unchanged" if none. -->

## Tests and evidence

- [ ] Failing test written first
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass (paste test counts)
- [ ] `npm run skills:check` passes
- [ ] Engine change: seeded test through `performAction` / `resolveEvent`; input state not mutated
- [ ] Save shape change: `SAVE_VERSION` bumped, migration and fixture test added
- [ ] Content change: data validation test passes
- [ ] Balancing change: autopilot numbers before and after (paste them)
- [ ] MCP change: stdio smoke call (paste tool list and one call)

## Content honesty checklist

- [ ] Content lives in `src/data/`, not in components or engine logic
- [ ] Real universities and companies are names only (no vacancies, rankings, fees, salaries implied)
- [ ] Salaries, tuition, prices, rents and vehicle costs labelled as fictional game estimates
- [ ] Calories are estimates; no nutrition or medical advice
- [ ] Payroll shown as a simplified simulation with the disclaimer and official links
- [ ] Humour friendly and original; politics only via fictional Seri Harapan; no stereotypes; no real people mocked

## Mobile check

- [ ] Checked at 360px width (screenshot if UI changed)
- [ ] Bottom nav reachable; no horizontal scroll
- [ ] No dead buttons: unavailable actions show a reason
- [ ] Major decisions confirm with the financial consequence
- [ ] Contrast and accessible names checked
- [ ] Not applicable (no UI change)

## Rollout notes

<!-- Effect on existing saves, MCP tool outputs, docs updated (CLAUDE.md, AGENTS.md, SKILLS.md, contracts). -->
