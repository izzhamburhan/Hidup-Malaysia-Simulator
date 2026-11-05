// Several lives at once. Today's save key stays the CURRENT life, so every existing player's game
// loads exactly as before; other lives sit on a shelf. Everything here is a pure function of a
// `Library` value (plus a small storage adapter at the end), so the rules are easy to test. A new
// life never replaces an old one: it shelves the current one, and a full library refuses instead of
// overwriting. UI layer only; the simulation engine never imports this file.

import { SAVE_KEY, type StorageLike } from '../engine/save';
import { metaFromEnvelope, type SaveMeta } from './cloudSync';

/** How many lives a player can hold at once (the current life plus shelved ones). */
export const MAX_LIVES = 3;

/** The shelved lives and local deletions. The current life stays under SAVE_KEY. */
export const SHELF_KEY = 'hidup-malaysia:shelf';

export interface Library {
  /** Save envelope text of the current life, or null. */
  active: string | null;
  /** Shelved lives: life id to save envelope text. */
  shelf: Record<string, string>;
  /** Lives deleted on this device: life id to the time they were deleted (so the cloud can be told). */
  deleted: Record<string, string>;
}

export interface LifeEntry {
  id: string;
  meta: SaveMeta;
  active: boolean;
}

export const emptyLibrary = (): Library => ({ active: null, shelf: {}, deleted: {} });

const copy = (lib: Library): Library => ({ active: lib.active, shelf: { ...lib.shelf }, deleted: { ...lib.deleted } });

function timeOf(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** The current life first, then shelved lives, newest save first. Unreadable entries are left out. */
export function listLives(lib: Library): LifeEntry[] {
  const out: LifeEntry[] = [];
  const current = lib.active ? metaFromEnvelope(lib.active) : null;
  if (current) out.push({ id: current.lifeId, meta: current, active: true });
  const shelved: LifeEntry[] = [];
  for (const [id, text] of Object.entries(lib.shelf)) {
    const meta = metaFromEnvelope(text);
    if (meta && !(current && id === current.lifeId)) shelved.push({ id, meta, active: false });
  }
  shelved.sort((a, b) => timeOf(b.meta.savedAt) - timeOf(a.meta.savedAt));
  return [...out, ...shelved];
}

export const liveCount = (lib: Library): number => listLives(lib).length;

const activeId = (lib: Library): string | null => (lib.active ? (metaFromEnvelope(lib.active)?.lifeId ?? null) : null);

/** The save text of any held life, or null. */
export function lifeText(lib: Library, id: string): string | null {
  if (activeId(lib) === id) return lib.active;
  return lib.shelf[id] ?? null;
}

/**
 * Start a new life: the current one moves to the shelf, the new one becomes current.
 * Null when the library is full (the caller asks the player to delete a life first) or the text is not a save.
 */
export function startNewLife(lib: Library, newText: string, max = MAX_LIVES): Library | null {
  const fresh = metaFromEnvelope(newText);
  if (!fresh) return null;
  const next = copy(lib);
  const current = activeId(lib);
  delete next.shelf[fresh.lifeId];
  delete next.deleted[fresh.lifeId];
  if (current === fresh.lifeId) {
    next.active = newText;
    return next;
  }
  if (liveCount(lib) + 1 > max) return null;
  if (current && lib.active) next.shelf[current] = lib.active;
  next.active = newText;
  return next;
}

/** Make a shelved life the current one; the current life goes to the shelf. Null for an unknown life. */
export function switchToLife(lib: Library, id: string): Library | null {
  const current = activeId(lib);
  if (current === id) return copy(lib);
  const text = lib.shelf[id];
  if (text === undefined) return null;
  const next = copy(lib);
  delete next.shelf[id];
  if (current && lib.active) next.shelf[current] = lib.active;
  next.active = text;
  return next;
}

function removeLife(lib: Library, id: string, at: string): Library {
  const next = copy(lib);
  if (activeId(lib) === id) {
    next.active = null;
    next.deleted[id] = at;
  } else if (id in next.shelf) {
    delete next.shelf[id];
    next.deleted[id] = at;
  }
  return next;
}

/** Delete a life for good and remember when, so the cloud copy can be deleted too. */
export const deleteLife = (lib: Library, id: string, nowIso: string): Library => removeLife(lib, id, nowIso);

/** A life was deleted somewhere else (the cloud says so): remove it here and keep that deletion time. */
export const applyCloudDeletion = (lib: Library, id: string, deletedAtIso: string): Library => removeLife(lib, id, deletedAtIso);

/**
 * Put a life downloaded from the cloud in place. The same life is replaced where it is; a new life goes on
 * the shelf if there is room, otherwise it is skipped (it stays in the cloud) so no life is ever pushed out.
 */
export function adoptCloudLife(lib: Library, text: string, max = MAX_LIVES): { lib: Library; placed: 'active' | 'shelf' | 'skipped' } {
  const meta = metaFromEnvelope(text);
  if (!meta) return { lib: copy(lib), placed: 'skipped' };
  const next = copy(lib);
  if (activeId(lib) === meta.lifeId) {
    next.active = text;
    delete next.deleted[meta.lifeId];
    return { lib: next, placed: 'active' };
  }
  if (meta.lifeId in lib.shelf) {
    next.shelf[meta.lifeId] = text;
    delete next.deleted[meta.lifeId];
    return { lib: next, placed: 'shelf' };
  }
  if (liveCount(lib) >= max) return { lib: next, placed: 'skipped' };
  next.shelf[meta.lifeId] = text;
  delete next.deleted[meta.lifeId];
  return { lib: next, placed: 'shelf' };
}

/** Never throws: anything unreadable means an empty library (a shelf that cannot be read is simply not listed). */
export function loadLibrary(storage: StorageLike | null): Library {
  const lib = emptyLibrary();
  if (!storage) return lib;
  try {
    lib.active = storage.getItem(SAVE_KEY);
    const raw = JSON.parse(storage.getItem(SHELF_KEY) ?? 'null') as { lives?: unknown; deleted?: unknown } | null;
    const strings = (value: unknown): Record<string, string> => {
      const out: Record<string, string> = {};
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [k, v] of Object.entries(value)) if (typeof v === 'string') out[k] = v;
      }
      return out;
    };
    lib.shelf = strings(raw?.lives);
    lib.deleted = strings(raw?.deleted);
  } catch {
    /* unreadable storage: an empty library, nothing is deleted */
  }
  return lib;
}

/**
 * Write the library. The shelf goes first, then the current life: if something stops in between, a life
 * could appear twice (harmless, same id) but is never lost.
 */
export function saveLibrary(storage: StorageLike | null, lib: Library): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SHELF_KEY, JSON.stringify({ version: 1, lives: lib.shelf, deleted: lib.deleted }));
    if (lib.active) storage.setItem(SAVE_KEY, lib.active);
    else storage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}