// Friends client: every operation of the real-player friends feature, over an injected `SocialStore`
// (the real Firestore adapter lives elsewhere; tests use an in-memory fake). Nothing here throws: a
// refused action or a failing store comes back as `{ ok: false, error }` with a reason the player can
// read, and the game is never affected. No Firebase import, no clock, no randomness of its own: the
// caller passes `now` (ISO time), `today` (YYYY-MM-DD) and a `random` source. UI layer only.

import type { StorageLike } from './cloud';
import {
  MAX_REAL_FRIENDS,
  HISTORY_LIMIT,
  REPORT_MESSAGES,
  REPORT_REASONS,
  chatIdOf,
  chatMembers,
  formatCode,
  giftDocId,
  newFriendCode,
  parseCode,
  prepareMessage,
  validateDisplayName,
  type ChatMessage,
  type ChatMeta,
  type FriendRequest,
  type Gift,
  type Profile,
  type ProfileSnapshot,
  type ReportReason,
  type Res,
  type SocialStore,
} from './social';
import { maskText } from './wordFilter';

const errorText = (err: unknown): string => (err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.');
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const KIND_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

const CODE_TRIES = 5;

// ---------------------------------------------------------------- turn on, update, turn off

/** Turn Friends on: validates the name, claims a free code (up to 5 tries) and writes the profile. Already on: returns the profile. */
export async function enableFriends(
  store: SocialStore,
  uid: string,
  displayName: string,
  snapshot: ProfileSnapshot,
  now: string,
  random: () => number,
): Promise<Res<{ profile: Profile }>> {
  const name = displayName.trim();
  const reason = validateDisplayName(name);
  if (reason) return fail(reason);
  try {
    const existing = await store.getProfile(uid);
    if (existing) return { ok: true, profile: existing };
    let code: string | null = null;
    for (let i = 0; i < CODE_TRIES && code === null; i++) {
      const candidate = newFriendCode(random);
      if (await store.claimCode(candidate, uid)) code = candidate;
    }
    if (code === null) return fail('Could not make a friend code. Please try again.');
    const profile: Profile = { uid, code, displayName: name, chatOpen: true, snapshot, updatedAt: now };
    try {
      await store.setProfile(profile);
    } catch (err) {
      await store.releaseCode(code).catch(() => undefined);
      return fail(errorText(err));
    }
    return { ok: true, profile };
  } catch (err) {
    return fail(errorText(err));
  }
}

/** Change the display name, the published snapshot or the chat switch. */
export async function updateProfile(
  store: SocialStore,
  uid: string,
  patch: { displayName?: string; snapshot?: ProfileSnapshot; chatOpen?: boolean },
  now: string,
): Promise<Res<{ profile: Profile }>> {
  try {
    const current = await store.getProfile(uid);
    if (!current) return fail('Friends is not turned on.');
    const next: Profile = { ...current, updatedAt: now };
    if (patch.displayName !== undefined) {
      const name = patch.displayName.trim();
      const reason = validateDisplayName(name);
      if (reason) return fail(reason);
      next.displayName = name;
    }
    if (patch.snapshot) next.snapshot = patch.snapshot;
    if (typeof patch.chatOpen === 'boolean') next.chatOpen = patch.chatOpen;
    await store.setProfile(next);
    return { ok: true, profile: next };
  } catch (err) {
    return fail(errorText(err));
  }
}

/**
 * Turn Friends off and remove what this player wrote: own messages, friend links, requests, gifts, blocks, the
 * code and the profile. Carries on past a failing step and reports the first error.
 */
export async function disableFriends(store: SocialStore, uid: string): Promise<Res> {
  const errors: string[] = [];
  const attempt = async (step: () => Promise<unknown>): Promise<void> => {
    try {
      await step();
    } catch (err) {
      errors.push(errorText(err));
    }
  };
  const read = async <T>(step: () => Promise<T[]>): Promise<T[]> => {
    try {
      return await step();
    } catch (err) {
      errors.push(errorText(err));
      return [];
    }
  };

  const profile = await store.getProfile(uid).catch((err) => {
    errors.push(errorText(err));
    return null;
  });
  const links = await read(() => store.listFriends(uid));
  const metas = await read(() => store.listChats(uid));

  const chatIds = new Set<string>([...links.map((l) => chatIdOf(uid, l.uid)), ...metas.map((m) => m.id)]);
  for (const chatId of chatIds) {
    const ids = await read(() => store.listMessagesFrom(chatId, uid));
    for (const id of ids) await attempt(() => store.deleteMessage(chatId, id));
  }
  // A last-message preview that is mine would outlive my messages: blank it.
  for (const meta of metas) if (meta.lastFrom === uid) await attempt(() => store.setChatMeta({ ...meta, lastText: '' }));

  for (const link of links) {
    await attempt(() => store.removeFriend(uid, link.uid));
    // My request in their inbox, if they never answered it. Best effort: the rules may not allow it.
    await store.deleteRequest(link.uid, uid).catch(() => undefined);
  }
  for (const req of await read(() => store.listRequests(uid))) await attempt(() => store.deleteRequest(uid, req.from));
  for (const gift of await read(() => store.listGifts(uid))) await attempt(() => store.deleteGift(uid, gift.id));
  for (const other of await read(() => store.listBlocked(uid))) await attempt(() => store.unblock(uid, other));

  // Profile first, then the code: if the profile cannot be deleted the code keeps pointing at it.
  let profileGone = true;
  await attempt(async () => {
    try {
      await store.deleteProfile(uid);
    } catch (err) {
      profileGone = false;
      throw err;
    }
  });
  if (profile && profileGone) await attempt(() => store.releaseCode(profile.code));

  return errors.length === 0 ? { ok: true } : fail(errors[0]);
}

// ---------------------------------------------------------------- finding and adding friends

type Lookup = { ok: true; profile: Profile; sentByMe: boolean } | { ok: false; error: string };

async function lookup(store: SocialStore, me: string, input: string): Promise<Lookup> {
  const code = parseCode(input);
  if (!code) return fail(`That code does not look right. Codes look like ${formatCode('ABC234')}.`);
  const uid = await store.lookupCode(code);
  if (!uid) return fail('No player has that code.');
  if (uid === me) return fail('That is your own code.');
  const profile = await store.getProfile(uid);
  if (!profile) return fail('No player has that code.');
  if ((await store.listBlocked(me)).includes(uid)) return fail('You blocked that player. Unblock them first.');
  const mine = await store.hasFriend(me, uid);
  const theirs = mine ? await store.hasFriend(uid, me) : false;
  if (mine && theirs) return fail('You are already friends.');
  return { ok: true, profile, sentByMe: mine };
}

/** Show who a code belongs to before asking: the profile, or the reason it cannot be added. */
export async function previewCode(store: SocialStore, me: string, input: string): Promise<Res<{ profile: Profile }>> {
  try {
    const found = await lookup(store, me, input);
    if (!found.ok) return found;
    if (found.sentByMe) return fail('You already sent that player a request.');
    return { ok: true, profile: found.profile };
  } catch (err) {
    return fail(errorText(err));
  }
}

/**
 * Ask a player to be friends by code. Writes the request to them and your own friend link. If they had already
 * asked you, this accepts their request instead (`accepted: true`).
 */
export async function sendFriendRequest(store: SocialStore, me: string, myName: string, input: string, now: string): Promise<Res<{ profile: Profile; accepted: boolean }>> {
  try {
    const found = await lookup(store, me, input);
    if (!found.ok) return found;
    if (found.sentByMe) return fail('You already sent that player a request.');
    const them = found.profile.uid;
    if ((await store.listFriends(me)).length >= MAX_REAL_FRIENDS) return fail(`Your friends list is full (${MAX_REAL_FRIENDS}).`);
    const incoming = (await store.listRequests(me)).find((r) => r.from === them);
    if (incoming) {
      await store.addFriend(me, them, now);
      await store.deleteRequest(me, them);
      return { ok: true, profile: found.profile, accepted: true };
    }
    await store.sendRequest(them, { from: me, displayName: myName, at: now });
    await store.addFriend(me, them, now);
    return { ok: true, profile: found.profile, accepted: false };
  } catch (err) {
    return fail(errorText(err));
  }
}

/** Accept a request: your own friend link is written and the request deleted. They must still have their link to you. */
export async function acceptRequest(store: SocialStore, me: string, from: string, now: string): Promise<Res> {
  try {
    const request = (await store.listRequests(me)).find((r) => r.from === from);
    if (!request) return fail('That request is no longer there.');
    if ((await store.listBlocked(me)).includes(from)) {
      await store.deleteRequest(me, from);
      return fail('You blocked that player. Unblock them first.');
    }
    if (!(await store.hasFriend(from, me))) {
      await store.deleteRequest(me, from);
      return fail('That player cancelled the request.');
    }
    if ((await store.listFriends(me)).length >= MAX_REAL_FRIENDS) return fail(`Your friends list is full (${MAX_REAL_FRIENDS}).`);
    await store.addFriend(me, from, now);
    await store.deleteRequest(me, from);
    return { ok: true };
  } catch (err) {
    return fail(errorText(err));
  }
}

export async function declineRequest(store: SocialStore, me: string, from: string): Promise<Res> {
  try {
    await store.deleteRequest(me, from);
    return { ok: true };
  } catch (err) {
    return fail(errorText(err));
  }
}

/** Drop your own link; with theirs left behind it is no longer mutual, so they disappear from your lists. */
export async function removeFriend(store: SocialStore, me: string, other: string): Promise<Res> {
  try {
    await store.removeFriend(me, other);
    return { ok: true };
  } catch (err) {
    return fail(errorText(err));
  }
}

/** Block: always blocks first, then removes your link and their request. Reports the first failure. */
export async function blockPlayer(store: SocialStore, me: string, other: string): Promise<Res> {
  if (me === other) return fail('You cannot block yourself.');
  const errors: string[] = [];
  for (const step of [() => store.block(me, other), () => store.removeFriend(me, other), () => store.deleteRequest(me, other)]) {
    try {
      await step();
    } catch (err) {
      errors.push(errorText(err));
    }
  }
  return errors.length === 0 ? { ok: true } : fail(errors[0]);
}

export async function unblockPlayer(store: SocialStore, me: string, other: string): Promise<Res> {
  try {
    await store.unblock(me, other);
    return { ok: true };
  } catch (err) {
    return fail(errorText(err));
  }
}

/** Blocked players with their profile when it still exists, for the Settings list. */
export async function listBlockedPlayers(store: SocialStore, me: string): Promise<Res<{ blocked: { uid: string; profile: Profile | null }[] }>> {
  try {
    const uids = await store.listBlocked(me);
    const blocked = await Promise.all(uids.map(async (uid) => ({ uid, profile: await store.getProfile(uid) })));
    return { ok: true, blocked };
  } catch (err) {
    return fail(errorText(err));
  }
}

export interface FriendEntry {
  uid: string;
  since: string;
  profile: Profile;
}

/**
 * Friends are mutual only (your link AND theirs). `pending` is your own links they have not answered, `requests`
 * is the incoming ones. Blocked players and players whose profile is gone are left out.
 */
export async function listFriendProfiles(store: SocialStore, me: string): Promise<Res<{ friends: FriendEntry[]; pending: FriendEntry[]; requests: FriendRequest[] }>> {
  try {
    const [links, blocked, requests] = await Promise.all([store.listFriends(me), store.listBlocked(me), store.listRequests(me)]);
    const hidden = new Set(blocked);
    const rows = await Promise.all(
      links
        .filter((l) => !hidden.has(l.uid))
        .map(async (l) => ({ link: l, profile: await store.getProfile(l.uid), mutual: await store.hasFriend(l.uid, me) })),
    );
    const friends: FriendEntry[] = [];
    const pending: FriendEntry[] = [];
    for (const row of rows) {
      if (!row.profile) continue;
      (row.mutual ? friends : pending).push({ uid: row.link.uid, since: row.link.since, profile: row.profile });
    }
    return { ok: true, friends, pending, requests: requests.filter((r) => !hidden.has(r.from)) };
  } catch (err) {
    return fail(errorText(err));
  }
}

// ---------------------------------------------------------------- shared checks for gifts and chat

async function mutualFriend(store: SocialStore, me: string, to: string): Promise<{ ok: true; profile: Profile } | { ok: false; error: string }> {
  if (me === to) return fail('You cannot send that to yourself.');
  const [mine, theirs, profile] = await Promise.all([store.hasFriend(me, to), store.hasFriend(to, me), store.getProfile(to)]);
  if (!mine || !theirs || !profile) return fail('You can only do that with friends.');
  return { ok: true, profile };
}

// ---------------------------------------------------------------- gifts

/**
 * Send the day's free gift to a mutual friend. `validKinds` (the gift catalogue ids) is optional: without it only the
 * shape of the id is checked. One gift per friend per `today`.
 */
export async function sendGift(
  store: SocialStore,
  me: string,
  myName: string,
  to: string,
  kind: string,
  today: string,
  now: string,
  validKinds?: readonly string[],
): Promise<Res> {
  if (typeof kind !== 'string' || !KIND_RE.test(kind) || (validKinds && !validKinds.includes(kind))) return fail('That gift does not exist.');
  try {
    const friend = await mutualFriend(store, me, to);
    if (!friend.ok) return friend;
    const gift: Gift = { id: giftDocId(me, today), from: me, fromName: myName, kind, date: today, at: now };
    if (!(await store.sendGift(to, gift))) return fail(`You already sent ${friend.profile.displayName} a gift today, or you are no longer friends.`);
    return { ok: true };
  } catch (err) {
    return fail(errorText(err));
  }
}

/** Gifts waiting for you, newest first, without those from blocked players. */
export async function listGifts(store: SocialStore, me: string): Promise<Res<{ gifts: Gift[] }>> {
  try {
    const [gifts, blocked] = await Promise.all([store.listGifts(me), store.listBlocked(me)]);
    const hidden = new Set(blocked);
    return { ok: true, gifts: gifts.filter((g) => !hidden.has(g.from)).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)) };
  } catch (err) {
    return fail(errorText(err));
  }
}

