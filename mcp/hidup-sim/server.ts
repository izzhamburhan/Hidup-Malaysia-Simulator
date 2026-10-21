// hidup-sim: a local stdio MCP server that exposes the real simulation engine
// to agents for balancing, QA and bug reproduction. Contract:
// docs/contracts/mcp-hidup-sim.md. Thin wrapper only: no rule is
// re-implemented here. No network, no file writes.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  currentEvent, listActions, newGame, performAction, resolveEvent, runAutopilot,
} from '../../src/engine/simulationEngine';
import { ageOf, formatDate, formatTime } from '../../src/engine/calendar';
import { netWorth, round2, totalDebt } from '../../src/engine/core';
import { relationshipStatus } from '../../src/engine/social';
import { computePayslip } from '../../src/engine/payroll';
import { STATUTORY_DISCLAIMER } from '../../src/data/statutory';
import { courseById } from '../../src/data/courses';
import { companyById } from '../../src/data/companies';
import { universityById } from '../../src/data/universities';
import type { GameState, NewGameOptions } from '../../src/engine/types';
import { validateCatalogues } from './validate';

const NOTE = 'Fictional game estimates; payroll is a simplified simulation, not official.';
const DEFAULT_SEED = 20270104;

const sessions = new Map<string, GameState>();
let counter = 0;

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

const ok = (data: unknown): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const err = (message: string): ToolResult => ({ isError: true, content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }] });

function session(id: string): GameState {
  const s = sessions.get(id);
  if (!s) throw new Error(`Unknown session ${id}. Call sim_new_game first.`);
  return s;
}

function summary(sessionId: string, s: GameState) {
  const job = s.career.job;
  const e = s.education;
  return {
    sessionId,
    day: s.clock.day,
    date: formatDate(s),
    time: formatTime(s.clock.minute),
    age: ageOf(s),
    mode: s.mode,
    lifeStage: s.character.lifeStage,
    cash: s.finance.cash,
    savings: round2(s.finance.savings + s.finance.emergencyFund),
    epfBalance: s.finance.epfBalance,
    totalDebt: totalDebt(s),
    netWorth: netWorth(s),
    stats: s.stats,
    job: job ? { title: job.title, employer: companyById(job.companyId)?.name ?? '', monthlySalary: job.monthlySalary } : null,
    education: {
      status: e.status,
      university: universityById(e.universityId)?.short,
      course: courseById(e.courseId)?.name,
      semester: e.status === 'studying' ? e.semester : undefined,
      cgpa: e.gpaHistory.length ? e.cgpa : undefined,
    },
    relationship: relationshipStatus(s),
    pendingEvent: currentEvent(s),
    ending: s.ending ? { id: s.ending.id, title: s.ending.title } : null,
    note: NOTE,
  };
}

