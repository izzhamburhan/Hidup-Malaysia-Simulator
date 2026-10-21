import type { EventContext } from '../events';
import type { GameState } from '../types';

export type ActionCategory =
  | 'daily' | 'food' | 'work' | 'career' | 'study' | 'fitness' | 'leisure' | 'social' | 'love' | 'family'
  | 'money' | 'home' | 'transport' | 'hustle' | 'civic';

type Dyn<T> = T | ((state: GameState, param?: string) => T);

export interface ActionVariant {
  param: string;
  label: string;
}

export interface ActionDef {
  id: string;
  category: ActionCategory;
  icon: string;
  title: Dyn<string>;
  description: Dyn<string>;
  /** Clock minutes the action takes (including any commute). */
  minutes: Dyn<number>;
  /** Up-front cash cost, checked before running. */
  cost?: Dyn<number>;
  /** Estimated energy change shown in the UI (negative = tiring). */
  energy?: Dyn<number>;
  contexts?: EventContext[];
  asleep?: boolean;
  /** Major decisions ask for confirmation with this consequence summary. */
  confirm?: (state: GameState, param?: string) => string | null;
  /** Hide when irrelevant (e.g. study actions for non-students). */
  visible?: (state: GameState) => boolean;
  /** Return a human reason when the action cannot be taken right now. */
  available?: (state: GameState, param?: string) => string | null;
  /** Parameter variants listed on the Act screen (e.g. sleep 6/7/8h). */
  variants?: (state: GameState) => ActionVariant[];
  /** Hide this action from the generic Act list (it has a dedicated screen). */
  dedicated?: boolean;
  /** Apply the action's effects to the draft. Return extra feedback lines. */
  run: (state: GameState, param?: string) => string[] | void;
}

export interface ActionView {
  id: string;
  param?: string;
  category: ActionCategory;
  icon: string;
  title: string;
  description: string;
  minutes: number;
  cost: number;
  energy: number;
  available: boolean;
  reason: string | null;
  confirm: string | null;
}

export function dyn<T>(value: Dyn<T> | undefined, state: GameState, param: string | undefined, fallback: T): T {
  if (value === undefined) return fallback;
  return typeof value === 'function' ? (value as (s: GameState, p?: string) => T)(state, param) : value;
}

/** Inclusive-exclusive window check on clock hours, supporting overnight windows. */
export function withinHours(state: GameState, from: number, to: number): boolean {
  const h = state.clock.minute / 60;
  return from <= to ? h >= from && h < to : h >= from || h < to;
}

export function hoursLabel(from: number, to: number): string {
  const fmt = (h: number) => {
    const hh = ((h % 24) + 24) % 24;
    const suffix = hh < 12 ? 'AM' : 'PM';
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${h12}${suffix}`;
  };
  return `${fmt(from)}–${fmt(to)}`;
}

export const needEnergy = (state: GameState, min: number): string | null =>
  state.stats.energy < min ? `Too tired (need ${min} energy). Rest or sleep first.` : null;
