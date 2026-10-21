# MCP server contract: `hidup-sim`

**This is the contract the server must follow.** Code: `mcp/hidup-sim/server.ts` (run with
`tsx`). Registered in `.mcp.json` as server `hidup-sim`, command `npx`, args
`["tsx", "mcp/hidup-sim/server.ts"]`. Start by hand with `npm run mcp`.

## Purpose

Expose the real simulation engine to agents for balancing, QA and bug reproduction, without a
browser. The server is a thin wrapper: it imports `src/engine/simulationEngine.ts`,
`src/engine/payroll.ts` and the catalogues, and never re-implements a rule.

## Operating rules

- **Transport:** stdio only.
- **Sessions in memory.** Each `sim_new_game` creates a session id (for example `s1`, `s2`, ...; deterministic counter, not random) mapping to a `GameState`. Sessions live until the process exits. No cross-session sharing.
- **No network, no file writes, no LocalStorage.** The server reads only the code it imports.
- **Deterministic.** The same seed and the same sequence of calls give the same results.
- **Inputs validated** with zod. Invalid input returns an error result, never a crash.
- **Results are JSON text.** Every tool returns one `text` content item containing `JSON.stringify(result, null, 2)`. Errors return `isError: true` with JSON `{ "error": "<message>" }`.
- **Honesty.** Results that contain money or payroll numbers include `"note": "Fictional game estimates; payroll is a simplified simulation, not official."`

## Shared shapes

```ts
// A compact, agent-friendly view of a GameState.
interface StateSummary {
  sessionId: string;
  day: number;            // state.clock.day
  date: string;           // formatted in-game date
  time: string;           // formatted in-game time
  age: number;
  mode: 'realistic' | 'chaotic';
  lifeStage: string;
  cash: number;
  savings: number;
  epfBalance: number;
  totalDebt: number;
  netWorth: number;
  stats: Stats;           // energy, health, fitness, stress, happiness, reputation, satiety
  job: { title: string; employer: string; monthlySalary: number } | null;
  education: { status: string; university?: string; course?: string; semester?: number; cgpa?: number };
  relationship: string;   // relationshipStatus(state)
  pendingEvent: EventView | null;   // events.ts viewEvent()
  ending: { id: string; title: string } | null;
}
```

`ActionView` is defined in `action-contract.md` (`src/engine/actions/types.ts`); `ActionFeedback` and `Payslip` in `src/engine/types.ts`; `EventView` in `src/engine/events.ts`.

## Tools

| Tool | Arguments | Returns |
| --- | --- | --- |
| `sim_new_game` | `options?: Partial<NewGameOptions>` (name, startAge, homeState, backgroundId, lifeStage, mode, universityId, courseId, startSemester, jobId, chapterYears), `seed?: number` | `{ sessionId, summary: StateSummary }`. Missing options get documented defaults; `seed` defaults to a fixed constant so runs are reproducible. |
| `sim_list_actions` | `sessionId: string`, `includeUnavailable?: boolean` (default true) | `{ actions: ActionView[], pendingEvent: EventView \| null }`. Variants appear as separate entries with their `param`; pass it to `sim_perform_action`. |
| `sim_perform_action` | `sessionId: string`, `actionId: string`, `param?: string` | `{ feedback: ActionFeedback, summary: StateSummary }`. On `ok: false` the session state is unchanged. |
| `sim_resolve_event` | `sessionId: string`, `choiceId: string` | `{ feedback: ActionFeedback, summary: StateSummary }` |
| `sim_autopilot` | `sessionId: string`, `days: number` (integer, 1 to 3650) | `{ feedback: ActionFeedback, daysSimulated: number, interrupted: boolean, summary: StateSummary, before: StateSummary }`. Stops early when an event needs a decision (`interrupted: true`); resolve it with `sim_resolve_event`, then call again. |
| `sim_state_summary` | `sessionId: string`, `full?: boolean` (default false) | `{ summary: StateSummary }`, plus `state: GameState` when `full` is true |
| `payroll_calculate` | `basic: number`, `schedule: 'fulltime' \| 'parttime' \| 'intern'`, `overtime?`, `bonus?`, `allowance?`, `unpaidLeave?`, `month?: string` (YYYY-MM), `employer?: string` | `{ payslip: Payslip, disclaimer: string, sources: { epf, perkeso, lhdn } }` from `computePayslip` and `statutory.ts` |
| `data_validate` | none | `{ ok: boolean, problems: string[], counts: Record<string, number> }`: the same integrity rules as `tests/data.test.ts` and `tests/events.test.ts` (`data-catalogues.md`) |

## Errors

| Case | Result |
| --- | --- |
| Unknown `sessionId` | `isError: true`, `{ "error": "Unknown session <id>. Call sim_new_game first." }` |
| Invalid arguments | `isError: true`, `{ "error": "<zod message>" }` |
| Unavailable action or choice | Not an MCP error: `feedback.ok` is false with the engine's reason. |
| Unexpected exception in the engine | `isError: true`, `{ "error": "<message>" }`; the session keeps its previous state. |

## Changing this contract

Update this file first, then the server, then run a stdio smoke call (see `verification-review`)
listing tools and calling the changed one. Tool names keep the `sim_`, `payroll_` and `data_`
prefixes.
