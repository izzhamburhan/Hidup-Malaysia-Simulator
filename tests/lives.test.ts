import { describe, expect, it } from 'vitest';
import { SAVE_KEY, serialize } from '../src/engine/save';
import {
  MAX_LIVES,
  SHELF_KEY,
  adoptCloudLife,
  applyCloudDeletion,
  deleteLife,
  emptyLibrary,
  lifeText,
  listLives,
  liveCount,
  loadLibrary,
  saveLibrary,
  startNewLife,
  switchToLife,
  type Library,
} from '../src/lib/lives';
import { metaFromEnvelope } from '../src/lib/cloudSync';
import { makeGame } from './helpers';

const T1 = '2027-02-01T10:00:00.000Z';
const T2 = '2027-02-02T10:00:00.000Z';
const T3 = '2027-02-03T10:00:00.000Z';

/** A save text for a life with the given seed, saved at the given time. */
function life(seed: number, at = T1): { id: string; text: string } {
  const state = makeGame({ seed });
  return { id: state.id, text: serialize(state, at) };
}

function lib(active: ReturnType<typeof life> | null, shelf: ReturnType<typeof life>[] = [], deleted: Record<string, string> = {}): Library {
  return { active: active?.text ?? null, shelf: Object.fromEntries(shelf.map((l) => [l.id, l.text])), deleted };
}

function fakeStorage(initial: Record<string, string> = {}) {
  const mem = new Map(Object.entries(initial));
  return {
    mem,
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };
}

describe('lives library', () => {
  it('allows three lives at once', () => {
    expect(MAX_LIVES).toBe(3);
  });

  it('lists the current life first, then shelved lives newest first, and skips unreadable ones', () => {
    const a = life(1, T1);
    const b = life(2, T3);
    const c = life(3, T2);
    const l = lib(a, [b, c]);
    l.shelf['junk'] = 'not a save';
    const list = listLives(l);
    expect(list.map((e) => e.id)).toEqual([a.id, b.id, c.id]);
    expect(list.map((e) => e.active)).toEqual([true, false, false]);
    expect(list[1].meta.savedAt).toBe(T3);
    expect(liveCount(l)).toBe(3);
  });

  it('starts a new life by shelving the current one, never replacing it', () => {
    const a = life(1);
    const n = life(9);
    const next = startNewLife(lib(a), n.text)!;
    expect(next.active).toBe(n.text);
    expect(next.shelf[a.id]).toBe(a.text);
    expect(liveCount(next)).toBe(2);
  });

  it('starts the very first life with nothing to shelve', () => {
    const n = life(9);
    const next = startNewLife(emptyLibrary(), n.text)!;
    expect(next.active).toBe(n.text);
    expect(next.shelf).toEqual({});
  });

  it('refuses a fourth life instead of overwriting one', () => {
    const l = lib(life(1), [life(2), life(3)]);
    expect(liveCount(l)).toBe(3);
    expect(startNewLife(l, life(9).text)).toBeNull();
    expect(startNewLife(lib(life(1), [life(2)]), life(9).text)).not.toBeNull();
  });

  it('does not mutate the library it was given', () => {
    const l = lib(life(1), [life(2)]);
    const copy = JSON.parse(JSON.stringify(l));
    startNewLife(l, life(9).text);
    switchToLife(l, Object.keys(l.shelf)[0]);
    deleteLife(l, Object.keys(l.shelf)[0], T2);
    expect(l).toEqual(copy);
  });

  it('switches to a shelved life and shelves the current one', () => {
    const a = life(1);
    const b = life(2);
    const next = switchToLife(lib(a, [b]), b.id)!;
    expect(next.active).toBe(b.text);
    expect(next.shelf).toEqual({ [a.id]: a.text });
  });

  it('switching to the current life changes nothing, and to an unknown life is refused', () => {
    const a = life(1);
    const l = lib(a, [life(2)]);
    expect(switchToLife(l, a.id)).toEqual(l);
    expect(switchToLife(l, 'life-nope')).toBeNull();
  });

  it('deletes the current life and records a tombstone', () => {
    const a = life(1);
    const b = life(2);
    const next = deleteLife(lib(a, [b]), a.id, T2);
    expect(next.active).toBeNull();
    expect(next.shelf).toEqual({ [b.id]: b.text });
    expect(next.deleted).toEqual({ [a.id]: T2 });
  });

  it('deletes a shelved life and records a tombstone, but ignores an unknown id', () => {
    const a = life(1);
    const b = life(2);
    const next = deleteLife(lib(a, [b]), b.id, T2);
    expect(next.active).toBe(a.text);
    expect(next.shelf).toEqual({});
    expect(next.deleted).toEqual({ [b.id]: T2 });
    expect(deleteLife(lib(a), 'life-nope', T2).deleted).toEqual({});
  });

  it('applies a deletion that came from the cloud', () => {
    const a = life(1);
    const b = life(2);
    const next = applyCloudDeletion(lib(a, [b]), b.id, T3);
    expect(next.shelf).toEqual({});
    expect(next.deleted).toEqual({ [b.id]: T3 });
    const cur = applyCloudDeletion(lib(a, [b]), a.id, T3);
    expect(cur.active).toBeNull();
  });

  it('adopts a cloud life into a free slot without touching the others', () => {
    const a = life(1);
    const c = life(5);
    const res = adoptCloudLife(lib(a), c.text);
    expect(res.placed).toBe('shelf');
    expect(res.lib.active).toBe(a.text);
    expect(res.lib.shelf[c.id]).toBe(c.text);
  });

  it('replaces the same life when the cloud copy is adopted, whether current or shelved', () => {
    const a = life(1, T1);
    const aNew = { id: a.id, text: life(1, T3).text };
    const current = adoptCloudLife(lib(a), aNew.text);
    expect(current.placed).toBe('active');
    expect(current.lib.active).toBe(aNew.text);
    const b = life(2, T1);
    const bNew = life(2, T3);
    const shelved = adoptCloudLife(lib(a, [b]), bNew.text);
    expect(shelved.placed).toBe('shelf');
    expect(shelved.lib.shelf[b.id]).toBe(bNew.text);
  });

  it('skips a cloud life that has no free slot, and replaces in place even when full', () => {
    const l = lib(life(1), [life(2), life(3)]);
    expect(adoptCloudLife(l, life(8).text).placed).toBe('skipped');
    expect(adoptCloudLife(l, life(8).text).lib).toEqual(l);
    const b = Object.keys(l.shelf)[0];
    const replacement = life(2, T3);
    expect(replacement.id).toBe(b);
    expect(adoptCloudLife(l, replacement.text).placed).toBe('shelf');
  });

  it('forgets a local tombstone when the life comes back from the cloud', () => {
    const c = life(5);
    const res = adoptCloudLife(lib(life(1), [], { [c.id]: T1 }), c.text);
    expect(res.lib.deleted).toEqual({});
  });

  it('finds the text of any held life', () => {
    const a = life(1);
    const b = life(2);
    const l = lib(a, [b]);
    expect(lifeText(l, a.id)).toBe(a.text);
    expect(lifeText(l, b.id)).toBe(b.text);
    expect(lifeText(l, 'life-nope')).toBeNull();
    expect(metaFromEnvelope(lifeText(l, b.id)!)?.lifeId).toBe(b.id);
  });
});

