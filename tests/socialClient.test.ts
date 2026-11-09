import { describe, expect, it } from 'vitest';
import {
  FRIENDS_KEY,
  STICKER_PREVIEW,
  acceptRequest,
  blockPlayer,
  claimGift,
  declineRequest,
  disableFriends,
  enableFriends,
  listBlockedPlayers,
  listChats,
  listFriendProfiles,
  listGifts,
  loadFriendsLocal,
  loadThread,
  markChatRead,
  previewCode,
  removeFriend,
  reportPlayer,
  saveFriendsLocal,
  sendFriendRequest,
  sendGift,
  sendMessage,
  sendSticker,
  unblockPlayer,
  unreadChats,
  updateProfile,
} from '../src/lib/socialClient';
import { MAX_REAL_FRIENDS, chatIdOf, formatCode, giftDayKey, profileSnapshot, type ChatMeta, type ProfileSnapshot } from '../src/lib/social';
import { fakeSocialStore, type FakeSocialStore } from './fakeSocialStore';
import { inMemoryStorage, makeGame } from './helpers';

const T1 = '2026-11-09T10:00:00.000Z';
const T2 = '2026-11-09T10:05:00.000Z';
const TODAY = giftDayKey(Date.parse(T1));
const dayAfter = (key: string): string => String(Number(key) + 1);
const dayBefore = (key: string): string => String(Number(key) - 1);
const snapshot: ProfileSnapshot = profileSnapshot(makeGame());

function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}
/** A different code per call: the first digit of each draw moves along the alphabet. */
const counter = () => {
  let n = 0;
  return () => ((n++ * 7) % 31) / 31 + 0.001;
};

async function join(store: FakeSocialStore, uid: string, name: string, random = counter()) {
  const res = await enableFriends(store, uid, name, snapshot, T1, random);
  if (!res.ok) throw new Error(res.error);
  return res.profile;
}

/** Two players who are mutual friends. */
async function pair(store = fakeSocialStore()) {
  const a = await join(store, 'a', 'Aisyah');
  const b = await join(store, 'b', 'Bala');
  const sent = await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1);
  expect(sent.ok).toBe(true);
  expect((await acceptRequest(store, 'b', 'a', T2)).ok).toBe(true);
  return { store, a, b };
}

