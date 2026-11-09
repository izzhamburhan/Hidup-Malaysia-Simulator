// An in-memory SocialStore for tests. It behaves like the Firestore paths: friend links, requests, gifts and
// blocks are per owner, a taken code or an existing gift id is refused, and `fail` makes methods reject.

import type { ChatMessage, ChatMeta, FriendLink, FriendRequest, Gift, Profile, Report, SocialStore } from '../src/lib/social';

export interface FakeSocialStore extends SocialStore {
  profiles: Map<string, Profile>;
  codes: Map<string, string>;
  friends: Map<string, Map<string, FriendLink>>;
  requests: Map<string, Map<string, FriendRequest>>;
  blocked: Map<string, Set<string>>;
  gifts: Map<string, Map<string, Gift>>;
  chats: Map<string, ChatMeta>;
  messages: Map<string, ChatMessage[]>;
  reports: Report[];
  /** Method names that reject; `true` makes every method reject. */
  fail: Set<string> | true | null;
  calls: string[];
}

const sub = <V>(m: Map<string, Map<string, V>>, key: string): Map<string, V> => {
  let inner = m.get(key);
  if (!inner) m.set(key, (inner = new Map()));
  return inner;
};

export function fakeSocialStore(failWith: Set<string> | true | null = null): FakeSocialStore {
  let seq = 0;
  const s: FakeSocialStore = {
    profiles: new Map(),
    codes: new Map(),
    friends: new Map(),
    requests: new Map(),
    blocked: new Map(),
    gifts: new Map(),
    chats: new Map(),
    messages: new Map(),
    reports: [],
    fail: failWith,
    calls: [],
    async getProfile(uid) {
      guard('getProfile');
      return s.profiles.get(uid) ?? null;
    },
    async setProfile(profile) {
      guard('setProfile');
      s.profiles.set(profile.uid, structuredClone(profile));
    },
    async deleteProfile(uid) {
      guard('deleteProfile');
      s.profiles.delete(uid);
    },
    async lookupCode(code) {
      guard('lookupCode');
      return s.codes.get(code) ?? null;
    },
    async claimCode(code, uid) {
      guard('claimCode');
      if (s.codes.has(code)) return false;
      s.codes.set(code, uid);
      return true;
    },
    async releaseCode(code) {
      guard('releaseCode');
      s.codes.delete(code);
    },
    async listFriends(uid) {
      guard('listFriends');
      return [...sub(s.friends, uid).values()];
    },
    async addFriend(uid, other, since) {
      guard('addFriend');
      sub(s.friends, uid).set(other, { uid: other, since });
    },
    async removeFriend(uid, other) {
      guard('removeFriend');
      sub(s.friends, uid).delete(other);
    },
    async hasFriend(uid, other) {
      guard('hasFriend');
      return sub(s.friends, uid).has(other);
    },
    async listRequests(uid) {
      guard('listRequests');
      return [...sub(s.requests, uid).values()];
    },
    async sendRequest(to, req) {
      guard('sendRequest');
      sub(s.requests, to).set(req.from, { ...req });
    },
    async deleteRequest(uid, from) {
      guard('deleteRequest');
      sub(s.requests, uid).delete(from);
    },
    async listBlocked(uid) {
      guard('listBlocked');
      return [...(s.blocked.get(uid) ?? [])];
    },
    async block(uid, other) {
      guard('block');
      if (!s.blocked.has(uid)) s.blocked.set(uid, new Set());
      s.blocked.get(uid)!.add(other);
    },
    async unblock(uid, other) {
      guard('unblock');
      s.blocked.get(uid)?.delete(other);
    },
    async listGifts(uid) {
      guard('listGifts');
      return [...sub(s.gifts, uid).values()];
    },
    async sendGift(to, gift) {
      guard('sendGift');
      const box = sub(s.gifts, to);
      if (box.has(gift.id)) return false;
      box.set(gift.id, { ...gift });
      return true;
    },
    async deleteGift(uid, id) {
      guard('deleteGift');
      sub(s.gifts, uid).delete(id);
    },
    async listChats(uid) {
      guard('listChats');
      return [...s.chats.values()].filter((c) => c.members.includes(uid));
    },
    async setChatMeta(meta) {
      guard('setChatMeta');
      s.chats.set(meta.id, structuredClone(meta));
    },
    async listMessages(chatId, limit) {
      guard('listMessages');
      return (s.messages.get(chatId) ?? []).slice(-limit).map((m) => ({ ...m }));
    },
    async addMessage(chatId, msg) {
      guard('addMessage');
      const id = `m${++seq}`;
      const list = s.messages.get(chatId) ?? [];
      list.push({ ...msg, id });
      s.messages.set(chatId, list);
      return id;
    },
    async deleteMessage(chatId, id) {
      guard('deleteMessage');
      s.messages.set(chatId, (s.messages.get(chatId) ?? []).filter((m) => m.id !== id));
    },
    async listMessagesFrom(chatId, uid) {
      guard('listMessagesFrom');
      return (s.messages.get(chatId) ?? []).filter((m) => m.from === uid).map((m) => m.id);
    },
    async addReport(report) {
      guard('addReport');
      s.reports.push(structuredClone(report));
    },
  };
  function guard(name: string): void {
    s.calls.push(name);
    if (s.fail === true || s.fail?.has(name)) throw new Error(`fake store: ${name} failed`);
  }
  return s;
}
