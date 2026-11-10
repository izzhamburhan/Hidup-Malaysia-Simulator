// Cloud save client: one document per life at users/{uid}/lives/{lifeId}. It talks to an injected
// `CloudStore`, so tests use an in-memory fake and the browser passes the real Firestore adapter
// (src/lib/firebaseClient.ts, loaded lazily). Nothing here throws: network and format problems come
// back as values the UI can show. UI layer only; the simulation engine never imports this file.

import { SAVE_VERSION } from '../engine/newGame';
import { deserialize } from '../engine/save';
import type { GameState } from '../engine/types';
import { metaFromEnvelope, type CloudLifeEntry, type SaveMeta } from './cloudSync';

/**
 * One life in the cloud. A deletion marker has `deleted: true`, an empty `save`, and the deletion time in
 * `savedAt`, so other devices learn the life was deleted on purpose.
 */
export interface CloudDoc {
  save: string;
  savedAt: string;
  version: number;
  lifeId: string;
  day: number;
  name: string;
  deleted?: boolean;
}

/**
 * How often a signed-in player opens the game, one small document per player at users/{uid}/activity/visits.
 * No name, no save content. `opens` counts sittings (a return after 30 quiet minutes starts a new one);
 * `days` lists the Malaysia dates (UTC+8) they played on, newest last, kept to the last 90.
 */
export interface CloudActivity {
  firstSeen: string;
  lastSeen: string;
  opens: number;
  days: string[];
}

export const SITTING_GAP_MS = 30 * 60 * 1000;
export const ACTIVITY_DAYS_MAX = 90;

const mytDate = (ms: number): string => new Date(ms + 8 * 3600 * 1000).toISOString().slice(0, 10);

/** Pure: the activity record after a visit at `nowIso`. */
export function nextActivity(prev: CloudActivity | null, nowIso: string): CloudActivity {
  const now = Date.parse(nowIso);
  const day = mytDate(Number.isFinite(now) ? now : 0);
  if (!prev) return { firstSeen: nowIso, lastSeen: nowIso, opens: 1, days: [day] };
  const last = Date.parse(prev.lastSeen);
  const newSitting = !Number.isFinite(last) || now - last > SITTING_GAP_MS;
  const days = prev.days.includes(day) ? prev.days : [...prev.days, day].slice(-ACTIVITY_DAYS_MAX);
  return { firstSeen: prev.firstSeen, lastSeen: nowIso, opens: prev.opens + (newSitting ? 1 : 0), days };
}

export interface CloudStore {
  /** Optional so older fakes still work; the Firebase adapter provides both. */
  getActivity?(uid: string): Promise<CloudActivity | null>;
  setActivity?(uid: string, activity: CloudActivity): Promise<void>;
  list(uid: string): Promise<CloudDoc[]>;
  get(uid: string, lifeId: string): Promise<CloudDoc | null>;
  /** The document id is `doc.lifeId`. */
  set(uid: string, doc: CloudDoc): Promise<void>;
  remove(uid: string, lifeId: string): Promise<void>;
}

/** Cloud sync state kept on this device only. */
export const CLOUD_KEY = 'hidup-malaysia:cloud';