describe('lives storage', () => {
  it('round-trips the current life under the existing save key and the rest under the shelf key', () => {
    const storage = fakeStorage();
    const a = life(1);
    const b = life(2);
    const l = lib(a, [b], { 'life-gone': T2 });
    expect(saveLibrary(storage, l)).toBe(true);
    expect(storage.mem.get(SAVE_KEY)).toBe(a.text);
    expect(JSON.parse(storage.mem.get(SHELF_KEY)!)).toEqual({ version: 1, lives: { [b.id]: b.text }, deleted: { 'life-gone': T2 } });
    expect(loadLibrary(storage)).toEqual(l);
  });

  it('removes the save key when there is no current life', () => {
    const storage = fakeStorage({ [SAVE_KEY]: life(1).text });
    saveLibrary(storage, emptyLibrary());
    expect(storage.mem.has(SAVE_KEY)).toBe(false);
  });

  it('reads an existing single save as the current life with an empty shelf (no migration needed)', () => {
    const a = life(1);
    const loaded = loadLibrary(fakeStorage({ [SAVE_KEY]: a.text }));
    expect(loaded).toEqual({ active: a.text, shelf: {}, deleted: {} });
  });

  it('survives a broken or missing shelf and broken storage', () => {
    expect(loadLibrary(fakeStorage({ [SHELF_KEY]: '{not json' }))).toEqual(emptyLibrary());
    expect(loadLibrary(fakeStorage({ [SHELF_KEY]: JSON.stringify({ lives: 'x', deleted: 7 }) }))).toEqual(emptyLibrary());
    expect(loadLibrary(null)).toEqual(emptyLibrary());
    const throwing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); }, removeItem: () => {} };
    expect(loadLibrary(throwing)).toEqual(emptyLibrary());
    expect(saveLibrary(throwing, emptyLibrary())).toBe(false);
  });
});