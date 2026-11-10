import { describe, expect, it } from 'vitest';
import { nextActivity, recordVisit, type CloudActivity, type CloudStore } from '../src/lib/cloud';

const T0 = '2026-11-01T02:00:00.000Z'; // 10:00 in Malaysia
const plus = (iso: string, min: number) => new Date(Date.parse(iso) + min * 60000).toISOString();

describe('nextActivity', () => {
  it('starts a record on the first visit', () => {
    expect(nextActivity(null, T0)).toEqual({ firstSeen: T0, lastSeen: T0, opens: 1, days: ['2026-11-01'] });
  });

  it('does not count a visit within 30 minutes as a new sitting', () => {
    const a = nextActivity(nextActivity(null, T0), plus(T0, 20));
    expect(a.opens).toBe(1);
    expect(a.lastSeen).toBe(plus(T0, 20));
  });

  it('counts a return after 30 quiet minutes and adds the day once', () => {
    const a = nextActivity(nextActivity(null, T0), plus(T0, 45));
    expect(a.opens).toBe(2);
    expect(a.days).toEqual(['2026-11-01']);
  });

  it('uses the Malaysia date (UTC+8) for the day', () => {
    const a = nextActivity(null, '2026-11-01T17:00:00.000Z'); // 01:00 on 2 Nov in Malaysia
    expect(a.days).toEqual(['2026-11-02']);
  });

  it('keeps only the last 90 days', () => {
    let a: CloudActivity | null = null;
    for (let d = 0; d < 100; d++) a = nextActivity(a, plus(T0, d * 1440));
    expect(a?.days.length).toBe(90);
    expect(a?.opens).toBe(100);
  });
});

describe('recordVisit', () => {
  it('reads then writes through the store, and never throws', async () => {
    let saved: CloudActivity | null = null;
    const store = { getActivity: async () => null, setActivity: async (_u: string, a: CloudActivity) => void (saved = a) } as unknown as CloudStore;
    await recordVisit(store, 'u1', T0);
    expect(saved).toMatchObject({ opens: 1 });
    const broken = { getActivity: async () => { throw new Error('offline'); }, setActivity: async () => undefined } as unknown as CloudStore;
    await expect(recordVisit(broken, 'u1', T0)).resolves.toBeUndefined();
    await expect(recordVisit({} as CloudStore, 'u1', T0)).resolves.toBeUndefined();
  });
});
