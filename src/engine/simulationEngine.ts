// Public engine API. Every gameplay change goes through performAction or
// resolveEvent: the input state is cloned, the draft is mutated through the
// shared helpers, time advances via advanceTime, events roll, achievements and
// challenges update, and a feedback summary is computed by diffing.

import { foodById } from '../data/foods';
import { actionById, actionCatalogue, dyn, type ActionDef, type ActionView } from './actions';
import { canAfford, formatRM, log, netWorth, round2, totalDebt, SKILL_KEYS } from './core';
import { isClassDay } from './education';
import { isWorkday, onLeave } from './career';
import { resolvePendingEvent, rollRandomEvent, viewEvent, type EventView } from './events';
import { rankEndings } from './endings';
import { canStartChallenge, checkAchievements, updateChallenges } from './progression';
import { currentHome } from './living';
import { advanceTime, minutesUntil } from './time';
import { acceptInvite, likePost } from './social';
import type { ActionFeedback, GameState } from './types';

export { newGame, SAVE_VERSION } from './newGame';
export type { ActionView, EventView };

export interface EngineResult {
  state: GameState;
  feedback: ActionFeedback;
}

/** Pass out when energy hits zero: forced sleep (game rule). */
export const PASS_OUT_MINUTES = 6 * 60;

function snapshot(s: GameState) {
  return {
    cash: s.finance.cash,
    savings: s.finance.savings + s.finance.emergencyFund,
    debt: totalDebt(s),
    epf: s.finance.epfBalance,
    stats: { ...s.stats },
    skills: { ...s.skills },
    family: s.relationships.family,
    friends: s.relationships.friends,
    partnerTrust: s.relationships.partner?.trust ?? null,
    caloriesIn: s.food.caloriesIn,
    abs: s.clock.day * 1440 + s.clock.minute,
    day: s.clock.day,
    performance: s.career.job?.performance ?? null,
  };
}

type Snap = ReturnType<typeof snapshot>;

function diff(before: Snap, after: GameState): ActionFeedback['deltas'] {
  const out: ActionFeedback['deltas'] = [];
  const push = (label: string, value: number, unit: 'RM' | 'min' | 'pt' | 'kcal' = 'pt', threshold = 0.5) => {
    if (Math.abs(value) >= threshold) out.push({ label, value: round2(value), unit });
  };
  const a = snapshot(after);
  push('Time', a.abs - before.abs, 'min', 1);
  push('Cash', a.cash - before.cash, 'RM', 0.01);
  push('Savings', a.savings - before.savings, 'RM', 0.01);
  push('Debt', a.debt - before.debt, 'RM', 0.01);
  push('EPF', a.epf - before.epf, 'RM', 0.01);
  for (const k of ['energy', 'health', 'fitness', 'stress', 'happiness', 'reputation'] as const) {
    push(k[0].toUpperCase() + k.slice(1), a.stats[k] - before.stats[k]);
  }
  push('Family', a.family - before.family);
  push('Friends', a.friends - before.friends);
  if (before.partnerTrust !== null && a.partnerTrust !== null) push('Partner trust', a.partnerTrust - before.partnerTrust);
  if (before.performance !== null && a.performance !== null) push('Work performance', a.performance - before.performance);
  if (a.day === before.day) push('Calories in (est.)', a.caloriesIn - before.caloriesIn, 'kcal', 1);
  for (const k of SKILL_KEYS) push(`${k[0].toUpperCase()}${k.slice(1)} skill`, a.skills[k] - before.skills[k], 'pt', 0.3);
  return out;
}

function fail(state: GameState, title: string, error: string): EngineResult {
  return { state, feedback: { ok: false, title, lines: [], deltas: [], error } };
}

export function describeAction(state: GameState, def: ActionDef, param?: string): ActionView {
  const cost = dyn(def.cost, state, param, 0);
  let reason: string | null = null;
  if (state.ending) reason = 'This chapter has ended.';
  else if (state.events.pending.length) reason = 'Deal with the current event first.';
  else if (def.visible && !def.visible(state)) reason = 'Not available in your current situation.';
  else reason = def.available?.(state, param) ?? null;
  if (!reason && cost > 0 && !canAfford(state, cost)) reason = `Need ${formatRM(cost, cost % 1 ? 2 : 0)} cash.`;
  return {
    id: def.id,
    param,
    category: def.category,
    icon: def.icon,
    title: dyn(def.title, state, param, def.id),
    description: dyn(def.description, state, param, ''),
    minutes: dyn(def.minutes, state, param, 0),
    cost,
    energy: dyn(def.energy, state, param, 0),
    available: !reason,
    reason,
    confirm: def.confirm ? def.confirm(state, param) : null,
  };
}

export function viewAction(state: GameState, actionId: string, param?: string): ActionView | null {
  const def = actionById(actionId);
  return def ? describeAction(state, def, param) : null;
}

