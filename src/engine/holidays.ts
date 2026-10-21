import { holidayOn } from '../data/holidays';
import { dateOf } from './calendar';
import type { GameState } from './types';

export function holidayFor(state: GameState, day = state.clock.day) {
  const d = dateOf(state.startDate, day);
  return holidayOn(d.getUTCMonth() + 1, d.getUTCDate());
}

export function isHoliday(state: GameState, day = state.clock.day): boolean {
  return !!holidayFor(state, day);
}
