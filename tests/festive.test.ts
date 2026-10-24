import { describe, expect, it } from 'vitest';
import { FESTIVE_SEASONS } from '../src/data/festive';
import { festiveOutfitKey, festiveSeason } from '../src/engine/festive';
import { migrate } from '../src/engine/save';
import { SAVE_VERSION, performAction } from '../src/engine/simulationEngine';
import type { GameState } from '../src/engine/types';
import { makeGame } from './helpers';

// The game starts on 2027-01-04 (day 0).
const onDate = (month: number, day: number, seed = 8): GameState => {
  const s = makeGame({ seed });
  const target = Date.UTC(2027, month - 1, day);
  s.clock.day = Math.round((target - Date.UTC(2027, 0, 4)) / 86_400_000);
  s.finance.cash = 500;
  return s;
};

describe('festive seasons', () => {
  it('knows the season around its date only', () => {
    expect(festiveSeason(onDate(2, 6))?.id).toBe('cny');
    expect(festiveSeason(onDate(2, 4))?.id).toBe('cny');
    expect(festiveSeason(onDate(2, 10))?.id).toBe('cny');
    expect(festiveSeason(onDate(2, 20))).toBeNull();
    expect(festiveSeason(onDate(12, 30))?.id).toBe('new-year');
    for (const f of FESTIVE_SEASONS) expect(f.garland.length, f.id).toBeGreaterThan(0);
  });

  it('sends wishes once per season through the engine', () => {
    const s = onDate(10, 29);
    const fam = s.relationships.family;
    const before = JSON.stringify(s);
    const r = performAction(s, 'festive-greet');
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    expect(r.state.relationships.family).toBeGreaterThan(fam);
    const again = performAction(r.state, 'festive-greet');
    expect(again.feedback.ok).toBe(false);
    expect(again.feedback.error).toMatch(/already/i);
    expect(performAction(onDate(7, 10), 'festive-greet').feedback.ok).toBe(false);
  });

  it('duit raya: single receives, married gives, broke and married is refused', () => {
    const single = onDate(3, 21);
    const got = performAction(single, 'festive-greet').state;
    expect(got.finance.cash).toBeCloseTo(530, 2);

    const wed = onDate(3, 21);
    wed.relationships.partner = { id: 'p', name: 'Aisyah', trait: 'kind', interest: 'food', stage: 'married', trust: 80, compatibility: 70, satisfaction: 70, sinceDay: 0, lastContactDay: 0, longDistance: false, memories: [] } as GameState['relationships']['partner'];
    expect(performAction(wed, 'festive-greet').state.finance.cash).toBeCloseTo(450, 2);
    wed.finance.cash = 10;
    expect(performAction(wed, 'festive-greet').feedback.ok).toBe(false);
  });

  it('unlocks the festive outfit by greeting in its season', () => {
    const s = onDate(12, 25);
    expect(performAction(s, 'change-outfit', 'outfit:christmas-sweater').feedback.ok).toBe(false);
    const greeted = performAction(s, 'festive-greet').state;
    expect(greeted.flags[festiveOutfitKey('christmas')]).toBeDefined();
    const worn = performAction(greeted, 'change-outfit', 'outfit:christmas-sweater');
    expect(worn.feedback.ok, worn.feedback.error).toBe(true);
    expect(worn.state.character.appearance.outfit).toBe('christmas-sweater');
  });

  it('migrates a version-5 save unchanged', () => {
    const s = makeGame();
    const old = JSON.parse(JSON.stringify(s));
    old.version = 5;
    const m = migrate(old);
    expect(m.version).toBe(SAVE_VERSION);
    expect(m.character.appearance).toEqual(s.character.appearance);
  });
});