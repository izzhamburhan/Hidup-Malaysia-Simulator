import { describe, expect, it } from 'vitest';
import { achievements } from '../src/data/achievements';
import { MALAYSIA } from '../src/data/malaysia';
import { baliKampungCost } from '../src/engine/actions/peopleActions';
import { eventById } from '../src/engine/events';
import { MAX_TRIP_MINUTES, isLongDistance, stateCentroid, travelBetween, visitedStates } from '../src/engine/geography';
import { checkAchievements } from '../src/engine/progression';
import { performAction, viewAction } from '../src/engine/simulationEngine';
import { at, makeGame } from './helpers';

// 2027-01-04 is a Monday, so day 5 is a Saturday and day 2 a Wednesday.
const SATURDAY = 5;
const WEDNESDAY = 2;

function tripper(cash = 5000) {
  const s = at(makeGame(), SATURDAY, 8);
  s.finance.cash = cash;
  return s;
}

describe('travelBetween', () => {
  it('is symmetric for every pair of states', () => {
    for (const a of MALAYSIA) for (const b of MALAYSIA) expect(travelBetween(a.name, b.name), `${a.name} ${b.name}`).toEqual(travelBetween(b.name, a.name));
  });

  it('flies across the sea and drives within the Peninsula or within Borneo', () => {
    expect(travelBetween('Selangor', 'Sabah').mode).toBe('flight');
    expect(travelBetween('Kelantan', 'Sarawak').mode).toBe('flight');
    expect(travelBetween('Selangor', 'Kelantan').mode).toBe('road');
    expect(travelBetween('Sabah', 'Sarawak').mode).toBe('road');
    expect(travelBetween('Labuan', 'Sabah').mode).toBe('road');
  });

  it('makes the same state a short, cheap local hop', () => {
    const local = travelBetween('Perak', 'Perak');
    expect(local.mode).toBe('road');
    expect(local.minutes).toBeLessThan(travelBetween('Selangor', 'Negeri Sembilan').minutes);
    expect(local.cost).toBeLessThan(travelBetween('Selangor', 'Negeri Sembilan').cost);
    expect(travelBetween('Nowhere', 'Perak')).toEqual(local);
  });

  it('costs more and takes longer the farther the trip', () => {
    const near = travelBetween('Selangor', 'Negeri Sembilan');
    const mid = travelBetween('Selangor', 'Perak');
    const far = travelBetween('Perlis', 'Johor');
    expect(mid.cost).toBeGreaterThan(near.cost);
    expect(far.cost).toBeGreaterThan(mid.cost);
    expect(far.minutes).toBeGreaterThan(mid.minutes);
    expect(mid.minutes).toBeGreaterThan(near.minutes);
    expect(travelBetween('Selangor', 'Sabah').cost).toBeGreaterThan(travelBetween('Selangor', 'Kelantan').cost);
    expect(travelBetween('Perlis', 'Sabah').cost).toBeGreaterThan(travelBetween('Selangor', 'Sabah').cost);
  });

  it('has a centroid for every state and none for an unknown name', () => {
    for (const m of MALAYSIA) expect(stateCentroid(m.name), m.name).not.toBeNull();
    expect(stateCentroid('Atlantis')).toBeNull();
  });

  it('calls only long drives long distance', () => {
    expect(isLongDistance('Selangor', 'Kelantan')).toBe(true);
    expect(isLongDistance('Selangor', 'Negeri Sembilan')).toBe(false);
    expect(isLongDistance('Kedah', 'Kedah')).toBe(false);
  });
});

