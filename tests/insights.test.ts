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

  it('puts the Map tab first, always', () => {
    expect(rankLifeTabs(makeGame())[0]).toBe('map');
    expect(rankLifeTabs(makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs' }))[0]).toBe('map');
    expect(rankLifeTabs(makeGame({ lifeStage: 'working', jobId: 'swe' }))[0]).toBe('map');
  });

  it('puts Career right after the map for an unemployed, non-studying player', () => {
    const s = makeGame({ lifeStage: 'fresh_grad' });
    expect(s.career.job).toBeNull();
    expect(s.education.status).not.toBe('studying');
    expect(rankLifeTabs(s)[1]).toBe('career');
  });

  it('puts Study above Career while the player is actively studying', () => {
    const s = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs' });
    const order = rankLifeTabs(s);
    expect(order.indexOf('study')).toBeLessThan(order.indexOf('career'));
  });

  it('follows the life stage right after the map: student -> Study, worker -> Career', () => {
    expect(rankLifeTabs(makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs' })).slice(0, 3)).toEqual(['map', 'study', 'career']);
    const worker = makeGame({ lifeStage: 'working', jobId: 'swe' });
    worker.transport.vehicleId = null;
    worker.relationships.prospects.push({} as never);
    expect(rankLifeTabs(worker).slice(0, 2)).toEqual(['map', 'career']);
    expect(rankLifeTabs(makeGame({ lifeStage: 'experienced', jobId: 'swe' })).slice(0, 2)).toEqual(['map', 'career']);
    expect(rankLifeTabs(makeGame({ lifeStage: 'fresh_grad' })).slice(0, 2)).toEqual(['map', 'career']);
  });

  it('puts Hustle right after the map for a jobless entrepreneur, then Career', () => {
    const s = makeGame({ lifeStage: 'entrepreneur' });
    s.career.job = null;
    expect(rankLifeTabs(s).slice(0, 3)).toEqual(['map', 'hustle', 'career']);
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
