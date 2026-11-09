// Real-player friends: types, the store interface and pure helpers. UI layer only, no Firebase import:
// the logic in socialClient.ts runs over an injected `SocialStore` (the real Firestore adapter comes
// later, tests use an in-memory fake). Nothing here changes the game state, reads the clock or rolls dice.

import { netWorth } from '../engine/core';
import { ageOf } from '../engine/calendar';
import type { Appearance, Gender, GameState, LifeStage } from '../engine/types';
import { bandOf } from './analyticsSnapshot';
import { hasBlockedWord, maskText } from './wordFilter';

export const MAX_REAL_FRIENDS = 50;
export const MESSAGE_MAX = 200;
export const HISTORY_LIMIT = 50;
export const REPORT_MESSAGES = 20;
export const NAME_MIN = 3;
export const NAME_MAX = 16;

/** What a friend can see of a life. Never the character name, never exact money. */
export interface ProfileSnapshot {
  appearance: Appearance;
  gender: Gender | null;
  lifeStage: LifeStage;
  stageLabel?: string;
  jobTitle: string | null;
  state: string;
  age: number;
  day: number;
  achievements: number;
  stamps: number;
  /** Coarse band such as "rm5k-20k". */
  netWorthBand: string;
  /** 0 and up, a higher band is a higher number; -1 for negative. Only for sorting. */
  netWorthRank: number;
}

/** profiles/{uid}: readable by any signed-in player who knows the uid or the code. */
export interface Profile {
  uid: string;
  code: string;
  displayName: string;
  chatOpen: boolean;
  snapshot: ProfileSnapshot;
  updatedAt: string;
}

export interface FriendLink {
  uid: string;
  since: string;
}

export interface FriendRequest {
  from: string;
  displayName: string;
  at: string;
}

export interface Gift {
  /** `{from}_{YYYY-MM-DD}` so one friend can send only one a day. */
  id: string;
  from: string;
  fromName: string;
  kind: string;
  date: string;
  at: string;
}

export interface ChatMessage {
  id: string;
  from: string;
  kind: 'text' | 'sticker';
  text: string;
  sticker: string | null;
  at: string;
}

export interface ChatMeta {
  id: string;
  members: [string, string];
  lastText: string;
  lastFrom: string;
  lastAt: string;
}

export const REPORT_REASONS = ['rude', 'bullying', 'personal-info', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface Report {
  reporter: string;
  reported: string;
  chatId: string;
  reason: ReportReason;
  messages: { from: string; text: string; at: string }[];
  at: string;
}

/**
 * Everything the friends feature needs from a database, scoped by uid like the Firestore paths. Every method
 * may reject; socialClient.ts turns that into `{ ok: false, error }`.
 */
export interface SocialStore {
  getProfile(uid: string): Promise<Profile | null>;
  setProfile(profile: Profile): Promise<void>;
  deleteProfile(uid: string): Promise<void>;
  /** codes/{code}: the uid that owns the code, or null. */
  lookupCode(code: string): Promise<string | null>;
  /** Claim a free code for uid. False when it is taken (nothing is written then). */
  claimCode(code: string, uid: string): Promise<boolean>;
  releaseCode(code: string): Promise<void>;
  /** users/{uid}/friends: this player's own links, mutual or not. */
  listFriends(uid: string): Promise<FriendLink[]>;
  addFriend(uid: string, other: string, since: string): Promise<void>;
  removeFriend(uid: string, other: string): Promise<void>;
  /** Does users/{uid}/friends/{other} exist? */
  hasFriend(uid: string, other: string): Promise<boolean>;
  listRequests(uid: string): Promise<FriendRequest[]>;
  /** Writes users/{to}/requests/{req.from}. */
  sendRequest(to: string, req: FriendRequest): Promise<void>;
  deleteRequest(uid: string, from: string): Promise<void>;
  listBlocked(uid: string): Promise<string[]>;
  block(uid: string, other: string): Promise<void>;
  unblock(uid: string, other: string): Promise<void>;
  listGifts(uid: string): Promise<Gift[]>;
  /** Writes users/{to}/gifts/{gift.id}. False when that id exists (already sent today). */
  sendGift(to: string, gift: Gift): Promise<boolean>;
  deleteGift(uid: string, id: string): Promise<void>;
  /** Chats this player is a member of. */
  listChats(uid: string): Promise<ChatMeta[]>;
  setChatMeta(meta: ChatMeta): Promise<void>;
  /** The latest `limit` messages, oldest first. */
  listMessages(chatId: string, limit: number): Promise<ChatMessage[]>;
  /** Adds a message and returns its id. */
  addMessage(chatId: string, msg: Omit<ChatMessage, 'id'>): Promise<string>;
  deleteMessage(chatId: string, id: string): Promise<void>;
  /** Ids of the messages in this chat sent by uid. */
  listMessagesFrom(chatId: string, uid: string): Promise<string[]>;
  addReport(report: Report): Promise<void>;
}

/** Client results are values: never a throw. */
export type Res<T extends object = { ok: true }> = ({ ok: true } & T) | { ok: false; error: string };

// ---------------------------------------------------------------- friend codes

/** No 0, O, 1, I or L, so a code read aloud or typed from a screenshot is hard to get wrong. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

/** A fresh code. `random` returns a number in [0, 1): `Math.random` is NOT used here, the caller supplies the source. */
export function newFriendCode(random: () => number): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const r = random();
    const n = Number.isFinite(r) ? Math.min(Math.max(r, 0), 0.999999999) : 0;
    code += CODE_ALPHABET[Math.floor(n * CODE_ALPHABET.length)];
  }
  return code;
}