describe('trip-state action', () => {
  it('takes a weekend trip: pays the fare, lifts mood, stamps the state and remembers it', () => {
    const s = tripper();
    const t = travelBetween('Selangor', 'Kelantan');
    const r = performAction(s, 'trip-state', 'Kelantan');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.finance.cash).toBeCloseTo(5000 - t.cost, 2);
    expect(r.state.stats.happiness).toBeGreaterThan(s.stats.happiness);
    expect(r.state.stats.stress).toBeLessThan(s.stats.stress);
    expect(r.state.travel.stamps.Kelantan).toBe(SATURDAY);
    expect(r.state.memories.some((m) => m.includes('Kelantan'))).toBe(true);
    expect(r.state.counters.trips).toBe(s.counters.trips + 1);
    expect(r.state.location.state).toBe('Selangor');
    // A there-and-back day trip stays within the day.
    const view = viewAction(s, 'trip-state', 'Kelantan')!;
    expect(view.minutes).toBeLessThanOrEqual(MAX_TRIP_MINUTES);
    expect(view.cost).toBe(t.cost);
    expect(r.state.clock.day).toBe(SATURDAY);
  });

  it('stamps a state only the first time', () => {
    let s = tripper();
    s = performAction(s, 'trip-state', 'Perak').state;
    const memories = s.memories.filter((m) => m.includes('Perak')).length;
    s = at(s, SATURDAY + 7, 8);
    const r = performAction(s, 'trip-state', 'Perak');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.travel.stamps.Perak).toBe(SATURDAY);
    expect(r.state.memories.filter((m) => m.includes('Perak')).length).toBe(memories);
  });

  it('refuses your own state with a reason', () => {
    const s = tripper();
    const r = performAction(s, 'trip-state', 'Selangor');
    expect(r.feedback.ok).toBe(false);
    expect(r.feedback.error).toMatch(/already live/i);
    expect(s.travel.stamps).toEqual({});
  });

  it('refuses weekdays, but allows an annual leave day', () => {
    const s = at(makeGame(), WEDNESDAY, 8);
    s.finance.cash = 5000;
    expect(performAction(s, 'trip-state', 'Melaka').feedback.error).toMatch(/weekend/i);
    s.flags.leaveUntil = WEDNESDAY;
    expect(performAction(s, 'trip-state', 'Melaka').feedback.ok).toBe(true);
  });

  it('refuses an unknown state and a late start', () => {
    const s = tripper();
    expect(performAction(s, 'trip-state', 'Atlantis').feedback.error).toMatch(/state/i);
    expect(performAction(s, 'trip-state').feedback.error).toMatch(/state/i);
    expect(performAction(at(tripper(), SATURDAY, 15), 'trip-state', 'Melaka').feedback.error).toMatch(/early/i);
  });

  it('never makes cash negative and explains when you cannot afford it', () => {
    const s = tripper(40);
    const r = performAction(s, 'trip-state', 'Sabah');
    expect(r.feedback.ok).toBe(false);
    expect(r.feedback.error).toMatch(/cash|afford/i);
    expect(r.state.finance.cash).toBe(40);
    // Exactly enough is fine and lands on zero, not below.
    const exact = tripper(travelBetween('Selangor', 'Melaka').cost);
    const ok = performAction(exact, 'trip-state', 'Melaka');
    expect(ok.feedback.ok).toBe(true);
    expect(ok.state.finance.cash).toBe(0);
  });

  it('does not mutate the input state and is deterministic', () => {
    const s = tripper();
    const before = JSON.stringify(s);
    const a = performAction(s, 'trip-state', 'Johor');
    const b = performAction(s, 'trip-state', 'Johor');
    expect(JSON.stringify(s)).toBe(before);
    expect(a.state).toEqual(b.state);
  });

  it('is a dedicated action (opened from the map, not the Act list)', () => {
    expect(viewAction(tripper(), 'trip-state', 'Kelantan')).not.toBeNull();
  });
});

