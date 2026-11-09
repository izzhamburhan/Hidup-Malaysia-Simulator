import { describe, expect, it } from 'vitest';
import { netWorth } from '../src/engine/core';
import {
  CODE_ALPHABET,
  HISTORY_LIMIT,
  MAX_REAL_FRIENDS,
  MESSAGE_MAX,
  chatIdOf,
  formatCode,
  giftDayKey,
  giftDocId,
  newFriendCode,
  parseCode,
  prepareMessage,
  profileSnapshot,
  rankFriends,
  validateDisplayName,
  type ProfileSnapshot,
  type RankEntry,
} from '../src/lib/social';
import { makeGame } from './helpers';

function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('friend codes', () => {
  it('uses an alphabet without 0, O, 1, I and L', () => {
    for (const bad of ['0', 'O', '1', 'I', 'L']) expect(CODE_ALPHABET).not.toContain(bad);
    expect(new Set(CODE_ALPHABET).size).toBe(CODE_ALPHABET.length);
  });

  it('makes 6 characters from the alphabet using only the injected source', () => {
    const code = newFriendCode(seq([0, 0.5, 0.999, 0.1, 0.2, 0.3]));
    expect(code).toHaveLength(6);
    for (const ch of code) expect(CODE_ALPHABET).toContain(ch);
    expect(newFriendCode(() => 0)).toBe('AAAAAA');
    expect(newFriendCode(() => 1)).toBe('999999');
    expect(newFriendCode(() => Number.NaN)).toBe('AAAAAA');
    expect(newFriendCode(seq([0.1, 0.2]))).toBe(newFriendCode(seq([0.1, 0.2])));
  });

  it('formats as HM-XXXXXX', () => {
    expect(formatCode('ABC234')).toBe('HM-ABC234');
  });

  it('parses the common ways to type a code', () => {
    expect(parseCode('HM-ABC234')).toBe('ABC234');
    expect(parseCode('hm-abc234')).toBe('ABC234');
    expect(parseCode('  hm abc 234 ')).toBe('ABC234');
    expect(parseCode('abc234')).toBe('ABC234');
    expect(parseCode('ABC-234')).toBe('ABC234');
    expect(parseCode('HMA234')).toBe('HMA234');
    expect(parseCode('HM-HMA234')).toBe('HMA234');
  });

  it('refuses anything else', () => {
    for (const bad of ['', 'ABC23', 'ABC2345', 'ABC230', 'ABCO34', 'AB!234', 'HM-', 'hello world']) expect(parseCode(bad), bad).toBeNull();
    expect(parseCode(undefined as unknown as string)).toBeNull();
  });
});

describe('display names', () => {
  it('accepts 3 to 16 letters, digits and single spaces, accents included', () => {
    for (const ok of ['Aisyah', 'Mat Rempit 88', 'Zoë', 'Nur Aina Sofea1', 'abc', 'a'.repeat(16), 'Ahmad 2']) expect(validateDisplayName(ok), ok).toBeNull();
  });

  it('refuses a bad length', () => {
    expect(validateDisplayName('ab')).toMatch(/3 to 16/);
    expect(validateDisplayName('a'.repeat(17))).toMatch(/3 to 16/);
    expect(validateDisplayName('')).toMatch(/3 to 16/);
  });

  it('refuses untrimmed names, double spaces and symbols', () => {
    expect(validateDisplayName(' Aisyah')).toBe('Remove the spaces at the start and the end.');
    expect(validateDisplayName('Aisyah ')).toBe('Remove the spaces at the start and the end.');
    expect(validateDisplayName('Nur  Aina')).toBe('Use letters, numbers and single spaces only.');
    expect(validateDisplayName('Aisyah!')).toBe('Use letters, numbers and single spaces only.');
    expect(validateDisplayName('Ai_syah')).toBe('Use letters, numbers and single spaces only.');
    expect(validateDisplayName('Cool 😀')).toBe('Use letters, numbers and single spaces only.');
  });

  it('refuses blocked words, including split and leetspeak ones', () => {
    for (const bad of ['Fuck', 'SH1T', 'Pu Ki', 'bangsat', 'Anjing', 'Mat Sial']) {
      expect(validateDisplayName(bad), bad).toBe('Please pick a different name.');
    }
  });

  it('refuses names that carry a phone number', () => {
    expect(validateDisplayName('0123456789')).toBe('Please pick a different name.');
    expect(validateDisplayName('wa 012 3456789')).toBe('Please pick a different name.');
  });

  it('does not refuse innocent names that contain a fragment', () => {
    for (const ok of ['Cassandra', 'Scunthorpe', 'Classy Amir', 'Dickson']) expect(validateDisplayName(ok), ok).toBeNull();
  });
});