/** Actions for the generic Act screen (dedicated catalogue actions are excluded). */
export function listActions(state: GameState): ActionView[] {
  const out: ActionView[] = [];
  for (const def of actionCatalogue) {
    if (def.dedicated) continue;
    if (def.visible && !def.visible(state)) continue;
    const variants = def.variants?.(state);
    if (variants?.length) for (const v of variants) out.push(describeAction(state, def, v.param));
    else out.push(describeAction(state, def));
  }
  return out;
}

/** Mutates the draft. Shared by performAction and autopilot. */
function execute(draft: GameState, def: ActionDef, param?: string): string[] {
  const minutes = dyn(def.minutes, draft, param, 0);
  const lines = def.run(draft, param) ?? [];
  advanceTime(draft, minutes, { asleep: def.asleep });
  draft.counters.actions += 1;
  if (!def.asleep) rollRandomEvent(draft, def.contexts ?? [], minutes);
  if (draft.stats.energy <= 0 && !def.asleep) {
    lines.push('You ran out of energy and passed out for 6 hours. Your body chose sleep for you.');
    log(draft, 'warning', 'Passed out from exhaustion.');
    draft.lastSleepMinutes = PASS_OUT_MINUTES;
    draft.flags.awakeMinutes = 0;
    advanceTime(draft, PASS_OUT_MINUTES, { asleep: true });
  }
  lines.push(...postProcess(draft));
  return lines;
}

function postProcess(draft: GameState): string[] {
  const lines: string[] = [];
  checkAchievements(draft);
  updateChallenges(draft);
  if (draft.clock.day >= draft.chapterDays && !draft.flags.chapterOffered) {
    draft.flags.chapterOffered = true;
    lines.push('📖 Chapter complete! Open the Life Report to see your ending, or keep living.');
    log(draft, 'milestone', 'Chapter complete. Your life report is ready.');
  }
  return lines;
}

export function performAction(state: GameState, actionId: string, param?: string): EngineResult {
  const def = actionById(actionId);
  if (!def) return fail(state, actionId, 'Unknown action.');
  const view = describeAction(state, def, param);
  if (!view.available) return fail(state, view.title, view.reason ?? 'Not available.');
  const draft = structuredClone(state);
  const before = snapshot(draft);
  const lines = execute(draft, def, param);
  const feedback: ActionFeedback = { ok: true, title: `${def.icon} ${view.title}`, lines, deltas: diff(before, draft) };
  return { state: draft, feedback };
}

export function currentEvent(state: GameState): EventView | null {
  return viewEvent(state);
}

export function resolveEvent(state: GameState, choiceId: string): EngineResult {
  const draft = structuredClone(state);
  const before = snapshot(draft);
  const result = resolvePendingEvent(draft, choiceId);
  if (!result.ok) return { state, feedback: result };
  result.lines.push(...postProcess(draft));
  result.deltas = diff(before, draft);
  return { state: draft, feedback: result };
}

/** Small instant interactions (feed likes, invites, challenge picks) that take no game time. */
export function interact(state: GameState, kind: 'like' | 'invite' | 'challenge' | 'setting', id: string, value?: boolean): EngineResult {
  const draft = structuredClone(state);
  let line = '';
  if (kind === 'like') line = likePost(draft, id);
  else if (kind === 'invite') line = acceptInvite(draft, id);
  else if (kind === 'challenge') {
    const reason = canStartChallenge(draft, id);
    if (reason) return fail(state, 'Challenge', reason);
    draft.challenges.active.push(id);
    line = 'Challenge accepted!';
  } else if (kind === 'setting') {
    draft.flags[id] = !!value;
    line = 'Setting saved.';
  }
  return { state: draft, feedback: { ok: true, title: line, lines: [], deltas: [] } };
}

/** End the chapter and lock in an ending. */
export function endChapter(state: GameState): GameState {
  const draft = structuredClone(state);
  const [top] = rankEndings(draft);
  draft.ending = { id: top.id, title: top.title, summary: top.blurb, day: draft.clock.day };
  log(draft, 'milestone', `The end of this chapter: ${top.title}.`);
  return draft;
}

export function continueAfterEnding(state: GameState): GameState {
  const draft = structuredClone(state);
  draft.ending = null;
  draft.chapterDays = draft.clock.day + 365;
  draft.flags.chapterOffered = false;
  return draft;
}

// ---------------- Autopilot ----------------

function tryAction(draft: GameState, id: string, param?: string): boolean {
  const def = actionById(id);
  if (!def || draft.events.pending.length) return false;
  if (!describeAction(draft, def, param).available) return false;
  execute(draft, def, param);
  return true;
}

function routineMeal(draft: GameState): boolean {
  const home = currentHome(draft);
  const options = home.familyHome ? ['mak-cooking', 'nasi-campur'] : home.kitchen ? ['home-cooked', 'nasi-campur', 'roti-canai', 'maggi'] : ['nasi-campur', 'chicken-rice', 'roti-canai', 'maggi'];
  for (const id of options) {
    if (foodById(id) && tryAction(draft, 'eat', id)) return true;
  }
  return false;
}

