// Pure helpers for the Malaysia pixel map: geometry on the tile grid and which markers a state
// carries for the current life. Reads GameState, never changes it; no rules live here.

import { mapStateByName } from '../../data/malaysia';
import { universityById } from '../../data/universities';
import type { GameState } from '../../engine/types';

export type MarkerKind = 'residence' | 'kampung' | 'campus' | 'stamp';

/** Marker order is fixed: it decides which tile of a state each glyph sits on. */
export const MARKER_ORDER: MarkerKind[] = ['residence', 'kampung', 'campus', 'stamp'];

export const MARKER_TEXT: Record<MarkerKind, string> = {
  residence: 'You live here.',
  kampung: 'Home state, your kampung.',
  campus: 'Your campus is here.',
  stamp: 'Stamped on your trip passport.',
};

export interface Point {
  x: number;
  y: number;
}

/** Centre of a state in grid units (the mean of its tile centres), or null for an unknown name. */
export function tileCentroid(name: string): Point | null {
  const s = mapStateByName(name);
  if (!s || s.tiles.length === 0) return null;
  const x = s.tiles.reduce((sum, [c]) => sum + c + 0.5, 0) / s.tiles.length;
  const y = s.tiles.reduce((sum, [, r]) => sum + r + 0.5, 0) / s.tiles.length;
  return { x, y };
}

/** A state's tiles ordered nearest the centroid first, so a glyph always lands on the state itself. */
export function anchorTiles(name: string): [number, number][] {
  const s = mapStateByName(name);
  const c = tileCentroid(name);
  if (!s || !c) return [];
  const d = ([col, row]: [number, number]) => (col + 0.5 - c.x) ** 2 + (row + 0.5 - c.y) ** 2;
  return [...s.tiles].sort((a, b) => d(a) - d(b) || a[1] - b[1] || a[0] - b[0]);
}

export interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Tile sides not shared with another tile of the same state: the outline of the state. */
export function borderEdges(name: string): Edge[] {
  const s = mapStateByName(name);
  if (!s) return [];
  const own = new Set(s.tiles.map(([c, r]) => `${c},${r}`));
  const out: Edge[] = [];
  for (const [c, r] of s.tiles) {
    if (!own.has(`${c},${r - 1}`)) out.push({ x1: c, y1: r, x2: c + 1, y2: r });
    if (!own.has(`${c},${r + 1}`)) out.push({ x1: c, y1: r + 1, x2: c + 1, y2: r + 1 });
    if (!own.has(`${c - 1},${r}`)) out.push({ x1: c, y1: r, x2: c, y2: r + 1 });
    if (!own.has(`${c + 1},${r}`)) out.push({ x1: c + 1, y1: r, x2: c + 1, y2: r + 1 });
  }
  return out;
}

/** The state of the player's campus while studying or after graduating; null otherwise. */
export function campusState(state: GameState): string | null {
  const e = state.education;
  if (e.status !== 'studying' && e.status !== 'graduated') return null;
  return universityById(e.universityId ?? '')?.state ?? null;
}

/** Markers for one state, in MARKER_ORDER. Kampung shows only when it differs from the residence. */
export function markersFor(state: GameState, name: string): MarkerKind[] {
  const out: MarkerKind[] = [];
  if (state.location.state === name) out.push('residence');
  if (state.character.homeState === name && state.location.state !== name) out.push('kampung');
  if (campusState(state) === name) out.push('campus');
  if (state.travel.stamps[name] !== undefined) out.push('stamp');
  return out;
}

/** Screen-reader text for a state: its name plus what is marked there. */
export function markerSummary(state: GameState, name: string): string {
  return [`${name}.`, ...markersFor(state, name).map((m) => MARKER_TEXT[m])].join(' ');
}

/** The balik kampung route (residence to home state), or null when they are the same state. */
export function kampungRoute(state: GameState): { from: string; to: string } | null {
  const from = state.location.state;
  const to = state.character.homeState;
  if (from === to || !mapStateByName(from) || !mapStateByName(to)) return null;
  return { from, to };
}

export type CompareTier = 'same' | 'bitHigher' | 'higher' | 'bitLower' | 'lower';

/** How a state's factor compares with Selangor (factor 1): the one rule the English and Malay notes share. */
export function compareTier(factor: number): CompareTier {
  const diff = factor - 1;
  if (Math.abs(diff) < 0.03) return 'same';
  const small = Math.abs(diff) < 0.1;
  if (diff > 0) return small ? 'bitHigher' : 'higher';
  return small ? 'bitLower' : 'lower';
}

const TIER_TEXT: Record<CompareTier, string> = {
  same: 'about the same as Selangor.',
  bitHigher: 'a bit higher than Selangor.',
  higher: 'higher than Selangor.',
  bitLower: 'a bit lower than Selangor.',
  lower: 'lower than Selangor.',
};

function againstSelangor(factor: number, what: string): string {
  return `${what}: ${TIER_TEXT[compareTier(factor)]}`;
}

/** "Cost of living: a bit higher than Selangor." The factor is a fictional game estimate. */
export const costNote = (factor: number) => againstSelangor(factor, 'Cost of living');

/** "Job offers pay: lower than Selangor." The factor is a fictional game estimate. */
export const payNote = (factor: number) => againstSelangor(factor, 'Job offers pay');

export type GlyphKind = Exclude<MarkerKind, 'stamp'>;

export interface GlyphSlot {
  kind: GlyphKind;
  /** The tile the glyph belongs to. */
  col: number;
  row: number;
  /** Glyph centre and radius in grid units. */
  x: number;
  y: number;
  r: number;
}

/**
 * Where to draw a state's pin glyphs. Each glyph takes its own tile, nearest the centre first; a
 * one-tile state shares its tile, so the glyphs shrink and sit side by side. Stamps have no glyph:
 * they tint the whole state instead.
 */
export function glyphSlots(state: GameState, name: string): GlyphSlot[] {
  const kinds = markersFor(state, name).filter((m): m is GlyphKind => m !== 'stamp');
  const tiles = anchorTiles(name);
  if (kinds.length === 0 || tiles.length === 0) return [];
  if (tiles.length === 1) {
    const [col, row] = tiles[0];
    if (kinds.length === 1) return [{ kind: kinds[0], col, row, x: col + 0.5, y: row + 0.5, r: 0.42 }];
    const step = 1 / kinds.length;
    return kinds.map((kind, i) => ({ kind, col, row, x: col + step * (i + 0.5), y: row + 0.5, r: step * 0.48 }));
  }
  return kinds.map((kind, i) => {
    const [col, row] = tiles[i % tiles.length];
    return { kind, col, row, x: col + 0.5, y: row + 0.5, r: 0.42 };
  });
}