export function formatCode(code: string): string {
  return `HM-${code}`;
}

/** "hm-abc234", "HM ABC 234" or "abc234" become "ABC234"; anything else is null. */
export function parseCode(input: string): string | null {
  if (typeof input !== 'string') return null;
  let s = input.toUpperCase().replace(/[\s_-]+/g, '');
  if (s.length === CODE_LENGTH + 2 && s.startsWith('HM')) s = s.slice(2);
  if (s.length !== CODE_LENGTH) return null;
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null;
  return s;
}

// ---------------------------------------------------------------- names, ids, messages

/** A reason the display name is not allowed, or null. 3 to 16 characters: letters, digits, single spaces. */
export function validateDisplayName(name: string): string | null {
  if (typeof name !== 'string') return 'Pick a name.';
  if (name !== name.trim()) return 'Remove the spaces at the start and the end.';
  const length = [...name].length;
  if (length < NAME_MIN || length > NAME_MAX) return `Pick a name of ${NAME_MIN} to ${NAME_MAX} characters.`;
  if (!/^[\p{L}\p{N}]+(?: [\p{L}\p{N}]+)*$/u.test(name)) return 'Use letters, numbers and single spaces only.';
  if (hasBlockedWord(name) || hasBlockedWord(name.replace(/ /g, '')) || maskText(name) !== name) return 'Please pick a different name.';
  return null;
}

/** The chat between two players: the same id from either side. */
export function chatIdOf(a: string, b: string): string {
  return [a, b].sort().join('_');
}

/**
 * The gift day: whole days since the epoch in Malaysia time (UTC+8), as a string. It resets at midnight Malaysia time and
 * is the `date` a gift must carry, so the rules can check it against the server's own clock.
 */
export function giftDayKey(ms: number): string {
  return String(Math.floor((ms + 8 * 3600000) / 86400000));
}

/** The gift document id: one per sender per gift day. */
export function giftDocId(from: string, date: string): string {
  return `${from}_${date}`;
}

/** The two uids of a chat id built by `chatIdOf`, sorted. */
export function chatMembers(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Trim, check the length (in characters, so an emoji counts once) and mask. */
export function prepareMessage(text: string): { ok: true; text: string } | { ok: false; error: string } {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) return { ok: false, error: 'Write a message first.' };
  const tooLong = { ok: false as const, error: `Messages can be up to ${MESSAGE_MAX} characters.` };
  if ([...trimmed].length > MESSAGE_MAX) return tooLong;
  const masked = maskText(trimmed);
  if ([...masked].length > MESSAGE_MAX) return tooLong;
  return { ok: true, text: masked };
}

// ---------------------------------------------------------------- the published snapshot

const NET_WORTH_EDGES = [0, 1000, 5000, 20000, 50000, 150000] as const;

const STAGE_LABEL: Record<LifeStage, string> = {
  student: 'Student',
  fresh_grad: 'Fresh grad',
  working: 'Working',
  experienced: 'Experienced',
  entrepreneur: 'Entrepreneur',
  retired: 'Retired',
};

/** What this life publishes to friends. Pure; the net worth leaves only as a band plus an ordinal for sorting. */
export function profileSnapshot(state: GameState): ProfileSnapshot {
  const worth = netWorth(state);
  const rank = worth < 0 ? -1 : NET_WORTH_EDGES.filter((edge) => worth >= edge).length;
  return {
    appearance: { ...state.character.appearance },
    gender: state.character.gender ?? null,
    lifeStage: state.character.lifeStage,
    stageLabel: STAGE_LABEL[state.character.lifeStage],
    jobTitle: state.career.job?.title ?? null,
    state: state.location.state,
    age: ageOf(state),
    day: state.clock.day,
    achievements: Object.keys(state.achievements).length,
    stamps: Object.keys(state.travel.stamps).length,
    netWorthBand: bandOf(worth, NET_WORTH_EDGES),
    netWorthRank: rank,
  };
}

// ---------------------------------------------------------------- ranking

export type RankBy = 'achievements' | 'days' | 'stamps' | 'networth';

export interface RankEntry {
  uid: string;
  displayName: string;
  snapshot: ProfileSnapshot;
  me?: boolean;
}

export type Ranked = RankEntry & { value: number; place: number };

const rankValue = (s: ProfileSnapshot, by: RankBy): number =>
  by === 'achievements' ? s.achievements : by === 'days' ? s.day : by === 'stamps' ? s.stamps : s.netWorthRank;

/** Highest first, ties ordered by name then uid; tied entries share a place (1, 1, 3). A new array, input untouched. */
export function rankFriends(entries: readonly RankEntry[], by: RankBy): Ranked[] {
  const sorted = entries
    .map((e) => ({ ...e, value: rankValue(e.snapshot, by), place: 0 }))
    .sort((a, b) => b.value - a.value || a.displayName.localeCompare(b.displayName, 'en', { sensitivity: 'base' }) || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
  sorted.forEach((e, i) => {
    e.place = i > 0 && sorted[i - 1].value === e.value ? sorted[i - 1].place : i + 1;
  });
  return sorted;
}
