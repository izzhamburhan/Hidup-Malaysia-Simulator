// Pure decision logic for the optional Google cloud save. No Firebase, no DOM, no storage:
// everything here is a function of two save summaries, so it is easy to test. UI layer only;
// the simulation engine never imports this file.

export interface SaveMeta {
  /** GameState.id: the same life on two devices shares it. */
  lifeId: string;
  day: number;
  name: string;
  /** ISO time the save was written (wall clock, never feeds the simulation). */
  savedAt: string;
  /** The save's format version (SAVE_VERSION when it was written). */
  version: number;
}

export type SyncDecision =
  | { action: 'none' }
  | { action: 'same' }
  | { action: 'upload' }
  | { action: 'download' }
  | { action: 'conflict'; reason: 'both-changed' | 'different-life' }
  | { action: 'refuse'; reason: 'cloud-newer-version' };

/** Unreadable times sort as the oldest possible, so they never win a comparison. */
function timeOf(iso: string | null): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

/**
 * What to do when the local save and the cloud save meet.
 * `lastSyncedAt` is the save time both sides agreed on at the last successful sync (null if never).
 * Nothing is ever overwritten silently: when both sides moved on, the player chooses.
 */
export function decideSync(local: SaveMeta | null, cloud: SaveMeta | null, lastSyncedAt: string | null, appVersion: number): SyncDecision {
  if (cloud && cloud.version > appVersion) return { action: 'refuse', reason: 'cloud-newer-version' };
  if (!local && !cloud) return { action: 'none' };
  if (!cloud) return { action: 'upload' };
  if (!local) return { action: 'download' };
  if (local.lifeId !== cloud.lifeId) return { action: 'conflict', reason: 'different-life' };
  if (timeOf(local.savedAt) === timeOf(cloud.savedAt) && local.savedAt === cloud.savedAt) return { action: 'same' };
  if (lastSyncedAt === null) return { action: 'conflict', reason: 'both-changed' };
  const base = timeOf(lastSyncedAt);
  const localChanged = timeOf(local.savedAt) > base;
  const cloudChanged = timeOf(cloud.savedAt) > base;
  if (localChanged && cloudChanged) return { action: 'conflict', reason: 'both-changed' };
  if (localChanged) return { action: 'upload' };
  if (cloudChanged) return { action: 'download' };
  return { action: 'same' };
}

/** One life as the cloud holds it: a readable life, a deletion marker, or an unreadable document. */
export interface CloudLifeEntry {
  id: string;
  /** Null for a deletion marker or an unreadable document. */
  meta: SaveMeta | null;
  /** When the life was deleted, for a deletion marker; otherwise null. */
  deletedAt: string | null;
}

export type PlanAction = 'upload' | 'download' | 'same' | 'conflict' | 'delete-local' | 'delete-cloud' | 'refuse' | 'corrupt';

export interface PlanItem {
  id: string;
  action: PlanAction;
  reason?: 'both-changed' | 'different-life';
  /** The deletion time, for delete-local and delete-cloud. */
  at?: string;
}

export interface PlanInput {
  /** Every life held on this device (current and shelved). */
  local: SaveMeta[];
  /** Lives deleted on this device: id to deletion time. */
  localDeleted: Record<string, string>;
  cloud: CloudLifeEntry[];
  /** The save time both sides last agreed on, per life. */
  lastSynced: Record<string, string>;
  appVersion: number;
}

/**
 * What to do for every life when this device and the cloud meet. Lives that exist on only one side are
 * added to the other (never replacing anything); a life on both sides is decided by `decideSync`; a
 * deletion wins unless the life was changed after it. Items come back sorted by life id.
 */
export function planSync(input: PlanInput): PlanItem[] {
  const local = new Map(input.local.map((m) => [m.lifeId, m]));
  const cloud = new Map(input.cloud.map((c) => [c.id, c]));
  const ids = [...new Set([...local.keys(), ...cloud.keys(), ...Object.keys(input.localDeleted)])].sort();
  const items: PlanItem[] = [];

  for (const id of ids) {
    const mine = local.get(id) ?? null;
    const theirs = cloud.get(id) ?? null;
    const deletedHere = input.localDeleted[id] ?? null;

    if (!theirs) {
      if (mine) items.push({ id, action: 'upload' });
      continue;
    }
    if (theirs.deletedAt !== null) {
      if (mine) items.push(timeOf(mine.savedAt) > timeOf(theirs.deletedAt) ? { id, action: 'upload' } : { id, action: 'delete-local', at: theirs.deletedAt });
      continue;
    }
    if (!theirs.meta) {
      items.push({ id, action: 'corrupt' });
      continue;
    }
    if (theirs.meta.version > input.appVersion) {
      items.push({ id, action: 'refuse' });
      continue;
    }
    if (!mine) {
      if (deletedHere !== null && timeOf(theirs.meta.savedAt) <= timeOf(deletedHere)) items.push({ id, action: 'delete-cloud', at: deletedHere });
      else items.push({ id, action: 'download' });
      continue;
    }
    const decision = decideSync(mine, theirs.meta, input.lastSynced[id] ?? null, input.appVersion);
    if (decision.action === 'conflict') items.push({ id, action: 'conflict', reason: decision.reason });
    else if (decision.action === 'upload' || decision.action === 'download' || decision.action === 'same') items.push({ id, action: decision.action });
    else if (decision.action === 'refuse') items.push({ id, action: 'refuse' });
  }
  return items;
}

/** Summarise a serialized save envelope (the text the game writes to LocalStorage). Null if it is not one. */
export function metaFromEnvelope(text: string): SaveMeta | null {
  try {
    const env = JSON.parse(text) as {
      version?: unknown;
      savedAt?: unknown;
      state?: { id?: unknown; clock?: { day?: unknown }; character?: { name?: unknown } };
    } | null;
    const s = env?.state;
    if (!env || !s) return null;
    if (typeof env.version !== 'number' || typeof env.savedAt !== 'string') return null;
    if (typeof s.id !== 'string' || typeof s.clock?.day !== 'number' || typeof s.character?.name !== 'string') return null;
    return { lifeId: s.id, day: s.clock.day, name: s.character.name, savedAt: env.savedAt, version: env.version };
  } catch {
    return null;
  }
}

/** The first letters of the first and last word of a name, in capitals, for the avatar fallback ("Ali bin Abu" gives "AA"). */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = [...words[0]][0] ?? '';
  const last = words.length > 1 ? ([...words[words.length - 1]][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** The first word of a display name in a friendly capitalisation ("MUHAMMAD ARIFF" gives "Muhammad"), kept short for a small pill. */
export function firstNameOf(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  const cased = first
    .split('-')
    .map((part) => {
      const chars = [...part];
      return chars.length === 0 ? '' : chars[0].toUpperCase() + chars.slice(1).join('').toLowerCase();
    })
    .join('-');
  return [...cased].slice(0, 14).join('');
}