/** Delete a gift once it has been opened in the game (the engine action `open-gift` ran first). */
export async function claimGift(store: SocialStore, me: string, giftId: string): Promise<Res> {
  try {
    await store.deleteGift(me, giftId);
    return { ok: true };
  } catch (err) {
    return fail(errorText(err));
  }
}

// ---------------------------------------------------------------- chat

async function chatAllowed(store: SocialStore, me: string, to: string): Promise<{ ok: true; profile: Profile } | { ok: false; error: string }> {
  const friend = await mutualFriend(store, me, to);
  if (!friend.ok) return friend;
  const mine = await store.getProfile(me);
  if (!mine?.chatOpen) return fail('Chat is turned off. Turn it on in Settings.');
  if (!friend.profile.chatOpen) return fail(`${friend.profile.displayName} has chat turned off.`);
  return friend;
}

async function post(store: SocialStore, me: string, to: string, msg: Omit<ChatMessage, 'id'>, preview: string): Promise<Res<{ id: string }>> {
  const chatId = chatIdOf(me, to);
  const id = await store.addMessage(chatId, msg);
  const meta: ChatMeta = { id: chatId, members: chatMembers(me, to), lastText: preview, lastFrom: me, lastAt: msg.at };
  await store.setChatMeta(meta);
  return { ok: true, id };
}