describe('enableFriends', () => {
  it('writes the profile and claims the code', async () => {
    const store = fakeSocialStore();
    const res = await enableFriends(store, 'a', '  Aisyah  ', snapshot, T1, counter());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.profile).toEqual({ uid: 'a', code: res.profile.code, displayName: 'Aisyah', chatOpen: true, snapshot, updatedAt: T1 });
    expect(res.profile.code).toHaveLength(6);
    expect(store.codes.get(res.profile.code)).toBe('a');
    expect(store.profiles.get('a')?.displayName).toBe('Aisyah');
  });

  it('retries a taken code up to 5 times, then gives up with a reason', async () => {
    const store = fakeSocialStore();
    store.codes.set('AAAAAA', 'someone');
    const ok = await enableFriends(store, 'a', 'Aisyah', snapshot, T1, seq([0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
    expect(ok.ok && ok.profile.code).toBe(formatCodeless(0.5));
    expect(store.calls.filter((c) => c === 'claimCode')).toHaveLength(2);

    const full = fakeSocialStore();
    full.codes.set('AAAAAA', 'someone');
    const res = await enableFriends(full, 'a', 'Aisyah', snapshot, T1, () => 0);
    expect(res).toEqual({ ok: false, error: 'Could not make a friend code. Please try again.' });
    expect(full.calls.filter((c) => c === 'claimCode')).toHaveLength(5);
    expect(full.profiles.size).toBe(0);
  });

  it('refuses a bad or blocked display name before touching the store', async () => {
    const store = fakeSocialStore();
    const res = await enableFriends(store, 'a', 'sial', snapshot, T1, counter());
    expect(res).toEqual({ ok: false, error: 'Please pick a different name.' });
    expect(store.calls).toEqual([]);
    expect((await enableFriends(store, 'a', 'ab', snapshot, T1, counter())).ok).toBe(false);
  });

  it('returns the existing profile when Friends is already on', async () => {
    const store = fakeSocialStore();
    const first = await join(store, 'a', 'Aisyah');
    const again = await enableFriends(store, 'a', 'Other', snapshot, T2, counter());
    expect(again.ok && again.profile).toEqual(first);
    expect(store.codes.size).toBe(1);
  });

  it('releases the code when the profile cannot be written', async () => {
    const store = fakeSocialStore(new Set(['setProfile']));
    const res = await enableFriends(store, 'a', 'Aisyah', snapshot, T1, counter());
    expect(res.ok).toBe(false);
    expect(store.codes.size).toBe(0);
  });
});

const formatCodeless = (r: number) => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(r * 31)].repeat(6);

describe('updateProfile', () => {
  it('changes the name, the snapshot and the chat switch', async () => {
    const store = fakeSocialStore();
    await join(store, 'a', 'Aisyah');
    const next = { ...snapshot, day: 99 };
    const res = await updateProfile(store, 'a', { displayName: ' Aina Sofea ', snapshot: next, chatOpen: false }, T2);
    expect(res.ok).toBe(true);
    const saved = store.profiles.get('a')!;
    expect(saved).toMatchObject({ displayName: 'Aina Sofea', chatOpen: false, updatedAt: T2 });
    expect(saved.snapshot.day).toBe(99);
  });

  it('keeps the old values for a refused name, and says when Friends is off', async () => {
    const store = fakeSocialStore();
    await join(store, 'a', 'Aisyah');
    expect(await updateProfile(store, 'a', { displayName: 'bangsat' }, T2)).toEqual({ ok: false, error: 'Please pick a different name.' });
    expect(store.profiles.get('a')?.displayName).toBe('Aisyah');
    expect(await updateProfile(store, 'zzz', { chatOpen: false }, T2)).toEqual({ ok: false, error: 'Friends is not turned on.' });
  });
});

describe('previewCode and sendFriendRequest', () => {
  it('shows the player behind a code, whatever the typing style', async () => {
    const store = fakeSocialStore();
    await join(store, 'a', 'Aisyah');
    const b = await join(store, 'b', 'Bala');
    const res = await previewCode(store, 'a', ` hm-${b.code.toLowerCase()} `);
    expect(res.ok && res.profile.displayName).toBe('Bala');
  });

  it('gives a reason for each way a code cannot be used', async () => {
    const store = fakeSocialStore();
    const a = await join(store, 'a', 'Aisyah');
    const b = await join(store, 'b', 'Bala');
    expect(await previewCode(store, 'a', 'nonsense')).toMatchObject({ ok: false, error: expect.stringContaining('does not look right') });
    expect(await previewCode(store, 'a', 'HM-ZZZZZZ')).toEqual({ ok: false, error: 'No player has that code.' });
    expect(await previewCode(store, 'a', formatCode(a.code))).toEqual({ ok: false, error: 'That is your own code.' });
    // a code whose profile is gone
    store.profiles.delete('b');
    expect(await previewCode(store, 'a', formatCode(b.code))).toEqual({ ok: false, error: 'No player has that code.' });
    store.profiles.set('b', b);
    await blockPlayer(store, 'a', 'b');
    expect(await previewCode(store, 'a', formatCode(b.code))).toEqual({ ok: false, error: 'You blocked that player. Unblock them first.' });
    await unblockPlayer(store, 'a', 'b');
    expect((await previewCode(store, 'a', formatCode(b.code))).ok).toBe(true);
  });

  it('says already friends when mutual, and already sent while waiting', async () => {
    const store = fakeSocialStore();
    await join(store, 'a', 'Aisyah');
    const b = await join(store, 'b', 'Bala');
    await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1);
    expect(await previewCode(store, 'a', formatCode(b.code))).toEqual({ ok: false, error: 'You already sent that player a request.' });
    expect(await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1)).toEqual({ ok: false, error: 'You already sent that player a request.' });
    await acceptRequest(store, 'b', 'a', T2);
    expect(await previewCode(store, 'a', formatCode(b.code))).toEqual({ ok: false, error: 'You are already friends.' });
    expect(await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1)).toEqual({ ok: false, error: 'You are already friends.' });
  });

  it('writes the request to them and your own friend link', async () => {
    const store = fakeSocialStore();
    await join(store, 'a', 'Aisyah');
    const b = await join(store, 'b', 'Bala');
    const res = await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1);
    expect(res.ok && res.accepted).toBe(false);
    expect(store.requests.get('b')?.get('a')).toEqual({ from: 'a', displayName: 'Aisyah', at: T1 });
    expect(store.friends.get('a')?.get('b')).toEqual({ uid: 'b', since: T1 });
    expect(store.friends.get('b')?.has('a') ?? false).toBe(false);
  });

  it('refuses with a full list', async () => {
    const store = fakeSocialStore();
    await join(store, 'a', 'Aisyah');
    const b = await join(store, 'b', 'Bala');
    for (let i = 0; i < MAX_REAL_FRIENDS; i++) await store.addFriend('a', `x${i}`, T1);
    expect(await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1)).toEqual({ ok: false, error: `Your friends list is full (${MAX_REAL_FRIENDS}).` });
    expect(store.requests.get('b')?.size ?? 0).toBe(0);
  });

  it('accepts their pending request instead when they asked first', async () => {
    const store = fakeSocialStore();
    const a = await join(store, 'a', 'Aisyah');
    const b = await join(store, 'b', 'Bala');
    await sendFriendRequest(store, 'b', 'Bala', formatCode(a.code), T1);
    const res = await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T2);
    expect(res.ok && res.accepted).toBe(true);
    expect(store.requests.get('a')?.size ?? 0).toBe(0);
    const list = await listFriendProfiles(store, 'a');
    expect(list.ok && list.friends.map((f) => f.uid)).toEqual(['b']);
  });

  it('a store that rejects the request leaves no friend link behind', async () => {
    const store = fakeSocialStore();
    await join(store, 'a', 'Aisyah');
    const b = await join(store, 'b', 'Bala');
    store.fail = new Set(['sendRequest']);
    const res = await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1);
    expect(res.ok).toBe(false);
    expect(store.friends.get('a')?.size ?? 0).toBe(0);
  });
});