describe('ids', () => {
  it('chatIdOf is the same from both sides and sorted', () => {
    expect(chatIdOf('b', 'a')).toBe('a_b');
    expect(chatIdOf('a', 'b')).toBe('a_b');
  });

  it('giftDocId is from and day key', () => {
    expect(giftDocId('u1', '20400')).toBe('u1_20400');
  });

  it('giftDayKey counts days since the epoch in Malaysia time and rolls over at midnight there', () => {
    const before = giftDayKey(Date.parse('2026-11-09T15:59:59Z')); // 23:59:59 in Malaysia
    const after = giftDayKey(Date.parse('2026-11-09T16:00:00Z')); // 00:00:00 the next day in Malaysia
    expect(before).toMatch(/^\d+$/);
    expect(Number(after)).toBe(Number(before) + 1);
    expect(giftDayKey(Date.parse('2026-11-09T00:00:00Z'))).toBe(before);
    expect(giftDayKey(Date.parse('1970-01-01T00:00:00Z'))).toBe('0');
    expect(giftDayKey(Date.parse('1970-01-01T16:00:00Z'))).toBe('1');
  });

  it('exposes the limits', () => {
    expect(MAX_REAL_FRIENDS).toBe(50);
    expect(MESSAGE_MAX).toBe(200);
    expect(HISTORY_LIMIT).toBe(50);
  });
});

describe('prepareMessage', () => {
  it('trims and keeps a normal message', () => {
    expect(prepareMessage('  Jom lepak  ')).toEqual({ ok: true, text: 'Jom lepak' });
  });

  it('refuses empty and whitespace-only', () => {
    expect(prepareMessage('')).toEqual({ ok: false, error: 'Write a message first.' });
    expect(prepareMessage('   \n ')).toEqual({ ok: false, error: 'Write a message first.' });
  });

  it('allows exactly 200 characters and refuses 201', () => {
    expect(prepareMessage('a'.repeat(200)).ok).toBe(true);
    expect(prepareMessage('a'.repeat(201))).toEqual({ ok: false, error: 'Messages can be up to 200 characters.' });
  });

  it('counts an emoji as one character', () => {
    expect(prepareMessage('😀'.repeat(200)).ok).toBe(true);
    expect(prepareMessage('😀'.repeat(201)).ok).toBe(false);
  });

  it('masks blocked words, links and phone numbers', () => {
    expect(prepareMessage('you are sial')).toEqual({ ok: true, text: 'you are ****' });
    expect(prepareMessage('call 0123456789 or www.x.com')).toEqual({ ok: true, text: 'call [hidden] or [hidden]' });
  });

  it('refuses a message that grows past the limit once links are hidden', () => {
    expect(prepareMessage('a.co '.repeat(40).trim()).ok).toBe(false);
  });
});

function snap(over: Partial<ProfileSnapshot> = {}): ProfileSnapshot {
  return { ...profileSnapshot(makeGame()), ...over };
}