/** Send a text message to a mutual friend with chat on. The text is trimmed, limited to 200 characters and masked. */
export async function sendMessage(store: SocialStore, me: string, to: string, input: string, now: string): Promise<Res<{ id: string }>> {
  const prepared = prepareMessage(input);
  if (!prepared.ok) return prepared;
  try {
    const allowed = await chatAllowed(store, me, to);
    if (!allowed.ok) return allowed;
    return await post(store, me, to, { from: me, kind: 'text', text: prepared.text, sticker: null, at: now }, prepared.text);
  } catch (err) {
    return fail(errorText(err));
  }
}

/** The chat list preview of a sticker. */
export const STICKER_PREVIEW = '[sticker]';

/** Send a preset sticker (catalogue id; `validIds` optional). Same rules as a text message. */
export async function sendSticker(store: SocialStore, me: string, to: string, stickerId: string, now: string, validIds?: readonly string[]): Promise<Res<{ id: string }>> {
  if (typeof stickerId !== 'string' || !KIND_RE.test(stickerId) || (validIds && !validIds.includes(stickerId))) return fail('That sticker does not exist.');
  try {
    const allowed = await chatAllowed(store, me, to);
    if (!allowed.ok) return allowed;
    return await post(store, me, to, { from: me, kind: 'sticker', text: '', sticker: stickerId, at: now }, STICKER_PREVIEW);
  } catch (err) {
    return fail(errorText(err));
  }
}

