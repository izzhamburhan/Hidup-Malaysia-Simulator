// The Firestore adapter for real-player friends (src/lib/social.ts `SocialStore`), plus live listeners for the phone.
// Built by firebaseClient.ts from the lazily loaded Firestore module, so guests download none of it. Paths and rules:
// firestore.rules and docs/contracts/friends-online.md. UI layer only; the simulation engine never imports this file.

import type * as FirestoreLib from 'firebase/firestore';
import type { ChatMessage, ChatMeta, FriendRequest, Gift, Profile, SocialStore } from './social';

type Fs = typeof FirestoreLib;
type Db = FirestoreLib.Firestore;

/** Live views for the phone. Each returns an unsubscribe function; errors arrive through `onError`. */
export interface SocialLive {
  watchMessages(chatId: string, limit: number, onData: (messages: ChatMessage[]) => void, onError: (error: string) => void): () => void;
  watchChats(uid: string, onData: (chats: ChatMeta[]) => void, onError: (error: string) => void): () => void;
  watchRequests(uid: string, onData: (requests: FriendRequest[]) => void, onError: (error: string) => void): () => void;
  watchGifts(uid: string, onData: (gifts: Gift[]) => void, onError: (error: string) => void): () => void;
}

/** Firebase error codes in words a player can act on. */
export function friendlyError(err: unknown): string {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
  if (code === 'permission-denied') return 'Not allowed. You may not be friends any more, or chat is turned off.';
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'You seem to be offline. Try again when you are back online.';
  if (code === 'resource-exhausted') return 'The friends server is busy today. Try again later.';
  if (code === 'unauthenticated') return 'Please sign in again.';
  return err instanceof Error ? err.message : 'Something went wrong.';
}

