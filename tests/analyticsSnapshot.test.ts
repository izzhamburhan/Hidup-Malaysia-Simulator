import { describe, expect, it } from 'vitest';
import { bandOf, lifeSnapshot, statBand } from '../src/lib/analyticsSnapshot';
import { makeGame } from './helpers';

const ctx = { lang: 'en', installed: false, signedIn: false, lives: 1 };

describe('money bands', () => {
  const cash = [0, 100, 500, 1000, 3000, 10000];

  it('puts a value in the band it falls in, with plain labels', () => {
    expect(bandOf(0, cash)).toBe('rm0-100');
    expect(bandOf(99.99, cash)).toBe('rm0-100');
    expect(bandOf(100, cash)).toBe('rm100-500');
    expect(bandOf(999, cash)).toBe('rm500-1k');
    expect(bandOf(2999, cash)).toBe('rm1k-3k');
    expect(bandOf(9999, cash)).toBe('rm3k-10k');
    expect(bandOf(10000, cash)).toBe('rm10k-plus');
    expect(bandOf(5_000_000, cash)).toBe('rm10k-plus');
  });

  it('labels negative and unusable values without leaking a number', () => {
    expect(bandOf(-1, cash)).toBe('neg');
    expect(bandOf(Number.NaN, cash)).toBe('na');
    expect(bandOf(Number.POSITIVE_INFINITY, cash)).toBe('na');
  });

  it('only ever produces short safe labels', () => {
    for (const v of [-5, 0, 1, 99, 100, 750, 4000, 12000, 1e9]) expect(bandOf(v, cash)).toMatch(/^[a-z0-9-]{1,16}$/);
  });
});

describe('stat bands', () => {
  it('splits 0 to 100 into low, mid and high', () => {
    expect(statBand(0)).toBe('low');
    expect(statBand(33)).toBe('low');
    expect(statBand(34)).toBe('mid');
    expect(statBand(66)).toBe('mid');
    expect(statBand(67)).toBe('high');
    expect(statBand(100)).toBe('high');
  });
});

describe('life snapshot', () => {
  it('carries the character choices and the situation', () => {
    const s = makeGame({ seed: 11, homeState: 'Johor' });
    const snap = lifeSnapshot(s, { lang: 'ms', installed: true, signedIn: true, lives: 2 });
    expect(snap).toMatchObject({
      mode: 'realistic',
      stage: 'fresh_grad',
      background: 'middle',
      home_state: 'Johor',
      residence: s.location.state,
      lang: 'ms',
      installed: true,
      signed_in: true,
      lives: 2,
      pet: false,
      vehicle: false,
    });
    expect(typeof snap.employed).toBe('boolean');
    expect(snap.partner).toBe('none');
  });

  it('reflects job, partner, pet and vehicle when present', () => {
    const s = makeGame({ seed: 12 });
    s.career.job = { jobId: 'barista', companyId: 'x', title: 'Barista', schedule: 'parttime', monthlySalary: 0, shiftPay: 50, level: 1, startDay: 0, levelSinceDay: 0, performance: 50, lastReviewDay: 0, overtimeHoursThisMonth: 0, daysWorkedThisMonth: 0, absencesThisMonth: 0 };
    s.pet = { name: 'Oyen', species: 'cat', adoptedDay: 1, fullness: 50, mood: 50, lastFedDay: 1, lastPlayedDay: 1, timesFed: 0 };
    s.transport.vehicleId = 'myvi';
    const snap = lifeSnapshot(s, ctx);
    expect(snap).toMatchObject({ employed: true, job: 'barista', pet: true, vehicle: true });
  });

  it('turns money into bands, including debt and net worth', () => {
    const s = makeGame({ seed: 13 });
    s.finance.cash = 1234.56;
    s.finance.savings = 3000;
    s.finance.emergencyFund = 500;
    s.finance.epfBalance = 0;
    s.finance.debts = [];
    const snap = lifeSnapshot(s, ctx);
    expect(snap.cash_band).toBe('rm1k-3k');
    expect(snap.savings_band).toBe('rm2k-10k');
    expect(snap.epf_band).toBe('rm0-1k');
    expect(snap.debt_band).toBe('none');
    expect(String(snap.networth_band)).toMatch(/^rm/);
  });

  it('never contains the character name or an exact amount', () => {
    const s = makeGame({ seed: 14, name: 'Aisyah Binti Rahman' });
    s.finance.cash = 1234.56;
    s.finance.savings = 7654.32;
    const snap = lifeSnapshot(s, ctx);
    const text = JSON.stringify(snap).toLowerCase();
    expect(text).not.toContain('aisyah');
    expect(text).not.toContain('rahman');
    expect(text).not.toContain('1234');
    expect(text).not.toContain('7654');
    for (const [key, value] of Object.entries(snap)) {
      if (key.endsWith('_band')) expect(value).toMatch(/^[a-z0-9-]{1,16}$/);
      expect(['name', 'cash', 'savings', 'money']).not.toContain(key);
    }
  });

  it('does not change the state it reads', () => {
    const s = makeGame({ seed: 15 });
    const before = JSON.stringify(s);
    lifeSnapshot(s, ctx);
    expect(JSON.stringify(s)).toBe(before);
  });
});