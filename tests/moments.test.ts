import { describe, expect, it } from 'vitest';
import { COUNT_UP_MS, countUpValue, easeOutCubic, paydayFor } from '../src/lib/moments';
import { monthKey } from '../src/engine/calendar';
import { runPayroll } from '../src/engine/economy';
import { makeGame, at } from './helpers';

describe('easeOutCubic', () => {
  it('runs 0 to 1, fast then slow, clamped', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(3)).toBe(1);
  });
});

describe('countUpValue', () => {
  it('starts at zero, rises monotonically and ends exactly on the target', () => {
    const target = 3456.78;
    expect(countUpValue(target, 0)).toBe(0);
    let last = 0;
    for (let ms = 0; ms <= COUNT_UP_MS; ms += 50) {
      const v = countUpValue(target, ms);
      expect(v).toBeGreaterThanOrEqual(last);
      expect(v).toBeLessThanOrEqual(target);
      last = v;
    }
    expect(countUpValue(target, COUNT_UP_MS)).toBe(target);
    expect(countUpValue(target, COUNT_UP_MS * 5)).toBe(target);
  });

  it('keeps cents precision mid-count and is exact for a zero or instant duration', () => {
    const mid = countUpValue(100, COUNT_UP_MS / 3);
    expect(Math.round(mid * 100) / 100).toBe(mid);
    expect(countUpValue(0, 10)).toBe(0);
    expect(countUpValue(42.5, 0, 0)).toBe(42.5);
  });
});

describe('paydayFor', () => {
  it('finds the payslip only for the last day of the month it was paid', () => {
    const s = makeGame({ lifeStage: 'working', jobId: 'swe' });
    // Walk to a month end and run payroll on it (test setup only).
    let day = s.clock.day;
    while (monthKey(s, day) === monthKey(s, day + 1)) day += 1;
    at(s, day, 8);
    runPayroll(s, day);
    expect(s.finance.payslips.length).toBeGreaterThan(0);
    const slip = paydayFor(s, day);
    expect(slip).not.toBeNull();
    expect(slip!.net).toBe(s.finance.payslips[0].net);
    expect(paydayFor(s, day - 1)).toBeNull();
    expect(paydayFor(s, day + 1)).toBeNull();
  });

  it('is null when nobody was paid', () => {
    expect(paydayFor(makeGame(), 3)).toBeNull();
  });
});