/** Your chats, newest first, with the preview masked again on display. */
export async function listChats(store: SocialStore, me: string): Promise<Res<{ chats: ChatMeta[] }>> {
  try {
    const [metas, blocked] = await Promise.all([store.listChats(me), store.listBlocked(me)]);
    const hidden = new Set(blocked);
    const chats = metas
      .filter((m) => !m.members.some((u) => hidden.has(u)))
      .map((m) => ({ ...m, lastText: maskText(m.lastText) }))
      .sort((a, b) => (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0));
    return { ok: true, chats };
  } catch (err) {
    return fail(errorText(err));
  }
}

/** The last 50 messages of a chat with a friend, oldest first, text masked again so a modified sender cannot get past this reader. */
export async function loadThread(store: SocialStore, me: string, friend: string): Promise<Res<{ messages: ChatMessage[] }>> {
  try {
    if ((await store.listBlocked(me)).includes(friend)) return fail('You blocked that player.');
    const messages = await store.listMessages(chatIdOf(me, friend), HISTORY_LIMIT);
    return { ok: true, messages: messages.map((m) => ({ ...m, text: m.kind === 'text' ? maskText(m.text) : '' })) };
  } catch (err) {
    return fail(errorText(err));
  }
}

// ---------------------------------------------------------------- report