/** Run a handler, converting thrown errors into MCP error results. */
function safe<A>(fn: (args: A) => unknown) {
  return async (args: A): Promise<ToolResult> => {
    try {
      return ok(fn(args));
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  };
}

const server = new McpServer({ name: 'hidup-sim', version: '0.1.0' });

server.registerTool(
  'sim_new_game',
  {
    description: 'Start a new HIDUP MALAYSIA life in memory and return a session id plus a state summary.',
    inputSchema: {
      options: z
        .object({
          name: z.string().max(24).optional(),
          startAge: z.number().int().min(16).max(70).optional(),
          homeState: z.string().optional(),
          backgroundId: z.string().optional(),
          lifeStage: z.enum(['student', 'fresh_grad', 'working', 'experienced', 'entrepreneur', 'retired']).optional(),
          mode: z.enum(['realistic', 'chaotic']).optional(),
          universityId: z.string().optional(),
          courseId: z.string().optional(),
          startSemester: z.number().int().min(1).max(10).optional(),
          jobId: z.string().optional(),
          chapterYears: z.number().min(0.1).max(10).optional(),
        })
        .optional(),
      seed: z.number().int().optional(),
    },
  },
  safe(({ options, seed }: { options?: Partial<NewGameOptions>; seed?: number }) => {
    const s = newGame({
      name: 'Agent',
      startAge: 23,
      homeState: 'Selangor',
      backgroundId: 'middle',
      lifeStage: 'fresh_grad',
      mode: 'realistic',
      courseId: 'cs',
      ...options,
      seed: seed ?? DEFAULT_SEED,
    });
    counter += 1;
    const id = `s${counter}`;
    sessions.set(id, s);
    return { sessionId: id, summary: summary(id, s) };
  }),
);

server.registerTool(
  'sim_list_actions',
  {
    description: 'List actions for a session with availability, reasons, time and cost. Variants appear as separate entries with a param.',
    inputSchema: { sessionId: z.string(), includeUnavailable: z.boolean().optional() },
  },
  safe(({ sessionId, includeUnavailable = true }: { sessionId: string; includeUnavailable?: boolean }) => {
    const s = session(sessionId);
    const actions = listActions(s).filter((a) => includeUnavailable || a.available);
    return { actions, pendingEvent: currentEvent(s) };
  }),
);

server.registerTool(
  'sim_perform_action',
  {
    description: 'Perform one action through the central engine. On failure the session state is unchanged.',
    inputSchema: { sessionId: z.string(), actionId: z.string(), param: z.string().optional() },
  },
  safe(({ sessionId, actionId, param }: { sessionId: string; actionId: string; param?: string }) => {
    const r = performAction(session(sessionId), actionId, param);
    sessions.set(sessionId, r.state);
    return { feedback: r.feedback, summary: summary(sessionId, r.state) };
  }),
);

server.registerTool(
  'sim_resolve_event',
  {
    description: 'Resolve the pending event with a choice id.',
    inputSchema: { sessionId: z.string(), choiceId: z.string() },
  },
  safe(({ sessionId, choiceId }: { sessionId: string; choiceId: string }) => {
    const r = resolveEvent(session(sessionId), choiceId);
    sessions.set(sessionId, r.state);
    return { feedback: r.feedback, summary: summary(sessionId, r.state) };
  }),
);

server.registerTool(
  'sim_autopilot',
  {
    description: 'Live on routine for up to N days. Stops early when an event needs a decision.',
    inputSchema: { sessionId: z.string(), days: z.number().int().min(1).max(3650) },
  },
  safe(({ sessionId, days }: { sessionId: string; days: number }) => {
    const before = session(sessionId);
    const r = runAutopilot(before, days);
    sessions.set(sessionId, r.state);
    return { feedback: r.feedback, daysSimulated: r.daysSimulated, interrupted: r.interrupted, summary: summary(sessionId, r.state), before: summary(sessionId, before) };
  }),
);

server.registerTool(
  'sim_state_summary',
  {
    description: 'Summarise a session; pass full=true to include the raw GameState.',
    inputSchema: { sessionId: z.string(), full: z.boolean().optional() },
  },
  safe(({ sessionId, full = false }: { sessionId: string; full?: boolean }) => {
    const s = session(sessionId);
    return full ? { summary: summary(sessionId, s), state: s } : { summary: summary(sessionId, s) };
  }),
);

server.registerTool(
  'payroll_calculate',
  {
    description: 'Compute a SIMPLIFIED Malaysian payslip (EPF, SOCSO, EIS, PCB estimate). Not an official calculation.',
    inputSchema: {
      basic: z.number().min(0),
      schedule: z.enum(['fulltime', 'parttime', 'intern']),
      overtime: z.number().min(0).optional(),
      bonus: z.number().min(0).optional(),
      allowance: z.number().min(0).optional(),
      unpaidLeave: z.number().min(0).optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      employer: z.string().optional(),
    },
  },
  safe((a: { basic: number; schedule: 'fulltime' | 'parttime' | 'intern'; overtime?: number; bonus?: number; allowance?: number; unpaidLeave?: number; month?: string; employer?: string }) => ({
    payslip: computePayslip({ ...a, month: a.month ?? 'simulated', employer: a.employer ?? 'Example employer' }),
    disclaimer: STATUTORY_DISCLAIMER,
    sources: { epf: 'https://www.kwsp.gov.my/', perkeso: 'https://www.perkeso.gov.my/', lhdn: 'https://www.hasil.gov.my/' },
    note: NOTE,
  })),
);

server.registerTool(
  'data_validate',
  { description: 'Check catalogue integrity (unique ids, references, event rules).', inputSchema: {} },
  safe(() => validateCatalogues()),
);

await server.connect(new StdioServerTransport());
