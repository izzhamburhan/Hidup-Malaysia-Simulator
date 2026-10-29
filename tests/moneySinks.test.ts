import { describe, expect, it } from 'vitest';
import { performAction, listActions } from '../src/engine/simulationEngine';
import { processNewYear } from '../src/engine/economy';
import { advanceTime } from '../src/engine/time';
import { allEvents, eventById, isEligible } from '../src/engine/events';
import { SEDEKAH_DAILY_CAP, UNIT_TRUST, lifestyleUpgrades } from '../src/data/lifestyle';
import { makeGame } from './helpers';
import type { GameState } from '../src/engine/types';

const rich = (cash = 20000): GameState => {
  const s = makeGame();
  s.finance.cash = cash;
  return s;
};

describe('unit trust', () => {
  it('deposit moves cash into the unit trust, never into spendable cash', () => {
    const s = rich(3000);
    const r = performAction(s, 'unit-trust-deposit', '1000');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.finance.cash).toBe(2000);
    expect(r.state.finance.unitTrust).toBe(1000);
  });

  it('refuses a deposit the player cannot afford, with a reason', () => {
    const s = rich(300);
    const r = performAction(s, 'unit-trust-deposit', '500');
    expect(r.feedback.ok).toBe(false);
    expect(r.feedback.error).toMatch(/cash/i);
    expect(r.state.finance.unitTrust).toBe(0);
  });

  it('withdraw moves money back to cash and refuses beyond the balance', () => {
    const s = rich(100);
    s.finance.unitTrust = 1200;
    const ok = performAction(s, 'unit-trust-withdraw', '500');
    expect(ok.feedback.ok).toBe(true);
    expect(ok.state.finance.unitTrust).toBe(700);
    expect(ok.state.finance.cash).toBe(600);
    const bad = performAction(ok.state, 'unit-trust-withdraw', '2000');
    expect(bad.feedback.ok).toBe(false);
    expect(bad.feedback.error).toMatch(/unit trust/i);
  });

  it('withdraw all empties the balance exactly', () => {
    const s = rich(0);
    s.finance.unitTrust = 1234.56;
    const r = performAction(s, 'unit-trust-withdraw', 'all');
    expect(r.state.finance.unitTrust).toBe(0);
    expect(r.state.finance.cash).toBe(1234.56);
  });

  it('big deposits ask for confirmation and say the money is locked and not guaranteed', () => {
    const s = rich();
    const view = listActions(s).find((a) => a.id === 'unit-trust-deposit' && a.param === '5000')!;
    expect(view.confirm).toMatch(/RM5,000/);
    expect(view.confirm).toMatch(/fictional/i);
    expect(view.confirm).toMatch(/not guaranteed/i);
  });

  it('is labelled a fictional game estimate with no real fund names', () => {
    expect(UNIT_TRUST.name).toMatch(/fictional/i);
    const view = listActions(rich()).find((a) => a.id === 'unit-trust-deposit')!;
    expect(view.description).toMatch(/fictional/i);
    expect(`${view.title} ${view.description}`).not.toMatch(/official|guarantee[ds]? return/i);
  });

  it('dividend is credited once at the tax-year turn, deterministic and in the fictional range', () => {
    const a = rich();
    const b = rich();
    a.finance.unitTrust = 10000;
    b.finance.unitTrust = 10000;
    processNewYear(a);
    processNewYear(b);
    expect(a.finance.unitTrust).toBe(b.finance.unitTrust);
    expect(a.finance.unitTrust).toBeGreaterThanOrEqual(10000 * (1 + UNIT_TRUST.dividendMin) - 0.01);
    expect(a.finance.unitTrust).toBeLessThanOrEqual(10000 * (1 + UNIT_TRUST.dividendMax) + 0.01);
    expect(a.rng).toEqual(b.rng);
  });

  it('dividend varies by year (not a fixed rate) and never goes negative', () => {
    const s = rich();
    s.finance.unitTrust = 10000;
    const rates: number[] = [];
    for (let i = 0; i < 12; i++) {
      const before = s.finance.unitTrust;
      processNewYear(s);
      expect(s.finance.unitTrust).toBeGreaterThanOrEqual(before);
      rates.push(Math.round((s.finance.unitTrust / before - 1) * 1000));
    }
    expect(new Set(rates).size).toBeGreaterThan(1);
  });

  it('a player with no unit trust is untouched (rng not consumed)', () => {
    const s = rich();
    const rngBefore = structuredClone(s.rng);
    processNewYear(s);
    expect(s.finance.unitTrust).toBe(0);
    expect(s.rng).toEqual(rngBefore);
  });

  it('is paid once when the real calendar crosses 1 January', () => {
    const s = rich();
    s.finance.unitTrust = 10000;
    // Game starts 4 Jan 2027; 400 days is well past 1 Jan 2028 and short of 1 Jan 2029.
    advanceTime(s, 400 * 1440);
    expect(s.finance.unitTrust).toBeGreaterThan(10000 * (1 + UNIT_TRUST.dividendMin) - 0.01);
    expect(s.finance.unitTrust).toBeLessThan(10000 * (1 + UNIT_TRUST.dividendMax) + 0.01);
  });
});

