// Pure helpers for the big-moment motion: the payday count-up and the lookup that
// says whether a day report is a payday. UI layer only; the engine never imports
// this and nothing here touches game state.

import { isLastDayOfMonth, monthKey } from '../engine/calendar';
import type { GameState, Payslip } from '../engine/types';

/** The payday coin count-up lasts about one second. */
export const COUNT_UP_MS = 1000;

/** Fast start, gentle landing: a calm ease-out. Clamped to 0..1. */
export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 3);
}

/**
 * The figure to show `elapsedMs` into a count-up towards `target` (ringgit, two decimals).
 * Never overshoots, and once the duration is over (or is 0) it is exactly `target`.
 */
export function countUpValue(target: number, elapsedMs: number, durationMs = COUNT_UP_MS): number {
  if (durationMs <= 0 || elapsedMs >= durationMs) return target;
  const v = Math.round(target * easeOutCubic(elapsedMs / durationMs) * 100) / 100;
  return Math.min(v, target);
}

/** The payslip paid on `day`, if that day was a payday (last day of the month), else null. */
export function paydayFor(state: GameState, day: number): Payslip | null {
  if (!isLastDayOfMonth(state, day)) return null;
  const month = monthKey(state, day);
  return state.finance.payslips.find((p) => p.month === month) ?? null;
}
