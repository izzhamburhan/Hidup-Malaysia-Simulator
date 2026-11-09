// Real-player friends as the UI sees them: own profile, friends, requests, chats, gifts, with live listeners while
// Friends is on. Guests, and a cloud that is not set up, load nothing. Every call goes through src/lib/socialClient.ts
// (errors come back as values, never a throw), so a failing network never touches the game. Nothing here changes the
// game state; opening a gift is done by the caller through the engine action `open-gift`.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cleanGift, cleanName, cleanProfile, cleanRequest, dayKey, otherMember, preferCurrentNames, secureRandom } from '../components/phone/phoneLogic';
import { GIFTS } from '../data/gifts';
import { STICKERS } from '../data/stickers';
import { loadFirebase } from '../lib/firebaseClient';
import type { SocialLive } from '../lib/firebaseSocial';
import { HISTORY_LIMIT, chatIdOf, giftDayKey, profileSnapshot, type ChatMessage, type ChatMeta, type FriendRequest, type Gift, type Profile, type ReportReason, type Res, type SocialStore } from '../lib/social';
import * as client from '../lib/socialClient';
import { maskText } from '../lib/wordFilter';
import { useCloud } from './useCloud';
import { useGame } from './useGame';
import { useT } from './useT';

type Store = SocialStore & SocialLive;

export type SocialStatus = 'off' | 'loading' | 'ready' | 'error';

export interface BlockedRow {
  uid: string;
  name: string;
}

export interface SocialApi {
  /** The Firebase config is filled in (cloud features are offered at all). */
  cloudEnabled: boolean;
  signedIn: boolean;
  /** off: guest or no cloud; loading: reading the profile; ready; error: could not read it. */
  status: SocialStatus;
  /** Friends is turned on (a profile exists). */
  on: boolean;
  me: string | null;
  profile: Profile | null;
  /** The last problem in words, or null. */
  error: string | null;
  /** My chat switch (the Settings setting and the published flag agree). */
  chatOn: boolean;
  friends: client.FriendEntry[];
  pending: client.FriendEntry[];
  requests: FriendRequest[];
  blocked: BlockedRow[];
  friendsByUid: Map<string, client.FriendEntry>;
  chats: ChatMeta[];
  unreadIds: string[];
  gifts: Gift[];
  /** Unread real chats + requests + gifts (the NPC chats are added by the phone button). */
  badge: number;
  giftSentTo: (uid: string) => boolean;
  retry: () => void;
  refresh: (force?: boolean) => Promise<void>;
  enable: (name: string) => Promise<Res<{ profile: Profile }>>;
  rename: (name: string) => Promise<Res<{ profile: Profile }>>;
  setChat: (on: boolean) => Promise<Res>;
  disable: () => Promise<Res>;
  preview: (code: string) => Promise<Res<{ profile: Profile }>>;
  requestByCode: (code: string) => Promise<Res<{ profile: Profile; accepted: boolean }>>;
  accept: (from: string) => Promise<Res>;
  decline: (from: string) => Promise<Res>;
  unfriend: (uid: string) => Promise<Res>;
  block: (uid: string) => Promise<Res>;
  unblock: (uid: string) => Promise<Res>;
  report: (uid: string, reason: ReportReason) => Promise<Res>;
  sendGift: (uid: string, kind: string) => Promise<Res>;
  claimGift: (id: string) => Promise<Res>;
  sendText: (uid: string, text: string) => Promise<Res<{ id: string }>>;
  sendSticker: (uid: string, stickerId: string) => Promise<Res<{ id: string }>>;
  markRead: (chatId: string) => void;
  /** Live messages of the chat with a friend, masked again. Returns the unsubscribe function. */
  watchThread: (friend: string, onData: (messages: ChatMessage[]) => void, onError: (error: string) => void) => () => void;
  /** Publish a fresh snapshot of this life (at most once per game day). */
  pushSnapshot: () => Promise<void>;
}

const SocialContext = createContext<SocialApi | null>(null);

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

const GIFT_KINDS = GIFTS.map((g) => g.id);
const STICKER_IDS = STICKERS.map((s) => s.id);
const REFRESH_GAP_MS = 5000;

const cleanEntry = (e: client.FriendEntry): client.FriendEntry => ({ ...e, profile: cleanProfile(e.profile) });
const errorOf = (err: unknown): string => (err instanceof Error && err.message ? err.message : 'Something went wrong.');

