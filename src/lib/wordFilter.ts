// Word filter for chat text and display names. UI layer only; the engine never imports it.
// `maskText` replaces blocked words with asterisks (same length as the original), and hides links, phone numbers,
// messenger handles and ".me" domains as "[hidden]". It matches WHOLE words only, so "class", "assess" and
// "Scunthorpe" stay as they are, but it sees through case, accents, full-width letters, invisible characters,
// Cyrillic and Greek look-alikes, repeated letters (fuuuck), symbols (sh1t, b!tch, a$$, f*ck) and separators
// (f.u.c.k, s-h-i-t, "f u c k"). Phrases of several words ("kill yourself") are matched across spaces. The word
// lists live in src/data/blockedWords.ts and are never shown.

import { ALLOWED_PHRASES, BLOCKED_EN, BLOCKED_MS, BLOCKED_PHRASES } from '../data/blockedWords';

// ---------------------------------------------------------------- folding (what the filter reads)

/** Look-alike letters from other scripts, read as the Latin letter they imitate. Lowercase keys, written as escapes. */
const CONFUSABLES: Record<string, string> = {
  // Cyrillic: a b c d e h i j k l m h o p s t y x v w
  'а': 'a', 'в': 'b', 'с': 'c', 'ԁ': 'd', 'е': 'e', 'һ': 'h', 'і': 'i', 'ј': 'j', 'к': 'k', 'ӏ': 'l', 'м': 'm',
  'н': 'h', 'о': 'o', 'р': 'p', 'ѕ': 's', 'т': 't', 'у': 'y', 'х': 'x', 'ѵ': 'v', 'ԝ': 'w',
  // Greek: a b e n i k u v o p t u x w y s o
  'α': 'a', 'β': 'b', 'ε': 'e', 'η': 'n', 'ι': 'i', 'κ': 'k', 'μ': 'u', 'ν': 'v', 'ο': 'o', 'ρ': 'p', 'τ': 't',
  'υ': 'u', 'χ': 'x', 'ω': 'w', 'γ': 'y', 'ς': 's', 'σ': 'o',
};

interface Folded {
  /** The text as the filter reads it: NFKC, lowercase, no invisible characters or marks, look-alikes as Latin letters. */
  s: string;
  /** For each unit of `s`, where its source starts and ends in the original text. */
  starts: number[];
  ends: number[];
}

/** Fold the text but remember where every unit came from, so a match can be masked in the ORIGINAL text. */
function fold(text: string): Folded {
  let s = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let at = 0;
  for (const ch of text) {
    const to = at + ch.length;
    const lowered = ch.normalize('NFKC').toLowerCase();
    let kept = '';
    for (const c of lowered) {
      if (/^[\p{Cf}\p{M}]$/u.test(c)) continue;
      kept += CONFUSABLES[c] ?? c;
    }
    if (kept === '') {
      // Invisible: drop it, but let a match just before it cover it too.
      if (ends.length > 0) ends[ends.length - 1] = to;
    } else {
      for (let i = 0; i < kept.length; i++) {
        s += kept[i];
        starts.push(at);
        ends.push(to);
      }
    }
    at = to;
  }
  return { s, starts, ends };
}

// ---------------------------------------------------------------- words

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i', '*': '?' };

/** Lowercase, strip accents, and turn look-alike symbols into letters ("?" stands for a wildcard star). */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[013457@$!*]/g, (c) => LEET[c]);
}

/** One pattern per word: a letter that occurs once may repeat, a doubled letter needs at least two ("ass" is not "as"). */
function runsPattern(word: string): string {
  let out = '';
  for (const m of word.matchAll(/(.)\1*/g)) out += `[${m[1]}?]{${m[0].length},}`;
  return out;
}

const EN_RE = new RegExp(`^(?:${BLOCKED_EN.map(runsPattern).join('|')})(?:s|es|ed|ing|in)?$`);
const MS_RE = new RegExp(`^(?:${BLOCKED_MS.map(runsPattern).join('|')})$`);