describe('sedekah', () => {
  it('gives mood and reputation and costs cash', () => {
    const s = rich(500);
    s.stats.happiness = 50;
    s.stats.reputation = 40;
    const r = performAction(s, 'sedekah', '20');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.finance.cash).toBe(480);
    expect(r.state.stats.happiness).toBeGreaterThan(50);
    expect(r.state.stats.reputation).toBeGreaterThan(40);
  });

  it('refuses when the player cannot afford it', () => {
    const s = rich(10);
    const r = performAction(s, 'sedekah', '20');
    expect(r.feedback.ok).toBe(false);
    expect(r.state.finance.cash).toBe(10);
  });

  it('has a daily cap that resets the next day', () => {
    let s = rich(2000);
    let given = 0;
    for (const amt of ['50', '50']) {
      const r = performAction(s, 'sedekah', amt);
      expect(r.feedback.ok).toBe(true);
      s = r.state;
      given += Number(amt);
    }
    expect(given).toBe(SEDEKAH_DAILY_CAP);
    const blocked = performAction(s, 'sedekah', '5');
    expect(blocked.feedback.ok).toBe(false);
    expect(blocked.feedback.error).toMatch(/today/i);
    // A new day: the cap resets.
    advanceTime(s, 1440);
    const next = performAction(s, 'sedekah', '20');
    expect(next.feedback.ok).toBe(true);
  });

  it('a partly used cap only blocks amounts that would exceed it', () => {
    let s = rich(2000);
    s = performAction(s, 'sedekah', '50').state;
    const r = performAction(s, 'sedekah', '50');
    expect(r.feedback.ok).toBe(true);
    const over = performAction(r.state, 'sedekah', '20');
    expect(over.feedback.ok).toBe(false);
  });
});

describe('lifestyle upgrades', () => {
  it('lists a handful of upgrades that each cost real money, labelled as estimates', () => {
    expect(lifestyleUpgrades.length).toBeGreaterThanOrEqual(3);
    expect(new Set(lifestyleUpgrades.map((u) => u.id)).size).toBe(lifestyleUpgrades.length);
    for (const u of lifestyleUpgrades) expect(u.price).toBeGreaterThanOrEqual(1000);
  });

  it('every upgrade asks for confirmation that states the cost', () => {
    const s = rich();
    for (const u of lifestyleUpgrades) {
      const v = listActions(s).find((a) => a.id === 'lifestyle-upgrade' && a.param === u.id)!;
      expect(v, u.id).toBeDefined();
      expect(v.cost).toBe(u.price);
      expect(v.confirm, u.id).toContain(u.price.toLocaleString('en-US'));
    }
  });

  it('buying pays cash, lifts mood and blocks a repeat until the cooldown passes', () => {
    const u = lifestyleUpgrades[0];
    const s = rich(10000);
    s.stats.happiness = 40;
    s.stats.stress = 60;
    const r = performAction(s, 'lifestyle-upgrade', u.id);
    expect(r.feedback.ok).toBe(true);
    expect(r.state.finance.cash).toBeLessThanOrEqual(10000 - u.price);
    expect(r.state.finance.cash).toBeGreaterThanOrEqual(0);
    expect(r.state.stats.happiness).toBeGreaterThan(40);
    const again = performAction(r.state, 'lifestyle-upgrade', u.id);
    expect(again.feedback.ok).toBe(false);
    expect(again.feedback.error).toMatch(/days/i);
  });

  it('refuses when the player cannot afford it and never takes cash below zero', () => {
    const u = lifestyleUpgrades[0];
    const s = rich(u.price - 1);
    const r = performAction(s, 'lifestyle-upgrade', u.id);
    expect(r.feedback.ok).toBe(false);
    expect(r.feedback.error).toMatch(/cash/i);
    expect(r.state.finance.cash).toBe(u.price - 1);
  });
});

describe('family duty events', () => {
  const DUTY_IDS = ['family-clinic-bill', 'sibling-tuition', 'sibling-wedding-fund', 'parents-fridge'];

  it('exist, are family events, and each has a free choice with no cost or requirement', () => {
    const s = rich();
    for (const id of DUTY_IDS) {
      const e = eventById(id)!;
      expect(e, id).toBeDefined();
      expect(e.category).toBe('family');
      expect(e.trigger).toBe('random');
      const choices = typeof e.choices === 'function' ? e.choices(s, {}) : e.choices;
      expect(choices.some((c) => !c.cost && !c.requires), id).toBe(true);
    }
    expect(allEvents().filter((e) => DUTY_IDS.includes(e.id)).length).toBe(DUTY_IDS.length);
  });

  it('do not fire for a broke player with no job', () => {
    const s = makeGame({ lifeStage: 'fresh_grad' });
    s.finance.cash = 40;
    s.career.job = null;
    for (const id of DUTY_IDS) expect(isEligible(s, eventById(id)!, ['family', 'any']), id).toBe(false);
  });

  it('can fire for an employed player with money to spare', () => {
    const s = makeGame({ lifeStage: 'working' });
    s.finance.cash = 8000;
    expect(s.career.job).not.toBeNull();
    s.clock.day = 400;
    for (const id of DUTY_IDS) expect(isEligible(s, eventById(id)!, ['family', 'any']), id).toBe(true);
  });

  it('copy is kind and the content stays halal-friendly and unofficial', () => {
    for (const id of DUTY_IDS) {
      const e = eventById(id)!;
      const text = JSON.stringify([e.title, typeof e.text === 'function' ? e.text(makeGame(), {}) : e.text]);
      expect(text).not.toMatch(/official|pork|babi|beer|alcohol|gambl/i);
    }
  });
});
