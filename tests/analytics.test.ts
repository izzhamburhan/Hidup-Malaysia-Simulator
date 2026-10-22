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

  it('removes characters outside a safe set', () => {
    const out = sanitizeEvent('tab_view', { tab: 'home<script>' });
    expect(out?.data.tab).toBe('homescript');
  });
});
