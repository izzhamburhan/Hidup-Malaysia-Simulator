import { describe, expect, it } from 'vitest';
import { endings } from '../src/engine/endings';
import { COLLECTION_KEY, emptyCollection, loadCollection, recordEnding, saveCollection } from '../src/engine/save';
import { inMemoryStorage } from './helpers';

describe('ending collection', () => {
  it('records a first find and counts repeats without mutating the input', () => {
    const empty = emptyCollection();
    const one = recordEnding(empty, 'stable', 'Aina');
    expect(empty.endings).toEqual({});
    expect(one.endings.stable).toEqual({ count: 1, firstName: 'Aina' });
    const two = recordEnding(one, 'stable', 'Badrul');
    expect(two.endings.stable).toEqual({ count: 2, firstName: 'Aina' });
  });

  it('survives a round trip through storage', () => {
    const store = inMemoryStorage();
    const c = recordEnding(recordEnding(emptyCollection(), 'career', 'A'), 'fitness', 'B');
    saveCollection(store, c);
    expect(loadCollection(store)).toEqual(c);
  });

  it('never crashes on a bad value', () => {
    const store = inMemoryStorage();
    store.setItem(COLLECTION_KEY, '{not json');
    expect(loadCollection(store)).toEqual(emptyCollection());
    store.setItem(COLLECTION_KEY, JSON.stringify({ version: 1, endings: 'nope' }));
    expect(loadCollection(store)).toEqual(emptyCollection());
    store.setItem(COLLECTION_KEY, JSON.stringify({ version: 1, endings: { stable: { count: 2, firstName: 'A' }, made_up: { count: 1, firstName: 'B' }, debt: { count: 'x' } } }));
    expect(loadCollection(store)).toEqual({ version: 1, endings: { stable: { count: 2, firstName: 'A' } } });
  });

  it('gives every ending a hint', () => {
    for (const e of endings) expect(e.hint, e.id).toBeTruthy();
  });
});
