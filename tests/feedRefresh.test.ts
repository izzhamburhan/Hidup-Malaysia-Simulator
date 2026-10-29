import { describe, expect, it } from 'vitest';
import { performAction } from '../src/engine/simulationEngine';
import { at, makeGame } from './helpers';

describe('scrolling social media refreshes the feed', () => {
  it('adds fresh friend or town posts to the top and says so', () => {
    const s = at(makeGame({ seed: 11 }), 0, 20);
    const before = s.feed.map((p) => p.id);
    const r = performAction(s, 'scroll-feed');
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    const fresh = r.state.feed.filter((p) => !before.includes(p.id));
    expect(fresh.length).toBeGreaterThanOrEqual(1);
    expect(fresh.length).toBeLessThanOrEqual(3);
    expect(r.state.feed[0].id).toBe(fresh[0].id);
    expect(fresh.every((p) => p.kind === 'friend' || p.kind === 'world')).toBe(true);
    expect(r.feedback.lines.join(' ')).toMatch(/new post/);
  });

  it('never repeats a text from the last 8 posts, even when scrolled again and again', () => {
    let s = at(makeGame({ seed: 4 }), 0, 9);
    for (let i = 0; i < 12; i++) {
      const r = performAction(s, 'scroll-feed');
      expect(r.feedback.ok, r.feedback.error).toBe(true);
      s = r.state;
    }
    const texts = s.feed.filter((p) => p.kind !== 'player').map((p) => p.text);
    texts.forEach((t, i) => expect(texts.slice(i + 1, i + 8), t).not.toContain(t));
  });

  it('is deterministic for a seed', () => {
    const a = performAction(at(makeGame({ seed: 7 }), 0, 20), 'scroll-feed').state.feed;
    const b = performAction(at(makeGame({ seed: 7 }), 0, 20), 'scroll-feed').state.feed;
    expect(a).toEqual(b);
  });
});