describe('Jelajah Malaysia achievements', () => {
  const stamp = (n: number) => {
    const s = makeGame();
    MALAYSIA.filter((m) => m.name !== s.location.state)
      .slice(0, n)
      .forEach((m, i) => (s.travel.stamps[m.name] = i + 1));
    return s;
  };
  const unlocked = (s: ReturnType<typeof makeGame>) => achievements.filter((a) => ['jelajah-first', 'jelajah-8', 'jelajah-all'].includes(a.id) && a.check(s)).map((a) => a.id);

  it('exists with unique ids', () => {
    for (const id of ['jelajah-first', 'jelajah-8', 'jelajah-all']) expect(achievements.filter((a) => a.id === id)).toHaveLength(1);
  });

  it('unlocks at 1, 8 and all 16 states (where you live counts)', () => {
    expect(unlocked(stamp(0))).toEqual([]);
    expect(unlocked(stamp(1))).toEqual(['jelajah-first']);
    expect(unlocked(stamp(6))).toEqual(['jelajah-first']);
    expect(visitedStates(stamp(7))).toHaveLength(8);
    expect(unlocked(stamp(7))).toEqual(['jelajah-first', 'jelajah-8']);
    expect(unlocked(stamp(14))).toEqual(['jelajah-first', 'jelajah-8']);
    expect(unlocked(stamp(15))).toEqual(['jelajah-first', 'jelajah-8', 'jelajah-all']);
  });

  it('is granted by checkAchievements', () => {
    const s = stamp(15);
    const got = checkAchievements(s);
    expect(got).toContain('jelajah-all');
  });
});

describe('balik kampung uses the map', () => {
  it('costs less and takes less time when you live in your home state than from across the sea', () => {
    const away = makeGame({ backgroundId: 'renter', homeState: 'Sabah' });
    expect(away.housing.optionId).not.toBe('family');
    expect(away.location.state).toBe('Selangor');
    const home = structuredClone(away);
    home.location.state = 'Sabah';
    const far = viewAction(at(away, SATURDAY, 8), 'balik-kampung')!;
    const near = viewAction(at(home, SATURDAY, 8), 'balik-kampung')!;
    expect(near.cost).toBeLessThan(far.cost);
    expect(near.minutes).toBeLessThan(far.minutes);
  });

  it('charges the travelBetween fare and stays within a day', () => {
    const s = at(makeGame({ backgroundId: 'renter', homeState: 'Kelantan' }), SATURDAY, 8);
    s.finance.cash = 5000;
    const t = travelBetween('Selangor', 'Kelantan');
    const view = viewAction(s, 'balik-kampung')!;
    expect(view.minutes).toBeLessThanOrEqual(MAX_TRIP_MINUTES);
    expect(view.cost).toBeGreaterThanOrEqual(Math.round(t.cost * 0.5));
    expect(view.cost).toBeLessThanOrEqual(t.cost);
    const r = performAction(s, 'balik-kampung');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.finance.cash).toBeCloseTo(5000 - view.cost, 2);
  });

  it('is free when you live with family', () => {
    const s = makeGame({ backgroundId: 'fresh-home', homeState: 'Kelantan' });
    expect(baliKampungCost(s)).toBe(0);
  });
});

describe('festive long-distance traffic jam event', () => {
  const DEEPAVALI = Math.round((Date.UTC(2027, 9, 29) - Date.UTC(2027, 0, 4)) / 86400000);

  it('is a festive event with a free choice', () => {
    const e = eventById('festive-jam')!;
    expect(e).toBeDefined();
    expect(e.category).toBe('festive');
    const s = makeGame();
    const choices = typeof e.choices === 'function' ? e.choices(s, {}) : e.choices;
    expect(choices.some((c) => !c.cost && !c.requires)).toBe(true);
  });

  it('only applies in a festive season to someone far from home', () => {
    const e = eventById('festive-jam')!;
    const far = at(makeGame({ backgroundId: 'renter', homeState: 'Kelantan' }), DEEPAVALI, 8);
    expect(e.when!(far)).toBe(true);
    const ordinary = at(makeGame({ backgroundId: 'renter', homeState: 'Kelantan' }), 100, 8);
    expect(e.when!(ordinary)).toBe(false);
    const close = at(makeGame({ backgroundId: 'renter', homeState: 'Negeri Sembilan' }), DEEPAVALI, 8);
    expect(e.when!(close)).toBe(false);
    const family = at(makeGame({ backgroundId: 'fresh-home', homeState: 'Kelantan' }), DEEPAVALI, 8);
    expect(e.when!(family)).toBe(false);
  });
});
