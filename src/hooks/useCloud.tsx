// Optional Google sign-in and cloud save for ALL of a player's lives. Guest play never touches this:
// nothing loads, nothing is sent, and the game reads and writes LocalStorage exactly as before. When a
// player signs in, every life on this device is compared with the cloud (planSync, one decision per life),
// lives that exist on only one side are added to the other, and a debounced push keeps the current life
// up to date. The engine is not involved: this layer only moves save text around.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CLOUD_SAVE_ENABLED } from '../config';
import { SAVE_VERSION } from '../engine/newGame';
import type { StringKey } from '../i18n';
import { track } from '../lib/analytics';
import { listCloudLives, loadCloudState, pullLife, pushLife, pushTombstone, recordVisit, removeAllCloudLives, saveCloudState } from '../lib/cloud';
import { createPushScheduler } from '../lib/cloudScheduler';
import { metaFromEnvelope, planSync, type SaveMeta } from '../lib/cloudSync';
import { loadFirebase, type CloudUser, type FirebaseHandle } from '../lib/firebaseClient';
import { adoptCloudLife, applyCloudDeletion, lifeText, listLives, switchToLife } from '../lib/lives';
import { useGame } from './useGame';

/** Quiet time after the last autosave before the cloud copy of the current life is updated. */
const PUSH_DELAY_MS = 20_000;

export type CloudStatus = 'idle' | 'signing-in' | 'syncing' | 'synced' | 'error';

/** One life that changed on both this device and the cloud: the player picks which copy to keep. */
export interface CloudConflict {
  id: string;
  local: SaveMeta;
  cloud: SaveMeta;
  reason: 'both-changed' | 'different-life';
}

interface CloudApi {
  /** False when no Firebase config is set: the UI hides every cloud control. */
  enabled: boolean;
  user: CloudUser | null;
  status: CloudStatus;
  /** A translatable reason for the last problem, or null. */
  messageKey: StringKey | null;
  /** The technical reason behind the last problem (for example a Firestore permission error), or null. */
  detail: string | null;
  /** When the last sync finished. */
  lastSyncedAt: string | null;
  /** The first unresolved conflict, or null. */
  conflict: CloudConflict | null;
  conflictCount: number;
  /** Lives in the cloud that did not fit in this device's slots (they stay in the cloud). */
  skippedCount: number;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  resolveConflict: (keep: 'local' | 'cloud') => Promise<void>;
  /** Delete every life in the cloud, then sign out. Lives on this device are untouched. */
  deleteCloudData: () => Promise<void>;
}

