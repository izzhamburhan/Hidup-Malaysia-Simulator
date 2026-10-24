// Versioned save format with migrations. Storage is injected so the engine
// stays testable without a browser; the UI passes window.localStorage.

import { SAVE_VERSION, emptyState } from './newGame';
import { isValidAppearance, randomAppearance } from './appearance';
import { endings } from './endings';
import type { GameState } from './types';

export const SAVE_KEY = 'hidup-malaysia:save';
export const CORRUPT_KEY = 'hidup-malaysia:save:corrupt';
export const SETTINGS_KEY = 'hidup-malaysia:settings';
/** Endings found across every life. Lives outside the save so a new life keeps it. */
export const COLLECTION_KEY = 'hidup-malaysia:collection';
/** Today's daily-challenge run, kept apart so it never replaces the main life. */
export const DAILY_KEY = 'hidup-malaysia:daily';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveEnvelope {
  version: number;
  savedAt: string;
  state: GameState;
}

type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/**
 * migrations[n] upgrades a save from version n to n + 1. Add one whenever the
 * GameState shape changes, then bump SAVE_VERSION in newGame.ts.
 */
export const migrations: Record<number, Migration> = {
  // 0 -> 1: pre-release saves without a scheduled-events queue.
  0: (s) => {
    const events = (s.events ?? {}) as Record<string, unknown>;
    return { ...s, events: { scheduled: [], ...events }, version: 1 };
  },
  // 1 -> 2: pixel characters. Old lives get a look derived from their seed.
  1: (s) => {
    const character = (s.character ?? {}) as Record<string, unknown>;
    const seed = typeof s.seed === 'number' ? s.seed : 1;
    const appearance = isValidAppearance(character.appearance) ? character.appearance : randomAppearance(seed);
    return { ...s, character: { ...character, appearance }, version: 2 };
  },
  // 2 -> 3: pets. Existing lives start without one.
  2: (s) => ({ ...s, pet: s.pet ?? null, version: 3 }),
  // 3 -> 4: home decor. Existing lives start with a bare room.
  3: (s) => ({ ...s, decor: s.decor ?? { owned: [], placed: {} }, version: 4 }),
  // 4 -> 5: wardrobe. Outfit and Headwear gained unlockable values; every old look is still valid.
  4: (s) => ({ ...s, version: 5 }),
};

export function migrate(raw: Record<string, unknown>): GameState {
  let current = { ...raw };
  let version = typeof current.version === 'number' ? current.version : 0;
  if (version > SAVE_VERSION) throw new Error(`Save is from a newer version (${version}).`);
  while (version < SAVE_VERSION) {
    const step = migrations[version];
    if (!step) throw new Error(`No migration from version ${version}.`);
    current = step(current);
    version = typeof current.version === 'number' ? current.version : version + 1;
  }
  return fillDefaults(current as unknown as GameState);
}

/** Deep-fill missing fields from a fresh state so older saves never crash the UI. */
function fillDefaults(state: GameState): GameState {
  const base = emptyState() as unknown as Record<string, unknown>;
  const merged = deepFill(base, state as unknown as Record<string, unknown>);
  return merged as unknown as GameState;
}

function deepFill(base: Record<string, unknown>, value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...value };
  for (const [k, v] of Object.entries(base)) {
    if (!(k in out) || out[k] === undefined) out[k] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = deepFill(v as Record<string, unknown>, out[k] as Record<string, unknown>);
    }
  }
  return out;
}

export function isValidState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<GameState>;
  return (
    typeof s.clock?.day === 'number' &&
    typeof s.clock?.minute === 'number' &&
    typeof s.finance?.cash === 'number' &&
    typeof s.stats?.energy === 'number' &&
    typeof s.character?.name === 'string' &&
    (s.mode === 'realistic' || s.mode === 'chaotic')
  );
}

export function serialize(state: GameState, savedAt: string): string {
  const envelope: SaveEnvelope = { version: SAVE_VERSION, savedAt, state };
  return JSON.stringify(envelope);
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; state: GameState; savedAt: string; migrated: boolean }
  | { status: 'corrupt'; error: string };

export function deserialize(text: string): LoadResult {
  try {
    const parsed = JSON.parse(text) as Partial<SaveEnvelope>;
    if (!parsed || typeof parsed !== 'object' || !parsed.state) return { status: 'corrupt', error: 'Missing state.' };
    const stateVersion = typeof parsed.state.version === 'number' ? parsed.state.version : 0;
    // Validate the core shape before defaults are filled in, so junk is never "repaired" into a fake life.
    if (!isValidState(parsed.state)) return { status: 'corrupt', error: 'Save failed validation.' };
    const state = migrate(parsed.state as unknown as Record<string, unknown>);
    if (!isValidState(state)) return { status: 'corrupt', error: 'Save failed validation.' };
    state.version = SAVE_VERSION;
    return { status: 'ok', state, savedAt: parsed.savedAt ?? '', migrated: stateVersion !== SAVE_VERSION };
  } catch (err) {
    return { status: 'corrupt', error: err instanceof Error ? err.message : 'Unreadable save.' };
  }
}

export function saveGame(storage: StorageLike, state: GameState, savedAt: string, key = SAVE_KEY): boolean {
  try {
    storage.setItem(key, serialize(state, savedAt));
    return true;
  } catch {
    return false;
  }
}

/** Load the save. A corrupt save is moved aside (never silently deleted) and reported. */
export function loadGame(storage: StorageLike, key = SAVE_KEY): LoadResult {
  let text: string | null = null;
  try {
    text = storage.getItem(key);
  } catch {
    return { status: 'empty' };
  }
  if (!text) return { status: 'empty' };
  const result = deserialize(text);
  if (result.status === 'corrupt') {
    try {
      storage.setItem(CORRUPT_KEY, text);
      storage.removeItem(key);
    } catch {
      /* storage unavailable: nothing else to do */
    }
  }
  return result;
}

export function clearSave(storage: StorageLike): void {
  try {
    storage.removeItem(SAVE_KEY);
    storage.removeItem(CORRUPT_KEY);
  } catch {
    /* ignore */
  }
}

export interface EndingCollection {
  version: 1;
  endings: Record<string, { count: number; firstName: string }>;
}

export const emptyCollection = (): EndingCollection => ({ version: 1, endings: {} });

export function recordEnding(c: EndingCollection, endingId: string, name: string): EndingCollection {
  const prev = c.endings[endingId];
  return { version: 1, endings: { ...c.endings, [endingId]: prev ? { ...prev, count: prev.count + 1 } : { count: 1, firstName: name } } };
}

/** Never throws: anything unreadable becomes an empty collection, unknown endings are dropped. */
export function loadCollection(storage: StorageLike): EndingCollection {
  try {
    const raw = JSON.parse(storage.getItem(COLLECTION_KEY) ?? 'null') as { endings?: unknown } | null;
    if (!raw || typeof raw.endings !== 'object' || raw.endings === null || Array.isArray(raw.endings)) return emptyCollection();
    const out = emptyCollection();
    for (const e of endings) {
      const v = (raw.endings as Record<string, { count?: unknown; firstName?: unknown }>)[e.id];
      if (v && Number.isInteger(v.count) && (v.count as number) > 0 && typeof v.firstName === 'string') out.endings[e.id] = { count: v.count as number, firstName: v.firstName };
    }
    return out;
  } catch {
    return emptyCollection();
  }
}

export function saveCollection(storage: StorageLike, c: EndingCollection): void {
  try {
    storage.setItem(COLLECTION_KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable or full: the collection is a nice-to-have */
  }
}
