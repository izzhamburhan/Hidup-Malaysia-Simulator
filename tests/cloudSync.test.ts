import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../src/engine/newGame';
import { serialize } from '../src/engine/save';
import { decideSync, firstNameOf, initialsOf, metaFromEnvelope, planSync, type CloudLifeEntry, type PlanItem, type SaveMeta } from '../src/lib/cloudSync';
import { makeGame } from './helpers';

const meta = (over: Partial<SaveMeta> = {}): SaveMeta => ({
  lifeId: 'life-a',
  day: 10,
  name: 'Ali',
  savedAt: '2027-02-01T10:00:00.000Z',
  version: SAVE_VERSION,
  ...over,
});

const T1 = '2027-02-01T10:00:00.000Z';
const T2 = '2027-02-02T10:00:00.000Z';
const T3 = '2027-02-03T10:00:00.000Z';

describe('decideSync', () => {
  it('does nothing when neither side has a save', () => {
    expect(decideSync(null, null, null, SAVE_VERSION)).toEqual({ action: 'none' });
  });

  it('uploads when only this device has a save', () => {
    expect(decideSync(meta(), null, null, SAVE_VERSION)).toEqual({ action: 'upload' });
  });

  it('downloads when only the cloud has a save', () => {
    expect(decideSync(null, meta(), null, SAVE_VERSION)).toEqual({ action: 'download' });
  });

  it('is already in sync when both sides carry the same save time', () => {
    expect(decideSync(meta({ savedAt: T2 }), meta({ savedAt: T2 }), T2, SAVE_VERSION)).toEqual({ action: 'same' });
  });

  it('uploads when only this device changed since the last sync', () => {
    expect(decideSync(meta({ savedAt: T3 }), meta({ savedAt: T1 }), T1, SAVE_VERSION)).toEqual({ action: 'upload' });
  });

  it('downloads when only the cloud changed since the last sync', () => {
    expect(decideSync(meta({ savedAt: T1 }), meta({ savedAt: T3 }), T1, SAVE_VERSION)).toEqual({ action: 'download' });
  });

  it('asks the player when both sides changed since the last sync', () => {
    expect(decideSync(meta({ savedAt: T3 }), meta({ savedAt: T2 }), T1, SAVE_VERSION)).toEqual({ action: 'conflict', reason: 'both-changed' });
  });

  it('asks the player when the two saves are different lives', () => {
    expect(decideSync(meta({ lifeId: 'life-a' }), meta({ lifeId: 'life-b', savedAt: T2 }), T2, SAVE_VERSION)).toEqual({ action: 'conflict', reason: 'different-life' });
  });

  it('asks the player on a first sync when the same life differs on both sides', () => {
    expect(decideSync(meta({ savedAt: T3 }), meta({ savedAt: T2 }), null, SAVE_VERSION)).toEqual({ action: 'conflict', reason: 'both-changed' });
  });

  it('refuses a cloud save written by a newer version of the game, never overwriting it', () => {
    expect(decideSync(meta(), meta({ version: SAVE_VERSION + 1 }), T1, SAVE_VERSION)).toEqual({ action: 'refuse', reason: 'cloud-newer-version' });
    expect(decideSync(null, meta({ version: SAVE_VERSION + 1 }), null, SAVE_VERSION)).toEqual({ action: 'refuse', reason: 'cloud-newer-version' });
  });

  it('treats an unreadable save time as the oldest possible', () => {
    expect(decideSync(meta({ savedAt: 'nonsense' }), meta({ savedAt: T3 }), T1, SAVE_VERSION)).toEqual({ action: 'download' });
  });
});

