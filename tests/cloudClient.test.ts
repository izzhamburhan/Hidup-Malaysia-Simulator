import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../src/engine/newGame';
import { serialize } from '../src/engine/save';
import {
  CLOUD_KEY,
  listCloudLives,
  loadCloudState,
  pullLife,
  pushLife,
  pushTombstone,
  removeAllCloudLives,
  saveCloudState,
  type CloudDoc,
  type CloudStore,
} from '../src/lib/cloud';
import { makeGame } from './helpers';

type Docs = Record<string, Record<string, CloudDoc>>;

function fakeStore(initial: Docs = {}, failWith?: string): CloudStore & { docs: Docs } {
  const docs: Docs = JSON.parse(JSON.stringify(initial));
  const guard = () => {
    if (failWith) throw new Error(failWith);
  };
  return {
    docs,
    async list(uid) {
      guard();
      return Object.values(docs[uid] ?? {});
    },
    async get(uid, lifeId) {
      guard();
      return docs[uid]?.[lifeId] ?? null;
    },
    async set(uid, doc) {
      guard();
      (docs[uid] ??= {})[doc.lifeId] = doc;
    },
    async remove(uid, lifeId) {
      guard();
      delete docs[uid]?.[lifeId];
    },
  };
}

const T = '2027-02-02T10:00:00.000Z';
const T2 = '2027-02-03T10:00:00.000Z';

function life(seed: number, at = T) {
  const state = makeGame({ seed });
  return { state, text: serialize(state, at) };
}

describe('cloud client (one document per life)', () => {
  it('pushLife writes the save text and a small summary under the user and life id', async () => {
    const store = fakeStore();
    const { state, text } = life(5);
    const res = await pushLife(store, 'u1', text);
    expect(res.ok).toBe(true);
    expect(store.docs.u1[state.id]).toEqual({ save: text, savedAt: T, version: SAVE_VERSION, lifeId: state.id, day: state.clock.day, name: state.character.name });
  });

  it('keeps several lives side by side without replacing one with another', async () => {
    const store = fakeStore();
    const a = life(1);
    const b = life(2);
    await pushLife(store, 'u1', a.text);
    await pushLife(store, 'u1', b.text);
    expect(Object.keys(store.docs.u1).sort()).toEqual([a.state.id, b.state.id].sort());
  });

  it('pushLife refuses text that is not a save and writes nothing', async () => {
    const store = fakeStore();
    expect((await pushLife(store, 'u1', 'garbage')).ok).toBe(false);
    expect(store.docs).toEqual({});
  });

  it('pushLife reports a network failure instead of throwing', async () => {
    expect(await pushLife(fakeStore({}, 'offline'), 'u1', life(5).text)).toEqual({ ok: false, error: 'offline' });
  });

  it('pushTombstone records a deletion with no save inside', async () => {
    const store = fakeStore();
    expect(await pushTombstone(store, 'u1', 'life-x', T2)).toEqual({ ok: true });
    expect(store.docs.u1['life-x']).toEqual({ save: '', savedAt: T2, version: SAVE_VERSION, lifeId: 'life-x', day: 0, name: '', deleted: true });
  });

  it('listCloudLives returns lives, deletion markers and unreadable documents', async () => {
    const store = fakeStore();
    const a = life(1);
    await pushLife(store, 'u1', a.text);
    await pushTombstone(store, 'u1', 'life-gone', T2);
    store.docs.u1['life-bad'] = { save: '{"version":9,"savedAt":"x","state":{"nope":1}}', savedAt: T, version: SAVE_VERSION, lifeId: 'life-bad', day: 1, name: 'x' };
    store.docs.u1['life-liar'] = { ...store.docs.u1[a.state.id], lifeId: 'life-liar' }; // save text belongs to another life
    const res = await listCloudLives(store, 'u1');
    expect(res.status).toBe('ok');
    if (res.status === 'ok') {
      const byId = Object.fromEntries(res.entries.map((e) => [e.id, e]));
      expect(byId[a.state.id].meta?.lifeId).toBe(a.state.id);
      expect(byId[a.state.id].deletedAt).toBeNull();
      expect(byId['life-gone']).toEqual({ id: 'life-gone', meta: null, deletedAt: T2 });
      expect(byId['life-liar']).toEqual({ id: 'life-liar', meta: null, deletedAt: null });
      expect(byId['life-bad'].meta?.lifeId ?? null).not.toBe('life-bad');
    }
  });

  it('listCloudLives is empty for a new user and reports failures as a value', async () => {
    expect(await listCloudLives(fakeStore(), 'u1')).toEqual({ status: 'ok', entries: [] });
    expect(await listCloudLives(fakeStore({}, 'offline'), 'u1')).toEqual({ status: 'error', error: 'offline' });
  });

  it('pullLife round-trips a life through deserialize', async () => {
    const { state, text } = life(6);
    const store = fakeStore();
    await pushLife(store, 'u1', text);
    const res = await pullLife(store, 'u1', state.id);
    expect(res.status).toBe('ok');
    if (res.status === 'ok') {
      expect(res.state.id).toBe(state.id);
      expect(res.state.character.name).toBe(state.character.name);
      expect(res.meta.savedAt).toBe(T);
      expect(res.text).toBe(text);
    }
  });

  it('pullLife reports empty, corrupt, newer-version and network problems without throwing', async () => {
    expect(await pullLife(fakeStore(), 'u1', 'life-none')).toEqual({ status: 'empty' });

    const bad = fakeStore({ u1: { 'life-bad': { save: '{"version":9,"savedAt":"x","state":{"nope":1}}', savedAt: T, version: SAVE_VERSION, lifeId: 'life-bad', day: 1, name: 'x' } } });
    expect((await pullLife(bad, 'u1', 'life-bad')).status).toBe('corrupt');

    const { state, text } = life(7);
    const newer = text.replace(`"version":${SAVE_VERSION},"savedAt"`, `"version":${SAVE_VERSION + 1},"savedAt"`);
    const store = fakeStore({ u1: { [state.id]: { save: newer, savedAt: T, version: SAVE_VERSION + 1, lifeId: state.id, day: 1, name: 'Ali' } } });
    expect((await pullLife(store, 'u1', state.id)).status).toBe('newer');

    expect(await pullLife(fakeStore({}, 'offline'), 'u1', 'life-x')).toEqual({ status: 'error', error: 'offline' });
  });

  it('removeAllCloudLives deletes every document of that user, including deletion markers, and no one else\'s', async () => {
    const store = fakeStore();
    await pushLife(store, 'u1', life(1).text);
    await pushLife(store, 'u1', life(2).text);
    await pushTombstone(store, 'u1', 'life-gone', T2);
    await pushLife(store, 'u2', life(3).text);
    expect(await removeAllCloudLives(store, 'u1')).toEqual({ ok: true });
    expect(Object.keys(store.docs.u1 ?? {})).toEqual([]);
    expect(Object.keys(store.docs.u2)).toHaveLength(1);
  });

  it('removeAllCloudLives reports a failure instead of throwing', async () => {
    expect((await removeAllCloudLives(fakeStore({}, 'offline'), 'u1')).ok).toBe(false);
  });
});

