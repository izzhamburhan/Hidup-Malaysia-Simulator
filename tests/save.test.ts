import { describe, expect, it } from 'vitest';
import { CORRUPT_KEY, SAVE_KEY, clearSave, deserialize, loadGame, migrate, saveGame, serialize } from '../src/engine/save';
import { SAVE_VERSION, performAction } from '../src/engine/simulationEngine';
import { isValidAppearance } from '../src/engine/appearance';
import { inMemoryStorage, makeGame } from './helpers';

describe('save system', () => {
  it('round-trips a game through storage', () => {
    const store = inMemoryStorage();
    const s = performAction(makeGame(), 'eat', 'roti-canai').state;
    expect(saveGame(store, s, '2027-01-01T00:00:00Z')).toBe(true);
    const loaded = loadGame(store);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state).toEqual(s);
      expect(loaded.migrated).toBe(false);
    }
  });

  it('continues deterministically after reload', () => {
    const s = makeGame();
    const reloaded = deserialize(serialize(s, 'now'));
    if (reloaded.status !== 'ok') throw new Error('load failed');
    const a = performAction(s, 'chill').state;
    const b = performAction(reloaded.state, 'chill').state;
    expect(b).toEqual(a);
  });

  it('reports an empty slot', () => {
    expect(loadGame(inMemoryStorage()).status).toBe('empty');
  });

  it('moves a corrupt save aside instead of crashing', () => {
    const store = inMemoryStorage();
    store.setItem(SAVE_KEY, '{not json');
    const r = loadGame(store);
    expect(r.status).toBe('corrupt');
    expect(store.getItem(SAVE_KEY)).toBeNull();
    expect(store.getItem(CORRUPT_KEY)).toBe('{not json');
  });

  it('rejects structurally invalid saves', () => {
    expect(deserialize(JSON.stringify({ version: 1, savedAt: 'x', state: { hello: 'world', version: 1 } })).status).toBe('corrupt');
  });

  it('migrates version-0 saves and fills missing fields', () => {
    const s = makeGame() as unknown as Record<string, unknown>;
    const old = JSON.parse(JSON.stringify(s));
    old.version = 0;
    delete old.events.scheduled;
    delete old.memories;
    const migrated = migrate(old);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.events.scheduled).toEqual([]);
    expect(migrated.memories).toEqual([]);
  });

  it('migrates version-1 saves by adding a pixel character appearance', () => {
    const old = JSON.parse(JSON.stringify(makeGame()));
    old.version = 1;
    delete old.character.appearance;
    const migrated = migrate(old);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(isValidAppearance(migrated.character.appearance)).toBe(true);
    expect(migrate(JSON.parse(JSON.stringify(old))).character.appearance).toEqual(migrated.character.appearance);
  });

  it('migrates a v6 save to v7 with gender not set', () => {
    const old = JSON.parse(JSON.stringify(makeGame()));
    old.version = 6;
    delete old.character.gender;
    const look = old.character.appearance;
    const migrated = migrate(old);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.character.gender).toBeNull();
    expect(migrated.character.appearance).toEqual(look);
  });

  it('migrates a v7 save to v8 with an empty unit trust and no mastery yet', () => {
    const old = JSON.parse(JSON.stringify(makeGame()));
    old.version = 7;
    delete old.finance.unitTrust;
    delete old.mastery;
    const cash = old.finance.cash;
    const migrated = migrate(old);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.finance.unitTrust).toBe(0);
    expect(migrated.finance.cash).toBe(cash);
    expect(Object.keys(migrated.mastery).sort()).toEqual(Object.keys(migrated.skills).sort());
    expect(Object.values(migrated.mastery).every((v) => v === 0)).toBe(true);
  });

  it('refuses saves from a newer version', () => {
    const s = JSON.parse(JSON.stringify(makeGame()));
    s.version = SAVE_VERSION + 1;
    expect(() => migrate(s)).toThrow(/newer/);
  });

  it('clears save data on reset', () => {
    const store = inMemoryStorage();
    saveGame(store, makeGame(), 'now');
    clearSave(store);
    expect(store.getItem(SAVE_KEY)).toBeNull();
  });

  it('does not store personal data beyond the chosen nickname', () => {
    const text = serialize(makeGame({ name: 'Tester' }), 'now');
    expect(text).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i); // no emails
  });
});
