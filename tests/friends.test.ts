import { describe, expect, it } from 'vitest';
import { interests, npcNames, traits } from '../src/data/lifestyle';
import { processDayEnd } from '../src/engine/daily';
import { MAX_CIRCLE, friendTier, makeFriend, maybeMeetFriend, starterCircle } from '../src/engine/friends';
import { performAction, viewAction } from '../src/engine/simulationEngine';
import { at, makeGame } from './helpers';

describe('friendTier', () => {
  it('splits closeness at 30 and 70', () => {
    expect(friendTier(0)).toBe('kenalan');
    expect(friendTier(29)).toBe('kenalan');
    expect(friendTier(29.9)).toBe('kenalan');
    expect(friendTier(30)).toBe('kawan');
    expect(friendTier(69)).toBe('kawan');
    expect(friendTier(70)).toBe('kawan-baik');
    expect(friendTier(100)).toBe('kawan-baik');
  });
});

describe('starterCircle', () => {
  it('gives two named friends from school, closeness 35 to 50', () => {
    const circle = starterCircle('1234|Tester', 0);
    expect(circle).toHaveLength(2);
    for (const f of circle) {
      expect(npcNames).toContain(f.name);
      expect(traits).toContain(f.trait);
      expect(interests).toContain(f.interest);
      expect(f.closeness).toBeGreaterThanOrEqual(35);
      expect(f.closeness).toBeLessThanOrEqual(50);
      expect(f.where).toBe('school');
      expect(f.metDay).toBe(0);
    }
    expect(new Set(circle.map((f) => f.name)).size).toBe(2);
    expect(new Set(circle.map((f) => f.id)).size).toBe(2);
  });

  it('is a pure function of its key (same key, same friends; other keys differ)', () => {
    expect(starterCircle('1234|Tester', 0)).toEqual(starterCircle('1234|Tester', 0));
    const names = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((k) => starterCircle(`${k}|Tester`, 0).map((f) => f.name).join()));
    expect(names.size).toBeGreaterThan(1);
  });

  it('skips names that are already taken', () => {
    const first = starterCircle('7|X', 0);
    const again = starterCircle('7|X', 0, first.map((f) => f.name));
    for (const f of again) expect(first.map((x) => x.name)).not.toContain(f.name);
  });

  it('starts a new friend free to be lepak-ed with the same day', () => {
    for (const f of starterCircle('k', 40)) {
      expect(f.lastSeenDay).toBeLessThan(40);
      expect(f.lastChatDay).toBeLessThan(40);
      expect(40 - f.lastGiftDay).toBeGreaterThanOrEqual(7);
    }
  });
});

describe('makeFriend', () => {
  it('builds a friend at closeness 12 to 25 from the rng, never repeating anyone known', () => {
    const s = makeGame();
    s.relationships.partner = { id: 'p', name: 'Aiman', trait: 'chill', interest: 'music festivals', stage: 'dating', trust: 50, compatibility: 50, satisfaction: 50, sinceDay: 0, lastContactDay: 0, longDistance: false, memories: [] };
    s.relationships.prospects = [{ id: 'x', name: 'Nurul', trait: 'funny', interest: 'hiking', compatibility: 50, metDay: 0 }];
    s.relationships.exes = ['Farah'];
    const known = new Set([s.relationships.partner.name, 'Nurul', 'Farah', ...s.relationships.circle.map((f) => f.name)]);
    const before = s.rng;
    const f = makeFriend(s, 'event');
    expect(f).not.toBeNull();
    expect(s.rng).not.toBe(before);
    expect(known.has(f!.name)).toBe(false);
    expect(f!.closeness).toBeGreaterThanOrEqual(12);
    expect(f!.closeness).toBeLessThanOrEqual(25);
    expect(f!.where).toBe('event');
    expect(f!.metDay).toBe(s.clock.day);
  });

  it('caps the circle at 8', () => {
    expect(MAX_CIRCLE).toBe(8);
    const s = makeGame();
    while (s.relationships.circle.length < MAX_CIRCLE) {
      const f = makeFriend(s, 'event');
      s.relationships.circle.push(f!);
    }
    const before = s.rng;
    expect(makeFriend(s, 'event')).toBeNull();
    expect(s.rng).toBe(before);
  });
});