/** True when an already normalised word is on a list. At most one wildcard, at least three real characters. */
function isBlockedNorm(n: string): boolean {
  if (n.length < 3) return false;
  const wild = n.split('?').length - 1;
  if (wild > 1 || n.length - wild < 3) return false;
  return EN_RE.test(n) || MS_RE.test(n);
}

const TOKEN = String.raw`[\p{L}\p{N}@$*](?:[\p{L}\p{N}@$*]|!(?=[\p{L}\p{N}@$*]))*`;
const CHAIN_RE = new RegExp(`${TOKEN}(?:[._-]${TOKEN})*`, 'gu');
const TOKEN_RE = new RegExp(TOKEN, 'gu');
/** Four or more single characters apart: "f u c k". */
const SPACED_RE = /(?<![\p{L}\p{N}@$*])[\p{L}@$](?:[ ._-]{1,2}[\p{L}@$]){3,}(?![\p{L}\p{N}@$*])/gu;
const MAX_WINDOW = 12;

type Range = [number, number];

/** Phrases of several words, compiled once: each word is a pattern with the same repeat rule as single words. */
const compile = (phrases: readonly (readonly string[])[]): RegExp[][] => phrases.map((p) => p.map((w) => new RegExp(`^${runsPattern(w)}$`)));
const BLOCKED_PHRASE_RES = compile(BLOCKED_PHRASES);
const ALLOWED_PHRASE_RES = compile(ALLOWED_PHRASES);
const PHRASE_GAP_RE = /^[\s._-]{1,3}$/;

/** Every span where a phrase's words follow each other (only spaces and light separators between). */
function phraseRanges(text: string, phrases: RegExp[][]): Range[] {
  const words = [...text.matchAll(TOKEN_RE)].map((t) => ({ start: t.index ?? 0, end: (t.index ?? 0) + t[0].length, norm: normalise(t[0]) }));
  const real = (n: string) => n.split('?').length - 1 <= 1 && n.replace(/\?/g, '').length >= 2;
  const ranges: Range[] = [];
  for (let i = 0; i < words.length; i++) {
    for (const phrase of phrases) {
      if (i + phrase.length > words.length) continue;
      let ok = true;
      for (let k = 0; k < phrase.length && ok; k++) {
        const w = words[i + k];
        ok = real(w.norm) && phrase[k].test(w.norm) && (k === 0 || PHRASE_GAP_RE.test(text.slice(words[i + k - 1].end, w.start)));
      }
      if (ok) ranges.push([words[i].start, words[i + phrase.length - 1].end]);
    }
  }
  return ranges;
}

const overlaps = (a: Range, b: Range): boolean => a[0] < b[1] && b[0] < a[1];

/** Every span of the folded text that is a blocked word or phrase, except inside an allowed phrase ("tahi lalat"). */
function blockedRanges(text: string): Range[] {
  const ranges: Range[] = [];

  for (const chain of text.matchAll(CHAIN_RE)) {
    const base = chain.index ?? 0;
    const parts = [...chain[0].matchAll(TOKEN_RE)].map((t) => ({ start: base + (t.index ?? 0), end: base + (t.index ?? 0) + t[0].length, raw: t[0], norm: normalise(t[0]) }));
    for (let i = 0; i < parts.length; i++) {
      let joined = '';
      for (let j = i; j < parts.length && j < i + MAX_WINDOW; j++) {
        joined += parts[j].norm;
        const raw = text.slice(parts[i].start, parts[j].end);
        if (/\p{L}/u.test(raw) && isBlockedNorm(joined)) ranges.push([parts[i].start, parts[j].end]);
      }
    }
  }

  for (const run of text.matchAll(SPACED_RE)) {
    const base = run.index ?? 0;
    const chars = [...run[0].matchAll(/[\p{L}@$]/gu)].map((c) => ({ at: base + (c.index ?? 0), norm: normalise(c[0]) }));
    for (let i = 0; i + 3 < chars.length; i++) {
      let joined = '';
      for (let j = i; j < chars.length && j < i + MAX_WINDOW; j++) {
        joined += chars[j].norm;
        if (j - i >= 3 && isBlockedNorm(joined)) ranges.push([chars[i].at, chars[j].at + 1]);
      }
    }
  }

  ranges.push(...phraseRanges(text, BLOCKED_PHRASE_RES));
  const allowed = phraseRanges(text, ALLOWED_PHRASE_RES);
  return ranges.filter((r) => !allowed.some((a) => overlaps(r, a)));
}

