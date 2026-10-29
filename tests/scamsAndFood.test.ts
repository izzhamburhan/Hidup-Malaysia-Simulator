import { describe, expect, it } from 'vitest';
import { foodById } from '../src/data/foods';
import { events } from '../src/data/events';
import { performAction, resolveEvent } from '../src/engine/simulationEngine';
import { at, makeGame } from './helpers';

const FOODS = ['cendol', 'ais-kacang', 'rojak', 'popiah', 'apam-balik', 'mee-rebus', 'nasi-kerabu', 'nasi-goreng-kampung', 'nasi-dagang', 'lontong', 'roti-john', 'murtabak', 'sirap-bandung', 'teh-o-ais'];
const SCAMS = ['scam-task-job', 'scam-fake-officer', 'scam-romance', 'scam-hacked-friend', 'scam-otp'];

/** The scam events use a fixed list of choices (not a function of the state). */
function choicesOf(id: string) {
  const e = events.find((x) => x.id === id);
  if (!e || typeof e.choices === 'function') throw new Error(`${id}: expected a fixed choice list`);
  return { event: e, choices: e.choices };
}

describe('iconic Malaysian food', () => {
  it('adds the classics with sane game values', () => {
    for (const id of FOODS) {
      const f = foodById(id);
      expect(f, id).toBeDefined();
      expect(f!.calories, id).toBeGreaterThan(0);
      expect(f!.price, id).toBeGreaterThan(0);
      expect(f!.satiety, id).toBeGreaterThan(0);
    }
    expect(foodById('sirap-bandung')!.meal).toBe(false);
    expect(foodById('nasi-kerabu')!.meal).toBe(true);
  });

  it('can be eaten through the engine', () => {
    const s = at(makeGame({ seed: 2 }), 0, 15);
    s.finance.cash = 200;
    s.stats.satiety = 20;
    const r = performAction(s, 'eat', 'nasi-kerabu');
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    expect(r.state.stats.satiety).toBeGreaterThan(20);
  });
});

describe('scam awareness events', () => {
  it('each has a safe free choice and a costly one', () => {
    for (const id of SCAMS) {
      const { event, choices } = choicesOf(id);
      expect(event.trigger).toBe('random');
      expect(choices.some((c) => !c.requires && !c.cost), id).toBe(true);
      expect(choices.length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('falling for a scam never pushes cash below zero, and the safe choice keeps it', () => {
    for (const id of SCAMS) {
      const { choices } = choicesOf(id);
      for (const cash of [0, 50, 5000]) {
        choices.forEach((choice, i) => {
          const s = makeGame({ seed: 5 });
          s.finance.cash = cash;
          s.events.pending = [{ eventId: id }];
          const r = resolveEvent(s, choice.id);
          expect(r.feedback.ok, `${id}/${choice.id}: ${r.feedback.error}`).toBe(true);
          expect(r.state.finance.cash, `${id}/${choice.id}`).toBeGreaterThanOrEqual(0);
          if (i === 0) expect(r.state.finance.cash, `${id} safe choice`).toBe(cash);
        });
      }
    }
  });
});