describe('accept, decline, remove', () => {
  it('accepting writes my link and deletes the request; friendship is mutual only with both', async () => {
    const store = fakeSocialStore();
    await join(store, 'a', 'Aisyah');
    const b = await join(store, 'b', 'Bala');
    await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1);
    const before = await listFriendProfiles(store, 'a');
    expect(before.ok && before.friends).toEqual([]);
    expect(before.ok && before.pending.map((p) => p.uid)).toEqual(['b']);
    expect(await acceptRequest(store, 'b', 'a', T2)).toEqual({ ok: true });
    expect(store.friends.get('b')?.get('a')).toEqual({ uid: 'a', since: T2 });
    expect(store.requests.get('b')?.size).toBe(0);
    const after = await listFriendProfiles(store, 'a');
    expect(after.ok && after.friends.map((f) => f.profile.displayName)).toEqual(['Bala']);
    expect(after.ok && after.pending).toEqual([]);
  });

  it('refuses a missing request, a cancelled one, a blocked sender and a full list', async () => {
    const store = fakeSocialStore();
    const a = await join(store, 'a', 'Aisyah');
    const b = await join(store, 'b', 'Bala');
    expect(await acceptRequest(store, 'b', 'a', T2)).toEqual({ ok: false, error: 'That request is no longer there.' });

    await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1);
    store.friends.get('a')!.delete('b');
    expect(await acceptRequest(store, 'b', 'a', T2)).toEqual({ ok: false, error: 'That player cancelled the request.' });
    expect(store.requests.get('b')?.size).toBe(0);

    await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1);
    await store.block('b', 'a');
    expect(await acceptRequest(store, 'b', 'a', T2)).toEqual({ ok: false, error: 'You blocked that player. Unblock them first.' });
    await store.unblock('b', 'a');

    await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1).catch(() => undefined);
    store.requests.get('b')!.set('a', { from: 'a', displayName: 'Aisyah', at: T1 });
    store.friends.get('a')!.set('b', { uid: 'b', since: T1 });
    for (let i = 0; i < MAX_REAL_FRIENDS; i++) await store.addFriend('b', `x${i}`, T1);
    expect(await acceptRequest(store, 'b', 'a', T2)).toEqual({ ok: false, error: `Your friends list is full (${MAX_REAL_FRIENDS}).` });
    expect(a.uid).toBe('a');
  });

  it('declining deletes the request', async () => {
    const store = fakeSocialStore();
    await join(store, 'a', 'Aisyah');
    const b = await join(store, 'b', 'Bala');
    await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1);
    expect(await declineRequest(store, 'b', 'a')).toEqual({ ok: true });
    expect(store.requests.get('b')?.size).toBe(0);
  });

  it('removing a friend drops my link, and they vanish from my list', async () => {
    const { store } = await pair();
    expect(await removeFriend(store, 'a', 'b')).toEqual({ ok: true });
    expect(store.friends.get('a')?.has('b')).toBe(false);
    expect(store.friends.get('b')?.has('a')).toBe(true);
    const mine = await listFriendProfiles(store, 'a');
    expect(mine.ok && mine.friends).toEqual([]);
    const theirs = await listFriendProfiles(store, 'b');
    expect(theirs.ok && theirs.friends).toEqual([]);
    expect(theirs.ok && theirs.pending.map((p) => p.uid)).toEqual(['a']);
  });
});

