import { describe, expect, it } from 'vitest';
import { PASAR_RAMADAN, FESTIVE_SEASONS, festiveSeasonById } from '../src/data/festive';
import { bukaPuasaReason, festiveSeason, pasarRamadanReason } from '../src/engine/festive';
import { listActions, performAction, viewAction } from '../src/engine/simulationEngine';
import type { GameState } from '../src/engine/types';
import { makeGame } from './helpers';

// The game starts on 2027-01-04 (day 0). Hari Raya Aidilfitri is pinned to 21 March on the simulated calendar.
function onDate(month: number, day: number, hour = 17, cash = 300, seed = 8): GameState {
  const s = makeGame({ seed });
  s.clock.day = Math.round((Date.UTC(2027, month - 1, day) - Date.UTC(2027, 0, 4)) / 86_400_000);
  s.clock.minute = Math.round(hour * 60);
  s.finance.cash = cash;
  s.stats.energy = 80;
  return s;
}

describe('Ramadan season (festive only)', () => {
  it('is on in the weeks before Raya and ends when the Raya season starts', () => {
    expect(festiveSeason(onDate(2, 20))).toBeNull();
    expect(festiveSeason(onDate(2, 21))?.id).toBe('ramadan');
    expect(festiveSeason(onDate(3, 1))?.id).toBe('ramadan');
    expect(festiveSeason(onDate(3, 17))?.id).toBe('ramadan');
    expect(festiveSeason(onDate(3, 18))?.id).toBe('raya');
    expect(festiveSeason(onDate(3, 21))?.id).toBe('raya');
    expect(festiveSeason(onDate(3, 25))?.id).toBe('raya');
    expect(festiveSeason(onDate(2, 6))?.id).toBe('cny');
  });

  it('has a calm crescent and stars garland and warm, inclusive copy', () => {
    const r = festiveSeasonById('ramadan')!;
    expect(r.name).toBe('Ramadan');
    expect(r.garland).toContain('🌙');
    expect(r.garland).toContain('⭐');
    expect(r.packet).toBeUndefined();
    expect(r.greeting).toMatch(/everyone is welcome/i);
    expect(FESTIVE_SEASONS.filter((f) => f.id === 'ramadan')).toHaveLength(1);
  });

  it('festive wishes work in Ramadan like any season, with no packet', () => {
    const s = onDate(3, 1, 12);
    const r = performAction(s, 'festive-greet');
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    expect(r.state.finance.cash).toBe(300);
  });
});

describe('pasar-ramadan', () => {
  it('buys a bag of bazaar food in the late afternoon of the season', () => {
    const s = onDate(3, 5, 17);
    const before = JSON.stringify(s);
    const r = performAction(s, 'pasar-ramadan');
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    expect(r.state.finance.cash).toBeCloseTo(300 - PASAR_RAMADAN.price, 2);
    expect(r.state.stats.happiness).toBeGreaterThanOrEqual(s.stats.happiness);
    expect(r.state.food.today.length).toBe(s.food.today.length + 1);
  });

  it('is refused with a plain reason outside the season, the hours, or without cash', () => {
    expect(performAction(onDate(7, 10, 17), 'pasar-ramadan').feedback.ok).toBe(false);
    expect(pasarRamadanReason(onDate(7, 10, 17))).toMatch(/Ramadan/);

    const early = performAction(onDate(3, 5, 10), 'pasar-ramadan');
    expect(early.feedback.ok).toBe(false);
    expect(early.feedback.error).toMatch(/4.*7 PM/);

    const broke = onDate(3, 5, 17, 5);
    const r = performAction(broke, 'pasar-ramadan');
    expect(r.feedback.ok).toBe(false);
    expect(r.feedback.error).toMatch(/RM/);
    expect(r.state.finance.cash).toBe(5);
  });

  it('once a day', () => {
    const first = performAction(onDate(3, 5, 16), 'pasar-ramadan');
    expect(first.feedback.ok).toBe(true);
    const again = performAction(first.state, 'pasar-ramadan');
    expect(again.feedback.ok).toBe(false);
    expect(again.feedback.error).toMatch(/today/i);
  });

  it('never makes cash negative and is deterministic', () => {
    const exact = onDate(3, 5, 17, PASAR_RAMADAN.price);
    const r = performAction(exact, 'pasar-ramadan');
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    expect(r.state.finance.cash).toBeGreaterThanOrEqual(0);
    const a = performAction(onDate(3, 5, 17), 'pasar-ramadan');
    const b = performAction(onDate(3, 5, 17), 'pasar-ramadan');
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(a.feedback.lines.join(' ')).toBe(b.feedback.lines.join(' '));
  });

  it('turns up a fun find on some days across seeds', () => {
    let finds = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const r = performAction(onDate(3, 5, 17, 300, seed), 'pasar-ramadan');
      if (r.feedback.lines.some((l) => PASAR_RAMADAN.finds.some((f) => l.includes(f)))) finds++;
    }
    expect(finds).toBeGreaterThan(0);
    expect(finds).toBeLessThan(40);
  });

  it('is hidden from the Act list outside the season and listed inside it', () => {
    expect(listActions(onDate(7, 10, 17)).some((a) => a.id === 'pasar-ramadan')).toBe(false);
    expect(listActions(onDate(3, 5, 17)).some((a) => a.id === 'pasar-ramadan' && a.available)).toBe(true);
  });
});

describe('buka-puasa', () => {
  it('is a gathering for everyone around sunset that lifts relationships and mood', () => {
    const s = onDate(3, 5, 19);
    s.relationships.friends = 40;
    s.relationships.family = 40;
    const before = JSON.stringify(s);
    const r = performAction(s, 'buka-puasa');
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    expect(r.state.relationships.friends).toBeGreaterThan(40);
    expect(r.state.relationships.family).toBeGreaterThan(40);
    expect(r.state.stats.happiness).toBeGreaterThanOrEqual(s.stats.happiness);
    expect(r.state.finance.cash).toBe(300);
  });

  it('is refused with a plain reason outside the season or the sunset hours', () => {
    expect(performAction(onDate(7, 10, 19), 'buka-puasa').feedback.ok).toBe(false);
    expect(bukaPuasaReason(onDate(7, 10, 19))).toMatch(/Ramadan/);
    const noon = performAction(onDate(3, 5, 12), 'buka-puasa');
    expect(noon.feedback.ok).toBe(false);
    expect(noon.feedback.error).toMatch(/6:30.*8:30 PM/);
    expect(performAction(onDate(3, 5, 6.25), 'buka-puasa').feedback.ok).toBe(false);
  });

  it('opens at 6:30 PM and only once a day', () => {
    expect(performAction(onDate(3, 5, 18.5), 'buka-puasa').feedback.ok).toBe(true);
    const first = performAction(onDate(3, 5, 19), 'buka-puasa');
    const again = performAction(first.state, 'buka-puasa');
    expect(again.feedback.ok).toBe(false);
    expect(again.feedback.error).toMatch(/today/i);
  });

  it('works with no cash and no partner, and is deterministic', () => {
    const a = performAction(onDate(3, 5, 19, 0), 'buka-puasa');
    expect(a.feedback.ok, a.feedback.error).toBe(true);
    expect(a.state.finance.cash).toBe(0);
    const b = performAction(onDate(3, 5, 19, 0), 'buka-puasa');
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it('never assumes anyone fasts: descriptions are inclusive', () => {
    const v = viewAction(onDate(3, 5, 19), 'buka-puasa')!;
    expect(v.description).toMatch(/everyone is welcome/i);
    expect(v.description).not.toMatch(/must|should|fast(ed|ing)? (all|today)/i);
  });
});