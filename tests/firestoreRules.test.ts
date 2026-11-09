import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GIFTS } from '../src/data/gifts';
import { STICKERS } from '../src/data/stickers';
import { friendlyError } from '../src/lib/firebaseSocial';
import { NAME_MAX, NAME_MIN, REPORT_MESSAGES, REPORT_REASONS } from '../src/lib/social';

// The rules themselves need the Firebase emulator (Java 21) to execute; these checks keep the text of
// firestore.rules in step with the catalogues and limits the client uses.
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

describe('firestore.rules stays in step with the client', () => {
  it('allows exactly the gift kinds in the catalogue', () => {
    const m = rules.match(/data\.kind in \[([^\]]+)\]\s*\n\s*&& shortText\(request\.resource\.data\.fromName/);
    expect(m).not.toBeNull();
    const kinds = m![1].split(',').map((s) => s.trim().replace(/'/g, ''));
    expect(kinds.sort()).toEqual(GIFTS.map((g) => g.id).sort());
  });

  it('allows exactly the report reasons the client offers, and no more messages than it copies', () => {
    for (const r of REPORT_REASONS) expect(rules).toContain(`'${r}'`);
    expect(rules).toContain(`messages.size() <= ${REPORT_MESSAGES}`);
  });

  it('caps display names at the client limits and sticker ids fit', () => {
    expect(rules).toContain(`displayName.size() >= ${NAME_MIN}`);
    expect(rules).toContain(`displayName.size() <= ${NAME_MAX}`);
    for (const s of STICKERS) expect(s.id.length).toBeLessThanOrEqual(24);
  });

  it('never lets anyone list profiles or read reports, and denies everything else', () => {
    expect(rules).toMatch(/match \/profiles\/\{uid\} \{\s*\n\s*allow get: if signedIn\(\);\s*\n\s*allow list: if false;/);
    expect(rules).toMatch(/match \/reports\/\{reportId\} \{\s*\n\s*allow read, update, delete: if false;/);
    expect(rules).toMatch(/match \/\{document=\*\*\} \{\s*\n\s*allow read, write: if false;/);
  });
});

describe('firestore.rules is well formed (a cheap guard; the emulator is the real test)', () => {
  const code = rules.replace(/\/\/.*$/gm, '');

  it('has balanced braces, brackets and parentheses', () => {
    for (const [open, close] of [['{', '}'], ['[', ']'], ['(', ')']]) {
      expect(code.split(open).length, open).toBe(code.split(close).length);
    }
  });

  it('ends every allow statement with a semicolon before the next statement', () => {
    const statements = code.split(/\ballow\b/).slice(1);
    for (const s of statements) {
      const body = s.split(/\b(match|function)\b|\}/)[0];
      expect(body.trim().endsWith(';'), `allow${body.slice(0, 80)}`).toBe(true);
      expect(body.split(';').length, `allow${body.slice(0, 80)}`).toBe(2);
    }
  });

  it('declares each match path and helper once, and has one header', () => {
    const matches = [...code.matchAll(/match (\S+) \{/g)].map((m) => m[1]);
    expect(new Set(matches).size).toBe(matches.length);
    const fns = [...code.matchAll(/function (\w+)\(/g)].map((m) => m[1]);
    expect(new Set(fns).size).toBe(fns.length);
    expect(rules.split('HIDUP MALAYSIA: cloud save').length).toBe(2);
    expect(rules.endsWith('}\n')).toBe(true);
  });

  it('ties gift ids to the server day in Malaysia time', () => {
    expect(rules).toContain("request.resource.data.date == mytDay(0) || request.resource.data.date == mytDay(1)");
    expect(rules).toContain('request.time.toMillis() + 28800000');
  });
});

describe('friendlyError', () => {
  it('turns Firebase codes into words', () => {
    expect(friendlyError({ code: 'permission-denied' })).toMatch(/Not allowed/);
    expect(friendlyError({ code: 'unavailable' })).toMatch(/offline/);
    expect(friendlyError(new Error('boom'))).toBe('boom');
    expect(friendlyError(42)).toBe('Something went wrong.');
  });
});
