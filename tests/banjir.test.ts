import { describe, expect, it } from 'vitest';
import { allEvents, eventById, isEligible } from '../src/engine/events';
import { monthIndex } from '../src/engine/calendar';
import { resolveEvent } from '../src/engine/simulationEngine';
import { makeGame, at } from './helpers';
import type { GameState } from '../src/engine/types';

const RANDOM_IDS = ['banjir-rising', 'banjir-night'];
const ALL_IDS = [...RANDOM_IDS, 'banjir-cleanup'];

// Start date is 2027-01-04: day 345 is mid December, day 162 is mid June.
const DEC = 345;
const JUN = 162;

function homeIn(state: string, day: number): GameState {
  const s = makeGame({ seed: 7 });
  s.location.state = state;
  at(s, day, 20);
  return s;
}

const weightOf = (s: GameState, id: string): number => {
  const w = eventById(id)!.weight;
  return typeof w === 'function' ? w(s) : (w ?? 1);
};

const choicesOf = (id: string, s: GameState) => {
  const def = eventById(id)!;
  return typeof def.choices === 'function' ? def.choices(s, {}) : def.choices;
};

describe('banjir events', () => {
  it('exist as housing events: two random, one scheduled clean-up', () => {
    for (const id of ALL_IDS) {
      const def = eventById(id);
      expect(def, id).toBeDefined();
      expect(def!.category, id).toBe('housing');
    }
    for (const id of RANDOM_IDS) expect(eventById(id)!.trigger, id).toBe('random');
    expect(eventById('banjir-cleanup')!.trigger).toBe('scheduled');
  });

  it('are placed directly after the last chaos event', () => {
    const list = allEvents();
    const lastChaos = list.map((e) => e.category).lastIndexOf('chaos');
    const ids = list.map((e) => e.id);
    // stray-oyen and cat-keyboard are interleaved in the chaos block; banjir follows the final chaos entry
    expect(ids.indexOf('banjir-rising')).toBe(lastChaos + 1);
    expect(ids.indexOf('banjir-night')).toBe(lastChaos + 2);
    expect(ids.indexOf('banjir-cleanup')).toBe(lastChaos + 3);
  });

  it('every event has a free, always-available choice and every follow-up resolves', () => {
    const s = homeIn('Kelantan', DEC);
    for (const id of ALL_IDS) {
      const choices = choicesOf(id, s);
      expect(choices.length, id).toBeGreaterThanOrEqual(2);
      expect(choices.some((c) => !c.cost && !c.requires), id).toBe(true);
      for (const c of choices) for (const o of c.outcomes) {
        if (o.followUp) expect(eventById(o.followUp.eventId)?.trigger, `${id} -> ${o.followUp.eventId}`).toBe('scheduled');
      }
    }
  });

  it('is much more likely for Kelantan in December than Selangor in June', () => {
    const kelantanDec = homeIn('Kelantan', DEC);
    const selangorJun = homeIn('Selangor', JUN);
    expect(monthIndex(kelantanDec)).toBe(11);
    expect(monthIndex(selangorJun)).toBe(5);
    for (const id of RANDOM_IDS) {
      const def = eventById(id)!;
      expect(isEligible(kelantanDec, def, ['home', 'night']), id).toBe(true);
      expect(weightOf(kelantanDec, id), id).toBeGreaterThanOrEqual(5 * weightOf(selangorJun, id));
      expect(weightOf(selangorJun, id), id).toBeLessThan(0.5);
    }
  });

  it('weights east coast above other low-lying states above the rest in the monsoon', () => {
    const east = weightOf(homeIn('Terengganu', DEC), 'banjir-rising');
    const low = weightOf(homeIn('Kedah', DEC), 'banjir-rising');
    const rest = weightOf(homeIn('Selangor', DEC), 'banjir-rising');
    expect(east).toBeGreaterThan(low);
    expect(low).toBeGreaterThan(rest);
    expect(weightOf(homeIn('Pahang', 5), 'banjir-rising')).toBeGreaterThan(rest); // January
    expect(weightOf(homeIn('Kelantan', DEC), 'banjir-night')).toBeGreaterThan(weightOf(homeIn('Kelantan', JUN), 'banjir-night'));
  });

  it('resolving any choice never makes cash negative, and unaffordable choices are refused', () => {
    for (const id of ALL_IDS) {
      const choices = choicesOf(id, homeIn('Kelantan', DEC));
      for (const cash of [0, 50, 5000]) {
        for (const seed of [1, 2, 3, 4, 5, 6]) {
          for (const choice of choices) {
            const s = makeGame({ seed });
            s.location.state = 'Kelantan';
            at(s, DEC, 20);
            s.finance.cash = cash;
            s.events.pending = [{ eventId: id }];
            const r = resolveEvent(s, choice.id);
            const cost = typeof choice.cost === 'function' ? choice.cost(s, {}) : (choice.cost ?? 0);
            if (cost > cash) {
              expect(r.feedback.ok, `${id}/${choice.id}`).toBe(false);
              continue;
            }
            expect(r.feedback.ok, `${id}/${choice.id}: ${r.feedback.error}`).toBe(true);
            expect(r.state.finance.cash, `${id}/${choice.id} cash ${cash}`).toBeGreaterThanOrEqual(0);
            for (const v of Object.values(r.state.stats)) {
              expect(v).toBeGreaterThanOrEqual(0);
              expect(v).toBeLessThanOrEqual(100);
            }
          }
        }
      }
    }
  });

  it('a free choice at cash 0 does not create debt', () => {
    for (const id of ALL_IDS) {
      const free = choicesOf(id, homeIn('Kelantan', DEC)).filter((c) => !c.cost && !c.requires);
      for (const choice of free) {
        const s = makeGame({ seed: 3 });
        s.finance.cash = 0;
        s.events.pending = [{ eventId: id }];
        const debtBefore = s.finance.debts.length;
        const r = resolveEvent(s, choice.id);
        expect(r.state.finance.debts.length, `${id}/${choice.id}`).toBe(debtBefore);
      }
    }
  });

  it('a rising-water event can schedule the clean-up', () => {
    const s = homeIn('Kelantan', DEC);
    const scheduling = ALL_IDS.filter((id) => id !== 'banjir-cleanup').some((id) =>
      choicesOf(id, s).some((c) => c.outcomes.some((o) => o.followUp?.eventId === 'banjir-cleanup')),
    );
    expect(scheduling).toBe(true);
  });
});
