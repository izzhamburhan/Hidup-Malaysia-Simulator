import { describe, expect, it } from 'vitest';
import { avatarCells } from '../src/components/PixelAvatar';
import { GAME_URL } from '../src/config';
import { lifeReport } from '../src/engine/endings';
import { shareCardModel } from '../src/lib/shareCard';
import { makeGame } from './helpers';

describe('share card', () => {
  it('carries the ending, the player and the game link, in lines that fit', () => {
    const s = makeGame({ name: 'Aina' });
    const report = lifeReport(s);
    const m = shareCardModel(report);
    expect(m.endingTitle).toBe(report.ending.title);
    expect(m.endingIcon).toBe(report.ending.icon);
    expect(m.who).toContain('Aina');
    expect(m.rows.find((r) => r.label === 'Net worth')?.value).toMatch(/^-?RM/);
    expect(m.url).toBe(GAME_URL.replace(/^https?:\/\//, '').replace(/\/$/, ''));
    for (const r of m.rows) expect(r.value.length, r.label).toBeLessThanOrEqual(34);
  });

  it('draws the sprite inside its grid', () => {
    const { width, height, cells } = avatarCells(makeGame().character.appearance, 'happy');
    expect(cells.length).toBeGreaterThan(20);
    for (const c of cells) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x + c.w).toBeLessThanOrEqual(width);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThan(height);
    }
  });
});