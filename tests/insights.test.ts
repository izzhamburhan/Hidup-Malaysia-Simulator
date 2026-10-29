import { describe, expect, it } from 'vitest';
import { rankLifeTabs, type LifeTabId } from '../src/engine/insights';
import { makeGame } from './helpers';

const ALL: LifeTabId[] = ['career', 'study', 'food', 'fitness', 'people', 'home', 'transport', 'hustle', 'shop', 'map'];

describe('rankLifeTabs (orders, never removes, Life sub-tabs)', () => {
  it('always returns every tab exactly once', () => {
    const order = rankLifeTabs(makeGame());
    expect(order).toHaveLength(ALL.length);
    expect(new Set(order)).toEqual(new Set(ALL));
  });

  it('puts Career first for an unemployed, non-studying player', () => {
    const s = makeGame({ lifeStage: 'fresh_grad' });
    expect(s.career.job).toBeNull();
    expect(s.education.status).not.toBe('studying');
    expect(rankLifeTabs(s)[0]).toBe('career');
  });

  it('puts Study above Career while the player is actively studying', () => {
    const s = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs' });
    const order = rankLifeTabs(s);
    expect(order.indexOf('study')).toBeLessThan(order.indexOf('career'));
  });

  it('keeps the Map tab last so it never displaces the working tabs', () => {
    expect(rankLifeTabs(makeGame()).at(-1)).toBe('map');
    expect(rankLifeTabs(makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs' })).at(-1)).toBe('map');
  });

  it('moves Hustle above Shop once the player has a side hustle, and below it otherwise', () => {
    const none = makeGame();
    expect(none.hustles).toHaveLength(0);
    const withoutHustle = rankLifeTabs(none);
    expect(withoutHustle.indexOf('hustle')).toBeGreaterThan(withoutHustle.indexOf('shop'));

    const withHustle = makeGame();
    withHustle.hustles.push({
      id: 'tutoring', level: 1, xp: 0, reputation: 30, satisfaction: 60, revenueTotal: 0, expenseTotal: 0,
      monthRevenue: 0, monthExpense: 0, startedDay: 0, lastWorkedDay: 0, employees: 0, registered: false,
    });
    const order = rankLifeTabs(withHustle);
    expect(order.indexOf('hustle')).toBeLessThan(order.indexOf('shop'));
  });

  it('moves Transport up when the player has a job but no vehicle', () => {
    const s = makeGame({ lifeStage: 'working', jobId: 'swe' });
    s.transport.vehicleId = null;
    const order = rankLifeTabs(s);
    expect(order.indexOf('transport')).toBeLessThan(ALL.length - 2);
  });
});
