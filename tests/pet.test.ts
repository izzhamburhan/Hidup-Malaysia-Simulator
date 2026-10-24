import { describe, expect, it } from 'vitest';
import { PET } from '../src/data/pets';
import { eventById } from '../src/engine/events';
import { processDayEnd } from '../src/engine/daily';
import { migrate } from '../src/engine/save';
import { SAVE_VERSION, performAction, resolveEvent } from '../src/engine/simulationEngine';
import type { GameState } from '../src/engine/types';
import { makeGame } from './helpers';

const withCat = (seed = 7): GameState => {
  const s = makeGame({ seed });
  s.finance.cash = 1000;
  const r = performAction(s, 'adopt-cat');
  expect(r.feedback.ok, r.feedback.error).toBe(true);
  return r.state;
};

describe('Oyen the cat', () => {
  it('migrates a version-2 save to a life without a pet', () => {
    const old = JSON.parse(JSON.stringify(makeGame()));
    old.version = 2;
    delete old.pet;
    const migrated = migrate(old);
    expect(SAVE_VERSION).toBe(3);
    expect(migrated.version).toBe(3);
    expect(migrated.pet).toBeNull();
  });

  it('adopts Oyen for the vet-check fee without touching the input state', () => {
    const s = makeGame({ seed: 7 });
    s.finance.cash = 1000;
    const before = JSON.stringify(s);
    const r = performAction(s, 'adopt-cat');
    expect(r.feedback.ok).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    expect(r.state.pet?.name).toBe('Oyen');
    expect(r.state.finance.cash).toBeCloseTo(1000 - PET.adoptionFee, 2);
  });

  it('feeds him for the food price, and refuses when he is full', () => {
    const s = withCat();
    s.pet!.fullness = 30;
    const cash = s.finance.cash;
    const fed = performAction(s, 'feed-pet');
    expect(fed.feedback.ok).toBe(true);
    expect(fed.state.pet!.fullness).toBeGreaterThan(30);
    expect(fed.state.finance.cash).toBeCloseTo(cash - PET.mealCost, 2);
    fed.state.pet!.fullness = 100;
    const full = performAction(fed.state, 'feed-pet');
    expect(full.feedback.ok).toBe(false);
    expect(full.feedback.error).toMatch(/full/i);
  });

  it('gets hungrier each day, and a happy cat calms the player down', () => {
    const cat = withCat();
    cat.pet!.fullness = 100;
    cat.pet!.mood = 95;
    const none = structuredClone(cat);
    none.pet = null;
    processDayEnd(cat);
    processDayEnd(none);
    expect(cat.pet!.fullness).toBeLessThan(100);
    expect(cat.stats.stress).toBeLessThan(none.stats.stress);
  });

  it('a starving cat makes the player sad, and stays within bounds', () => {
    const cat = withCat();
    cat.pet!.fullness = 0;
    cat.pet!.mood = 0;
    const none = structuredClone(cat);
    none.pet = null;
    processDayEnd(cat);
    processDayEnd(none);
    expect(cat.stats.happiness).toBeLessThan(none.stats.happiness);
    expect(cat.pet!.fullness).toBe(0);
    expect(cat.pet!.mood).toBe(0);
  });

  it('the stray event has a free choice and can bring Oyen home', () => {
    const def = eventById('stray-oyen')!;
    expect(def).toBeDefined();
    const s = makeGame({ seed: 7 });
    s.finance.cash = 1000;
    s.events.pending = [{ eventId: 'stray-oyen', params: {} } as GameState['events']['pending'][number]];
    const choices = typeof def.choices === 'function' ? def.choices(s, {}) : def.choices;
    expect(choices.some((c) => !c.cost && !c.requires)).toBe(true);
    const r = resolveEvent(s, 'adopt');
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    expect(r.state.pet?.name).toBe('Oyen');
  });

  it('is deterministic', () => {
    const a = performAction(withCat(11), 'play-pet').state;
    const b = performAction(withCat(11), 'play-pet').state;
    expect(a.pet).toEqual(b.pet);
    expect(a.stats).toEqual(b.stats);
  });
});