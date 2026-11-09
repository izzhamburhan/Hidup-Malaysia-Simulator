// The friends circle: named friends you meet, grow closer to, and can drift away from.
// The overall `relationships.friends` meter keeps its meaning (social health); the circle feeds it.

import { interests, npcNames, traits } from '../data/lifestyle';
import { adjustFriends, applyStats, clamp, log, nextId, round2, spend } from './core';
import { chance, pick, randInt, seedFromString } from './rng';
import type { Friend, FriendPlace, GameState } from './types';

export const MAX_CIRCLE = 8;

export type FriendTier = 'kenalan' | 'kawan' | 'kawan-baik';

/** Under 30 is Kenalan (acquaintance), 30 to 69 Kawan (friend), 70 and over Kawan baik (close friend). */
export function friendTier(closeness: number): FriendTier {
  if (closeness >= 70) return 'kawan-baik';
  if (closeness >= 30) return 'kawan';
  return 'kenalan';
}

/** Days without a hangout or a message before a friend starts to drift. */
export const DRIFT_AFTER_DAYS = 7;
/** Closeness lost per day once a friend is drifting. */
export const DRIFT_PER_DAY = 0.5;
/** Daily happiness a close friend (Kawan baik) adds. */
export const CLOSE_FRIEND_HAPPINESS = 0.1;

/** Where you meet people, for the line shown when it happens. */
const PLACE_LABEL: Record<FriendPlace, string> = {
  school: 'school',
  event: 'a social event',
  mamak: 'the mamak',
  networking: 'a networking event',
  class: 'class',
  work: 'work',
};

/** A small generator of its own (like appearance.ts), so the starter circle never touches state.rng. */
function generator(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A friend who has not been lepak-ed with, messaged or sent a gift yet: every action is open today. */
function newFriend(id: string, name: string, trait: string, interest: string, closeness: number, day: number, where: FriendPlace): Friend {
  return { id, name, trait, interest, closeness, metDay: day, lastSeenDay: day - 1, lastChatDay: day - 1, lastGiftDay: day - 99, where };
}

/**
 * The two school friends a life starts with. A pure function of the key (the stored seed and the
 * character name): it never advances `state.rng`, so seeded lives keep their random stream.
 * `taken` lists names to skip (the partner, prospects and exes of an older save).
 */
export function starterCircle(seedKey: string, day: number, taken: readonly string[] = []): Friend[] {
  const r = generator(seedFromString(`friends|${seedKey}`));
  const names = npcNames.filter((n) => !taken.includes(n));
  const out: Friend[] = [];
  for (let i = 0; i < 2 && names.length; i++) {
    const name = names.splice(Math.floor(r() * names.length), 1)[0];
    const trait = traits[Math.floor(r() * traits.length)];
    const interest = interests[Math.floor(r() * interests.length)];
    const closeness = 35 + Math.floor(r() * 16);
    out.push(newFriend(`friend-s${i}`, name, trait, interest, closeness, day, 'school'));
  }
  return out;
}

/** Names nobody in your life already has: the circle, prospects, partner and exes. */
export function knownNames(state: GameState): Set<string> {
  const r = state.relationships;
  return new Set<string>([...r.circle.map((f) => f.name), ...r.prospects.map((p) => p.name), ...(r.partner ? [r.partner.name] : []), ...r.exes]);
}

/** A new acquaintance (closeness 12 to 25) drawn from `state.rng`, or null when the circle is full or no name is free. */
export function makeFriend(state: GameState, where: FriendPlace): Friend | null {
  if (state.relationships.circle.length >= MAX_CIRCLE) return null;
  const known = knownNames(state);
  const names = npcNames.filter((n) => !known.has(n));
  if (!names.length) return null;
  const name = pick(state, names);
  return newFriend(nextId(state, 'friend'), name, pick(state, traits), pick(state, interests), randInt(state, 12, 25), state.clock.day, where);
}

/** Meet someone and add them to the circle. Returns the line to show, or null when there was no room. */
export function meetFriend(state: GameState, where: FriendPlace): string | null {
  const friend = makeFriend(state, where);
  if (!friend) return null;
  state.relationships.circle.push(friend);
  return `You made a new friend at ${PLACE_LABEL[where]}: ${friend.name}, ${friend.trait}, into ${friend.interest}.`;
}

/** Roll for meeting a friend. A full circle (or no free name) costs no roll. */
export function maybeMeetFriend(state: GameState, probability: number, where: FriendPlace): string | null {
  const r = state.relationships;
  if (r.circle.length >= MAX_CIRCLE || knownNames(state).size >= npcNames.length) return null;
  return chance(state, probability) ? meetFriend(state, where) : null;
}

/** Grow closeness, kept within 0 to 100. */
export function addCloseness(friend: Friend, delta: number): void {
  friend.closeness = round2(clamp(friend.closeness + delta));
}

/** The most recent day you were in touch with a friend (hangout, message or gift). */
export function lastContactDay(friend: Friend): number {
  return Math.max(friend.metDay, friend.lastSeenDay, friend.lastChatDay, friend.lastGiftDay);
}

/** End-of-day circle upkeep: silent friends drift, lost friends leave, close friends lift your mood. */
export function dailyFriends(state: GameState): void {
  const r = state.relationships;
  const day = state.clock.day;
  const staying: Friend[] = [];
  let close = 0;
  for (const f of r.circle) {
    if (day - lastContactDay(f) > DRIFT_AFTER_DAYS) addCloseness(f, -DRIFT_PER_DAY);
    if (f.closeness <= 0) {
      log(state, 'event', `You and ${f.name} drifted apart.`);
      continue;
    }
    if (friendTier(f.closeness) === 'kawan-baik') close += 1;
    staying.push(f);
  }
  r.circle = staying;
  if (close) applyStats(state, { happiness: CLOSE_FRIEND_HAPPINESS * close });
}

// ---- Per-friend actions (the action catalogue calls these) ----

export const HANGOUT_COST = 25;
export const GIFT_COST = 30;
/** Days between gifts to the same friend. */
export const GIFT_COOLDOWN_DAYS = 7;
export const HANGOUT_FROM_HOUR = 10;
export const HANGOUT_TO_HOUR = 23;

export const friendById = (state: GameState, id: string | undefined): Friend | undefined => state.relationships.circle.find((f) => f.id === id);

/** Message a friend: a little closer, once a day each. */
export function chatFriend(state: GameState, friend: Friend): string[] {
  addCloseness(friend, 3);
  friend.lastChatDay = state.clock.day;
  return [`You and ${friend.name} swapped memes and a "dah makan?". ${friend.name} sent back three stickers.`];
}

/** Lepak with a friend: costs a little, lifts closeness, the friends meter and your mood. */
export function hangoutFriend(state: GameState, friend: Friend): string[] {
  spend(state, HANGOUT_COST, `lepak with ${friend.name}`);
  addCloseness(friend, 8);
  friend.lastSeenDay = state.clock.day;
  adjustFriends(state, 3);
  state.relationships.lastFriendsDay = state.clock.day;
  state.today.socialised = true;
  applyStats(state, { energy: -6, happiness: 5, stress: -4 });
  return [`Good lepak with ${friend.name}, talking about ${friend.interest} and nothing in particular.`];
}

/** Send a small gift (fictional price): a bigger step closer, once a week each. */
export function giftFriend(state: GameState, friend: Friend): string[] {
  spend(state, GIFT_COST, `gift for ${friend.name}`);
  addCloseness(friend, 10);
  friend.lastGiftDay = state.clock.day;
  return [`${friend.name} loved the small gift. It is the thought that counts.`];
}
