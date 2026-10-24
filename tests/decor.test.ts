import { describe, expect, it } from 'vitest';
import { DECOR_SLOTS, decorById, decorItems } from '../src/data/decor';
import { processDayEnd } from '../src/engine/daily';
import { migrate } from '../src/engine/save';
import { SAVE_VERSION, performAction } from '../src/engine/simulationEngine';
import { makeGame } from './helpers';

const rich = () => {
  const s = makeGame({ seed: 5 });
  s.finance.cash = 5000;
  return s;
};

describe('decor shop', () => {
  it('migrates a version-3 save to empty decor', () => {
    const old = JSON.parse(JSON.stringify(makeGame()));
    old.version = 3;
    delete old.decor;
    const m = migrate(old);
    expect(m.version).toBe(SAVE_VERSION);
    expect(m.decor).toEqual({ owned: [], placed: {} });
  });

  it('has unique ids and at least three items per slot', () => {
    expect(new Set(decorItems.map((d) => d.id)).size).toBe(decorItems.length);
    for (const slot of DECOR_SLOTS) expect(decorItems.filter((d) => d.slot === slot).length, slot).toBeGreaterThanOrEqual(3);
  });

  it('buys, owns and places an item without touching the input', () => {
    const s = rich();
    const item = decorItems.find((d) => d.slot === 'right')!;
    const before = JSON.stringify(s);
    const r = performAction(s, 'buy-decor', item.id);
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    expect(r.state.decor.owned).toContain(item.id);
    expect(r.state.decor.placed.right).toBe(item.id);
    expect(r.state.finance.cash).toBeCloseTo(5000 - item.price, 2);
  });

  it('refuses an owned item and an unaffordable one with a reason', () => {
    const s = rich();
    const item = decorItems[0];
    const once = performAction(s, 'buy-decor', item.id).state;
    const again = performAction(once, 'buy-decor', item.id);
    expect(again.feedback.ok).toBe(false);
    expect(again.feedback.error).toMatch(/already/i);
    const poor = makeGame({ seed: 5 });
    poor.finance.cash = 0;
    const r = performAction(poor, 'buy-decor', item.id);
    expect(r.feedback.ok).toBe(false);
    expect(r.feedback.error).toBeTruthy();
  });

  it('swaps a slot to another owned item', () => {
    const [a, b] = decorItems.filter((d) => d.slot === 'wall');
    let s = performAction(rich(), 'buy-decor', a.id).state;
    s = performAction(s, 'buy-decor', b.id).state;
    expect(s.decor.placed.wall).toBe(b.id);
    const r = performAction(s, 'place-decor', a.id);
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    expect(r.state.decor.placed.wall).toBe(a.id);
    expect(decorById(a.id)?.slot).toBe('wall');
  });

  it('placed decor makes home a little happier, capped', () => {
    const cosy = rich();
    for (const slot of DECOR_SLOTS) cosy.decor.placed[slot] = decorItems.find((d) => d.slot === slot)!.id;
    cosy.stats.happiness = 50;
    const bare = structuredClone(cosy);
    bare.decor.placed = {};
    processDayEnd(cosy);
    processDayEnd(bare);
    const gain = cosy.stats.happiness - bare.stats.happiness;
    expect(gain).toBeGreaterThan(0);
    expect(gain).toBeLessThanOrEqual(1.6 + 1e-9);
  });
});