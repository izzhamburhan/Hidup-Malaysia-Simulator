import { describe, expect, it } from 'vitest';
import { createSessionStats } from '../src/lib/sessionStats';

const MIN = 60_000;

describe('session stats', () => {
  it('has nothing to report before anything happens', () => {
    const s = createSessionStats(0);
    expect(s.summary(5 * MIN)).toBeNull();
  });

  it('counts actions, events, games and days', () => {
    const s = createSessionStats(0);
    s.recordAction('eat', 'food');
    s.recordAction('eat', 'food');
    s.recordAction('work', 'work');
    s.recordEvent();
    s.recordGame();
    s.recordDays(2);
    s.recordDays(0);
    s.recordDays(-3); // never counts backwards
    const sum = s.summary(4 * MIN)!;
    expect(sum).toMatchObject({ actions: 3, events: 1, games: 1, days: 2, minutes: 4 });
  });

  it('lists the three most used actions, ties broken by name, and the top categories', () => {
    const s = createSessionStats(0);
    for (let i = 0; i < 3; i++) s.recordAction('eat', 'food');
    for (let i = 0; i < 2; i++) s.recordAction('gym', 'fitness');
    for (let i = 0; i < 2; i++) s.recordAction('chat', 'social');
    s.recordAction('nap', 'life');
    const sum = s.summary(MIN)!;
    expect(sum.top1).toBe('eat');
    expect(sum.top2).toBe('chat');
    expect(sum.top3).toBe('gym');
    expect(sum.mix).toBe('food:3 fitness:2 social:2');
  });

  it('leaves out top slots it does not have', () => {
    const s = createSessionStats(0);
    s.recordAction('eat', 'food');
    const sum = s.summary(MIN)!;
    expect(sum.top1).toBe('eat');
    expect('top2' in sum).toBe(false);
    expect('top3' in sum).toBe(false);
  });

  it('rounds minutes, never reports less than 0 and caps a forgotten tab', () => {
    const a = createSessionStats(0);
    a.recordEvent();
    expect(a.summary(90_000)!.minutes).toBe(2);
    const b = createSessionStats(10 * MIN);
    b.recordEvent();
    expect(b.summary(5 * MIN)!.minutes).toBe(0);
    const c = createSessionStats(0);
    c.recordEvent();
    expect(c.summary(48 * 60 * MIN)!.minutes).toBe(240);
  });

  it('starts a fresh session after a reset', () => {
    const s = createSessionStats(0);
    s.recordAction('eat', 'food');
    s.reset(10 * MIN);
    expect(s.summary(11 * MIN)).toBeNull();
    s.recordEvent();
    expect(s.summary(13 * MIN)).toMatchObject({ actions: 0, events: 1, minutes: 3 });
  });

  it('can restart the clock without losing counts (tab shown again)', () => {
    const s = createSessionStats(0);
    s.recordAction('eat', 'food');
    s.startClock(20 * MIN);
    expect(s.summary(23 * MIN)).toMatchObject({ actions: 1, minutes: 3 });
  });

  it('uses only short safe text', () => {
    const s = createSessionStats(0);
    s.recordAction('a'.repeat(80), 'b'.repeat(80));
    const sum = s.summary(MIN)!;
    expect(String(sum.top1).length).toBeLessThanOrEqual(40);
    expect(String(sum.mix).length).toBeLessThanOrEqual(40);
  });
});