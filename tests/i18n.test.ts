import { describe, expect, it } from 'vitest';
import { STRINGS, translate, type StringKey } from '../src/i18n';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('UI translations', () => {
  it('has every English key in Bahasa Malaysia, non-empty, with the same placeholders', () => {
    for (const key of Object.keys(STRINGS.en) as StringKey[]) {
      const ms = STRINGS.ms[key];
      expect(ms, key).toBeTruthy();
      expect(placeholders(ms), key).toEqual(placeholders(STRINGS.en[key]));
    }
  });

  it('fills placeholders and falls back to English', () => {
    expect(translate('ms', 'land.continue', { name: 'Aina' })).toBe('Sambung hidup Aina');
    expect(translate('en', 'daily.label', { d: 3 })).toBe('Daily challenge · day 3/7');
    expect(translate('en', 'nav.home')).toBe('Home');
  });
});