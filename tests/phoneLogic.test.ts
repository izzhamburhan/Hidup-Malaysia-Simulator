import { describe, expect, it } from 'vitest';
import {
  badgeCount,
  charCount,
  chatBlock,
  cleanGift,
  cleanProfile,
  cleanRequest,
  cleanSnapshot,
  composeState,
  conversations,
  dayKey,
  limitChars,
  netWorthLabel,
  preferCurrentNames,
  otherMember,
  previewOf,
  secureRandom,
  timeLabel,
} from '../src/components/phone/phoneLogic';
import { MESSAGE_MAX, profileSnapshot, type ChatMeta, type Profile } from '../src/lib/social';
import { STICKER_PREVIEW, type FriendEntry } from '../src/lib/socialClient';
import { makeGame } from './helpers';

const game = () => makeGame({ name: 'Aina' });

const profileOf = (uid: string, name: string): Profile => ({
  uid,
  code: 'ABC234',
  displayName: name,
  chatOpen: true,
  snapshot: profileSnapshot(game()),
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('secureRandom', () => {
  it('turns 32 random bits into a number in [0, 1)', () => {
    const fill = (value: number) => ({ getRandomValues: <T extends ArrayBufferView>(a: T): T => { (a as unknown as Uint32Array)[0] = value; return a; } });
    expect(secureRandom(fill(0))()).toBe(0);
    const top = secureRandom(fill(0xffffffff))();
    expect(top).toBeLessThan(1);
    expect(top).toBeGreaterThan(0.999);
  });

  it('throws when the browser has no crypto, so a weak code is never made', () => {
    expect(() => secureRandom(null)).toThrow();
  });

  it('works with the real crypto of this runtime', () => {
    const r = secureRandom()();
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(1);
  });
});

describe('badgeCount', () => {
  it('adds unread chats, requests, gifts and NPC chats', () => {
    expect(badgeCount({ unreadChats: 2, requests: 1, gifts: 3, npcUnread: 1 })).toBe(7);
    expect(badgeCount({ unreadChats: 0, requests: 0, gifts: 0, npcUnread: 0 })).toBe(0);
  });

  it('ignores negative or fractional junk', () => {
    expect(badgeCount({ unreadChats: -3, requests: 1.9, gifts: Number.NaN, npcUnread: 0 })).toBe(1);
  });
});

describe('timeLabel', () => {
  const now = new Date(2026, 10, 9, 15, 30);
  const iso = (d: Date) => d.toISOString();

  it('shows the clock time for today', () => {
    expect(timeLabel(iso(new Date(2026, 10, 9, 8, 5)), now, 'en-GB')).toEqual({ kind: 'time', text: '08:05' });
  });

  it('says yesterday for the day before', () => {
    expect(timeLabel(iso(new Date(2026, 10, 8, 23, 59)), now, 'en-GB').kind).toBe('yesterday');
  });

  it('shows a short date for older messages', () => {
    const label = timeLabel(iso(new Date(2026, 1, 3, 12, 0)), now, 'en-GB');
    expect(label.kind).toBe('date');
    expect(label.text).toBe('3 Feb');
  });

  it('shows nothing for an unreadable time', () => {
    expect(timeLabel('not a time', now, 'en-GB')).toEqual({ kind: 'none', text: '' });
    expect(timeLabel('', now, 'en-GB')).toEqual({ kind: 'none', text: '' });
  });
});

describe('chatBlock (why the text box is replaced by a reason)', () => {
  it('lets a mutual friend with both chats on through', () => {
    expect(chatBlock({ myChatOn: true, theirChatOpen: true, mutual: true })).toBeNull();
  });

  it('names the first reason that applies', () => {
    expect(chatBlock({ myChatOn: true, theirChatOpen: true, mutual: false })).toBe('not-friends');
    expect(chatBlock({ myChatOn: false, theirChatOpen: true, mutual: true })).toBe('mine-off');
    expect(chatBlock({ myChatOn: true, theirChatOpen: false, mutual: true })).toBe('theirs-closed');
    expect(chatBlock({ myChatOn: false, theirChatOpen: false, mutual: false })).toBe('not-friends');
    expect(chatBlock({ myChatOn: false, theirChatOpen: false, mutual: true })).toBe('mine-off');
  });
});

describe('composing a message', () => {
  it('counts characters, so an emoji counts once', () => {
    expect(charCount('abc')).toBe(3);
    expect(charCount('a😂b')).toBe(3);
  });

  it('is empty for blank text, long above the limit and ok in between', () => {
    expect(composeState('')).toBe('empty');
    expect(composeState('   ')).toBe('empty');
    expect(composeState('hai')).toBe('ok');
    expect(composeState('x'.repeat(MESSAGE_MAX))).toBe('ok');
    expect(composeState('x'.repeat(MESSAGE_MAX + 1))).toBe('long');
  });

  it('limits pasted text without splitting an emoji', () => {
    const text = '😂'.repeat(500);
    const out = limitChars(text, 10);
    expect(charCount(out)).toBe(10);
    expect(out).toBe('😂'.repeat(10));
    expect(limitChars('short', 10)).toBe('short');
  });
});

describe('previewOf', () => {
  it('recognises the sticker preview and leaves text alone', () => {
    expect(previewOf(STICKER_PREVIEW)).toEqual({ sticker: true, text: '' });
    expect(previewOf('jom makan')).toEqual({ sticker: false, text: 'jom makan' });
    expect(previewOf('')).toEqual({ sticker: false, text: '' });
  });
});

describe('netWorthLabel', () => {
  it('reads the coarse bands of profileSnapshot', () => {
    expect(netWorthLabel('rm0-1k')).toEqual({ key: 'under', to: 'RM1k' });
    expect(netWorthLabel('rm5k-20k')).toEqual({ key: 'range', from: 'RM5k', to: 'RM20k' });
    expect(netWorthLabel('rm150k-plus')).toEqual({ key: 'plus', from: 'RM150k' });
    expect(netWorthLabel('neg')).toEqual({ key: 'neg' });
  });

  it('never shows text it does not recognise', () => {
    expect(netWorthLabel('RM 1,234,567 <b>')).toEqual({ key: 'na' });
    expect(netWorthLabel('')).toEqual({ key: 'na' });
    expect(netWorthLabel('na')).toEqual({ key: 'na' });
  });
});

describe('cleaning what other players published', () => {
  it('keeps a good snapshot as it is', () => {
    const snap = profileSnapshot(game());
    expect(cleanSnapshot(snap, 'Aina')).toEqual(snap);
  });

  it('replaces a broken look and clamps numbers, labels and unknown stages', () => {
    const good = profileSnapshot(game());
    const dirty = { ...good, appearance: { skin: 99 }, achievements: -5, day: 'x', stamps: Number.POSITIVE_INFINITY, lifeStage: 'wizard', jobTitle: 'J'.repeat(500), state: 42 } as unknown;
    const clean = cleanSnapshot(dirty, 'Aina');
    expect(clean.appearance.skin).toBeLessThan(6);
    expect(clean.achievements).toBe(0);
    expect(clean.day).toBe(0);
    expect(clean.stamps).toBe(0);
    expect(clean.lifeStage).toBe('working');
    expect([...(clean.jobTitle ?? '')].length).toBeLessThanOrEqual(40);
    expect(clean.state).toBe('');
  });

  it('masks the job title and stage label and keeps only a known state name', () => {
    const good = profileSnapshot(game());
    const clean = cleanSnapshot({ ...good, jobTitle: 'Chief fuck officer', stageLabel: 'Call 0123456789', state: 'Selangor' }, 'Aina');
    expect(clean.jobTitle).toBe('Chief **** officer');
    expect(clean.stageLabel).toBe('Call [hidden]');
    expect(clean.state).toBe('Selangor');
    expect(cleanSnapshot({ ...good, state: 'wa.me/60123456789' }, 'Aina').state).toBe('');
    expect(cleanSnapshot({ ...good, state: 'Narnia' }, 'Aina').state).toBe('');
    expect(cleanSnapshot({ ...good, state: 'selangor' }, 'Aina').state).toBe('');
  });

  it('survives a missing snapshot', () => {
    const clean = cleanSnapshot(undefined, 'Aina');
    expect(clean.day).toBe(0);
    expect(clean.jobTitle).toBeNull();
  });

  it('masks a display name that slipped past the sender and trims it', () => {
    const p = profileOf('u1', 'Aina');
    const out = cleanProfile({ ...p, displayName: `${'N'.repeat(40)}` });
    expect([...out.displayName].length).toBeLessThanOrEqual(16);
    expect(cleanProfile(p).displayName).toBe('Aina');
  });
});

describe('conversations', () => {
  const entry = (uid: string, name: string): FriendEntry => ({ uid, since: '2026-01-01', profile: profileOf(uid, name) });
  const meta = (id: string, a: string, b: string, lastFrom: string, lastAt: string): ChatMeta => ({ id, members: [a, b], lastText: 'hi', lastFrom, lastAt });

  it('finds the other member of a chat', () => {
    expect(otherMember(meta('a_b', 'a', 'b', 'a', 'x'), 'a')).toBe('b');
    expect(otherMember(meta('a_b', 'a', 'b', 'a', 'x'), 'b')).toBe('a');
  });

  it('lists chats newest first, then friends with no chat by name, and drops chats with non-friends', () => {
    const friends = [entry('b', 'Bala'), entry('c', 'Chong'), entry('d', 'Dewi'), entry('e', 'Adam')];
    const chats = [meta('a_c', 'a', 'c', 'c', '2026-02-01T10:00:00Z'), meta('a_b', 'a', 'b', 'a', '2026-02-02T10:00:00Z'), meta('a_x', 'a', 'x', 'x', '2026-03-01T10:00:00Z')];
    const rows = conversations(friends, chats, 'a');
    expect(rows.map((r) => r.entry.uid)).toEqual(['b', 'c', 'e', 'd']);
    expect(rows[0].meta?.id).toBe('a_b');
    expect(rows[2].meta).toBeNull();
  });
});

describe('dayKey', () => {
  it('changes with the life and with the game day, and is null without a life', () => {
    const s = game();
    const a = dayKey(s);
    const next = { ...s, clock: { ...s.clock, day: s.clock.day + 1 } };
    expect(dayKey(next)).not.toBe(a);
    expect(dayKey({ ...s, id: 'other' })).not.toBe(a);
    expect(dayKey(null)).toBeNull();
  });
});

describe('preferCurrentNames (a sender cannot pick the name shown beside a gift or request)', () => {
  const gift = { id: 'u1_1', from: 'u1', fromName: 'Fake Admin', kind: 'kopi', date: '1', at: '2026-01-01T00:00:00.000Z' };
  const req = { from: 'u1', displayName: 'Fake Admin', at: '2026-01-01T00:00:00.000Z' };

  it('shows the current profile name when it is known and masks the sent name otherwise', () => {
    const names = new Map([['u1', 'Aina']]);
    const out = preferCurrentNames([gift, { ...gift, id: 'u2_1', from: 'u2', fromName: 'Bala' }], [req, { ...req, from: 'u2', displayName: 'Bala' }], names);
    expect(out.gifts.map((g) => g.fromName)).toEqual(['Aina', 'Bala']);
    expect(out.requests.map((r) => r.displayName)).toEqual(['Aina', 'Bala']);
  });

  it('ignores an empty current name and cleans the one it uses', () => {
    expect(preferCurrentNames([gift], [], new Map([['u1', '']])).gifts[0].fromName).toBe('Fake Admin');
    expect(preferCurrentNames([gift], [], new Map([['u1', 'shit']])).gifts[0].fromName).toBe('****');
    expect(cleanGift(gift).fromName).toBe('Fake Admin');
    expect(cleanRequest(req).displayName).toBe('Fake Admin');
  });
});
