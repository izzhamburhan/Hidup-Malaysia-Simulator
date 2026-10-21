---
name: verification-review
description: Use when HIDUP MALAYSIA implementation or a test-only slice is complete and the change may be claimed fixed, complete, or ready for review. Produces fresh evidence before any completion claim.
---

# Verification and Review

Produce fresh evidence that the change matches the approved artifacts and adds no contract,
determinism, save, content, or mobile regressions. Evidence from earlier in the session does not
count; run the commands again after the last edit.

## Required checks

1. Compare the diff with the approved spec and plan. Note any difference.
2. Run, from the workspace root, and read the output:
   ```bash
   npm run typecheck
   npm test
   npm run build
   npm run skills:check
   ```
3. Add the extra evidence `playbook.md` §7 asks for this kind of change:
   - engine change: the new or updated test, seen red then green; a seeded determinism check when randomness or ordering moved;
   - `GameState` shape change: the migration test passes and `SAVE_VERSION` was bumped;
   - UI change: `npm run dev`, then the screen at 360px width (layout, bottom nav, no dead buttons, confirmations);
   - content change: the data validation tests (`tests/data.test.ts`, `tests/events.test.ts`) pass;
   - balancing change: autopilot numbers before and after;
   - MCP change: a real stdio smoke call (see below);
   - skill change: `npm run skills:sync` then `npm run skills:check`.
4. Scan the diff:
   ```bash
   git diff main --stat
   git diff main -- src/engine | grep -nE "Math\.random|Date\.now|new Date\(\)|from 'react'|window\.|document\." 
   ```
   Any hit in `src/engine/` other than the storage access in `save.ts` is a finding.
5. Review against the guards that applied, and against `playbook.md` §10.

## MCP stdio smoke call

Start the server the way clients do and call the changed tool. One way, using the SDK client from `@modelcontextprotocol/sdk`:

```bash
npx tsx -e "
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const c = new Client({ name: 'smoke', version: '0' });
await c.connect(new StdioClientTransport({ command: 'npx', args: ['tsx', 'mcp/hidup-sim/server.ts'] }));
console.log((await c.listTools()).tools.map((t) => t.name));
console.log(JSON.stringify(await c.callTool({ name: 'sim_new_game', arguments: { seed: 42 } })).slice(0, 400));
await c.close();
"
```

## Delegation

For a large branch, ask `hm-reviewer` for a whole-branch review first. Its findings inform
you, but the commands above must be run by this session; a role agent's run is not the evidence.

## Required output

- Each command run and its fresh result (pass, fail, counts).
- Tests added or updated.
- Findings by severity with `path:line`, or an explicit "no findings".
- Fixes made, residual risks, and anything skipped with the reason.
- Whether the change is ready for human review.

If any check fails or cannot run, say so plainly and stop short of a completion claim.

## Common mistakes

- Reporting "tests pass" from a run before the last edit.
- Skipping `npm run build` because typecheck passed.
- Skipping the 360px check because the component "did not change much".
- Skipping the stdio call because unit tests passed.
