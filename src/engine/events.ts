// Data-driven event engine: random rolls with conditions, contexts, weights and
// cooldowns; scheduled (dated / follow-up) events; and choice resolution.

import { events as eventCatalogue } from '../data/events';
import { npcNames } from '../data/lifestyle';
import { applyEffect, canAfford, formatRM, log, spend } from './core';
import { chance, pick, weightedPick } from './rng';
import { advanceTime } from './time';
import type { ActionFeedback, Effect, GameMode, GameState, PendingEvent } from './types';

export type EventContext = 'commute' | 'work' | 'study' | 'social' | 'home' | 'gym' | 'food' | 'shopping' | 'night' | 'love' | 'family' | 'any';
export type EventCategory =
  | 'work' | 'commute' | 'money' | 'family' | 'social' | 'love' | 'health' | 'study' | 'civic' | 'festive' | 'chaos' | 'opportunity' | 'world' | 'housing';

export type Params = Record<string, string | number>;

export interface EventOutcome {
  weight?: number;
  text: string;
  effect?: Effect;
  /** Custom logic for outcomes that touch engine systems. May return extra feedback text. */
  apply?: (state: GameState, params: Params) => string | void;
  followUp?: { eventId: string; inDays: number };
}

export interface EventChoice {
  id: string;
  label: string;
  hint?: string;
  /** Cash required up front; the choice is disabled if the player cannot afford it. */
  cost?: number | ((state: GameState, params: Params) => number);
  requires?: (state: GameState, params: Params) => string | null;
  outcomes: EventOutcome[];
}

export interface GameEventDef {
  id: string;
  title: string;
  icon: string;
  category: EventCategory;
  text: string | ((state: GameState, params: Params) => string);
  /** Defaults to both modes. */
  modes?: GameMode[];
  trigger: 'random' | 'scheduled';
  contexts?: EventContext[];
  weight?: number | ((state: GameState) => number);
  cooldownDays?: number;
  once?: boolean;
  when?: (state: GameState) => boolean;
  params?: (state: GameState) => Params;
  choices: EventChoice[] | ((state: GameState, params: Params) => EventChoice[]);
}

// Built on first use: data/events imports engine helpers that import this
// module, so reading the catalogue at load time would hit an init cycle.
let registryCache: Map<string, GameEventDef> | null = null;
function reg(): Map<string, GameEventDef> {
  if (registryCache) return registryCache;
  const map = new Map<string, GameEventDef>();
  for (const e of eventCatalogue) {
    if (map.has(e.id)) throw new Error(`Duplicate event id ${e.id}`);
    map.set(e.id, e);
  }
  registryCache = map;
  return map;
}

export const allEvents = (): GameEventDef[] => [...reg().values()];
export const eventById = (id: string) => reg().get(id);

/** Probability per hour of an action that a random event fires (before mode scaling). */
export const EVENT_RATE_PER_HOUR = { realistic: 0.035, chaotic: 0.06 } as const;
/** Routine mode (autopilot) rolls fewer random events so a week can actually pass. */
export const AUTOPILOT_EVENT_FACTOR = 0.35;
export const MAX_EVENT_CHANCE = 0.4;

