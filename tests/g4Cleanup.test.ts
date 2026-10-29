import { describe, expect, it } from 'vitest';
import { performAction, viewAction } from '../src/engine/simulationEngine';
import { advanceTime } from '../src/engine/time';
import { friendPosts, invitePosts, worldPosts } from '../src/data/feed';
import { makeGame } from './helpers';

describe('insurance cancel confirmation (UI v3, criterion 15)', () => {
  it('cancelling an active policy states the consequence', () => {
    const s = makeGame();
    s.finance.insurance = true;
    const v = viewAction(s, 'toggle-insurance')!;
    expect(v.title).toMatch(/Cancel/);
    expect(v.confirm).toMatch(/hospital/i);
    expect(v.confirm).toMatch(/RM150/);
  });

  it('buying a policy needs no confirmation', () => {
    const s = makeGame();
    s.finance.insurance = false;
    expect(viewAction(s, 'toggle-insurance')!.confirm).toBeNull();
  });

  it('the action itself still toggles', () => {
    const s = makeGame();
    s.finance.insurance = true;
    expect(performAction(s, 'toggle-insurance').state.finance.insurance).toBe(false);
  });
});

describe('feed does not repeat itself in a short window (criterion 19)', () => {
  const ALL_TEXT = new Set<string>([...friendPosts, ...worldPosts.map((w) => w.text), ...invitePosts.map((i) => i.text)]);
  const WINDOW = 8; // consecutive generated (non-player) posts

  function feedTexts(seed: number, days: number): string[] {
    const s = makeGame({ seed });
    for (let d = 0; d < days; d++) {
      advanceTime(s, 24 * 60);
      s.events.pending = [];
    }
    // oldest first
    return s.feed.filter((p) => ALL_TEXT.has(p.text)).map((p) => p.text).reverse();
  }

  it('never shows the same post text twice within 8 posts, over 60 days, several seeds', () => {
    for (const seed of [1, 7, 42, 1234, 99999]) {
      const texts = feedTexts(seed, 60);
      expect(texts.length).toBeGreaterThan(40);
      texts.forEach((t, i) => {
        const recent = texts.slice(Math.max(0, i - WINDOW), i);
        expect(recent, `seed ${seed} repeated: ${t}`).not.toContain(t);
      });
    }
  });

  it('is deterministic for a fixed seed', () => {
    expect(feedTexts(5, 20)).toEqual(feedTexts(5, 20));
  });
});
