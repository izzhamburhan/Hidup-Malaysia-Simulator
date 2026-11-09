// Pure helpers for the phone UI: badge counts, time labels, why a chat box is closed, and cleaning what other
// players published before it is drawn. No React, no Firebase, no state writes. UI layer only.

import { MALAYSIA } from '../../data/malaysia';
import { appearanceFromName, isValidAppearance } from '../../engine/appearance';
import type { LifeStage } from '../../engine/types';
import { MESSAGE_MAX, type ChatMeta, type FriendRequest, type Gift, type Profile, type ProfileSnapshot } from '../../lib/social';
import { STICKER_PREVIEW, type FriendEntry } from '../../lib/socialClient';
import { maskText } from '../../lib/wordFilter';

// ---------------------------------------------------------------- randomness for friend codes

/** A 0 to 1 source over the browser's own crypto (never Math.random). Throws when there is none, so a weak code is never made. */
export function secureRandom(source: Pick<Crypto, 'getRandomValues'> | null | undefined = globalThis.crypto ?? null): () => number {
  if (!source || typeof source.getRandomValues !== 'function') throw new Error('This browser cannot make a safe friend code.');
  return () => {
    const bits = new Uint32Array(1);
    source.getRandomValues(bits);
    return bits[0] / 4294967296;
  };
}

// ---------------------------------------------------------------- badges and time

const whole = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** The number on the phone's unread dot: real chats, friend requests, gifts and the NPC chats. */
export function badgeCount(p: { unreadChats: number; requests: number; gifts: number; npcUnread: number }): number {
  return whole(p.unreadChats) + whole(p.requests) + whole(p.gifts) + whole(p.npcUnread);
}