describe('listFriendProfiles', () => {
  it('lists incoming requests, hides blocked players and friends whose profile is gone', async () => {
    const { store, b } = await pair();
    await join(store, 'c', 'Chong');
    const d = await join(store, 'd', 'Dewi');
    await sendFriendRequest(store, 'd', 'Dewi', formatCode((await store.getProfile('a'))!.code), T1);
    store.profiles.delete('b');
    let res = await listFriendProfiles(store, 'a');
    expect(res.ok && res.friends).toEqual([]);
    expect(res.ok && res.requests.map((r) => r.from)).toEqual(['d']);
    store.profiles.set('b', b);
    res = await listFriendProfiles(store, 'a');
    expect(res.ok && res.friends.map((f) => f.uid)).toEqual(['b']);
    await store.block('a', 'd');
    res = await listFriendProfiles(store, 'a');
    expect(res.ok && res.requests).toEqual([]);
    expect(d.uid).toBe('d');
  });
});

describe('block, unblock', () => {
  it('removes my link, deletes their request and blocks them', async () => {
    const { store } = await pair();
    await store.sendRequest('a', { from: 'b', displayName: 'Bala', at: T1 });
    expect(await blockPlayer(store, 'a', 'b')).toEqual({ ok: true });
    expect(store.blocked.get('a')?.has('b')).toBe(true);
    expect(store.friends.get('a')?.has('b')).toBe(false);
    expect(store.requests.get('a')?.has('b')).toBe(false);
    const list = await listBlockedPlayers(store, 'a');
    expect(list.ok && list.blocked.map((x) => [x.uid, x.profile?.displayName])).toEqual([['b', 'Bala']]);
    expect(await unblockPlayer(store, 'a', 'b')).toEqual({ ok: true });
    expect(store.blocked.get('a')?.has('b')).toBe(false);
  });

  it('blocks first and still blocks when a later step fails', async () => {
    const { store } = await pair();
    store.fail = new Set(['removeFriend']);
    const res = await blockPlayer(store, 'a', 'b');
    expect(res.ok).toBe(false);
    expect(store.blocked.get('a')?.has('b')).toBe(true);
    expect(await blockPlayer(store, 'a', 'a')).toEqual({ ok: false, error: 'You cannot block yourself.' });
  });

  it('a blocked friend is hidden from chats, gifts and threads', async () => {
    const { store } = await pair();
    await sendMessage(store, 'b', 'a', 'hi', T1);
    await sendGift(store, 'b', 'Bala', 'a', 'kopi', TODAY, T1);
    await store.block('a', 'b');
    const chats = await listChats(store, 'a');
    expect(chats.ok && chats.chats).toEqual([]);
    const gifts = await listGifts(store, 'a');
    expect(gifts.ok && gifts.gifts).toEqual([]);
    expect(await loadThread(store, 'a', 'b')).toEqual({ ok: false, error: 'You blocked that player.' });
  });
});

