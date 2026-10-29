import { describe, expect, it } from 'vitest';
import { mapStateByName } from '../src/data/malaysia';
import { refreshListings } from '../src/engine/career';
import { monthlyCommitments } from '../src/engine/economy';
import { costFactor, currentHome, movingStateCost, payFactor } from '../src/engine/living';
import { performAction, viewAction } from '../src/engine/simulationEngine';
import type { GameState } from '../src/engine/types';
import { makeGame } from './helpers';

const rentOf = (s: GameState) => monthlyCommitments(s).find((c) => c.id === 'rent')?.amount ?? 0;

function renter(overrides: Parameters<typeof makeGame>[0] = {}): GameState {
  const s = makeGame({ lifeStage: 'working', ...overrides });
  s.housing = { optionId: 'apartment', sinceDay: 0, depositHeld: 2600, ownedPropertyId: null };
  s.finance.cash = 20000;
  return s;
}

describe('state cost and pay factors', () => {
  it('are 1 for Selangor and unknown states', () => {
    const s = makeGame();
    s.location.state = 'Selangor';
    expect(costFactor(s)).toBe(1);
    expect(payFactor(s)).toBe(1);
    s.location.state = 'Atlantis';
    expect(costFactor(s)).toBe(1);
    expect(payFactor(s)).toBe(1);
  });

  it('follow the residence state', () => {
    const s = makeGame();
    s.location.state = 'Kelantan';
    expect(costFactor(s)).toBe(mapStateByName('Kelantan')!.costFactor);
    expect(payFactor(s)).toBe(mapStateByName('Kelantan')!.payFactor);
  });

  it('scale rent and bills but leave Selangor numbers unchanged', () => {
    const s = renter();
    s.location.state = 'Selangor';
    expect(rentOf(s)).toBe(1300);
    expect(currentHome(s).utilities).toBe(150);
    s.location.state = 'Kuala Lumpur';
    expect(rentOf(s)).toBe(Math.round(1300 * 1.12));
    s.location.state = 'Kelantan';
    expect(rentOf(s)).toBe(Math.round(1300 * 0.8));
    expect(currentHome(s).utilities).toBe(Math.round(150 * 0.8));
  });
});

describe('new job listings follow the pay factor', () => {
  it('scales new listings, never an existing salary', () => {
    const a = renter({ seed: 77 });
    const b = structuredClone(a);
    a.location.state = 'Selangor';
    b.location.state = 'Kelantan';
    a.career.listings = [];
    b.career.listings = [];
    refreshListings(a);
    refreshListings(b);
    expect(a.career.listings.length).toBe(b.career.listings.length);
    const full = a.career.listings.map((l, i) => [l, b.career.listings[i]] as const).filter(([l]) => l.salary > 300);
    expect(full.length).toBeGreaterThan(0);
    for (const [la, lb] of full) {
      expect(la.jobId).toBe(lb.jobId);
      expect(Math.abs(lb.salary - la.salary * 0.85)).toBeLessThanOrEqual(50);
    }
  });

  it('keeps salaries already on the board after a move', () => {
    const s = renter();
    s.career.listings = [];
    refreshListings(s);
    const before = s.career.listings.map((l) => l.salary);
    expect(before.length).toBeGreaterThan(0);
    const r = performAction(s, 'move-state', 'Kelantan');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.career.listings.slice(0, before.length).map((l) => l.salary)).toEqual(before);
  });
});

describe('move-state action', () => {
  it('confirm text states cost, cost and pay factors and resigning', () => {
    const s = renter();
    const v = viewAction(s, 'move-state', 'Kuala Lumpur')!;
    expect(v.available).toBe(true);
    expect(v.cost).toBe(movingStateCost(s, 'Kuala Lumpur'));
    expect(v.confirm).toContain('RM');
    expect(v.confirm).toMatch(/rent/i);
    expect(v.confirm).toMatch(/pay/i);
    expect(v.confirm).toMatch(/resign/i);
    expect(v.confirm).toMatch(/fictional/i);
  });

  it('costs more across the sea than within a region', () => {
    const s = renter();
    s.location.state = 'Selangor';
    const near = movingStateCost(s, 'Kuala Lumpur');
    const far = movingStateCost(s, 'Johor');
    const sea = movingStateCost(s, 'Sabah');
    expect(near).toBeLessThan(far);
    expect(far).toBeLessThan(sea);
  });

  it('is unavailable with reasons', () => {
    const s = renter();
    expect(viewAction(s, 'move-state', 'Selangor')!.reason).toMatch(/already live/i);
    expect(viewAction(s, 'move-state', 'Atlantis')!.reason).toMatch(/unknown/i);
    expect(viewAction(s, 'move-state')!.reason).toMatch(/unknown/i);
    const broke = renter();
    broke.finance.cash = 10;
    expect(viewAction(broke, 'move-state', 'Kelantan')!.reason).toMatch(/RM/);
    const student = makeGame({ lifeStage: 'student' });
    student.finance.cash = 20000;
    expect(student.education.status).toBe('studying');
    expect(viewAction(student, 'move-state', 'Kelantan')!.reason).toMatch(/stud/i);
    const owner = renter();
    owner.housing.ownedPropertyId = 'flat';
    owner.housing.optionId = 'owned';
    expect(viewAction(owner, 'move-state', 'Kelantan')!.reason).toMatch(/property/i);
  });

  it('spends the moving cost, sets the state, resigns a full-time job and keeps the housing type', () => {
    const s = renter();
    expect(s.career.job?.schedule).toBe('fulltime');
    const cost = movingStateCost(s, 'Kelantan');
    const cash = s.finance.cash;
    const r = performAction(s, 'move-state', 'Kelantan');
    expect(r.feedback.ok).toBe(true);
    const n = r.state;
    expect(n.location.state).toBe('Kelantan');
    expect(n.career.job).toBeNull();
    expect(n.housing.optionId).toBe('apartment');
    expect(rentOf(n)).toBe(Math.round(1300 * 0.8));
    expect(n.finance.cash).toBeLessThanOrEqual(cash - cost + 1);
    expect(n.finance.cash).toBeGreaterThanOrEqual(0);
    expect(r.feedback.lines.join(' ')).toMatch(/resign/i);
    expect(n.log.some((l) => /Kelantan/.test(l.text))).toBe(true);
  });

  it('is deterministic', () => {
    const a = performAction(renter(), 'move-state', 'Kuala Lumpur').state;
    const b = performAction(renter(), 'move-state', 'Kuala Lumpur').state;
    expect(a).toEqual(b);
  });

  it('never leaves cash negative', () => {
    const s = renter();
    s.finance.cash = movingStateCost(s, 'Kelantan');
    const r = performAction(s, 'move-state', 'Kelantan');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.finance.cash).toBeGreaterThanOrEqual(0);
  });
});