export interface TimeLabel {
  kind: 'time' | 'yesterday' | 'date' | 'none';
  text: string;
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "08:05" for today, "yesterday" for the day before, "3 Feb" for older. `now` is passed in; this never reads the clock. */
export function timeLabel(iso: string, now: Date, locale: string): TimeLabel {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return { kind: 'none', text: '' };
  if (sameDay(d, now)) return { kind: 'time', text: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` };
  const before = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(d, before)) return { kind: 'yesterday', text: '' };
  let text = '';
  try {
    text = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d);
  } catch {
    text = `${d.getDate()}/${d.getMonth() + 1}`;
  }
  return { kind: 'date', text };
}

// ---------------------------------------------------------------- chat rules

export type ChatBlock = 'not-friends' | 'mine-off' | 'theirs-closed';

/** Why the chat box is replaced by a reason, or null when messages can be sent. */
export function chatBlock(p: { myChatOn: boolean; theirChatOpen: boolean; mutual: boolean }): ChatBlock | null {
  if (!p.mutual) return 'not-friends';
  if (!p.myChatOn) return 'mine-off';
  if (!p.theirChatOpen) return 'theirs-closed';
  return null;
}

/** Characters, so an emoji counts once (the same way the limit is checked when sending). */
export const charCount = (text: string): number => [...text].length;

export function composeState(text: string): 'empty' | 'long' | 'ok' {
  const trimmed = text.trim();
  if (!trimmed) return 'empty';
  return charCount(trimmed) > MESSAGE_MAX ? 'long' : 'ok';
}

/** Cut pasted text to `max` characters without splitting an emoji. */
export function limitChars(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : chars.slice(0, max).join('');
}

/** The chat list line: a sticker preview becomes "sent a sticker" in the UI, text stays text. */
export function previewOf(lastText: string): { sticker: boolean; text: string } {
  return lastText === STICKER_PREVIEW ? { sticker: true, text: '' } : { sticker: false, text: lastText };
}

/** The other player of a chat. */
export const otherMember = (meta: ChatMeta, me: string): string => (meta.members[0] === me ? meta.members[1] : meta.members[0]);

export interface Conversation {
  entry: FriendEntry;
  meta: ChatMeta | null;
}

/**
 * Friends with a chat first (newest message first), then friends with no chat yet by name. Chats with someone who is
 * not a mutual friend any more are left out.
 */
export function conversations(friends: readonly FriendEntry[], chats: readonly ChatMeta[], me: string): Conversation[] {
  const byUid = new Map(friends.map((f) => [f.uid, f]));
  const withChat: Conversation[] = [];
  const seen = new Set<string>();
  for (const meta of [...chats].sort((a, b) => (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0))) {
    const uid = otherMember(meta, me);
    const entry = byUid.get(uid);
    if (!entry || seen.has(uid)) continue;
    seen.add(uid);
    withChat.push({ entry, meta });
  }
  const rest = friends
    .filter((f) => !seen.has(f.uid))
    .sort((a, b) => a.profile.displayName.localeCompare(b.profile.displayName, 'en', { sensitivity: 'base' }))
    .map((entry) => ({ entry, meta: null }));
  return [...withChat, ...rest];
}

/** One key per life and game day, so the published snapshot is refreshed at most once a game day. */
export function dayKey(state: { id: string; clock: { day: number } } | null): string | null {
  return state ? `${state.id}:${state.clock.day}` : null;
}

// ---------------------------------------------------------------- the net worth band

export type NetWorthLabel = { key: 'under'; to: string } | { key: 'range'; from: string; to: string } | { key: 'plus'; from: string } | { key: 'neg' } | { key: 'na' };

/** Reads the coarse band published in a snapshot ("rm5k-20k"); anything else is "na" so unknown text is never shown. */
export function netWorthLabel(band: string): NetWorthLabel {
  if (band === 'neg') return { key: 'neg' };
  const plus = /^rm(\d{1,6}k?)-plus$/.exec(band);
  if (plus) return { key: 'plus', from: `RM${plus[1]}` };
  const range = /^rm(\d{1,6}k?)-(\d{1,6}k?)$/.exec(band);
  if (range) return range[1] === '0' ? { key: 'under', to: `RM${range[2]}` } : { key: 'range', from: `RM${range[1]}`, to: `RM${range[2]}` };
  return { key: 'na' };
}

// ---------------------------------------------------------------- cleaning what others published

const STAGES: readonly LifeStage[] = ['student', 'fresh_grad', 'working', 'experienced', 'entrepreneur', 'retired'];

const clip = (v: unknown, max: number): string => (typeof v === 'string' ? [...v].slice(0, max).join('') : '');
const count = (v: unknown, max: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(Math.min(v, max)) : 0);

/** A display name, cut to length and masked again (the sender's check is not trusted). */
export const cleanName = (v: unknown): string => maskText(clip(v, 16).trim());

/** Make a published snapshot safe to draw: a valid look, bounded numbers, known stage, short labels. */
export function cleanSnapshot(raw: unknown, fallbackName: string): ProfileSnapshot {
  const x = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const stage = STAGES.find((s) => s === x.lifeStage) ?? 'working';
  const job = maskText(clip(x.jobTitle, 40).trim());
  const rank = typeof x.netWorthRank === 'number' && Number.isFinite(x.netWorthRank) ? Math.max(-1, Math.min(20, Math.floor(x.netWorthRank))) : 0;
  const label = maskText(clip(x.stageLabel, 24).trim());
  return {
    appearance: isValidAppearance(x.appearance) ? { ...x.appearance } : appearanceFromName(fallbackName),
    gender: x.gender === 'male' || x.gender === 'female' ? x.gender : null,
    lifeStage: stage,
    stageLabel: label || undefined,
    jobTitle: job || null,
    state: MALAYSIA.find((m) => m.name === x.state)?.name ?? '',
    age: count(x.age, 120),
    day: count(x.day, 1_000_000),
    achievements: count(x.achievements, 1000),
    stamps: count(x.stamps, 100),
    netWorthBand: clip(x.netWorthBand, 16),
    netWorthRank: rank,
  };
}

export function cleanProfile(p: Profile): Profile {
  const displayName = cleanName(p.displayName);
  return { ...p, displayName, code: clip(p.code, 8), chatOpen: p.chatOpen === true, snapshot: cleanSnapshot(p.snapshot, displayName || p.uid) };
}

export const cleanRequest = (r: FriendRequest): FriendRequest => ({ ...r, displayName: cleanName(r.displayName) });

export const cleanGift = (g: Gift): Gift => ({ ...g, fromName: cleanName(g.fromName), kind: clip(g.kind, 40) });

/**
 * Gifts and requests carry the name their sender wrote. A sender could write someone else's name, so when the sender's
 * current profile name is known (`names`: uid to name, from the friends list or the profile) it replaces the sent one;
 * otherwise the masked sent name stays.
 */
export function preferCurrentNames(gifts: readonly Gift[], requests: readonly FriendRequest[], names: ReadonlyMap<string, string>): { gifts: Gift[]; requests: FriendRequest[] } {
  const current = (uid: string, sent: string): string => cleanName(names.get(uid)) || sent;
  return {
    gifts: gifts.map((g) => ({ ...g, fromName: current(g.from, g.fromName) })),
    requests: requests.map((r) => ({ ...r, displayName: current(r.from, r.displayName) })),
  };
}
