// Simulated calendar helpers. Day 0 is GameState.startDate; time only moves
// when the player acts or waits.

import type { GameState } from './types';

export const MINUTES_PER_DAY = 1440;
export const DAYS_PER_YEAR = 365;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_LONG = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dateOf(startDate: string, day: number): Date {
  const d = new Date(`${startDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day);
  return d;
}

export function currentDate(state: GameState): Date {
  return dateOf(state.startDate, state.clock.day);
}

export function weekday(state: GameState, day = state.clock.day): number {
  return dateOf(state.startDate, day).getUTCDay();
}

export function isWeekend(state: GameState, day = state.clock.day): boolean {
  const w = weekday(state, day);
  return w === 0 || w === 6;
}

export function monthKey(state: GameState, day = state.clock.day): string {
  const d = dateOf(state.startDate, day);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function dayOfMonth(state: GameState, day = state.clock.day): number {
  return dateOf(state.startDate, day).getUTCDate();
}

export function monthIndex(state: GameState, day = state.clock.day): number {
  return dateOf(state.startDate, day).getUTCMonth();
}

export function yearOf(state: GameState, day = state.clock.day): number {
  return dateOf(state.startDate, day).getUTCFullYear();
}

export function isLastDayOfMonth(state: GameState, day = state.clock.day): boolean {
  return dateOf(state.startDate, day + 1).getUTCDate() === 1;
}

export function formatTime(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatDate(state: GameState, day = state.clock.day, long = false): string {
  const d = dateOf(state.startDate, day);
  const name = long ? DAY_NAMES_LONG[d.getUTCDay()] : DAY_NAMES[d.getUTCDay()];
  return `${name}, ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function ageOf(state: GameState): number {
  return state.character.startAge + Math.floor(state.clock.day / DAYS_PER_YEAR);
}

export function hour(state: GameState): number {
  return Math.floor(state.clock.minute / 60);
}

export function absoluteMinute(state: GameState): number {
  return state.clock.day * MINUTES_PER_DAY + state.clock.minute;
}