describe('profileSnapshot', () => {
  it('publishes the visible parts of a life', () => {
    const state = makeGame({ name: 'Zainal Abidin Secret', seed: 9 });
    const s = profileSnapshot(state);
    expect(s.appearance).toEqual(state.character.appearance);
    expect(s.appearance).not.toBe(state.character.appearance);
    expect(s.lifeStage).toBe('fresh_grad');
    expect(s.state).toBe(state.location.state);
    expect(s.age).toBe(23);
    expect(s.day).toBe(0);
    expect(s.achievements).toBe(Object.keys(state.achievements).length);
    expect(s.stamps).toBe(Object.keys(state.travel.stamps).length);
    expect(s.jobTitle).toBe(state.career.job?.title ?? null);
    expect(typeof s.stageLabel).toBe('string');
  });

  it('never carries the character name or exact money, and does not change the state', () => {
    const state = makeGame({ name: 'Zainal Abidin Secret', seed: 9 });
    state.finance.cash = 4321.77;
    const before = JSON.stringify(state);
    const s = profileSnapshot(state);
    expect(JSON.stringify(state)).toBe(before);
    const text = JSON.stringify(s);
    expect(text).not.toContain('Zainal');
    expect(text).not.toContain('Secret');
    expect(text).not.toContain('4321');
    expect(text).not.toContain(String(netWorth(state)));
    expect(s.netWorthBand).toMatch(/^rm/);
  });

  it('shows the net worth only as a band and an ordinal', () => {
    const state = makeGame();
    state.finance.cash = 0;
    state.finance.savings = 0;
    state.finance.emergencyFund = 0;
    state.finance.unitTrust = 0;
    state.finance.epfBalance = 0;
    state.finance.debts = [];
    const poor = profileSnapshot(state);
    state.finance.savings = 30000;
    const richer = profileSnapshot(state);
    state.finance.savings = 400000;
    const rich = profileSnapshot(state);
    expect(poor.netWorthRank).toBeLessThan(richer.netWorthRank);
    expect(richer.netWorthRank).toBeLessThan(rich.netWorthRank);
    expect(richer.netWorthBand).toBe('rm20k-50k');
    expect(rich.netWorthBand).toBe('rm150k-plus');
    state.finance.savings = 0;
    state.finance.debts = [{ id: 'd', kind: 'personal', label: 'x', principal: 500, balance: 500, monthlyPayment: 10, annualRate: 0 }];
    const owing = profileSnapshot(state);
    expect(owing.netWorthBand).toBe('neg');
    expect(owing.netWorthRank).toBe(-1);
  });

  it('follows the life: job title and age', () => {
    const state = makeGame({ seed: 4 });
    state.career.job = {
      jobId: 'swe', companyId: 'x', title: 'Software Developer', schedule: 'fulltime', monthlySalary: 4000, shiftPay: 0, level: 0,
      startDay: 0, levelSinceDay: 0, performance: 50, lastReviewDay: 0, overtimeHoursThisMonth: 0, daysWorkedThisMonth: 0, absencesThisMonth: 0,
    };
    state.clock.day = 400;
    const s = profileSnapshot(state);
    expect(s.jobTitle).toBe('Software Developer');
    expect(s.age).toBe(24);
    expect(s.day).toBe(400);
  });

  it('is a pure function of the state: same state, same snapshot', () => {
    expect(profileSnapshot(makeGame({ seed: 77 }))).toEqual(profileSnapshot(makeGame({ seed: 77 })));
  });
});

describe('rankFriends', () => {
  const entry = (uid: string, displayName: string, over: Partial<ProfileSnapshot>, me = false): RankEntry => ({ uid, displayName, snapshot: snap(over), ...(me ? { me } : {}) });
  const entries = [
    entry('1', 'Mira', { achievements: 5, day: 100, stamps: 1, netWorthRank: 2 }),
    entry('2', 'Amir', { achievements: 9, day: 50, stamps: 3, netWorthRank: 4 }, true),
    entry('3', 'Zack', { achievements: 5, day: 300, stamps: 3, netWorthRank: 4 }),
    entry('4', 'Bella', { achievements: 5, day: 100, stamps: 0, netWorthRank: -1 }),
  ];

  it('ranks by achievements, highest first, ties by name', () => {
    const r = rankFriends(entries, 'achievements');
    expect(r.map((e) => e.displayName)).toEqual(['Amir', 'Bella', 'Mira', 'Zack']);
    expect(r.map((e) => e.place)).toEqual([1, 2, 2, 2]);
    expect(r.map((e) => e.value)).toEqual([9, 5, 5, 5]);
  });

  it('ranks by days, stamps and net worth', () => {
    expect(rankFriends(entries, 'days').map((e) => e.displayName)).toEqual(['Zack', 'Bella', 'Mira', 'Amir']);
    expect(rankFriends(entries, 'days').map((e) => e.place)).toEqual([1, 2, 2, 4]);
    expect(rankFriends(entries, 'stamps').map((e) => e.displayName)).toEqual(['Amir', 'Zack', 'Mira', 'Bella']);
    expect(rankFriends(entries, 'networth').map((e) => e.displayName)).toEqual(['Amir', 'Zack', 'Mira', 'Bella']);
  });

  it('keeps the me flag, is stable and does not touch the input', () => {
    const copy = JSON.stringify(entries);
    const r = rankFriends(entries, 'achievements');
    expect(r.find((e) => e.me)?.displayName).toBe('Amir');
    expect(JSON.stringify(entries)).toBe(copy);
    expect(rankFriends([...entries].reverse(), 'achievements').map((e) => e.uid)).toEqual(r.map((e) => e.uid));
  });

  it('orders equal names by uid and handles an empty list', () => {
    const twin = [entry('b', 'Sam', {}), entry('a', 'Sam', {})];
    expect(rankFriends(twin, 'days').map((e) => e.uid)).toEqual(['a', 'b']);
    expect(rankFriends([], 'days')).toEqual([]);
  });
});