describe('gifts', () => {
  it('sends one gift a day to a mutual friend, with a reason for the second', async () => {
    const { store } = await pair();
    expect(await sendGift(store, 'a', 'Aisyah', 'b', 'kopi', TODAY, T1)).toEqual({ ok: true });
    expect(store.gifts.get('b')?.get(`a_${TODAY}`)).toEqual({ id: `a_${TODAY}`, from: 'a', fromName: 'Aisyah', kind: 'kopi', date: TODAY, at: T1 });
    expect(await sendGift(store, 'a', 'Aisyah', 'b', 'kuih', TODAY, T2)).toEqual({ ok: false, error: 'You already sent Bala a gift today, or you are no longer friends.' });
    expect(store.gifts.get('b')?.size).toBe(1);
    expect(await sendGift(store, 'a', 'Aisyah', 'b', 'kuih', dayAfter(TODAY), T2)).toEqual({ ok: true });
    expect(store.gifts.get('b')?.size).toBe(2);
  });

  it('refuses non-friends, one-sided links, yourself and unknown kinds', async () => {
    const store = fakeSocialStore();
    await join(store, 'a', 'Aisyah');
    const b = await join(store, 'b', 'Bala');
    await join(store, 'c', 'Chong');
    const reason = 'You can only do that with friends.';
    expect(await sendGift(store, 'a', 'Aisyah', 'c', 'kopi', TODAY, T1)).toEqual({ ok: false, error: reason });
    await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1);
    expect(await sendGift(store, 'a', 'Aisyah', 'b', 'kopi', TODAY, T1)).toEqual({ ok: false, error: reason });
    expect(await sendGift(store, 'b', 'Bala', 'a', 'kopi', TODAY, T1)).toEqual({ ok: false, error: reason });
    expect(await sendGift(store, 'a', 'Aisyah', 'a', 'kopi', TODAY, T1)).toEqual({ ok: false, error: 'You cannot send that to yourself.' });
    await acceptRequest(store, 'b', 'a', T2);
    expect(await sendGift(store, 'a', 'Aisyah', 'b', 'Bad Kind!', TODAY, T1)).toEqual({ ok: false, error: 'That gift does not exist.' });
    expect(await sendGift(store, 'a', 'Aisyah', 'b', 'kopi', TODAY, T1, ['kuih'])).toEqual({ ok: false, error: 'That gift does not exist.' });
    expect(await sendGift(store, 'a', 'Aisyah', 'b', 'kuih', TODAY, T1, ['kuih'])).toEqual({ ok: true });
  });

  it('lists the inbox newest first and claiming deletes the gift', async () => {
    const { store } = await pair();
    await sendGift(store, 'a', 'Aisyah', 'b', 'kopi', dayBefore(TODAY), T1);
    await sendGift(store, 'a', 'Aisyah', 'b', 'kuih', TODAY, T2);
    const inbox = await listGifts(store, 'b');
    expect(inbox.ok && inbox.gifts.map((g) => g.kind)).toEqual(['kuih', 'kopi']);
    expect(await claimGift(store, 'b', `a_${TODAY}`)).toEqual({ ok: true });
    const left = await listGifts(store, 'b');
    expect(left.ok && left.gifts.map((g) => g.kind)).toEqual(['kopi']);
  });
});