export function SocialProvider({ children }: { children: ReactNode }) {
  const cloud = useCloud();
  const game = useGame();
  const t = useT();
  const gameRef = useRef(game);
  gameRef.current = game;
  const tRef = useRef(t);
  tRef.current = t;

  const uid = cloud.enabled ? (cloud.user?.uid ?? null) : null;
  const uidRef = useRef<string | null>(uid);
  uidRef.current = uid;

  const [status, setStatus] = useState<SocialStatus>('off');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<client.FriendEntry[]>([]);
  const [pending, setPending] = useState<client.FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [chatsRaw, setChatsRaw] = useState<ChatMeta[]>([]);
  const [giftsRaw, setGiftsRaw] = useState<Gift[]>([]);
  const [lastRead, setLastRead] = useState<Record<string, string>>(() => client.loadFriendsLocal(storage()).lastRead);
  const [sent, setSent] = useState<Record<string, string>>({});
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [reloadTick, setReloadTick] = useState(0);

  const storeRef = useRef<Store | null>(null);
  const profileRef = useRef<Profile | null>(null);
  profileRef.current = profile;
  const chatsRef = useRef<ChatMeta[]>([]);
  const pushedRef = useRef<string | null>(null);
  const lastRefreshRef = useRef(0);

  const on = status === 'ready' && profile !== null;

  const clearData = useCallback(() => {
    setFriends([]);
    setPending([]);
    setRequests([]);
    setBlocked([]);
    setChatsRaw([]);
    setGiftsRaw([]);
    setSenderNames({});
    lastRefreshRef.current = 0;
    pushedRef.current = null;
  }, []);

  // Load the own profile once per sign-in. Guests and a missing cloud never reach Firebase from here.
  useEffect(() => {
    if (!uid) {
      storeRef.current = null;
      setStatus('off');
      setProfile(null);
      setError(null);
      clearData();
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setError(null);
    (async () => {
      try {
        const handle = await loadFirebase();
        if (cancelled) return;
        storeRef.current = handle.social;
        const p = await handle.social.getProfile(uid);
        if (cancelled) return;
        const cleaned = p ? cleanProfile(p) : null;
        setProfile(cleaned);
        // The chat switch lives on the profile too: another device may have changed it.
        if (cleaned && cleaned.chatOpen !== gameRef.current.settings.friendsChat) gameRef.current.setSettings({ friendsChat: cleaned.chatOpen });
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setError(errorOf(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, reloadTick, clearData]);

  // Look at friends and blocks again (not more than once every few seconds unless forced).
  const refresh = useCallback(async (force = false) => {
    const store = storeRef.current;
    const id = uidRef.current;
    if (!store || !id || !profileRef.current) return;
    if (!force && Date.now() - lastRefreshRef.current < REFRESH_GAP_MS) return;
    lastRefreshRef.current = Date.now();
    const [list, blockedRes] = await Promise.all([client.listFriendProfiles(store, id), client.listBlockedPlayers(store, id)]);
    if (uidRef.current !== id) return;
    if (list.ok) {
      setFriends(list.friends.map(cleanEntry));
      setPending(list.pending.map(cleanEntry));
      setRequests(list.requests.map(cleanRequest));
      setError(null);
    } else setError(list.error);
    if (blockedRes.ok) setBlocked(blockedRes.blocked.map((b) => ({ uid: b.uid, name: b.profile ? cleanName(b.profile.displayName) : '' })));
  }, []);

  // While Friends is on: live chats, requests and gifts.
  useEffect(() => {
    const store = storeRef.current;
    if (!uid || !store || !on) return;
    void refresh(true);
    const onError = (message: string) => setError(message);
    const stops = [
      store.watchChats(uid, setChatsRaw, onError),
      store.watchRequests(uid, (list) => setRequests(list.map(cleanRequest)), onError),
      store.watchGifts(uid, (list) => setGiftsRaw(list.map(cleanGift)), onError),
    ];
    return () => stops.forEach((stop) => stop());
  }, [uid, on, refresh]);

  const blockedSet = useMemo(() => new Set(blocked.map((b) => b.uid)), [blocked]);
  const chats = useMemo(
    () => chatsRaw.filter((m) => !m.members.some((u) => blockedSet.has(u))).map((m) => ({ ...m, lastText: maskText(m.lastText) })),
    [chatsRaw, blockedSet],
  );
  chatsRef.current = chats;
  const friendsByUid = useMemo(() => new Map(friends.map((f) => [f.uid, f])), [friends]);

  // A sender picks the name written on a gift or request, so show the sender's current profile name instead: a friend's
  // from the friends list, anyone else's read once from their public card. Unknown or deleted: the masked sent name.
  useEffect(() => {
    const store = storeRef.current;
    if (!store || !on) return;
    const need = [...new Set([...giftsRaw.map((g) => g.from), ...requests.map((r) => r.from)])].filter((u) => !friendsByUid.has(u) && !(u in senderNames));
    if (need.length === 0) return;
    let cancelled = false;
    void (async () => {
      const found: Record<string, string> = {};
      for (const u of need) {
        try {
          const p = await store.getProfile(u);
          found[u] = p ? cleanName(p.displayName) : '';
        } catch {
          found[u] = '';
        }
      }
      if (!cancelled) setSenderNames((prev) => ({ ...prev, ...found }));
    })();
    return () => {
      cancelled = true;
    };
  }, [on, giftsRaw, requests, friendsByUid, senderNames]);

  const named = useMemo(() => {
    const names = new Map(Object.entries(senderNames));
    for (const f of friends) names.set(f.uid, f.profile.displayName);
    return preferCurrentNames(giftsRaw, requests, names);
  }, [giftsRaw, requests, friends, senderNames]);
  const gifts = useMemo(() => named.gifts.filter((g) => !blockedSet.has(g.from)).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)), [named, blockedSet]);
  const visibleRequests = useMemo(() => named.requests.filter((r) => !blockedSet.has(r.from)), [named, blockedSet]);
  const unreadIds = useMemo(
    () => (uid ? client.unreadChats(chats, uid, lastRead).filter((id) => friendsByUid.has(otherMember(chats.find((c) => c.id === id)!, uid))) : []),
    [chats, uid, lastRead, friendsByUid],
  );

  /** Run one client call with the store, the uid and the device times. Never throws. */
  const run = useCallback(async <T extends object>(fn: (c: { store: Store; uid: string; now: string; today: string; name: string }) => Promise<Res<T>>): Promise<Res<T>> => {
    const store = storeRef.current;
    const id = uidRef.current;
    if (!store || !id) return { ok: false, error: tRef.current('phone.err.unavailable') };
    try {
      return await fn({ store, uid: id, now: new Date().toISOString(), today: giftDayKey(Date.now()), name: profileRef.current?.displayName ?? '' });
    } catch (err) {
      return { ok: false, error: errorOf(err) };
    }
  }, []);

  const pushSnapshot = useCallback(async () => {
    const g = gameRef.current;
    const key = g.slot === 'main' ? dayKey(g.state) : null;
    if (!key || !g.state || !profileRef.current || pushedRef.current === key) return;
    pushedRef.current = key;
    const snapshot = profileSnapshot(g.state);
    const res = await run(({ store, uid: id, now }) => client.updateProfile(store, id, { snapshot }, now));
    if (res.ok) setProfile(cleanProfile(res.profile));
    else pushedRef.current = null;
  }, [run]);

  // A new game day: publish the new look of this life.
  const currentKey = game.slot === 'main' ? dayKey(game.state) : null;
  useEffect(() => {
    if (on && currentKey) void pushSnapshot();
  }, [on, currentKey, pushSnapshot]);

  const enable = useCallback(
    async (name: string) => {
      const g = gameRef.current;
      if (!g.state) return { ok: false as const, error: tRef.current('phone.err.unavailable') };
      let random: () => number;
      try {
        random = secureRandom();
      } catch (err) {
        return { ok: false as const, error: errorOf(err) };
      }
      const snapshot = profileSnapshot(g.state);
      const res = await run(({ store, uid: id, now }) => client.enableFriends(store, id, name, snapshot, now, random));
      if (!res.ok) return res;
      let made = res.profile;
      if (!g.settings.friendsChat && made.chatOpen) {
        const closed = await run(({ store, uid: id, now }) => client.updateProfile(store, id, { chatOpen: false }, now));
        if (closed.ok) made = closed.profile;
      }
      pushedRef.current = g.slot === 'main' ? dayKey(g.state) : null;
      setProfile(cleanProfile(made));
      return { ok: true as const, profile: made };
    },
    [run],
  );

  const rename = useCallback(
    async (name: string) => {
      const res = await run(({ store, uid: id, now }) => client.updateProfile(store, id, { displayName: name }, now));
      if (res.ok) setProfile(cleanProfile(res.profile));
      return res;
    },
    [run],
  );

  const setChat = useCallback(
    async (next: boolean): Promise<Res> => {
      const before = gameRef.current.settings.friendsChat;
      gameRef.current.setSettings({ friendsChat: next });
      if (!profileRef.current) return { ok: true };
      const res = await run(({ store, uid: id, now }) => client.updateProfile(store, id, { chatOpen: next }, now));
      if (res.ok) {
        setProfile(cleanProfile(res.profile));
        return { ok: true };
      }
      gameRef.current.setSettings({ friendsChat: before });
      return res;
    },
    [run],
  );

  const disable = useCallback(async (): Promise<Res> => {
    const res = await run(({ store, uid: id }) => client.disableFriends(store, id));
    if (res.ok) {
      setProfile(null);
      clearData();
      return res;
    }
    // Part of it may have worked: look at what is left.
    const store = storeRef.current;
    const id = uidRef.current;
    if (store && id) {
      try {
        const p = await store.getProfile(id);
        setProfile(p ? cleanProfile(p) : null);
        if (!p) clearData();
      } catch {
        /* keep what is on screen */
      }
    }
    return res;
  }, [run, clearData]);

  /** After anything that changes who my friends are. */
  const changed = useCallback(
    async <T extends Res<object>>(res: T): Promise<T> => {
      if (res.ok) await refresh(true);
      return res;
    },
    [refresh],
  );

  const api: SocialApi = useMemo(
    () => ({
      cloudEnabled: cloud.enabled,
      signedIn: cloud.user !== null,
      status,
      on,
      me: uid,
      profile,
      error,
      chatOn: game.settings.friendsChat && profile?.chatOpen === true,
      friends,
      pending,
      requests: visibleRequests,
      blocked,
      friendsByUid,
      chats,
      unreadIds,
      gifts,
      badge: unreadIds.length + visibleRequests.length + gifts.length,
      giftSentTo: (other) => sent[other] === giftDayKey(Date.now()),
      retry: () => setReloadTick((n) => n + 1),
      refresh,
      enable,
      rename,
      setChat,
      disable,
      preview: (code) => run(({ store, uid: id }) => client.previewCode(store, id, code)),
      requestByCode: async (code) => changed(await run(({ store, uid: id, now, name }) => client.sendFriendRequest(store, id, name, code, now))),
      accept: async (from) => changed(await run(({ store, uid: id, now }) => client.acceptRequest(store, id, from, now))),
      decline: async (from) => {
        const res = await run(({ store, uid: id }) => client.declineRequest(store, id, from));
        if (res.ok) setRequests((list) => list.filter((r) => r.from !== from));
        return res;
      },
      unfriend: async (other) => changed(await run(({ store, uid: id }) => client.removeFriend(store, id, other))),
      block: async (other) => changed(await run(({ store, uid: id }) => client.blockPlayer(store, id, other))),
      unblock: async (other) => changed(await run(({ store, uid: id }) => client.unblockPlayer(store, id, other))),
      report: async (other, reason) => changed(await run(({ store, uid: id, now }) => client.reportPlayer(store, id, other, reason, now))),
      sendGift: async (other, kind) => {
        const res = await run(({ store, uid: id, now, today, name }) => client.sendGift(store, id, name, other, kind, today, now, GIFT_KINDS));
        if (res.ok || res.error.startsWith('You already sent')) setSent((m) => ({ ...m, [other]: giftDayKey(Date.now()) }));
        return res;
      },
      claimGift: async (id) => {
        const res = await run(({ store, uid: me }) => client.claimGift(store, me, id));
        if (res.ok) setGiftsRaw((list) => list.filter((g) => g.id !== id));
        return res;
      },
      sendText: (other, text) => run(({ store, uid: id, now }) => client.sendMessage(store, id, other, text, now)),
      sendSticker: (other, stickerId) => run(({ store, uid: id, now }) => client.sendSticker(store, id, other, stickerId, now, STICKER_IDS)),
      markRead: (chatId) => {
        const meta = chatsRef.current.find((c) => c.id === chatId);
        const now = new Date().toISOString();
        const at = meta && meta.lastAt > now ? meta.lastAt : now; // a friend's clock can be ahead of this device
        setLastRead((prev) => {
          if ((prev[chatId] ?? '') >= at) return prev;
          const next = client.markChatRead({ lastRead: prev }, chatId, at);
          client.saveFriendsLocal(storage(), next);
          return next.lastRead;
        });
      },
      watchThread: (friend, onData, onError) => {
        const store = storeRef.current;
        const id = uidRef.current;
        if (!store || !id) return () => undefined;
        return store.watchMessages(
          chatIdOf(id, friend),
          HISTORY_LIMIT,
          (list) => onData(list.map((m) => ({ ...m, text: m.kind === 'text' ? maskText(m.text) : '' }))),
          onError,
        );
      },
      pushSnapshot,
    }),
    [cloud.enabled, cloud.user, status, on, uid, profile, error, game.settings.friendsChat, friends, pending, visibleRequests, blocked, friendsByUid, chats, unreadIds, gifts, sent, refresh, enable, rename, setChat, disable, run, changed, pushSnapshot],
  );

  return <SocialContext.Provider value={api}>{children}</SocialContext.Provider>;
}

export function useSocial(): SocialApi {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used inside SocialProvider');
  return ctx;
}