const CloudContext = createContext<CloudApi | null>(null);

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const game = useGame();
  const gameRef = useRef(game); // the game API changes on every state change; callbacks read the latest
  gameRef.current = game;
  const { slot, lastSavedAt, libraryVersion } = game;

  const [user, setUser] = useState<CloudUser | null>(null);
  const [status, setStatus] = useState<CloudStatus>('idle');
  const [messageKey, setMessageKey] = useState<StringKey | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(() => loadCloudState(storage()).lastRunAt);
  const [conflicts, setConflicts] = useState<CloudConflict[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);

  const handleRef = useRef<FirebaseHandle | null>(null);
  const userRef = useRef<CloudUser | null>(null);
  const slotRef = useRef(slot);
  slotRef.current = slot;
  const lastSyncedRef = useRef<Record<string, string>>(loadCloudState(storage()).lastSynced);
  const lastRunRef = useRef<string | null>(lastRunAt);
  const conflictsRef = useRef<CloudConflict[]>([]);
  const readyRef = useRef(false); // a sync finished with no open conflict
  const syncingRef = useRef(false);
  const rerunRef = useRef(false); // something changed while a sync was running: run once more
  const suppressRef = useRef(false); // the next autosave is a download, not a player change
  const skipLibRef = useRef(false); // the next library change came from this sync, not the player
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const signInClickRef = useRef(false); // the player tapped Sign in (a restored session is not counted as a sign-in)
  const lastProblemRef = useRef<string | null>(null);
  const runSyncRef = useRef<() => Promise<void>>(async () => {});

  const persist = useCallback(() => {
    saveCloudState(storage(), { signedIn: userRef.current !== null, lastSynced: lastSyncedRef.current, lastRunAt: lastRunRef.current });
  }, []);

  const markLife = useCallback(
    (id: string, iso: string) => {
      lastSyncedRef.current = { ...lastSyncedRef.current, [id]: iso };
      persist();
    },
    [persist],
  );

  const finishRun = useCallback(() => {
    const now = new Date().toISOString();
    lastRunRef.current = now;
    setLastRunAt(now);
    persist();
  }, [persist]);

  const fail = useCallback((key: StringKey, why?: string) => {
    console.warn('[cloud save]', key, why ?? '');
    // A refused write almost always means the server rules are not published: say that instead of "offline".
    const shown: StringKey = why && /permission/i.test(why) ? 'cloud.err.permission' : key;
    setStatus('error');
    setMessageKey(shown);
    setDetail(why ?? null);
    // Count the kind of problem, never its text. The same kind twice in a row is counted once.
    const source = shown.replace('cloud.err.', 'cloud_');
    if (lastProblemRef.current !== source) track('problem', { source });
    lastProblemRef.current = source;
  }, []);

  const activeLifeId = useCallback((): string | null => {
    const text = gameRef.current.getLibrary().active;
    return text ? (metaFromEnvelope(text)?.lifeId ?? null) : null;
  }, []);

  /** Upload the life being played. Shelved lives only change through a full sync. */
  const pushActive = useCallback(async () => {
    const u = userRef.current;
    const h = handleRef.current;
    const text = gameRef.current.getLibrary().active;
    if (!u || !h || !text) return;
    const res = await pushLife(h.store, u.uid, text);
    if (res.ok) {
      markLife(res.meta.lifeId, res.meta.savedAt);
      finishRun();
      setStatus('synced');
      setMessageKey(null);
      setDetail(null);
    } else {
      fail('cloud.err.push', res.error);
    }
  }, [fail, finishRun, markLife]);

  const scheduler = useMemo(
    () => createPushScheduler({ delayMs: PUSH_DELAY_MS, canPush: () => userRef.current !== null && readyRef.current && slotRef.current === 'main', push: pushActive }),
    [pushActive],
  );

  /** Compare every life here with the cloud and act on each one. */
  const runSync = useCallback(async () => {
    const u = userRef.current;
    const h = handleRef.current;
    if (!u || !h) return;
    if (syncingRef.current) {
      rerunRef.current = true;
      return;
    }
    syncingRef.current = true;
    setStatus('syncing');
    setMessageKey(null);
    setDetail(null);
    try {
      const lib = gameRef.current.getLibrary();
      const mine = listLives(lib);
      const listed = await listCloudLives(h.store, u.uid);
      if (listed.status === 'error') {
        fail('cloud.err.network', listed.error);
        return;
      }
      const cloudById = new Map(listed.entries.map((e) => [e.id, e]));
      const items = planSync({ local: mine.map((e) => e.meta), localDeleted: lib.deleted, cloud: listed.entries, lastSynced: lastSyncedRef.current, appVersion: SAVE_VERSION });

      let working = lib;
      let changed = false;
      let activeReplaced = false;
      let skipped = 0;
      let problem: { key: StringKey; why?: string } | null = null;
      const found: CloudConflict[] = [];

      for (const item of items) {
        switch (item.action) {
          case 'same': {
            const m = mine.find((e) => e.id === item.id);
            if (m) markLife(item.id, m.meta.savedAt);
            break;
          }
          case 'upload': {
            const text = lifeText(working, item.id);
            if (!text) break;
            const res = await pushLife(h.store, u.uid, text);
            if (res.ok) markLife(item.id, res.meta.savedAt);
            else problem ??= { key: 'cloud.err.push', why: res.error };
            break;
          }
          case 'download': {
            const pulled = await pullLife(h.store, u.uid, item.id);
            if (pulled.status === 'ok') {
              const adopted = adoptCloudLife(working, pulled.text);
              if (adopted.placed === 'skipped') {
                skipped += 1;
              } else {
                working = adopted.lib;
                changed = true;
                if (adopted.placed === 'active') activeReplaced = true;
                markLife(item.id, pulled.meta.savedAt);
              }
            } else if (pulled.status === 'newer') problem ??= { key: 'cloud.err.newer' };
            else if (pulled.status === 'corrupt') problem ??= { key: 'cloud.err.corrupt' };
            else if (pulled.status === 'error') problem ??= { key: 'cloud.err.network', why: pulled.error };
            break;
          }
          case 'conflict': {
            const local = mine.find((e) => e.id === item.id)?.meta;
            const cloud = cloudById.get(item.id)?.meta;
            if (local && cloud) found.push({ id: item.id, local, cloud, reason: item.reason ?? 'both-changed' });
            break;
          }
          case 'delete-local':
            if (item.at) {
              working = applyCloudDeletion(working, item.id, item.at);
              changed = true;
            }
            break;
          case 'delete-cloud':
            if (item.at) {
              const res = await pushTombstone(h.store, u.uid, item.id, item.at);
              if (!res.ok) problem ??= { key: 'cloud.err.push', why: res.error };
            }
            break;
          case 'refuse':
            problem ??= { key: 'cloud.err.newer' };
            break;
          case 'corrupt':
            problem ??= { key: 'cloud.err.corrupt' };
            break;
        }
      }

      // A new device ends up with lives but no current one: make the most recently saved life current.
      if (working.active === null) {
        const newest = listLives(working)[0];
        const switched = newest ? switchToLife(working, newest.id) : null;
        if (switched) {
          working = switched;
          changed = true;
          activeReplaced = true;
        }
      }

      if (changed && gameRef.current.applyLibrary(working)) {
        skipLibRef.current = true;
        suppressRef.current = activeReplaced && working.active !== null;
      }

      conflictsRef.current = found;
      setConflicts(found);
      readyRef.current = found.length === 0;
      setSkippedCount(skipped);
      if (problem) fail(problem.key, problem.why);
      else {
        setStatus(found.length > 0 ? 'idle' : 'synced');
        finishRun();
      }
    } finally {
      syncingRef.current = false;
      if (rerunRef.current) {
        rerunRef.current = false;
        void runSyncRef.current();
      }
    }
  }, [fail, finishRun, markLife]);
  runSyncRef.current = runSync;

  /** Load Firebase and start listening for the session. Runs only for a returning or signing-in player. */
  const connect = useCallback(async (): Promise<FirebaseHandle | null> => {
    try {
      const handle = await loadFirebase();
      handleRef.current = handle;
      if (!unsubscribeRef.current) {
        unsubscribeRef.current = handle.onUser((next) => {
          userRef.current = next;
          setUser(next);
          if (next) {
            if (signInClickRef.current) {
              signInClickRef.current = false;
              track('account', { source: 'signin' });
            }
            persist();
            void recordVisit(handle.store, next.uid, new Date().toISOString());
            void runSyncRef.current();
          } else {
            readyRef.current = false;
            scheduler.cancel();
            setStatus('idle');
          }
        });
      }
      return handle;
    } catch (err) {
      fail('cloud.err.network', err instanceof Error ? err.message : undefined);
      return null;
    }
  }, [fail, persist, scheduler]);

  // A returning player: restore the session quietly. Guests never reach Firebase.
  useEffect(() => {
    if (CLOUD_SAVE_ENABLED && loadCloudState(storage()).signedIn) void connect();
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [connect]);

  // Every autosave: a download is already in sync; anything else waits for a quiet moment, then pushes.
  useEffect(() => {
    if (!userRef.current || !lastSavedAt) return;
    const id = activeLifeId();
    if (suppressRef.current) {
      suppressRef.current = false;
      if (id) markLife(id, lastSavedAt);
      return;
    }
    if (slot !== 'main') return;
    scheduler.schedule();
    // A life that has never reached the cloud (a brand-new character) goes up straight away, not after the quiet delay.
    if (id && lastSyncedRef.current[id] === undefined && readyRef.current) void scheduler.flush();
  }, [lastSavedAt, slot, scheduler, markLife, activeLifeId]);

  // The player started, switched or deleted a life: sync everything now.
  useEffect(() => {
    if (skipLibRef.current) {
      skipLibRef.current = false;
      return;
    }
    if (!userRef.current || !readyRef.current) return;
    void runSyncRef.current();
  }, [libraryVersion]);

  // Push right away when the tab is hidden or closing, so a quick app switch does not lose a change.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') void scheduler.flush();
      // Coming back to the tab after a while counts as a new sitting (recordVisit applies the 30 minute rule).
      else if (userRef.current && handleRef.current) void recordVisit(handleRef.current.store, userRef.current.uid, new Date().toISOString());
    };
    const onHide = () => void scheduler.flush();
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', onHide);
    };
  }, [scheduler]);

  const signIn = useCallback(async () => {
    setStatus('signing-in');
    setMessageKey(null);
    setDetail(null);
    const handle = await connect();
    if (!handle) return;
    signInClickRef.current = true;
    try {
      await handle.signIn();
      // The session arrives through onUser, which starts the first sync.
    } catch {
      signInClickRef.current = false;
      track('account', { source: 'signin_fail' });
      setStatus('idle');
      setMessageKey('cloud.err.popup');
    }
  }, [connect]);

  /** Leave the account: stop pushes, forget the per-life sync state, sign out of Google. */
  const leave = useCallback(async () => {
    await scheduler.flush();
    scheduler.cancel();
    readyRef.current = false;
    conflictsRef.current = [];
    setConflicts([]);
    setSkippedCount(0);
    try {
      await handleRef.current?.signOut();
    } catch {
      /* already signed out */
    }
    userRef.current = null;
    setUser(null);
    lastSyncedRef.current = {};
    lastRunRef.current = null;
    setLastRunAt(null);
    persist();
    setStatus('idle');
    setMessageKey(null);
    setDetail(null);
  }, [persist, scheduler]);

  const signOut = useCallback(async () => {
    track('account', { source: 'signout' });
    await leave();
  }, [leave]);

  const syncNow = useCallback(async () => {
    if (conflictsRef.current.length > 0) return;
    await scheduler.flush();
    await runSync();
  }, [runSync, scheduler]);

  const resolveConflict = useCallback(
    async (keep: 'local' | 'cloud') => {
      const first = conflictsRef.current[0];
      const u = userRef.current;
      const h = handleRef.current;
      if (!first || !u || !h) return;
      const rest = conflictsRef.current.slice(1);
      conflictsRef.current = rest;
      setConflicts(rest);
      setStatus('syncing');
      const lib = gameRef.current.getLibrary();
      let ok = true;
      if (keep === 'local') {
        const text = lifeText(lib, first.id);
        const res = text ? await pushLife(h.store, u.uid, text) : null;
        if (res?.ok) markLife(first.id, res.meta.savedAt);
        else {
          ok = false;
          fail('cloud.err.push', res && !res.ok ? res.error : undefined);
        }
      } else {
        const pulled = await pullLife(h.store, u.uid, first.id);
        if (pulled.status === 'ok') {
          const adopted = adoptCloudLife(lib, pulled.text);
          if (gameRef.current.applyLibrary(adopted.lib)) {
            skipLibRef.current = true;
            suppressRef.current = adopted.placed === 'active';
            markLife(first.id, pulled.meta.savedAt);
          } else {
            ok = false;
            fail('cloud.err.apply');
          }
        } else {
          ok = false;
          fail(pulled.status === 'newer' ? 'cloud.err.newer' : pulled.status === 'corrupt' ? 'cloud.err.corrupt' : 'cloud.err.network', pulled.status === 'error' ? pulled.error : undefined);
        }
      }
      if (rest.length === 0) readyRef.current = true;
      if (ok) {
        setStatus('synced');
        setMessageKey(null);
        setDetail(null);
        finishRun();
      }
    },
    [fail, finishRun, markLife],
  );

  const deleteCloudData = useCallback(async () => {
    const u = userRef.current;
    const h = handleRef.current;
    if (!u || !h) return;
    scheduler.cancel();
    const res = await removeAllCloudLives(h.store, u.uid);
    if (!res.ok) {
      fail('cloud.err.delete', res.error);
      return;
    }
    track('account', { source: 'delete_cloud' });
    await leave();
    setMessageKey('cloud.deleted');
  }, [fail, leave, scheduler]);

  const api: CloudApi = useMemo(
    () => ({
      enabled: CLOUD_SAVE_ENABLED,
      user,
      status,
      messageKey,
      detail,
      lastSyncedAt: lastRunAt,
      conflict: conflicts[0] ?? null,
      conflictCount: conflicts.length,
      skippedCount,
      signIn,
      signOut,
      syncNow,
      resolveConflict,
      deleteCloudData,
    }),
    [user, status, messageKey, detail, lastRunAt, conflicts, skippedCount, signIn, signOut, syncNow, resolveConflict, deleteCloudData],
  );

  return <CloudContext.Provider value={api}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudApi {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error('useCloud must be used inside CloudProvider');
  return ctx;
}