describe('chat', () => {
  it('sends a masked text, sets the chat meta, and the friend sees it', async () => {
    const { store } = await pair();
    const res = await sendMessage(store, 'a', 'b', '  Jom lepak, kau sial  ', T1);
    expect(res.ok).toBe(true);
    const id = chatIdOf('a', 'b');
    expect(store.messages.get(id)).toEqual([{ id: expect.any(String), from: 'a', kind: 'text', text: 'Jom lepak, kau ****', sticker: null, at: T1 }]);
    expect(store.chats.get(id)).toEqual({ id, members: ['a', 'b'], lastText: 'Jom lepak, kau ****', lastFrom: 'a', lastAt: T1 });
    const thread = await loadThread(store, 'b', 'a');
    expect(thread.ok && thread.messages.map((m) => m.text)).toEqual(['Jom lepak, kau ****']);
  });

  it('refuses empty and too long text before touching the store', async () => {
    const { store } = await pair();
    store.calls.length = 0;
    expect(await sendMessage(store, 'a', 'b', '   ', T1)).toEqual({ ok: false, error: 'Write a message first.' });
    expect(await sendMessage(store, 'a', 'b', 'x'.repeat(201), T1)).toEqual({ ok: false, error: 'Messages can be up to 200 characters.' });
    expect(store.calls).toEqual([]);
  });

  it('only mutual friends can chat', async () => {
    const store = fakeSocialStore();
    await join(store, 'a', 'Aisyah');
    const b = await join(store, 'b', 'Bala');
    expect(await sendMessage(store, 'a', 'b', 'hi', T1)).toEqual({ ok: false, error: 'You can only do that with friends.' });
    await sendFriendRequest(store, 'a', 'Aisyah', formatCode(b.code), T1);
    expect(await sendMessage(store, 'a', 'b', 'hi', T1)).toEqual({ ok: false, error: 'You can only do that with friends.' });
    expect(store.messages.size).toBe(0);
  });

  it('refuses when the friend has chat off, and when mine is off', async () => {
    const { store } = await pair();
    await updateProfile(store, 'b', { chatOpen: false }, T2);
    expect(await sendMessage(store, 'a', 'b', 'hi', T2)).toEqual({ ok: false, error: 'Bala has chat turned off.' });
    expect(await sendSticker(store, 'a', 'b', 'hai', T2)).toEqual({ ok: false, error: 'Bala has chat turned off.' });
    await updateProfile(store, 'b', { chatOpen: true }, T2);
    await updateProfile(store, 'a', { chatOpen: false }, T2);
    expect(await sendMessage(store, 'a', 'b', 'hi', T2)).toEqual({ ok: false, error: 'Chat is turned off. Turn it on in Settings.' });
    expect(store.messages.size).toBe(0);
  });

  it('sends stickers as sticker messages with a short preview', async () => {
    const { store } = await pair();
    expect((await sendSticker(store, 'a', 'b', 'hai', T1)).ok).toBe(true);
    const id = chatIdOf('a', 'b');
    expect(store.messages.get(id)?.[0]).toMatchObject({ kind: 'sticker', text: '', sticker: 'hai' });
    expect(store.chats.get(id)?.lastText).toBe(STICKER_PREVIEW);
    expect(await sendSticker(store, 'a', 'b', 'NOT OK', T1)).toEqual({ ok: false, error: 'That sticker does not exist.' });
    expect(await sendSticker(store, 'a', 'b', 'hai', T1, ['yay'])).toEqual({ ok: false, error: 'That sticker does not exist.' });
  });

  it('masks again on display, so a modified sender cannot slip a word past the reader', async () => {
    const { store } = await pair();
    const id = chatIdOf('a', 'b');
    await store.addMessage(id, { from: 'a', kind: 'text', text: 'you babi, call 0123456789', sticker: null, at: T1 });
    await store.setChatMeta({ id, members: ['a', 'b'], lastText: 'you babi', lastFrom: 'a', lastAt: T1 });
    const thread = await loadThread(store, 'b', 'a');
    expect(thread.ok && thread.messages[0].text).toBe('you ****, call [hidden]');
    const chats = await listChats(store, 'b');
    expect(chats.ok && chats.chats[0].lastText).toBe('you ****');
  });

  it('loads only the last 50 messages, oldest first, and lists chats newest first', async () => {
    const { store } = await pair();
    await join(store, 'c', 'Chong');
    const id = chatIdOf('a', 'b');
    for (let i = 0; i < 60; i++) await store.addMessage(id, { from: 'a', kind: 'text', text: `m${i}`, sticker: null, at: T1 });
    const thread = await loadThread(store, 'b', 'a');
    expect(thread.ok && thread.messages).toHaveLength(50);
    expect(thread.ok && thread.messages[0].text).toBe('m10');
    expect(thread.ok && thread.messages[49].text).toBe('m59');
    await store.setChatMeta({ id: 'old', members: ['a', 'c'], lastText: 'old', lastFrom: 'c', lastAt: '2026-01-01T00:00:00.000Z' });
    await store.setChatMeta({ id, members: ['a', 'b'], lastText: 'new', lastFrom: 'b', lastAt: T2 });
    const chats = await listChats(store, 'a');
    expect(chats.ok && chats.chats.map((c) => c.id)).toEqual([id, 'old']);
  });
});