/** A game at noon on day 3 with cash in hand and a known first friend. */
function noon() {
  const s = at(makeGame(), 3, 12);
  s.finance.cash = 500;
  return { s, friend: s.relationships.circle[0] };
}

describe('friend-chat', () => {
  it('adds 3 closeness for free, takes 10 minutes, once a day per friend', () => {
    const { s, friend } = noon();
    const before = friend.closeness;
    const cash = s.finance.cash;
    const r = performAction(s, 'friend-chat', friend.id);
    expect(r.feedback.ok).toBe(true);
    const after = r.state.relationships.circle[0];
    expect(after.closeness).toBe(before + 3);
    expect(after.lastChatDay).toBe(3);
    expect(r.state.finance.cash).toBe(cash);
    expect(r.state.clock.minute - s.clock.minute).toBe(10);
    const again = viewAction(r.state, 'friend-chat', friend.id)!;
    expect(again.available).toBe(false);
    expect(again.reason).toBe(`You already messaged ${friend.name} today.`);
    // The other friend is still open, and tomorrow is a new day.
    expect(viewAction(r.state, 'friend-chat', r.state.relationships.circle[1].id)!.available).toBe(true);
    expect(viewAction(at(structuredClone(r.state), 4, 12), 'friend-chat', friend.id)!.available).toBe(true);
  });

  it('does not mutate the input state', () => {
    const { s, friend } = noon();
    const copy = structuredClone(s);
    performAction(s, 'friend-chat', friend.id);
    expect(s).toEqual(copy);
  });
});

describe('friend-hangout', () => {
  it('costs RM25 and energy, lifts closeness, the friends meter and mood, and counts as socialising', () => {
    const { s, friend } = noon();
    s.stats.happiness = 50;
    s.stats.stress = 50;
    const r = performAction(s, 'friend-hangout', friend.id);
    expect(r.feedback.ok).toBe(true);
    const after = r.state.relationships.circle[0];
    expect(after.closeness).toBe(friend.closeness + 8);
    expect(after.lastSeenDay).toBe(3);
    expect(r.state.finance.cash).toBe(475);
    expect(r.state.relationships.friends).toBe(s.relationships.friends + 3);
    expect(r.state.relationships.lastFriendsDay).toBe(3);
    expect(r.state.today.socialised).toBe(true);
    expect(r.state.stats.energy).toBeLessThan(s.stats.energy);
    expect(r.state.stats.happiness).toBeGreaterThan(50);
    expect(r.state.stats.stress).toBeLessThan(50);
    expect(r.state.clock.minute - s.clock.minute).toBe(150);
  });

  it('explains every reason it is unavailable', () => {
    const { s, friend } = noon();
    const view = (state: typeof s) => viewAction(state, 'friend-hangout', friend.id)!;
    expect(view(at(structuredClone(s), 3, 8)).reason).toBe('Best 10AM–11PM.');
    expect(view(at(structuredClone(s), 3, 23, 30)).reason).toBe('Best 10AM–11PM.');
    const poor = structuredClone(s);
    poor.finance.cash = 10;
    expect(view(poor).reason).toBe('Not enough cash.');
    const done = performAction(s, 'friend-hangout', friend.id).state;
    expect(view(at(done, 3, 16)).reason).toBe(`You already lepak-ed with ${friend.name} today.`);
  });

  it('keeps closeness at 100 and cash at or above 0', () => {
    const { s, friend } = noon();
    s.relationships.circle[0].closeness = 98;
    s.finance.cash = 25;
    const r = performAction(s, 'friend-hangout', friend.id);
    expect(r.state.relationships.circle[0].closeness).toBe(100);
    expect(r.state.finance.cash).toBe(0);
  });
});