describe('local cloud state', () => {
  const memory = () => {
    const mem = new Map<string, string>();
    return { mem, getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  };

  it('keeps the signed-in hint, the agreed save time per life and the last sync time', () => {
    const storage = memory();
    expect(loadCloudState(storage)).toEqual({ signedIn: false, lastSynced: {}, lastRunAt: null });
    saveCloudState(storage, { signedIn: true, lastSynced: { 'life-a': T }, lastRunAt: T2 });
    expect(loadCloudState(storage)).toEqual({ signedIn: true, lastSynced: { 'life-a': T }, lastRunAt: T2 });
  });

  it('reads the first release\'s single-life shape, or broken storage, as signed in or out with nothing synced', () => {
    const storage = memory();
    storage.mem.set(CLOUD_KEY, JSON.stringify({ signedIn: true, lastSyncedAt: T }));
    expect(loadCloudState(storage)).toEqual({ signedIn: true, lastSynced: {}, lastRunAt: null });
    storage.mem.set(CLOUD_KEY, JSON.stringify({ signedIn: true, lastSynced: { a: 5, b: T }, lastRunAt: 9 }));
    expect(loadCloudState(storage)).toEqual({ signedIn: true, lastSynced: { b: T }, lastRunAt: null });
    storage.mem.set(CLOUD_KEY, '{not json');
    expect(loadCloudState(storage)).toEqual({ signedIn: false, lastSynced: {}, lastRunAt: null });
    expect(loadCloudState(null)).toEqual({ signedIn: false, lastSynced: {}, lastRunAt: null });
    expect(() => saveCloudState({ getItem: () => null, setItem: () => { throw new Error('full'); } }, { signedIn: true, lastSynced: {}, lastRunAt: null })).not.toThrow();
  });
});
