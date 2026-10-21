# Contracts

Each file here is the source of truth for one boundary in HIDUP MALAYSIA. The UI, the tests, the
`hidup-sim` MCP server and every agent depend on these shapes and guarantees.

| Contract | Boundary | Code that must follow it | Guard skill |
| --- | --- | --- | --- |
| [engine-api.md](engine-api.md) | Public engine API used by the UI and the MCP server | `src/engine/simulationEngine.ts` | `engine-contract-guard` |
| [action-contract.md](action-contract.md) | Shape and rules of an action definition | `src/engine/actions/` | `engine-contract-guard` |
| [event-contract.md](event-contract.md) | Shape and rules of an event definition | `src/engine/events.ts`, `src/data/events.ts` | `engine-contract-guard`, `content-guard` |
| [save-format.md](save-format.md) | LocalStorage keys, save envelope, migrations | `src/engine/save.ts` | `save-compat-guard` |
| [data-catalogues.md](data-catalogues.md) | Every catalogue file, its type and its honesty label | `src/data/` | `content-guard` |
| [payroll.md](payroll.md) | What the simplified payroll simulates, and its disclaimer | `src/engine/payroll.ts`, `src/data/statutory.ts` | `content-guard`, `engine-contract-guard` |
| [mcp-hidup-sim.md](mcp-hidup-sim.md) | Tools of the local MCP server | `mcp/hidup-sim/` | `engine-contract-guard` |

## Rules

- **Contract first.** A change to one of these boundaries updates the contract in the same change, before or with the code. The plan (`docs/plans/<slug>.md`) says which contract changes.
- **Tests enforce contracts.** Each guarantee written here has a Vitest test in `tests/` (or a stdio smoke call for the MCP server). A guarantee with no test is a gap to report.
- **Types win on detail, contracts win on intent.** `src/engine/types.ts` and the module types are the exact TypeScript shapes. If code and contract disagree, stop and ask the developer which is right, then fix the other side in the same change (`doc-drift`).
- **Versioned where stored.** Anything persisted (the save) is versioned; see `save-format.md`.