describe('friend-gift', () => {
  it('costs RM30 and adds 10 closeness, once every 7 days per friend', () => {
    const { s, friend } = noon();
    const r = performAction(s, 'friend-gift', friend.id);
    expect(r.feedback.ok).toBe(true);
    expect(r.state.relationships.circle[0].closeness).toBe(friend.closeness + 10);
    expect(r.state.finance.cash).toBe(470);
    expect(r.state.clock.minute - s.clock.minute).toBe(15);
    const view = (day: number) => viewAction(at(structuredClone(r.state), day, 12), 'friend-gift', friend.id)!;
    expect(view(3).reason).toBe(`You sent ${friend.name} something recently. Give it a few days.`);
    expect(view(9).available).toBe(false);
    expect(view(10).available).toBe(true);
  });

  it('needs the cash', () => {
    const { s, friend } = noon();
    s.finance.cash = 29;
    expect(viewAction(s, 'friend-gift', friend.id)!.reason).toBe('Not enough cash.');
  });
});

describe('unknown friend', () => {
  it('is refused with a reason by all three actions', () => {
    const { s } = noon();
    for (const id of ['friend-chat', 'friend-hangout', 'friend-gift']) {
      const v = viewAction(s, id, 'friend-nope')!;
      expect(v.available, id).toBe(false);
      expect(v.reason, id).toBe('That friend is no longer around.');
      const r = performAction(s, id, 'friend-nope');
      expect(r.feedback.ok, id).toBe(false);
      expect(r.state, id).toBe(s);
    }
  });
});

describe('determinism', () => {
  it('same seed and same actions give the same state', () => {
    const run = () => {
      const { s, friend } = noon();
      let state = performAction(s, 'friend-chat', friend.id).state;
      state = performAction(state, 'friend-gift', friend.id).state;
      return performAction(state, 'friend-hangout', friend.id).state;
    };
    expect(run()).toEqual(run());
  });
});

describe('meeting friends', () => {
  const fill = (s: ReturnType<typeof makeGame>) => {
    while (s.relationships.circle.length < MAX_CIRCLE) s.relationships.circle.push(makeFriend(s, 'event')!);
  };
  const newcomers = (before: ReturnType<typeof makeGame>, after: ReturnType<typeof makeGame>) => after.relationships.circle.length - before.relationships.circle.length;

  it('meet-people always adds a friend while the circle has room', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const s = at(makeGame({ seed }), 3, 19);
      s.finance.cash = 500;
      const r = performAction(s, 'meet-people');
      expect(r.feedback.ok).toBe(true);
      expect(newcomers(s, r.state), `seed ${seed}`).toBe(1);
      const added = r.state.relationships.circle.at(-1)!;
      expect(added.where).toBe('event');
      expect(added.closeness).toBeGreaterThanOrEqual(12);
      expect(r.feedback.lines.join(' ')).toContain(added.name);
    }
  });

  it('meet-people adds none when the circle is full, and never passes 8', () => {
    const s = at(makeGame(), 3, 19);
    s.finance.cash = 500;
    fill(s);
    const r = performAction(s, 'meet-people');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.relationships.circle).toHaveLength(MAX_CIRCLE);
  });

  it('new friends never share a name with anyone in your life', () => {
    let state = at(makeGame(), 3, 19);
    state.finance.cash = 5000;
    for (let i = 0; i < 6; i++) {
      state = at(performAction(state, 'meet-people').state, 3 + i, 19);
      state.finance.cash = 5000;
    }
    const r = state.relationships;
    const names = [...r.circle.map((f) => f.name), ...r.prospects.map((p) => p.name), ...(r.partner ? [r.partner.name] : []), ...r.exes];
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(r.circle.map((f) => f.id)).size).toBe(r.circle.length);
  });

  // Share of seeds where one run of the action brings a friend home.
  const rate = (setup: (seed: number) => ReturnType<typeof makeGame>, id: string, seeds = 400) => {
    let met = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const s = setup(seed);
      const r = performAction(s, id);
      expect(r.feedback.ok, `${id} seed ${seed}`).toBe(true);
      met += newcomers(s, r.state);
    }
    return met / seeds;
  };
  const evening = (seed: number, hour: number) => {
    const s = at(makeGame({ seed }), 3, hour);
    s.finance.cash = 500;
    return s;
  };

  it('mamak brings a friend about 15% of the time', () => {
    const r = rate((seed) => evening(seed, 20), 'mamak');
    expect(r).toBeGreaterThan(0.09);
    expect(r).toBeLessThan(0.21);
  });

  it('networking brings a friend about 20% of the time', () => {
    const r = rate((seed) => evening(seed, 19), 'networking');
    expect(r).toBeGreaterThan(0.14);
    expect(r).toBeLessThan(0.26);
  });

  it('attend-class brings a friend about 6% of the time', () => {
    const r = rate((seed) => makeGame({ seed, lifeStage: 'student', universityId: 'um', courseId: 'cs' }), 'attend-class', 800);
    expect(r).toBeGreaterThan(0.025);
    expect(r).toBeLessThan(0.1);
  });

  it('work-shift brings a friend about 5% of the time', () => {
    const r = rate((seed) => makeGame({ seed, lifeStage: 'working', jobId: 'swe' }), 'work-shift', 800);
    expect(r).toBeGreaterThan(0.02);
    expect(r).toBeLessThan(0.09);
  });

  it('a full circle costs no friend rolls and gains no friend from any hook', () => {
    expect(rate((seed) => { const s = evening(seed, 20); fill(s); return s; }, 'mamak', 60)).toBe(0);
    expect(rate((seed) => { const s = evening(seed, 19); fill(s); return s; }, 'networking', 60)).toBe(0);
    const s = makeGame();
    fill(s);
    const rng = s.rng;
    expect(maybeMeetFriend(s, 1, 'work')).toBeNull();
    expect(s.rng).toBe(rng);
  });
});

