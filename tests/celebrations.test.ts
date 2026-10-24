import { describe, expect, it } from 'vitest';
import { celebrationsBetween } from '../src/components/celebrate/celebrations';
import { makeGame } from './helpers';

const clone = <T,>(x: T): T => structuredClone(x);

describe('celebrationsBetween', () => {
  it('finds nothing when nothing big changed', () => {
    const s = makeGame();
    expect(celebrationsBetween(s, clone(s))).toEqual([]);
  });

  it('celebrates a new achievement', () => {
    const prev = makeGame();
    const next = clone(prev);
    next.achievements['first-day'] = 1;
    const [c] = celebrationsBetween(prev, next);
    expect(c.title).toMatch(/Hari Pertama/);
  });

  it('celebrates a promotion at the same company, and a new job elsewhere', () => {
    const prev = makeGame({ lifeStage: 'working', jobId: 'swe' });
    expect(prev.career.job).not.toBeNull();
    const promoted = clone(prev);
    promoted.career.job!.title = 'Senior ' + promoted.career.job!.title;
    expect(celebrationsBetween(prev, promoted)[0].kind).toBe('promotion');

    const moved = clone(prev);
    moved.career.job!.companyId = 'zus';
    expect(celebrationsBetween(prev, moved)[0].kind).toBe('job');
  });

  it('celebrates graduating and puts it ahead of a smaller moment', () => {
    const prev = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs' });
    const next = clone(prev);
    next.education.status = 'graduated';
    next.achievements['first-day'] = 1;
    const list = celebrationsBetween(prev, next);
    expect(list.map((c) => c.kind)).toEqual(['graduated', 'achievement']);
  });

  it('never celebrates across two different lives', () => {
    const prev = makeGame();
    const next = clone(prev);
    next.createdAt = 'another life';
    next.achievements['first-day'] = 1;
    expect(celebrationsBetween(prev, next)).toEqual([]);
  });
});