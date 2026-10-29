import { describe, expect, it } from 'vitest';
import { DEFAULT_RESIDENCE, MALAYSIA, MAP_COLS, MAP_ROWS, mapStateByName } from '../src/data/malaysia';
import { STATE_FLAGS } from '../src/data/stateFlags';
import { migrate } from '../src/engine/save';
import { SAVE_VERSION } from '../src/engine/simulationEngine';
import { makeGame } from './helpers';

describe('Malaysia map catalogue', () => {
  it('covers exactly the 16 states and territories that have flags', () => {
    expect(MALAYSIA.map((s) => s.name).sort()).toEqual(STATE_FLAGS.map((f) => f.state).sort());
  });

  it('gives every state at least one tile, all on the board, none shared', () => {
    const seen = new Set<string>();
    for (const s of MALAYSIA) {
      expect(s.tiles.length, s.name).toBeGreaterThan(0);
      for (const [c, r] of s.tiles) {
        expect(c >= 0 && c < MAP_COLS && r >= 0 && r < MAP_ROWS, `${s.name} ${c},${r}`).toBe(true);
        const key = `${c},${r}`;
        expect(seen.has(key), `${s.name} reuses ${key}`).toBe(false);
        seen.add(key);
      }
    }
  });

  it('keeps fictional factors near the Selangor baseline', () => {
    expect(mapStateByName(DEFAULT_RESIDENCE)?.costFactor).toBe(1);
    expect(mapStateByName(DEFAULT_RESIDENCE)?.payFactor).toBe(1);
    for (const s of MALAYSIA) {
      expect(s.costFactor, s.name).toBeGreaterThanOrEqual(0.7);
      expect(s.costFactor, s.name).toBeLessThanOrEqual(1.3);
      expect(s.payFactor, s.name).toBeGreaterThanOrEqual(0.7);
      expect(s.payFactor, s.name).toBeLessThanOrEqual(1.3);
      expect(new Set(MALAYSIA.map((x) => x.short)).size).toBe(MALAYSIA.length);
    }
  });
});

describe('save v9: residence and travel stamps', () => {
  it('a new life has a residence and no stamps', () => {
    const s = makeGame();
    expect(mapStateByName(s.location.state)).toBeDefined();
    expect(s.travel.stamps).toEqual({});
  });

  it('migrates a v8 save: residence is the Klang Valley unless living with family, no stamps', () => {
    for (const backgroundId of ['fresh-home', 'renter']) {
      const old = JSON.parse(JSON.stringify(makeGame({ backgroundId, homeState: 'Kelantan' })));
      old.version = 8;
      delete old.location;
      delete old.travel;
      const migrated = migrate(old);
      expect(SAVE_VERSION).toBe(9);
      expect(migrated.version).toBe(9);
      expect(migrated.travel.stamps).toEqual({});
      const withFamily = migrated.housing.optionId === 'family';
      expect(migrated.location.state, backgroundId).toBe(withFamily ? 'Kelantan' : DEFAULT_RESIDENCE);
    }
  });
});
