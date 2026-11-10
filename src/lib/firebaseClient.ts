// The real Firebase adapter for cloud save. Browser only, loaded lazily with dynamic import() so
// guests download none of the Firebase code. Only Authentication (Google) and Firestore are used:
// Firebase Analytics is never imported. UI layer only; the simulation engine never imports this file.

import { FIREBASE_CONFIG } from '../config';
import type { CloudActivity, CloudDoc, CloudStore } from './cloud';
import { makeSocialStore, type SocialLive } from './firebaseSocial';
import type { SocialStore } from './social';

export interface CloudUser {
  uid: string;
  /** Shown on this device only; never stored in the cloud save. */
  name: string;
  /** The Google profile picture address, shown on this device only; null when the account has none. */
  photoURL: string | null;
}

export interface FirebaseHandle {
  store: CloudStore;
  /** Real-player friends (docs/contracts/friends-online.md). */
  social: SocialStore & SocialLive;
  /** Opens the Google popup. The new user arrives through onUser. */
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** Fires once with the restored session (or null), then on every sign-in and sign-out. */
  onUser(callback: (user: CloudUser | null) => void): () => void;
}

let pending: Promise<FirebaseHandle> | null = null;

export function loadFirebase(): Promise<FirebaseHandle> {
  if (!pending) {
    pending = build().catch((err) => {
      pending = null; // let a later tap try again, for example after the phone comes back online
      throw err;
    });
  }
  return pending;
}

async function build(): Promise<FirebaseHandle> {
  const [{ initializeApp }, authLib, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = authLib.getAuth(app);
  const db = fs.getFirestore(app);
  // One document per life: users/{uid}/lives/{lifeId}. The document id is the life id.
  const lives = (uid: string) => fs.collection(db, 'users', uid, 'lives');
  const ref = (uid: string, lifeId: string) => fs.doc(db, 'users', uid, 'lives', lifeId);

  const activityRef = (uid: string) => fs.doc(db, 'users', uid, 'activity', 'visits');

  const store: CloudStore = {
    async getActivity(uid) {
      const snap = await fs.getDoc(activityRef(uid));
      if (!snap.exists()) return null;
      const d = snap.data() as Partial<CloudActivity>;
      if (typeof d.firstSeen !== 'string' || typeof d.lastSeen !== 'string' || typeof d.opens !== 'number' || !Array.isArray(d.days)) return null;
      return { firstSeen: d.firstSeen, lastSeen: d.lastSeen, opens: d.opens, days: d.days.filter((x): x is string => typeof x === 'string') };
    },
    async setActivity(uid, activity) {
      await fs.setDoc(activityRef(uid), activity);
    },
    async list(uid) {
      const snap = await fs.getDocs(lives(uid));
      return snap.docs.map((d) => ({ ...(d.data() as CloudDoc), lifeId: d.id }));
    },
    async get(uid, lifeId) {
      const snap = await fs.getDoc(ref(uid, lifeId));
      return snap.exists() ? ({ ...(snap.data() as CloudDoc), lifeId: snap.id }) : null;
    },
    async set(uid, doc) {
      await fs.setDoc(ref(uid, doc.lifeId), doc);
    },
    async remove(uid, lifeId) {
      await fs.deleteDoc(ref(uid, lifeId));
    },
  };

  return {
    store,
    social: makeSocialStore(fs, db),
    async signIn() {
      await authLib.signInWithPopup(auth, new authLib.GoogleAuthProvider());
    },
    async signOut() {
      await authLib.signOut(auth);
    },
    onUser(callback) {
      return authLib.onAuthStateChanged(auth, (u) => callback(u ? { uid: u.uid, name: u.displayName ?? '', photoURL: u.photoURL ?? null } : null));
    },
  };
}