describe('daily circle', () => {
  const endDay = (s: ReturnType<typeof makeGame>, day: number) => {
    s.clock.day = day;
    processDayEnd(s);
    return s;
  };

  it('a friend you have not seen or messaged for more than 7 days loses 0.5 closeness a day', () => {
    const quiet = makeGame();
    const [a] = quiet.relationships.circle;
    const start = a.closeness;
    expect(endDay(structuredClone(quiet), 7).relationships.circle[0].closeness).toBe(start);
    expect(endDay(structuredClone(quiet), 8).relationships.circle[0].closeness).toBe(start - 0.5);
  });

  it('a hangout, a message or a gift resets the drift', () => {
    for (const field of ['lastSeenDay', 'lastChatDay', 'lastGiftDay'] as const) {
      const s = makeGame();
      const start = s.relationships.circle[0].closeness;
      s.relationships.circle[0][field] = 10;
      expect(endDay(s, 12).relationships.circle[0].closeness, field).toBe(start);
    }
  });

  it('a friend whose closeness reaches 0 leaves with a log line', () => {
    const s = makeGame();
    const [gone, kept] = s.relationships.circle;
    gone.closeness = 0.4;
    kept.lastChatDay = 19;
    endDay(s, 20);
    expect(s.relationships.circle.map((f) => f.id)).toEqual([kept.id]);
    expect(s.log.some((l) => l.text === `You and ${gone.name} drifted apart.`)).toBe(true);
  });

  it('each close friend adds 0.1 happiness a day', () => {
    const base = makeGame();
    base.relationships.circle.forEach((f) => (f.closeness = 50));
    const one = structuredClone(base);
    one.relationships.circle[0].closeness = 75;
    const two = structuredClone(base);
    two.relationships.circle.forEach((f) => (f.closeness = 75));
    const h = (s: ReturnType<typeof makeGame>) => endDay(s, 0).stats.happiness;
    const plain = h(base);
    expect(h(one) - plain).toBeCloseTo(0.1, 5);
    expect(h(two) - plain).toBeCloseTo(0.2, 5);
  });

  it('keeps closeness within 0 and 100', () => {
    const s = makeGame();
    s.relationships.circle[0].closeness = 99.8;
    performAction(at(s, 3, 12), 'friend-chat', s.relationships.circle[0].id);
    const r = performAction(at(structuredClone(s), 3, 12), 'friend-gift', s.relationships.circle[0].id);
    for (const f of endDay(r.state, 40).relationships.circle) {
      expect(f.closeness).toBeGreaterThanOrEqual(0);
      expect(f.closeness).toBeLessThanOrEqual(100);
    }
  });
});