/** Report a player: copies the last 20 messages of your chat, then blocks them. If the report cannot be saved nothing else changes. */
export async function reportPlayer(store: SocialStore, me: string, them: string, reason: ReportReason, now: string): Promise<Res> {
  if (!REPORT_REASONS.includes(reason)) return fail('Pick a reason for the report.');
  if (me === them) return fail('You cannot report yourself.');
  try {
    const chatId = chatIdOf(me, them);
    const recent = await store.listMessages(chatId, REPORT_MESSAGES);
    const messages = recent.slice(-REPORT_MESSAGES).map((m) => ({ from: m.from, text: m.kind === 'sticker' ? `[sticker: ${m.sticker ?? ''}]` : m.text, at: m.at }));
    await store.addReport({ reporter: me, reported: them, chatId, reason, messages, at: now });
  } catch (err) {
    return fail(errorText(err));
  }
  return blockPlayer(store, me, them);
}

// ---------------------------------------------------------------- read state on this device

/** On this device only: when each chat was last opened. */
export const FRIENDS_KEY = 'hidup-malaysia:friends';

export interface FriendsLocal {
  lastRead: Record<string, string>;
}

/** Never throws: anything unreadable means "nothing read yet". */
export function loadFriendsLocal(storage: StorageLike | null): FriendsLocal {
  try {
    const raw = JSON.parse(storage?.getItem(FRIENDS_KEY) ?? 'null') as { lastRead?: unknown } | null;
    const lastRead: Record<string, string> = {};
    if (raw && typeof raw === 'object' && raw.lastRead && typeof raw.lastRead === 'object' && !Array.isArray(raw.lastRead)) {
      for (const [k, v] of Object.entries(raw.lastRead)) if (typeof v === 'string') lastRead[k] = v;
    }
    return { lastRead };
  } catch {
    return { lastRead: {} };
  }
}

export function saveFriendsLocal(storage: StorageLike | null, state: FriendsLocal): void {
  try {
    storage?.setItem(FRIENDS_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable or full: chats simply show as unread again */
  }
}

/** A new state with the chat marked read at `at`. */
export function markChatRead(state: FriendsLocal, chatId: string, at: string): FriendsLocal {
  return { lastRead: { ...state.lastRead, [chatId]: at } };
}

/** Chat ids with a message from someone else newer than the last time this device opened the chat. */
export function unreadChats(metas: readonly ChatMeta[], me: string, lastRead: Record<string, string>): string[] {
  return metas.filter((m) => m.lastFrom !== me && m.lastText !== '' && m.lastAt > (lastRead[m.id] ?? '')).map((m) => m.id);
}