export interface CloudLocalState {
  /** Whether to restore the session quietly on load. */
  signedIn: boolean;
  /** The save time both sides last agreed on, per life. */
  lastSynced: Record<string, string>;
  /** When a sync last finished, for the "last synced" line. */
  lastRunAt: string | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const emptyState = (): CloudLocalState => ({ signedIn: false, lastSynced: {}, lastRunAt: null });

/** Never throws: anything unreadable (including the first release's single-life shape) means "nothing synced yet". */
export function loadCloudState(storage: StorageLike | null): CloudLocalState {
  try {
    const raw = JSON.parse(storage?.getItem(CLOUD_KEY) ?? 'null') as { signedIn?: unknown; lastSynced?: unknown; lastRunAt?: unknown } | null;
    if (!raw || typeof raw !== 'object') return emptyState();
    const lastSynced: Record<string, string> = {};
    if (raw.lastSynced && typeof raw.lastSynced === 'object' && !Array.isArray(raw.lastSynced)) {
      for (const [k, v] of Object.entries(raw.lastSynced)) if (typeof v === 'string') lastSynced[k] = v;
    }
    return { signedIn: raw.signedIn === true, lastSynced, lastRunAt: typeof raw.lastRunAt === 'string' ? raw.lastRunAt : null };
  } catch {
    return emptyState();
  }
}

export function saveCloudState(storage: StorageLike | null, state: CloudLocalState): void {
  try {
    storage?.setItem(CLOUD_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable or full: the next sign-in simply compares both sides again */
  }
}

const errorText = (err: unknown): string => (err instanceof Error ? err.message : 'Something went wrong.');

export async function pushLife(store: CloudStore, uid: string, text: string): Promise<{ ok: true; meta: SaveMeta } | { ok: false; error: string }> {
  const meta = metaFromEnvelope(text);
  if (!meta) return { ok: false, error: 'That is not a save.' };
  try {
    await store.set(uid, { save: text, savedAt: meta.savedAt, version: meta.version, lifeId: meta.lifeId, day: meta.day, name: meta.name });
    return { ok: true, meta };
  } catch (err) {
    return { ok: false, error: errorText(err) };
  }
}

/** Note that the player is here now. Never throws; a failure just skips this visit. */
export async function recordVisit(store: CloudStore, uid: string, nowIso: string): Promise<void> {
  if (!store.getActivity || !store.setActivity) return;
  try {
    const prev = await store.getActivity(uid);
    await store.setActivity(uid, nextActivity(prev, nowIso));
  } catch {
    /* activity is best effort */
  }
}

/** Tell the cloud a life was deleted on purpose. */
export async function pushTombstone(store: CloudStore, uid: string, lifeId: string, deletedAt: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await store.set(uid, { save: '', savedAt: deletedAt, version: SAVE_VERSION, lifeId, day: 0, name: '', deleted: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorText(err) };
  }
}

export type ListResult = { status: 'ok'; entries: CloudLifeEntry[] } | { status: 'error'; error: string };

/** Every life the cloud holds, as summaries, without parsing the whole states. */
export async function listCloudLives(store: CloudStore, uid: string): Promise<ListResult> {
  try {
    const docs = await store.list(uid);
    const entries = docs.map((doc): CloudLifeEntry => {
      if (doc.deleted === true) return { id: doc.lifeId, meta: null, deletedAt: doc.savedAt };
      const meta = typeof doc.save === 'string' ? metaFromEnvelope(doc.save) : null;
      return { id: doc.lifeId, meta: meta && meta.lifeId === doc.lifeId ? meta : null, deletedAt: null };
    });
    return { status: 'ok', entries };
  } catch (err) {
    return { status: 'error', error: errorText(err) };
  }
}

export type PullResult =
  | { status: 'empty' }
  | { status: 'ok'; state: GameState; meta: SaveMeta; text: string }
  | { status: 'corrupt'; error: string }
  | { status: 'newer' }
  | { status: 'error'; error: string };

/** Download and validate one life. A bad or too-new save is reported, never loaded. */
export async function pullLife(store: CloudStore, uid: string, lifeId: string): Promise<PullResult> {
  let doc: CloudDoc | null;
  try {
    doc = await store.get(uid, lifeId);
  } catch (err) {
    return { status: 'error', error: errorText(err) };
  }
  if (!doc || doc.deleted === true) return { status: 'empty' };
  const meta = typeof doc.save === 'string' ? metaFromEnvelope(doc.save) : null;
  if (!meta || meta.lifeId !== lifeId) return { status: 'corrupt', error: 'The cloud save is not readable.' };
  if (meta.version > SAVE_VERSION) return { status: 'newer' };
  const res = deserialize(doc.save);
  if (res.status !== 'ok') return { status: 'corrupt', error: res.status === 'corrupt' ? res.error : 'The cloud save is empty.' };
  return { status: 'ok', state: res.state, meta, text: doc.save };
}

/** Delete every document of this user (lives and deletion markers). Nothing on this device is touched. */
export async function removeAllCloudLives(store: CloudStore, uid: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const docs = await store.list(uid);
    for (const doc of docs) await store.remove(uid, doc.lifeId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorText(err) };
  }
}