function routineSleep(draft: GameState): void {
  const minutes = Math.max(360, Math.min(600, minutesUntil(draft, 7 * 60)));
  draft.lastSleepMinutes = minutes;
  draft.flags.awakeMinutes = 0;
  if (minutes < 360) draft.flags.tiredDay = draft.clock.day + 1;
  advanceTime(draft, minutes, { asleep: true });
  postProcess(draft);
}

/** Simulate one routine day on the draft. Returns false if interrupted by an event. */
function routineDay(draft: GameState): boolean {
  const startDay = draft.clock.day;
  for (let guard = 0; guard < 40; guard++) {
    if (draft.events.pending.length || draft.ending) return false;
    const hour = draft.clock.minute / 60;
    if (draft.clock.day > startDay && hour >= 6.5) return true;
    if (hour < 6 && draft.clock.day > startDay) {
      routineSleep(draft);
      continue;
    }
    if (hour < 6) {
      advanceTime(draft, minutesUntil(draft, 7 * 60), { asleep: true });
      draft.lastSleepMinutes = 420;
      continue;
    }
    if (draft.stats.satiety < 60 && routineMeal(draft)) continue;
    const job = draft.career.job;
    if (job && !draft.career.workedToday) {
      if (job.schedule !== 'parttime' && isWorkday(draft) && !onLeave(draft) && hour < 11 && tryAction(draft, 'work-shift')) continue;
      if (job.schedule === 'parttime' && !isWorkday(draft) && hour >= 8 && hour < 17 && tryAction(draft, 'work-shift')) continue;
    }
    if (isClassDay(draft) && !draft.education.attendedToday && hour < 13 && tryAction(draft, 'attend-class')) continue;
    if (draft.education.status === 'studying' && hour < 21 && draft.stats.energy > 35) {
      if (tryAction(draft, 'assignment')) continue;
      if (!draft.flags.routineStudied || draft.flags.routineStudied !== draft.clock.day) {
        draft.flags.routineStudied = draft.clock.day;
        if (tryAction(draft, 'fyp') || tryAction(draft, 'study', '2')) continue;
      }
    }
    if (!job && draft.hustles.length && hour >= 8 && hour < 19 && Number(draft.flags.routineHustle ?? -1) !== draft.clock.day) {
      draft.flags.routineHustle = draft.clock.day;
      if (tryAction(draft, 'work-hustle', draft.hustles[0].id)) continue;
    }
    if (!job && draft.education.status !== 'studying' && hour >= 9 && hour < 18 && draft.flags.routineGrow !== draft.clock.day) {
      draft.flags.routineGrow = draft.clock.day;
      if (tryAction(draft, 'update-cv') || tryAction(draft, 'self-study', 'communication')) continue;
    }
    if (draft.fitness.gymMember && !draft.today.exercised && draft.clock.day % 2 === 0 && hour >= 17 && hour < 22 && draft.stats.energy > 35 && tryAction(draft, 'gym')) continue;
    if (draft.relationships.partner && draft.relationships.partner.lastContactDay < draft.clock.day && hour >= 19 && tryAction(draft, 'chat-partner')) continue;
    if (hour >= 18 && draft.food.today.filter((f) => foodById(f.foodId)?.meal).length < 3 && draft.stats.satiety < 70 && routineMeal(draft)) continue;
    if (hour >= 22.5 || draft.stats.energy < 12) {
      routineSleep(draft);
      continue;
    }
    if (!tryAction(draft, 'chill')) advanceTime(draft, 60);
  }
  return true;
}

export interface AutopilotResult extends EngineResult {
  daysSimulated: number;
  interrupted: boolean;
}

/** Live on routine for up to `days` days. Stops early when an event needs a decision. */
export function runAutopilot(state: GameState, days: number): AutopilotResult {
  if (state.events.pending.length) {
    return { ...fail(state, 'Autopilot', 'Deal with the current event first.'), daysSimulated: 0, interrupted: true };
  }
  if (state.ending) return { ...fail(state, 'Autopilot', 'This chapter has ended.'), daysSimulated: 0, interrupted: true };
  const draft = structuredClone(state);
  const before = snapshot(draft);
  const worthBefore = netWorth(draft);
  const startDay = draft.clock.day;
  let interrupted = false;
  draft.flags.autopilot = true;
  for (let i = 0; i < days; i++) {
    if (!routineDay(draft)) {
      interrupted = true;
      break;
    }
  }
  delete draft.flags.autopilot;
  const simulated = draft.clock.day - startDay;
  const lines = [
    `Lived ${simulated} day(s) on routine.`,
    `Net worth change: ${formatRM(netWorth(draft) - worthBefore)}.`,
  ];
  if (interrupted) lines.push('Something came up that needs your decision.');
  return {
    state: draft,
    feedback: { ok: true, title: '⏩ Routine mode', lines, deltas: diff(before, draft) },
    daysSimulated: simulated,
    interrupted,
  };
}
