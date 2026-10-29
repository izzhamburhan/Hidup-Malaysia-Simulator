import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STATUTORY_DISCLAIMER } from '../src/data/statutory';
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

  it('has no Bahasa Malaysia key without an English one', () => {
    expect(Object.keys(STRINGS.ms).sort()).toEqual(Object.keys(STRINGS.en).sort());
  });

  it('fills placeholders and falls back to English', () => {
    expect(translate('ms', 'land.continue', { name: 'Aina' })).toBe('Sambung hidup Aina');
    expect(translate('en', 'daily.label', { d: 3 })).toBe('Daily challenge · day 3/7');
    expect(translate('en', 'nav.home')).toBe('Home');
  });
});

describe('UI chrome coverage (group BM)', () => {
  const REQUIRED: StringKey[] = [
    // tutorial
    'tut.title', 'tut.skip', 'tut.back', 'tut.go', 'tut.1.title', 'tut.5.text',
    // overlays
    'confirm.ok', 'confirm.takes', 'day.next', 'day.payday', 'day.quiet', 'common.close',
    // tabs
    'act.cat.all', 'act.cat.hustle', 'act.suggested', 'act.nothing',
    'life.tab.career', 'life.tab.map', 'life.tab.shop',
    'money.tab.overview', 'money.tab.payslip', 'money.tab.debts', 'money.balances', 'money.monthly',
    // settings and landing
    'settings.save', 'settings.export', 'settings.reset.title', 'land.privacy', 'land.disclaimer', 'land.newlife.title',
    // map
    'map.title', 'map.legend.residence', 'map.legend.route', 'map.notScale', 'map.sheet.trip', 'map.sheet.move',
    // career offers
    'offers.title', 'offers.respond', 'offers.accept', 'offers.negotiate', 'offers.decline',
    // header
    'hud.day', 'hud.menuOpen',
  ] as StringKey[];

  it('defines the UI chrome keys for every extracted area', () => {
    for (const key of REQUIRED) {
      expect(STRINGS.en[key], `en ${key}`).toBeTruthy();
      expect(STRINGS.ms[key], `ms ${key}`).toBeTruthy();
    }
  });

  it('uses only defined keys in t(...) calls across src/screens and src/components', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(name)) files.push(p);
      }
    };
    walk('src/screens');
    walk('src/components');
    const missing: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(/\bt\(\s*'([a-z0-9]+(?:\.[a-zA-Z0-9]+)+)'/g)) {
        if (!(m[1] in STRINGS.en)) missing.push(`${f}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('is translated, not copied: Malay differs from English except for proper nouns and short loanwords', () => {
    const same = (Object.keys(STRINGS.en) as StringKey[]).filter((k) => {
      const en = STRINGS.en[k];
      return en === STRINGS.ms[k] && en.split(/\s+/).length >= 3;
    });
    expect(same).toEqual([]);
  });

  it('keeps tab and button labels short enough for 360px (Malay up to 26 characters)', () => {
    const labelKeys = (Object.keys(STRINGS.ms) as StringKey[]).filter((k) => /^(tut\.(skip|back|go|next)|confirm\.(ok|notNow)|offers\.(respond|accept|negotiate|decline))$/.test(k) || /^(nav\.(home|act|money|life|feed)|act\.cat\.|life\.tab\.|money\.tab\.)/.test(k));
    for (const k of labelKeys) expect(STRINGS.ms[k].length, k).toBeLessThanOrEqual(26);
  });

  it('never calls game data "official" in Bahasa Malaysia (rasmi only in disclaimers and the flag credit)', () => {
    // Each of these says the game is NOT official, or names the real official flags/schedules.
    const RASMI_OK = new Set<string>([
      'money.statutory', 'money.statutory.more', 'money.debt.note', 'life.study.note', 'life.tr.note',
      'map.flags', 'settings.about.body', 'land.disclaimer',
    ]);
    const bad = (Object.keys(STRINGS.ms) as StringKey[]).filter((k) => /rasmi/i.test(STRINGS.ms[k]) && !RASMI_OK.has(k));
    expect(bad).toEqual([]);
    for (const k of ['money.statutory', 'money.debt.note', 'life.study.note', 'life.tr.note', 'settings.about.body', 'land.disclaimer'] as StringKey[]) {
      expect(STRINGS.ms[k], k).toMatch(/bukan|tidak/i);
    }
  });

  it('keeps the honesty labels in step with the data catalogue', () => {
    expect(STRINGS.en['money.statutory']).toBe(STATUTORY_DISCLAIMER);
    for (const k of ['money.rent.note', 'life.fit.note', 'life.shop.note', 'life.hustle.note', 'confirm.fictional'] as StringKey[]) {
      expect(STRINGS.ms[k], k).toMatch(/rekaan/i);
    }
    expect(STRINGS.ms['day.kcalNote']).toMatch(/bukan nasihat/);
    expect(STRINGS.ms['life.food.note']).toMatch(/bukan alat perubatan/);
  });
});
