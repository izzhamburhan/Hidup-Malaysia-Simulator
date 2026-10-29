// Geography for trips and balik kampung: distances on the stylised pixel-tile map
// (src/data/malaysia.ts, NOT TO SCALE) turned into a travel mode, time and fictional fare.
// Pure: no state writes, no randomness, no clock. Costs and times are FICTIONAL GAME ESTIMATES.

import { MALAYSIA, mapStateByName, type MapState } from '../data/malaysia';
import type { GameState } from './types';

export type TravelMode = 'road' | 'flight';

export interface Travel {
  mode: TravelMode;
  /** Minutes ONE WAY, door to door (flights include airport time). */
  minutes: number;
  /** Fictional RM for the RETURN journey. */
  cost: number;
}

/** One map tile is about this many minutes by road (a long, slow, scenic drive). */
export const ROAD_MINUTES_PER_TILE = 60;
/** Flights: fixed airport time plus a little per tile. */
export const FLIGHT_BASE_MINUTES = 150;
export const FLIGHT_MINUTES_PER_TILE = 8;
/** Moving around inside one state: a short hop. */
export const LOCAL_HOP: Travel = { mode: 'road', minutes: 45, cost: 20 };
/** A trip or balik kampung always fits in one day of game time. */
export const MAX_TRIP_MINUTES = 840;
export const MIN_TRIP_MINUTES = 480;
/** Trips of at least this many one-way minutes count as long distance (festive jams). */
export const LONG_DISTANCE_MINUTES = 240;

/** Centre of a state's tiles as [column, row] (tile centres), or null for an unknown name. Pure. */
export function stateCentroid(name: string): [number, number] | null {
  const s = mapStateByName(name);
  if (!s || !s.tiles.length) return null;
  const n = s.tiles.length;
  const x = s.tiles.reduce((a, t) => a + t[0], 0) / n + 0.5;
  const y = s.tiles.reduce((a, t) => a + t[1], 0) / n + 0.5;
  return [x, y];
}

const round5 = (n: number) => Math.round(n / 5) * 5;
const isBorneo = (s: MapState) => s.region === 'borneo';

/**
 * Travel between two states by name. Road inside the Peninsula or inside Borneo, a flight across
 * the South China Sea, a short local hop inside one state (or when a name is unknown). Symmetric.
 */
export function travelBetween(from: string, to: string): Travel {
  const a = mapStateByName(from);
  const b = mapStateByName(to);
  const ca = a && stateCentroid(a.name);
  const cb = b && stateCentroid(b.name);
  if (!a || !b || !ca || !cb || a.name === b.name) return { ...LOCAL_HOP };
  const dist = Math.hypot(ca[0] - cb[0], ca[1] - cb[1]);
  if (isBorneo(a) !== isBorneo(b)) {
    return {
      mode: 'flight',
      minutes: round5(FLIGHT_BASE_MINUTES + dist * FLIGHT_MINUTES_PER_TILE),
      cost: round5(300 + dist * 12),
    };
  }
  return { mode: 'road', minutes: round5(dist * ROAD_MINUTES_PER_TILE), cost: Math.max(LOCAL_HOP.cost + 10, round5(20 + dist * 30)) };
}

/** Clock minutes for a there-and-back day trip with `stay` minutes at the other end, kept within one day. */
export function tripMinutes(travel: Travel, stay: number): number {
  return Math.min(MAX_TRIP_MINUTES, Math.max(MIN_TRIP_MINUTES, 2 * travel.minutes + stay));
}

export const isLongDistance = (from: string, to: string): boolean => travelBetween(from, to).minutes >= LONG_DISTANCE_MINUTES;

/** States the player has been to for Jelajah Malaysia: trip stamps plus where they live now. */
export function visitedStates(s: GameState): string[] {
  const names = new Set(Object.keys(s.travel.stamps));
  if (mapStateByName(s.location.state)) names.add(s.location.state);
  return MALAYSIA.map((m) => m.name).filter((n) => names.has(n));
}