// ---------------------------------------------------------------- links, numbers and handles

const HIDDEN = '[hidden]';
const TLDS = 'com|net|org|my|io|co|app|xyz|info|biz|link|gg|tv|edu|gov|cc|ly|me';
const URL_RE = /(?:https?:\/\/|www\.)[^\s]+?(?=[.,!?;:)\]]*(?:\s|$))/giu;
const DOMAIN_RE = new RegExp(String.raw`(?<![\p{L}\p{N}_@.+-])(?:[\p{L}\p{N}._+-]+@)?(?:[a-z0-9-]+\.)+(?:${TLDS})\b(?:\/[^\s]*)?`, 'giu');
const PHONE_RE = /(?<![\p{L}\p{N}])\+?\(?\d(?:[\s().-]{0,2}\d)+(?![\p{L}\p{N}])/gu;
const DATE_RE = /^(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})$/;
/** "@aina_99": an @ that starts a word, then at least two word characters. (An email's @ follows a letter, so the domain rule takes it.) */
const HANDLE_RE = /(?<![\p{L}\p{N}_])@[\p{L}\p{N}_][\p{L}\p{N}_.]*[\p{L}\p{N}_]/gu;
/** "ig: aina99", "tiktok:aina", "whatsapp: 0123456789": a messenger name, a colon, then a handle or number of 3+ characters. */
const MESSENGER_RE = /(?<![\p{L}\p{N}])(?:ig|insta|instagram|tiktok|telegram|tele|whatsapp|wechat|snapchat)[ ]?[:=][ ]?@?[\p{L}\p{N}_.+-]{3,}/gu;

/** Spans to show as "[hidden]": links, numbers, messenger handles. */
function hiddenRanges(text: string): Range[] {
  const out: Range[] = [];
  for (const re of [URL_RE, DOMAIN_RE, MESSENGER_RE, HANDLE_RE]) for (const m of text.matchAll(re)) out.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  for (const m of text.matchAll(PHONE_RE)) {
    if (m[0].replace(/\D/g, '').length < 7 || DATE_RE.test(m[0].trim())) continue;
    out.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  }
  return out;
}

/** Sort and join overlapping spans. */
function merge(ranges: Range[]): Range[] {
  const merged: Range[] = [];
  for (const r of [...ranges].sort((a, b) => a[0] - b[0] || b[1] - a[1])) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

// ---------------------------------------------------------------- public API

/** True when the text holds a blocked word or phrase (links, numbers and handles are not counted here). */
export function hasBlockedWord(text: string): boolean {
  return blockedRanges(fold(text).s).length > 0;
}

/** Blocked words become asterisks of the same length; links, phone numbers, handles and ".me" domains become "[hidden]". */
export function maskText(text: string): string {
  const f = fold(text);
  const hidden = merge(hiddenRanges(f.s));
  const words = merge(blockedRanges(f.s).filter((r) => !hidden.some((h) => overlaps(r, h))));
  if (hidden.length === 0 && words.length === 0) return text;
  const marks = [...hidden.map((r) => ({ r, hide: true })), ...words.map((r) => ({ r, hide: false }))].sort((a, b) => a.r[0] - b.r[0]);
  let out = '';
  let pos = 0;
  for (const { r, hide } of marks) {
    const start = f.starts[r[0]];
    const end = f.ends[r[1] - 1];
    if (start < pos) continue; // two spans that share an original character (an expanded letter): the first wins
    out += text.slice(pos, start) + (hide ? HIDDEN : '*'.repeat(end - start));
    pos = end;
  }
  return out + text.slice(pos);
}
