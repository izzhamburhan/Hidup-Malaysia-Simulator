import { describe, expect, it } from 'vitest';
import { advanceTime, minutesUntil } from '../src/engine/time';
import { formatTime, isWeekend, weekday } from '../src/engine/calendar';
import { at, makeGame } from './helpers';

describe('time engine', () => {
  it('starts on Monday 4 Jan 2027 at 7 AM', () => {
    const s = makeGame();
    expect(weekday(s)).toBe(1);
    expect(formatTime(s.clock.minute)).toBe('7:00 AM');
    expect(isWeekend(s, 5)).toBe(true);
  });

  it('advances minutes and rolls over days', () => {
    const s = at(makeGame(), 0, 22);
    advanceTime(s, 180);
    expect(s.clock).toEqual({ day: 1, minute: 60 });
  });

  it('drains energy and satiety while awake and restores energy while asleep', () => {
    const s = at(makeGame(), 0, 9);
    const e0 = s.stats.energy;
    const f0 = s.stats.satiety;
    advanceTime(s, 120);
    expect(s.stats.energy).toBeLessThan(e0);
    expect(s.stats.satiety).toBeLessThan(f0);
    s.stats.energy = 20;
    advanceTime(s, 300, { asleep: true });
    expect(s.stats.energy).toBeGreaterThan(70);
  });

  it('writes a day report at midnight and resets daily trackers', () => {
    const s = at(makeGame(), 0, 23);
    s.food.caloriesIn = 2000;
    advanceTime(s, 90);
    expect(s.dayReports[0].day).toBe(0);
    expect(s.dayReports[0].caloriesIn).toBe(2000);
    expect(s.food.caloriesIn).toBe(0);
  });

  it('computes minutes until a clock time', () => {
    const s = at(makeGame(), 0, 23);
    expect(minutesUntil(s, 7 * 60)).toBe(8 * 60);
    expect(minutesUntil(at(s, 0, 6), 7 * 60)).toBe(60);
  });

  it('keeps stats inside 0..100 across many days', () => {
    const s = makeGame();
    advanceTime(s, 60 * 24 * 5);
    for (const v of Object.values(s.stats)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
