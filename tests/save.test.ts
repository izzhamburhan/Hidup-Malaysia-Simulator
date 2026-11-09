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

  it('migrates a v10 save by adding a starter circle', () => {
    const fresh = makeGame();
    const old = JSON.parse(JSON.stringify(fresh));
    old.version = 10;
    delete old.relationships.circle;
    const rng = old.rng;
    const migrated = migrate(old);
    expect(SAVE_VERSION).toBe(11);
    expect(migrated.version).toBe(11);
    expect(migrated.relationships.circle).toHaveLength(2);
    expect(migrated.relationships.circle).toEqual(fresh.relationships.circle);
    expect(migrated.rng).toBe(rng);
    expect(migrated.relationships.friends).toBe(fresh.relationships.friends);
  });

  it('loads a v10 save envelope (main slot, shelf, daily or cloud text) with a starter circle, then reloads as a no-op', () => {
    const fresh = makeGame();
    const old = JSON.parse(JSON.stringify(fresh));
    old.version = 10;
    delete old.relationships.circle;
    const first = deserialize(JSON.stringify({ version: 10, savedAt: 'then', state: old }));
    expect(first.status).toBe('ok');
    if (first.status !== 'ok') return;
    expect(first.migrated).toBe(true);
    expect(first.state.version).toBe(SAVE_VERSION);
    expect(first.state.relationships.circle).toEqual(fresh.relationships.circle);
    const second = deserialize(serialize(first.state, 'now'));
    expect(second).toMatchObject({ status: 'ok', migrated: false });
    if (second.status === 'ok') expect(second.state.relationships.circle).toEqual(first.state.relationships.circle);
  });

  it('migrates a v10 save to the same friends every time, skipping names already in your life', () => {
    const old = JSON.parse(JSON.stringify(makeGame()));
    old.version = 10;
    delete old.relationships.circle;
    const names = (state: ReturnType<typeof migrate>) => state.relationships.circle.map((f) => f.name);
    const first = names(migrate(JSON.parse(JSON.stringify(old))));
    expect(names(migrate(JSON.parse(JSON.stringify(old))))).toEqual(first);
    old.relationships.exes = [first[0]];
    old.relationships.prospects = [{ id: 'p1', name: first[1], trait: 'funny', interest: 'hiking', compatibility: 50, metDay: 0 }];
    const again = names(migrate(old));
    expect(again).toHaveLength(2);
    for (const n of again) expect(first).not.toContain(n);
  });

  it('keeps the circle a v11 save already has', () => {
    const s = JSON.parse(JSON.stringify(makeGame()));
    const circle = s.relationships.circle;
    expect(deserialize(JSON.stringify({ version: SAVE_VERSION, savedAt: 'x', state: s }))).toMatchObject({ status: 'ok', migrated: false });
    expect(migrate(s).relationships.circle).toEqual(circle);
  });

  it('keeps the random stream of a seeded new game (the starter circle does not use state.rng)', () => {
    // Recorded after the more-courses and student part-time content merged (a new job moves the first job
    // board a new game draws). The friends circle itself draws nothing from state.rng.
    const a = makeGame();
    const b = makeGame({ seed: 99, lifeStage: 'working', jobId: 'swe' });
    expect([a.rng, a.logSeq, b.rng, b.logSeq]).toEqual([-951540421, 12, 1511859927, 12]);
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