describe('reportPlayer', () => {
  it('copies the last 20 messages, then blocks', async () => {
    const { store } = await pair();
    const id = chatIdOf('a', 'b');
    for (let i = 0; i < 25; i++) await store.addMessage(id, { from: i % 2 ? 'a' : 'b', kind: 'text', text: `m${i}`, sticker: null, at: `2026-11-09T10:${String(i).padStart(2, '0')}:00.000Z` });
    await store.addMessage(id, { from: 'b', kind: 'sticker', text: '', sticker: 'hai', at: T2 });
    const res = await reportPlayer(store, 'a', 'b', 'rude', T2);
    expect(res).toEqual({ ok: true });
    expect(store.reports).toHaveLength(1);
    const report = store.reports[0];
    expect(report).toMatchObject({ reporter: 'a', reported: 'b', chatId: id, reason: 'rude', at: T2 });
    expect(report.messages).toHaveLength(20);
    expect(report.messages[0].text).toBe('m6');
    expect(report.messages[18].text).toBe('m24');
    expect(report.messages[19]).toEqual({ from: 'b', text: '[sticker: hai]', at: T2 });
    expect(store.blocked.get('a')?.has('b')).toBe(true);
    expect(store.friends.get('a')?.has('b')).toBe(false);
  });

  it('works with an empty chat and every reason; refuses an unknown reason and yourself', async () => {
    for (const reason of ['rude', 'bullying', 'personal-info', 'other'] as const) {
      const { store } = await pair();
      expect((await reportPlayer(store, 'a', 'b', reason, T2)).ok).toBe(true);
      expect(store.reports[0].messages).toEqual([]);
    }
    const { store } = await pair();
    expect(await reportPlayer(store, 'a', 'b', 'spam' as never, T2)).toEqual({ ok: false, error: 'Pick a reason for the report.' });
    expect(await reportPlayer(store, 'a', 'a', 'rude', T2)).toEqual({ ok: false, error: 'You cannot report yourself.' });
    expect(store.reports).toEqual([]);
    expect(store.blocked.get('a')?.size ?? 0).toBe(0);
  });

  it('changes nothing when the report cannot be saved', async () => {
    const { store } = await pair();
    store.fail = new Set(['addReport']);
    const res = await reportPlayer(store, 'a', 'b', 'rude', T2);
    expect(res.ok).toBe(false);
    expect(store.blocked.get('a')?.size ?? 0).toBe(0);
    expect(store.friends.get('a')?.has('b')).toBe(true);
  });
});

describe('disableFriends', () => {
  it('deletes everything this player wrote, and nothing of anyone else', async () => {
    const { store, a, b } = await pair();
    const c = await join(store, 'c', 'Chong');
    await sendFriendRequest(store, 'a', 'Aisyah', formatCode(c.code), T1); // never answered
    await sendMessage(store, 'a', 'b', 'one', T1);
    await sendMessage(store, 'b', 'a', 'two', T2);
    await sendMessage(store, 'a', 'b', 'three', T2);
    await sendGift(store, 'b', 'Bala', 'a', 'kopi', TODAY, T1);
    await store.sendRequest('a', { from: 'd', displayName: 'Dewi', at: T1 });
    await store.block('a', 'x');

    expect(await disableFriends(store, 'a')).toEqual({ ok: true });

    expect(store.profiles.has('a')).toBe(false);
    expect(store.codes.has(a.code)).toBe(false);
    expect(store.friends.get('a')?.size ?? 0).toBe(0);
    expect(store.requests.get('a')?.size ?? 0).toBe(0);
    expect(store.requests.get('c')?.has('a') ?? false).toBe(false);
    expect(store.gifts.get('a')?.size ?? 0).toBe(0);
    expect(store.blocked.get('a')?.size ?? 0).toBe(0);
    expect(store.messages.get(chatIdOf('a', 'b'))?.map((m) => m.text)).toEqual(['two']);
    expect(store.chats.get(chatIdOf('a', 'b'))?.lastText).toBe('');

    // the others are untouched
    expect(store.profiles.get('b')).toEqual(b);
    expect(store.profiles.has('c')).toBe(true);
    expect(store.friends.get('b')?.has('a')).toBe(true);
    const after = await listFriendProfiles(store, 'b');
    expect(after.ok && after.friends).toEqual([]);
  });

  it('works when Friends was never on, and when the profile is already gone', async () => {
    const store = fakeSocialStore();
    expect(await disableFriends(store, 'nobody')).toEqual({ ok: true });
  });

  it('carries on past a failing step and reports the first error', async () => {
    const { store, a } = await pair();
    await sendMessage(store, 'a', 'b', 'one', T1);
    store.fail = new Set(['deleteMessage', 'removeFriend']);
    const res = await disableFriends(store, 'a');
    expect(res).toEqual({ ok: false, error: 'fake store: deleteMessage failed' });
    // everything else still ran
    expect(store.profiles.has('a')).toBe(false);
    expect(store.codes.has(a.code)).toBe(false);
    expect(store.blocked.get('a')?.size ?? 0).toBe(0);
  });

  it('keeps the code when the profile cannot be deleted', async () => {
    const { store, a } = await pair();
    store.fail = new Set(['deleteProfile']);
    const res = await disableFriends(store, 'a');
    expect(res.ok).toBe(false);
    expect(store.profiles.has('a')).toBe(true);
    expect(store.codes.get(a.code)).toBe('a');
  });
});