describe('planSync (one decision per life)', () => {
  const life = (id: string, savedAt: string, version = SAVE_VERSION): SaveMeta => meta({ lifeId: id, savedAt, version });
  const cloudLife = (id: string, savedAt: string, version = SAVE_VERSION): CloudLifeEntry => ({ id, meta: life(id, savedAt, version), deletedAt: null });
  const tomb = (id: string, at: string): CloudLifeEntry => ({ id, meta: null, deletedAt: at });
  const plan = (local: SaveMeta[], cloud: CloudLifeEntry[], opts: { deleted?: Record<string, string>; lastSynced?: Record<string, string> } = {}): PlanItem[] =>
    planSync({ local, localDeleted: opts.deleted ?? {}, cloud, lastSynced: opts.lastSynced ?? {}, appVersion: SAVE_VERSION });

  it('adds lives that exist on only one side, never replacing another', () => {
    const items = plan([life('a', T1), life('b', T1)], [cloudLife('b', T1), cloudLife('c', T2)], { lastSynced: { b: T1 } });
    expect(items).toEqual([
      { id: 'a', action: 'upload' },
      { id: 'b', action: 'same' },
      { id: 'c', action: 'download' },
    ]);
  });

  it('decides each shared life on its own save times', () => {
    const items = plan(
      [life('a', T3), life('b', T1), life('c', T3)],
      [cloudLife('a', T1), cloudLife('b', T3), cloudLife('c', T2)],
      { lastSynced: { a: T1, b: T1, c: T1 } },
    );
    expect(items).toEqual([
      { id: 'a', action: 'upload' },
      { id: 'b', action: 'download' },
      { id: 'c', action: 'conflict', reason: 'both-changed' },
    ]);
  });

  it('refuses a life saved by a newer version of the game, whether or not it is held here', () => {
    expect(plan([life('a', T1)], [cloudLife('a', T2, SAVE_VERSION + 1)], { lastSynced: { a: T1 } })).toEqual([{ id: 'a', action: 'refuse' }]);
    expect(plan([], [cloudLife('z', T2, SAVE_VERSION + 1)])).toEqual([{ id: 'z', action: 'refuse' }]);
  });

  it('removes a life here when the cloud says it was deleted, unless it changed after the deletion', () => {
    expect(plan([life('a', T1)], [tomb('a', T2)])).toEqual([{ id: 'a', action: 'delete-local', at: T2 }]);
    expect(plan([life('a', T3)], [tomb('a', T2)])).toEqual([{ id: 'a', action: 'upload' }]);
  });

  it('tells the cloud about a local deletion, unless the cloud life changed after it', () => {
    expect(plan([], [cloudLife('a', T1)], { deleted: { a: T2 } })).toEqual([{ id: 'a', action: 'delete-cloud', at: T2 }]);
    expect(plan([], [cloudLife('a', T3)], { deleted: { a: T2 } })).toEqual([{ id: 'a', action: 'download' }]);
  });

  it('ignores a deletion that has nothing left to delete', () => {
    expect(plan([], [tomb('a', T2)])).toEqual([]);
    expect(plan([], [], { deleted: { a: T2 } })).toEqual([]);
  });

  it('leaves an unreadable cloud life alone', () => {
    expect(plan([life('a', T1)], [{ id: 'a', meta: null, deletedAt: null }])).toEqual([{ id: 'a', action: 'corrupt' }]);
  });

  it('does nothing when there is nothing anywhere', () => {
    expect(plan([], [])).toEqual([]);
  });
});

describe('initialsOf', () => {
  it('uses the first letters of the first and last word, in capitals', () => {
    expect(initialsOf('MUHAMMAD ARIFF IZZHAM BIN BURHANUDDIN')).toBe('MB');
    expect(initialsOf('ali bin abu')).toBe('AA');
    expect(initialsOf('Siti')).toBe('S');
  });

  it('copes with empty, spaced and non-Latin names', () => {
    expect(initialsOf('')).toBe('?');
    expect(initialsOf('   ')).toBe('?');
    expect(initialsOf('  Nur   Aina ')).toBe('NA');
    expect(initialsOf('李 明')).toBe('李明');
  });
});

describe('firstNameOf', () => {
  it('takes the first word in a friendly capitalisation', () => {
    expect(firstNameOf('MUHAMMAD ARIFF IZZHAM BIN BURHANUDDIN')).toBe('Muhammad');
    expect(firstNameOf('ali bin abu')).toBe('Ali');
    expect(firstNameOf('  Siti   Aminah ')).toBe('Siti');
    expect(firstNameOf('Mei-ling TAN')).toBe('Mei-Ling');
  });

  it('copes with empty and non-Latin names', () => {
    expect(firstNameOf('')).toBe('');
    expect(firstNameOf('   ')).toBe('');
    expect(firstNameOf('李 明')).toBe('李');
  });

  it('keeps a very long single word short', () => {
    expect(firstNameOf('A'.repeat(40)).length).toBeLessThanOrEqual(14);
  });
});

describe('metaFromEnvelope', () => {
  it('summarises a serialized save without keeping the full state', () => {
    const state = makeGame({ seed: 3 });
    const text = serialize(state, T2);
    const m = metaFromEnvelope(text);
    expect(m).toEqual({ lifeId: state.id, day: state.clock.day, name: state.character.name, savedAt: T2, version: SAVE_VERSION });
  });

  it('returns null for text that is not a save', () => {
    expect(metaFromEnvelope('not json')).toBeNull();
    expect(metaFromEnvelope('{}')).toBeNull();
    expect(metaFromEnvelope('')).toBeNull();
  });
});