export function renderText(state: GameState, text: string, params: Params = {}): string {
  const vars: Params = {
    name: state.character.name,
    partner: state.relationships.partner?.name ?? 'your crush',
    employer: String(state.flags.employerName ?? 'the office'),
    home: state.character.homeState,
    ...params,
  };
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

function defaultParams(state: GameState): Params {
  return { friend: pick(state, npcNames) };
}

export function queueEvent(state: GameState, eventId: string, params?: Params): void {
  const def = reg().get(eventId);
  if (!def) return;
  const p = { ...defaultParams(state), ...(def.params ? def.params(state) : {}), ...(params ?? {}) };
  state.events.pending.push({ eventId, params: p });
}

export function scheduleEvent(state: GameState, eventId: string, inDays: number, params?: Params): void {
  state.events.scheduled.push({ eventId, day: state.clock.day + Math.max(1, inDays), params });
}

export function isEligible(state: GameState, def: GameEventDef, contexts: EventContext[]): boolean {
  if (def.trigger !== 'random') return false;
  if (def.modes && !def.modes.includes(state.mode)) return false;
  if (def.once && state.events.seen[def.id]) return false;
  const last = state.events.cooldowns[def.id];
  if (last !== undefined && state.clock.day - last < (def.cooldownDays ?? 14)) return false;
  if (def.contexts && def.contexts.length && !def.contexts.includes('any') && !def.contexts.some((c) => contexts.includes(c))) return false;
  if (state.events.pending.some((p) => p.eventId === def.id)) return false;
  return def.when ? def.when(state) : true;
}

export function eligibleEvents(state: GameState, contexts: EventContext[]): GameEventDef[] {
  return allEvents().filter((def) => isEligible(state, def, contexts));
}

/** Roll for a random event after an action of `minutes` with the given contexts. */
export function rollRandomEvent(state: GameState, contexts: EventContext[], minutes: number): boolean {
  if (state.events.pending.length > 0 || minutes <= 0) return false;
  const factor = state.flags.autopilot ? AUTOPILOT_EVENT_FACTOR : 1;
  const p = Math.min(MAX_EVENT_CHANCE, EVENT_RATE_PER_HOUR[state.mode] * (minutes / 60) * factor);
  if (!chance(state, p)) return false;
  const pool = eligibleEvents(state, contexts);
  const def = weightedPick(state, pool, (d) => {
    const w = typeof d.weight === 'function' ? d.weight(state) : (d.weight ?? 1);
    // Chaotic mode favours chaos-category events.
    return state.mode === 'chaotic' && d.category === 'chaos' ? w * 2.5 : w;
  });
  if (!def) return false;
  queueEvent(state, def.id);
  return true;
}

/** Move due scheduled events into the pending queue. */
export function processScheduledEvents(state: GameState): void {
  const due = state.events.scheduled.filter((s) => s.day <= state.clock.day);
  state.events.scheduled = state.events.scheduled.filter((s) => s.day > state.clock.day);
  for (const s of due) queueEvent(state, s.eventId, s.params);
}

export interface ChoiceView {
  id: string;
  label: string;
  hint?: string;
  cost: number;
  disabledReason: string | null;
}

export interface EventView {
  eventId: string;
  title: string;
  icon: string;
  category: EventCategory;
  text: string;
  choices: ChoiceView[];
}

function choicesOf(state: GameState, def: GameEventDef, params: Params): EventChoice[] {
  return typeof def.choices === 'function' ? def.choices(state, params) : def.choices;
}

function costOf(state: GameState, choice: EventChoice, params: Params): number {
  return typeof choice.cost === 'function' ? choice.cost(state, params) : (choice.cost ?? 0);
}

export function viewEvent(state: GameState, pending: PendingEvent | undefined = state.events.pending[0]): EventView | null {
  if (!pending) return null;
  const def = reg().get(pending.eventId);
  if (!def) return null;
  const params = pending.params ?? {};
  const raw = typeof def.text === 'function' ? def.text(state, params) : def.text;
  return {
    eventId: def.id,
    title: renderText(state, def.title, params),
    icon: def.icon,
    category: def.category,
    text: renderText(state, raw, params),
    choices: choicesOf(state, def, params).map((c) => {
      const cost = costOf(state, c, params);
      let reason = c.requires ? c.requires(state, params) : null;
      if (!reason && cost > 0 && !canAfford(state, cost)) reason = `Need ${formatRM(cost)} cash`;
      return { id: c.id, label: renderText(state, c.label, params), hint: c.hint ? renderText(state, c.hint, params) : undefined, cost, disabledReason: reason };
    }),
  };
}

/** Resolve the front pending event with the given choice. */
export function resolvePendingEvent(state: GameState, choiceId: string): ActionFeedback {
  const pending = state.events.pending[0];
  if (!pending) return { ok: false, title: 'No event', lines: [], deltas: [], error: 'There is no event to resolve.' };
  const def = reg().get(pending.eventId);
  if (!def) {
    state.events.pending.shift();
    return { ok: false, title: 'Unknown event', lines: [], deltas: [], error: 'That event no longer exists.' };
  }
  const params = pending.params ?? {};
  const choice = choicesOf(state, def, params).find((c) => c.id === choiceId);
  if (!choice) return { ok: false, title: def.title, lines: [], deltas: [], error: 'Unknown choice.' };
  const cost = costOf(state, choice, params);
  const reason = (choice.requires ? choice.requires(state, params) : null) ?? (cost > 0 && !canAfford(state, cost) ? `Need ${formatRM(cost)} cash` : null);
  if (reason) return { ok: false, title: def.title, lines: [], deltas: [], error: reason };

  state.events.pending.shift();
  if (cost > 0) spend(state, cost, def.title);
  const outcome = weightedPick(state, choice.outcomes, (o) => o.weight ?? 1) ?? choice.outcomes[0];
  const lines: string[] = [renderText(state, outcome.text, params)];
  applyEffect(state, outcome.effect);
  const extra = outcome.apply?.(state, params);
  if (extra) lines.push(renderText(state, extra, params));
  if (outcome.followUp) scheduleEvent(state, outcome.followUp.eventId, outcome.followUp.inDays, params);
  if (outcome.effect?.minutes) advanceTime(state, outcome.effect.minutes);

  state.events.cooldowns[def.id] = state.clock.day;
  state.events.seen[def.id] = (state.events.seen[def.id] ?? 0) + 1;
  const title = renderText(state, def.title, params);
  state.events.history.unshift({ day: state.clock.day, eventId: def.id, choiceId, title });
  if (state.events.history.length > 80) state.events.history.length = 80;
  log(state, 'event', `${def.icon} ${title}: ${lines[0]}`);
  return { ok: true, title, lines, deltas: [] };
}