const wrap =
  <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
  async (...args: A): Promise<R> => {
    try {
      return await fn(...args);
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  };

const isoOf = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: unknown }).toDate === 'function') {
    return (v as { toDate(): Date }).toDate().toISOString();
  }
  return new Date(0).toISOString();
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function makeSocialStore(fs: Fs, db: Db): SocialStore & SocialLive {
  const profileRef = (uid: string) => fs.doc(db, 'profiles', uid);
  const codeRef = (code: string) => fs.doc(db, 'codes', code);
  const sub = (uid: string, name: string) => fs.collection(db, 'users', uid, name);
  const subDoc = (uid: string, name: string, id: string) => fs.doc(db, 'users', uid, name, id);
  const chatRef = (chatId: string) => fs.doc(db, 'chats', chatId);
  const messages = (chatId: string) => fs.collection(db, 'chats', chatId, 'messages');
  const estimate = { serverTimestamps: 'estimate' as const };

  const toMessage = (d: FirestoreLib.QueryDocumentSnapshot): ChatMessage => {
    const x = d.data(estimate);
    return {
      id: d.id,
      from: str(x.from),
      kind: x.kind === 'sticker' ? 'sticker' : 'text',
      text: str(x.text),
      sticker: typeof x.sticker === 'string' ? x.sticker : null,
      at: isoOf(x.at),
    };
  };
  const toMeta = (d: FirestoreLib.QueryDocumentSnapshot): ChatMeta => {
    const x = d.data();
    const m = Array.isArray(x.members) ? x.members : [];
    return { id: d.id, members: [str(m[0]), str(m[1])], lastText: str(x.lastText), lastFrom: str(x.lastFrom), lastAt: str(x.lastAt) };
  };
  const toRequest = (d: FirestoreLib.QueryDocumentSnapshot): FriendRequest => {
    const x = d.data();
    return { from: d.id, displayName: str(x.displayName), at: str(x.at) };
  };
  const toGift = (d: FirestoreLib.QueryDocumentSnapshot): Gift => {
    const x = d.data();
    return { id: d.id, from: str(x.from), fromName: str(x.fromName), kind: str(x.kind), date: str(x.date), at: str(x.at) };
  };
  const latest = (chatId: string, limit: number) => fs.query(messages(chatId), fs.orderBy('at', 'desc'), fs.limit(limit));

  return {
    getProfile: wrap(async (uid: string): Promise<Profile | null> => {
      const snap = await fs.getDoc(profileRef(uid));
      if (!snap.exists()) return null;
      const x = snap.data();
      return { uid, code: str(x.code), displayName: str(x.displayName), chatOpen: x.chatOpen === true, snapshot: x.snapshot, updatedAt: str(x.updatedAt) };
    }),
    setProfile: wrap(async (p: Profile) => {
      await fs.setDoc(profileRef(p.uid), { code: p.code, displayName: p.displayName, chatOpen: p.chatOpen, snapshot: p.snapshot, updatedAt: p.updatedAt });
    }),
    deleteProfile: wrap(async (uid: string) => fs.deleteDoc(profileRef(uid))),
    lookupCode: wrap(async (code: string) => {
      const snap = await fs.getDoc(codeRef(code));
      return snap.exists() ? str(snap.data().uid) || null : null;
    }),
    claimCode: wrap(async (code: string, uid: string) =>
      fs.runTransaction(db, async (tx) => {
        const snap = await tx.get(codeRef(code));
        if (snap.exists()) return snap.data().uid === uid;
        tx.set(codeRef(code), { uid });
        return true;
      }),
    ),
    releaseCode: wrap(async (code: string) => fs.deleteDoc(codeRef(code))),

    listFriends: wrap(async (uid: string) => (await fs.getDocs(sub(uid, 'friends'))).docs.map((d) => ({ uid: d.id, since: str(d.data().since) }))),
    addFriend: wrap(async (uid: string, other: string, since: string) => fs.setDoc(subDoc(uid, 'friends', other), { since })),
    removeFriend: wrap(async (uid: string, other: string) => fs.deleteDoc(subDoc(uid, 'friends', other))),
    hasFriend: wrap(async (uid: string, other: string) => (await fs.getDoc(subDoc(uid, 'friends', other))).exists()),

    listRequests: wrap(async (uid: string) => (await fs.getDocs(sub(uid, 'requests'))).docs.map(toRequest)),
    sendRequest: wrap(async (to: string, req: FriendRequest) => fs.setDoc(subDoc(to, 'requests', req.from), { displayName: req.displayName, at: req.at })),
    deleteRequest: wrap(async (uid: string, from: string) => fs.deleteDoc(subDoc(uid, 'requests', from))),

    listBlocked: wrap(async (uid: string) => (await fs.getDocs(sub(uid, 'blocked'))).docs.map((d) => d.id)),
    block: wrap(async (uid: string, other: string) => fs.setDoc(subDoc(uid, 'blocked', other), { at: new Date().toISOString() })),
    unblock: wrap(async (uid: string, other: string) => fs.deleteDoc(subDoc(uid, 'blocked', other))),

    listGifts: wrap(async (uid: string) => (await fs.getDocs(sub(uid, 'gifts'))).docs.map(toGift)),
    // The sender cannot read the recipient's inbox, and the rules refuse to overwrite a gift, so "already sent
    // today" comes back as permission-denied. socialClient checks the friendship first, so that is what it means here.
    sendGift: async (to: string, gift: Gift) => {
      try {
        await fs.setDoc(subDoc(to, 'gifts', gift.id), { from: gift.from, fromName: gift.fromName, kind: gift.kind, date: gift.date, at: gift.at });
        return true;
      } catch (err) {
        if (typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'permission-denied') return false;
        throw new Error(friendlyError(err));
      }
    },
    deleteGift: wrap(async (uid: string, id: string) => fs.deleteDoc(subDoc(uid, 'gifts', id))),

    listChats: wrap(async (uid: string) => (await fs.getDocs(fs.query(fs.collection(db, 'chats'), fs.where('members', 'array-contains', uid)))).docs.map(toMeta)),
    setChatMeta: wrap(async (meta: ChatMeta) =>
      fs.setDoc(chatRef(meta.id), { members: meta.members, lastText: meta.lastText, lastFrom: meta.lastFrom, lastAt: meta.lastAt }),
    ),
    listMessages: wrap(async (chatId: string, limit: number) => (await fs.getDocs(latest(chatId, limit))).docs.map(toMessage).reverse()),
    addMessage: wrap(async (chatId: string, msg: Omit<ChatMessage, 'id'>) => {
      // `at` is the server's time (the rules require it), not the device clock.
      const ref = await fs.addDoc(messages(chatId), { from: msg.from, kind: msg.kind, text: msg.text, sticker: msg.sticker, at: fs.serverTimestamp() });
      return ref.id;
    }),
    deleteMessage: wrap(async (chatId: string, id: string) => fs.deleteDoc(fs.doc(db, 'chats', chatId, 'messages', id))),
    listMessagesFrom: wrap(async (chatId: string, uid: string) => (await fs.getDocs(fs.query(messages(chatId), fs.where('from', '==', uid)))).docs.map((d) => d.id)),
    addReport: wrap(async (report) => {
      await fs.addDoc(fs.collection(db, 'reports'), { ...report });
    }),

    watchMessages(chatId, limit, onData, onError) {
      return fs.onSnapshot(
        latest(chatId, limit),
        (snap) => onData(snap.docs.map(toMessage).reverse()),
        (err) => onError(friendlyError(err)),
      );
    },
    watchChats(uid, onData, onError) {
      return fs.onSnapshot(
        fs.query(fs.collection(db, 'chats'), fs.where('members', 'array-contains', uid)),
        (snap) => onData(snap.docs.map(toMeta)),
        (err) => onError(friendlyError(err)),
      );
    },
    watchRequests(uid, onData, onError) {
      return fs.onSnapshot(sub(uid, 'requests'), (snap) => onData(snap.docs.map(toRequest)), (err) => onError(friendlyError(err)));
    },
    watchGifts(uid, onData, onError) {
      return fs.onSnapshot(sub(uid, 'gifts'), (snap) => onData(snap.docs.map(toGift)), (err) => onError(friendlyError(err)));
    },
  };
}
