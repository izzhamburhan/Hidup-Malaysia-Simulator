import { describe, expect, it } from 'vitest';
import { VIRAL_KEY, emptyViral, loadViral, markShown, pickViral, saveViral, setPoster, shouldShowViral } from '../src/lib/viral';

const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

function memory(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(VIRAL_KEY, initial);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('viral picker', () => {
  it('is deterministic for a date and never repeats a seen item while unseen ones remain', () => {
    const first = pickViral(items, '2026-11-12', []);
    expect(first).toEqual(pickViral(items, '2026-11-12', []));
    const second = pickViral(items, '2026-11-13', [first!.id]);
    expect(second!.id).not.toBe(first!.id);
    const third = pickViral(items, '2026-11-14', [first!.id, second!.id]);
    expect(new Set([first!.id, second!.id, third!.id]).size).toBe(3);
  });

  it('rotates through everything once all are seen, and handles an empty list', () => {
    const a = pickViral(items, '2026-11-12', ['a', 'b', 'c']);
    expect(a).not.toBeNull();
    expect(pickViral([], '2026-11-12', [])).toBeNull();
  });
});

describe('viral store rules', () => {
  it('shows once per day, only when enabled and something is unseen', () => {
    const v = emptyViral();
    expect(shouldShowViral(v, '2026-11-12', true, items)).toBe(true);
    expect(shouldShowViral(v, '2026-11-12', false, items)).toBe(false);
    const shown = markShown(v, 'a', '2026-11-12');
    expect(shouldShowViral(shown, '2026-11-12', true, items)).toBe(false);
    expect(shouldShowViral(shown, '2026-11-13', true, items)).toBe(true);
    const all = markShown(markShown(markShown(v, 'a', '2026-11-10'), 'b', '2026-11-11'), 'c', '2026-11-12');
    expect(shouldShowViral(all, '2026-11-13', true, items)).toBe(false);
  });

  it('markShown keeps ids unique and does not mutate', () => {
    const v = emptyViral();
    const once = markShown(v, 'a', '2026-11-12');
    const twice = markShown(once, 'a', '2026-11-13');
    expect(v.seen).toEqual([]);
    expect(twice.seen).toEqual(['a']);
    expect(twice.lastShown).toBe('2026-11-13');
  });

  it('sets and clears the poster', () => {
    const v = setPoster(emptyViral(), 'b');
    expect(v.poster).toBe('b');
    expect(setPoster(v, null).poster).toBeNull();
  });

  it('round-trips through storage and survives bad data', () => {
    const store = memory();
    saveViral(store, markShown(emptyViral(), 'a', '2026-11-12'));
    expect(loadViral(store).seen).toEqual(['a']);
    expect(loadViral(memory('{nope')).seen).toEqual([]);
    expect(loadViral(memory(JSON.stringify({ seen: 'x', lastShown: 5, poster: 7 })))).toEqual(emptyViral());
    expect(loadViral(null)).toEqual(emptyViral());
  });
});
import { existsSync } from 'node:fs';
import { VIRAL_ITEMS, VIRAL_SCENES } from '../src/data/viral';

describe('viral catalogue', () => {
  it('has unique ids and both languages for every card', () => {
    expect(VIRAL_ITEMS.length).toBeGreaterThanOrEqual(7);
    expect(new Set(VIRAL_ITEMS.map((i) => i.id)).size).toBe(VIRAL_ITEMS.length);
    for (const i of VIRAL_ITEMS) {
      expect(i.topic.en.length, i.id).toBeGreaterThan(2);
      expect(i.topic.ms.length, i.id).toBeGreaterThan(2);
      expect(i.line.en.length, i.id).toBeGreaterThan(10);
      expect(i.line.ms.length, i.id).toBeGreaterThan(10);
      expect(i.line.en.length, i.id).toBeLessThanOrEqual(140);
      expect(i.line.ms.length, i.id).toBeLessThanOrEqual(140);
    }
  });

  it('points every card at a known scene and any image file that exists', () => {
    for (const i of VIRAL_ITEMS) {
      expect(Object.keys(VIRAL_SCENES), i.id).toContain(i.scene);
      if (i.image) expect(existsSync(`public/viral/${i.image}`), i.image).toBe(true);
      if (i.original) expect(existsSync(`public/viral/${i.original}`), i.original).toBe(true);
    }
  });

  it('gives every card its own picture: a ready-made image, or its own scene and sprite', () => {
    const keys = VIRAL_ITEMS.map((i) => i.image ?? `${i.scene}:${i.sprite}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const i of VIRAL_ITEMS) {
      expect(i.image || i.sprite, i.id).toBeTruthy();
      if (i.image) expect(i.original, i.id).toBeTruthy();
    }
  });

  it('keeps real people, politics and brands out of the cards', () => {
    const text = VIRAL_ITEMS.map((i) => `${i.topic.en} ${i.topic.ms} ${i.line.en} ${i.line.ms}`).join(' ').toLowerCase();
    for (const word of ['minecraft', 'google', 'grab', 'tiktok', 'threads', 'anwar', 'najib', 'mahathir', 'pm ', 'pas ', 'umno', 'dap', 'pkr']) {
      expect(text.includes(word), word).toBe(false);
    }
  });
});

import { CARD_H, CARD_W, PIC_H, PIC_W, sceneGrid } from '../src/lib/viralCard';
import { VIRAL_SCENES as SCENES } from '../src/data/viral';

describe('viral pixel scene', () => {
  it('draws a fixed-size grid, the same every time', () => {
    const a = sceneGrid(SCENES.sunset);
    expect(a).toHaveLength(PIC_W * PIC_H);
    expect(a).toEqual(sceneGrid(SCENES.sunset));
  });

  it('uses only the scene palette plus the cat', () => {
    const grid = sceneGrid(SCENES.noon);
    for (const px of grid) expect(px).toMatch(/^#[0-9a-f]{6}$/i);
    expect(grid).toContain('#e8913a');
    expect(grid).toContain(SCENES.noon.sunColor);
  });

  it('shows rain and stars only where the scene asks for them', () => {
    const rain = sceneGrid(SCENES.rain);
    const dry = sceneGrid(SCENES.noon);
    expect(rain.filter((p) => p === '#b8c8e0').length).toBeGreaterThan(20);
    expect(dry.filter((p) => p === '#b8c8e0').length).toBe(0);
    expect(sceneGrid(SCENES.night).filter((p) => p === '#ffffff').length).toBeGreaterThan(5);
  });

  it('keeps the share card portrait', () => {
    expect(CARD_W).toBe(1080);
    expect(CARD_H).toBeGreaterThan(CARD_W);
  });
});
