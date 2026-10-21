import { describe, expect, it } from 'vitest';
import { allEvents, eligibleEvents, eventById, isEligible, queueEvent, rollRandomEvent, viewEvent } from '../src/engine/events';
import { resolveEvent } from '../src/engine/simulationEngine';
import { holidays } from '../src/data/holidays';
import { invitePosts } from '../src/data/feed';
import { makeGame } from './helpers';

const REQUIRED = [
  'interview', 'burnout', 'relationship-crisis', 'tax-filing', 'tax-late', 'new-year-resolution', 'festive-cny', 'festive-raya',
  'festive-haji', 'festive-deepavali', 'festive-christmas', 'merdeka', 'trip-invite', 'futsal-invite', 'friend-wedding', 'referral-offer', 'car-breakdown',
];

describe('event catalogue integrity', () => {
  const events = allEvents();

  it('has at least 50 distinct scenarios', () => {
    expect(events.length).toBeGreaterThanOrEqual(50);
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it('contains every id the engine and data reference', () => {
    const referenced = [...REQUIRED, ...holidays.flatMap((h) => (h.eventId ? [h.eventId] : [])), ...invitePosts.map((p) => p.eventId)];
    for (const id of referenced) expect(eventById(id), id).toBeDefined();
  });

  it('every event has 2+ choices and at least one that is always available', () => {
    const s = makeGame({ mode: 'chaotic' });
    for (const e of events) {
      const choices = typeof e.choices === 'function' ? e.choices(s, { friend: 'Aiman', appId: 'x', company: 'Co', job: 'Job' }) : e.choices;
      expect(choices.length, e.id).toBeGreaterThanOrEqual(2);
      expect(new Set(choices.map((c) => c.id)).size, e.id).toBe(choices.length);
      expect(choices.some((c) => !c.cost && !c.requires), e.id).toBe(true);
    }
  });

  it('follow-ups point to scheduled events', () => {
    const s = makeGame();
    for (const e of events) {
      const choices = typeof e.choices === 'function' ? e.choices(s, {}) : e.choices;
      for (const c of choices) for (const o of c.outcomes) {
        if (o.followUp) expect(eventById(o.followUp.eventId)?.trigger, `${e.id} -> ${o.followUp.eventId}`).toBe('scheduled');
      }
    }
  });
});

describe('event engine', () => {
  it('respects mode, cooldowns and conditions', () => {
    const s = makeGame({ mode: 'realistic' });
    const chaosOnly = allEvents().filter((e) => e.trigger === 'random' && e.modes?.length === 1 && e.modes[0] === 'chaotic');
    expect(chaosOnly.length).toBeGreaterThan(0);
    for (const e of chaosOnly) expect(isEligible(s, e, ['any', 'work', 'commute', 'social', 'home'])).toBe(false);

    const breakdown = eventById('car-breakdown')!;
    expect(isEligible(s, breakdown, ['commute'])).toBe(false); // no vehicle
    s.transport.vehicleId = 'axia';
    expect(isEligible(s, breakdown, ['commute'])).toBe(true);
    s.events.cooldowns['car-breakdown'] = s.clock.day;
    expect(isEligible(s, breakdown, ['commute'])).toBe(false);
  });

  it('only rolls context events for matching actions', () => {
    const s = makeGame();
    s.transport.vehicleId = 'axia';
    const home = eligibleEvents(s, ['home']).map((e) => e.id);
    expect(home).not.toContain('car-breakdown');
  });

  it('is deterministic for the same seed', () => {
    const a = makeGame({ seed: 99 });
    const b = makeGame({ seed: 99 });
    const ra: boolean[] = [];
    const rb: boolean[] = [];
    for (let i = 0; i < 30; i++) {
      ra.push(rollRandomEvent(a, ['work', 'commute', 'social'], 240));
      rb.push(rollRandomEvent(b, ['work', 'commute', 'social'], 240));
      a.events.pending = [];
      b.events.pending = [];
    }
    expect(ra).toEqual(rb);
  });

  it('resolving a choice applies costs, records history and sets the cooldown', () => {
    const s = makeGame();
    s.finance.cash = 1000;
    queueEvent(s, 'burnout');
    const view = viewEvent(s)!;
    const paid = view.choices.find((c) => c.cost > 0);
    const choice = paid ?? view.choices[0];
    const r = resolveEvent(s, choice.id);
    expect(r.feedback.ok).toBe(true);
    expect(r.state.events.pending).toHaveLength(0);
    expect(r.state.events.history[0].eventId).toBe('burnout');
    expect(r.state.events.cooldowns.burnout).toBe(s.clock.day);
    if (paid) expect(r.state.finance.cash).toBeLessThan(1000);
  });

  it('refuses a choice the player cannot afford', () => {
    const s = makeGame();
    s.finance.cash = 0;
    queueEvent(s, 'trip-invite', { friend: 'Aiman' });
    const view = viewEvent(s)!;
    const paid = view.choices.find((c) => c.cost > 0)!;
    expect(paid.disabledReason).toMatch(/Need/);
    const r = resolveEvent(s, paid.id);
    expect(r.feedback.ok).toBe(false);
    expect(r.state.events.pending).toHaveLength(1);
  });
});
