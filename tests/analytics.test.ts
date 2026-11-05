import { describe, expect, it } from 'vitest';
import { sanitizeEvent, shouldTrack } from '../src/lib/analytics';

const base = { configured: true, optedOut: false, doNotTrack: false, hostname: 'izzhamburhan.github.io' };

describe('analytics gate', () => {
  it('tracks only when configured, allowed and on a real host', () => {
    expect(shouldTrack(base)).toBe(true);
    expect(shouldTrack({ ...base, configured: false })).toBe(false);
    expect(shouldTrack({ ...base, optedOut: true })).toBe(false);
    expect(shouldTrack({ ...base, doNotTrack: true })).toBe(false);
    expect(shouldTrack({ ...base, hostname: 'localhost' })).toBe(false);
    expect(shouldTrack({ ...base, hostname: '127.0.0.1' })).toBe(false);
  });
});

describe('analytics event sanitising', () => {
  it('passes allow-listed events and fields', () => {
    expect(sanitizeEvent('action', { id: 'eat', category: 'food', source: 'tile' })).toEqual({
      name: 'action',
      data: { id: 'eat', category: 'food', source: 'tile' },
    });
  });

  it('drops unknown events', () => {
    expect(sanitizeEvent('player_secret', { id: 'x' })).toBeNull();
  });

  it('drops unknown fields such as the character name or money', () => {
    const out = sanitizeEvent('game_start', { mode: 'realistic', name: 'Aisyah', cash: 1500, stage: 'student' } as never);
    expect(out?.data).toEqual({ mode: 'realistic', stage: 'student' });
  });

  it('truncates long strings and keeps numbers and booleans', () => {
    const out = sanitizeEvent('feedback', { topic: 'x'.repeat(100), rating: 4 });
    expect(out?.data.topic).toHaveLength(40);
    expect(out?.data.rating).toBe(4);
  });

  it('accepts the milestone snapshot fields and money only as bands', () => {
    const out = sanitizeEvent('day_reached', { day: 30, mode: 'realistic', home_state: 'Pulau Pinang', cash_band: 'rm1k-3k', savings_band: 'rm2k-10k', employed: true, lives: 2, lang: 'ms' });
    expect(out?.data).toEqual({ day: 30, mode: 'realistic', home_state: 'Pulau Pinang', cash_band: 'rm1k-3k', savings_band: 'rm2k-10k', employed: true, lives: 2, lang: 'ms' });
  });

  it('drops a number in a band field and any exact-money field', () => {
    const out = sanitizeEvent('day_reached', { cash_band: 1500, savings_band: '1500.50 ringgit!', networth_band: 'rm0-100', cash: 1500, savings: 3000, money: 9, name: 'Aisyah' } as never);
    expect(out?.data).toEqual({ networth_band: 'rm0-100' });
  });

  it('accepts the session summary, and the account, life, create and problem events', () => {
    expect(sanitizeEvent('session', { actions: 12, events: 2, games: 1, days: 3, minutes: 14, top1: 'eat', mix: 'food:5 work:3' })?.data).toEqual({ actions: 12, events: 2, games: 1, days: 3, minutes: 14, top1: 'eat', mix: 'food:5 work:3' });
    expect(sanitizeEvent('account', { source: 'signin' })?.name).toBe('account');
    expect(sanitizeEvent('life', { source: 'new_extra', lives: 2 })?.data).toEqual({ source: 'new_extra', lives: 2 });
    expect(sanitizeEvent('create', { source: 'open' })?.name).toBe('create');
    expect(sanitizeEvent('problem', { source: 'cloud_permission' })?.data).toEqual({ source: 'cloud_permission' });
  });

  it('removes characters outside a safe set', () => {
    const out = sanitizeEvent('tab_view', { tab: 'home<script>' });
    expect(out?.data.tab).toBe('homescript');
  });
});