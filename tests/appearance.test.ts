import { describe, expect, it } from 'vitest';
import { appearanceFromName, isValidAppearance, moodOf, randomAppearance } from '../src/engine/appearance';
import { makeGame } from './helpers';

describe('pixel character appearance', () => {
  it('randomAppearance is deterministic and valid', () => {
    expect(randomAppearance(42)).toEqual(randomAppearance(42));
    for (let seed = 1; seed < 60; seed++) expect(isValidAppearance(randomAppearance(seed))).toBe(true);
  });

  it('different seeds give variety', () => {
    const looks = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(randomAppearance(i + 1))));
    expect(looks.size).toBeGreaterThan(20);
  });

  it('appearanceFromName is stable per name and varies across names', () => {
    expect(appearanceFromName('Aiman')).toEqual(appearanceFromName('Aiman'));
    expect(JSON.stringify(appearanceFromName('Aiman'))).not.toBe(JSON.stringify(appearanceFromName('Mei Xin')));
  });

  it('newGame stores the chosen appearance', () => {
    const look = { ...randomAppearance(5), headwear: 'songkok' as const, glasses: true };
    const s = makeGame({ appearance: look });
    expect(s.character.appearance).toEqual(look);
  });

  it('newGame falls back to a valid random appearance', () => {
    const s = makeGame();
    expect(isValidAppearance(s.character.appearance)).toBe(true);
  });

  it('rejects invalid appearances and repairs them in newGame', () => {
    const bad = { ...randomAppearance(1), hair: 'mohawk-of-doom' } as never;
    expect(isValidAppearance(bad)).toBe(false);
    expect(isValidAppearance(makeGame({ appearance: bad }).character.appearance)).toBe(true);
  });

  it('mood follows stats', () => {
    const s = makeGame();
    s.stats = { ...s.stats, energy: 70, stress: 20, happiness: 80, health: 80 };
    expect(moodOf(s)).toBe('happy');
    s.stats.energy = 10;
    expect(moodOf(s)).toBe('tired');
    s.stats.energy = 70;
    s.stats.stress = 85;
    expect(moodOf(s)).toBe('stressed');
    s.stats.stress = 20;
    s.stats.health = 20;
    expect(moodOf(s)).toBe('unwell');
    s.stats.health = 80;
    s.stats.happiness = 50;
    expect(moodOf(s)).toBe('neutral');
  });
});