describe('failures are values', () => {
  it('a failing store never throws out of a client function', async () => {
    const store = fakeSocialStore(true);
    const results = await Promise.all([
      enableFriends(store, 'a', 'Aisyah', snapshot, T1, counter()),
      updateProfile(store, 'a', { chatOpen: false }, T1),
      previewCode(store, 'a', 'HM-ABC234'),
      sendFriendRequest(store, 'a', 'Aisyah', 'HM-ABC234', T1),
      acceptRequest(store, 'a', 'b', T1),
      declineRequest(store, 'a', 'b'),
      removeFriend(store, 'a', 'b'),
      blockPlayer(store, 'a', 'b'),
      unblockPlayer(store, 'a', 'b'),
      listBlockedPlayers(store, 'a'),
      listFriendProfiles(store, 'a'),
      sendGift(store, 'a', 'Aisyah', 'b', 'kopi', TODAY, T1),
      listGifts(store, 'a'),
      claimGift(store, 'a', 'x'),
      sendMessage(store, 'a', 'b', 'hi', T1),
      sendSticker(store, 'a', 'b', 'hai', T1),
      listChats(store, 'a'),
      loadThread(store, 'a', 'b'),
      reportPlayer(store, 'a', 'b', 'rude', T1),
      disableFriends(store, 'a'),
    ]);
    for (const res of results) {
      expect(res.ok).toBe(false);
      expect(res.ok === false && res.error).toMatch(/failed|Could not make/);
    }
  });

  it('a non-Error rejection still gives a readable reason', async () => {
    const store = fakeSocialStore();
    store.getProfile = async () => {
      throw 'boom';
    };
    expect(await updateProfile(store, 'a', {}, T1)).toEqual({ ok: false, error: 'Something went wrong. Please try again.' });
  });
});

describe('read state on this device', () => {
  const meta = (id: string, lastFrom: string, lastAt: string, lastText = 'hi'): ChatMeta => ({ id, members: ['a', 'b'], lastText, lastFrom, lastAt });

  it('unreadChats lists chats with a newer message from someone else', () => {
    const metas = [meta('c1', 'b', T2), meta('c2', 'a', T2), meta('c3', 'b', T1), meta('c4', 'b', T2, '')];
    expect(unreadChats(metas, 'a', {})).toEqual(['c1', 'c3']);
    expect(unreadChats(metas, 'a', { c1: T2, c3: T1 })).toEqual([]);
    expect(unreadChats(metas, 'a', { c1: T1 })).toEqual(['c1', 'c3']);
    expect(unreadChats([], 'a', {})).toEqual([]);
  });

  it('markChatRead returns a new state', () => {
    const base = { lastRead: { x: T1 } };
    const next = markChatRead(base, 'y', T2);
    expect(next).toEqual({ lastRead: { x: T1, y: T2 } });
    expect(base).toEqual({ lastRead: { x: T1 } });
  });

  it('saves and loads under the friends key', () => {
    const storage = inMemoryStorage();
    expect(loadFriendsLocal(storage)).toEqual({ lastRead: {} });
    saveFriendsLocal(storage, { lastRead: { c1: T1 } });
    expect(storage.map.has(FRIENDS_KEY)).toBe(true);
    expect(loadFriendsLocal(storage)).toEqual({ lastRead: { c1: T1 } });
  });

  it('never throws: a broken value is empty, and storage that throws is ignored', () => {
    const storage = inMemoryStorage();
    storage.setItem(FRIENDS_KEY, '{not json');
    expect(loadFriendsLocal(storage)).toEqual({ lastRead: {} });
    storage.setItem(FRIENDS_KEY, JSON.stringify({ lastRead: ['x'] }));
    expect(loadFriendsLocal(storage)).toEqual({ lastRead: {} });
    storage.setItem(FRIENDS_KEY, JSON.stringify({ lastRead: { a: 1, b: 'ok' } }));
    expect(loadFriendsLocal(storage)).toEqual({ lastRead: { b: 'ok' } });
    expect(loadFriendsLocal(null)).toEqual({ lastRead: {} });
    const angry = {
      getItem: () => {
        throw new Error('no');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(loadFriendsLocal(angry)).toEqual({ lastRead: {} });
    expect(() => saveFriendsLocal(angry, { lastRead: {} })).not.toThrow();
    expect(() => saveFriendsLocal(null, { lastRead: {} })).not.toThrow();
  });
});
