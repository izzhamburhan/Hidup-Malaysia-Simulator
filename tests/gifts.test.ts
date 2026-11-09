import { describe, expect, it } from 'vitest';
import { achievements } from '../src/data/achievements';
import { GIFTS, GIFTS_PER_DAY, giftById } from '../src/data/gifts';
import { STICKERS, stickerById } from '../src/data/stickers';
import { applyStats } from '../src/engine/core';
import { performAction, viewAction } from '../src/engine/simulationEngine';
import { at, makeGame } from './helpers';

const noon = (day = 3) => at(makeGame(), day, 12);

describe('gift catalogue', () => {
  it('has unique ids, a name in English and Malay, and a small non-cash effect', () => {
    expect(GIFTS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(GIFTS.map((g) => g.id)).size).toBe(GIFTS.length);
    expect(GIFTS_PER_DAY).toBe(3);
    for (const g of GIFTS) {
      expect(g.icon, g.id).toBeTruthy();
      expect(g.name, g.id).toBeTruthy();
      expect(g.nameMs, g.id).toBeTruthy();
      expect(giftById(g.id)).toBe(g);
      const e = g.effect;
      expect(e.cash, g.id).toBeUndefined();
      expect(e.savings, g.id).toBeUndefined();
      expect(e.addDebt, g.id).toBeUndefined();
      for (const [k, v] of Object.entries(e.stats ?? {})) {
        expect(Math.abs(v), `${g.id}.${k}`).toBeLessThanOrEqual(5);
      }
      expect(e.stats?.happiness ?? 0, g.id).toBeGreaterThan(0);
    }
    expect(giftById('nope')).toBeUndefined();
  });
});

describe('sticker catalogue', () => {
  it('has unique ids with an emoji and EN and BM text', () => {
    expect(STICKERS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(STICKERS.map((s) => s.id)).size).toBe(STICKERS.length);
    for (const s of STICKERS) {
      expect(s.emoji, s.id).toBeTruthy();
      expect(s.en, s.id).toBeTruthy();
      expect(s.ms, s.id).toBeTruthy();
      expect(stickerById(s.id)).toBe(s);
    }
    expect(stickerById('nope')).toBeUndefined();
  });
});

describe('open-gift', () => {
  it('applies a small effect, costs no cash and counts the gift', () => {
    const s = noon();
    s.stats.happiness = 50;
    s.stats.stress = 50;
    const cash = s.finance.cash;
    const r = performAction(s, 'open-gift', 'teh-tarik');
    expect(r.feedback.ok).toBe(true);
    const gift = giftById('teh-tarik')!;
    expect(r.state.stats.happiness).toBe(50 + (gift.effect.stats?.happiness ?? 0));
    expect(r.state.finance.cash).toBe(cash);
    expect(r.state.flags.giftsOpened).toBe(1);
    expect(r.state.clock.minute - s.clock.minute).toBe(5);
    expect(r.feedback.lines.join(' ')).toContain(`You opened ${gift.icon} ${gift.name} from a friend.`);
  });

  it('is deterministic for a fixed seed', () => {
    const a = performAction(noon(), 'open-gift', 'kuih');
    const b = performAction(noon(), 'open-gift', 'kuih');
    expect(a.state).toEqual(b.state);
  });

  it('explains an unknown or missing gift', () => {
    const s = noon();
    expect(viewAction(s, 'open-gift', 'nope')!.reason).toBe('That gift is not here any more.');
    expect(viewAction(s, 'open-gift')!.reason).toBe('That gift is not here any more.');
    const r = performAction(s, 'open-gift', 'nope');
    expect(r.feedback.ok).toBe(false);
    expect(r.state.flags.giftsOpened).toBeUndefined();
  });

  it('refuses a fourth gift on the same game day and leaves the input untouched', () => {
    let state = noon();
    for (let i = 0; i < GIFTS_PER_DAY; i++) state = performAction(state, 'open-gift', GIFTS[i].id).state;
    expect(state.flags.giftsOpened).toBe(3);
    const copy = structuredClone(state);
    const view = viewAction(state, 'open-gift', 'bunga')!;
    expect(view.available).toBe(false);
    expect(view.reason).toBe(`You have opened ${GIFTS_PER_DAY} gifts today. Open the rest tomorrow.`);
    const r = performAction(state, 'open-gift', 'bunga');
    expect(r.feedback.ok).toBe(false);
    expect(state).toEqual(copy);
    expect(r.state.flags.giftsOpened).toBe(3);
  });

  it('allows gifts again on the next game day', () => {
    let state = noon(3);
    for (let i = 0; i < GIFTS_PER_DAY; i++) state = performAction(state, 'open-gift', GIFTS[i].id).state;
    const tomorrow = at(structuredClone(state), 4, 12);
    expect(viewAction(tomorrow, 'open-gift', 'bunga')!.available).toBe(true);
    const r = performAction(tomorrow, 'open-gift', 'bunga');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.flags.giftsOpened).toBe(4);
    expect(r.state.flags['gifts-today']).toBe(1);
    expect(r.state.flags['gift-day']).toBe(4);
  });

  it('keeps every stat within 0 to 100', () => {
    for (const g of GIFTS) {
      const hi = noon();
      for (const k of Object.keys(hi.stats) as (keyof typeof hi.stats)[]) hi.stats[k] = 100;
      const up = performAction(hi, 'open-gift', g.id).state;
      for (const v of Object.values(up.stats)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
      const lo = noon();
      applyStats(lo, { stress: -100 });
      lo.stats.happiness = 0;
      const down = performAction(lo, 'open-gift', g.id).state;
      for (const v of Object.values(down.stats)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('unlocks Hadiah Kawan at five gifts opened', () => {
    expect(achievements.some((a) => a.id === 'hadiah-kawan')).toBe(true);
    let state = noon(3);
    for (let i = 0; i < 4; i++) {
      if (i === 3) state = at(structuredClone(state), 4, 12);
      state = performAction(state, 'open-gift', GIFTS[i].id).state;
    }
    expect(state.flags.giftsOpened).toBe(4);
    expect(state.achievements['hadiah-kawan']).toBeUndefined();
    state = performAction(state, 'open-gift', GIFTS[4].id).state;
    expect(state.flags.giftsOpened).toBe(5);
    expect(state.achievements['hadiah-kawan']).toBeDefined();
  });
});
