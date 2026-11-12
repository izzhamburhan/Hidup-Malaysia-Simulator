// The Viral Hari Ini store as a shared hook, so the sheet (GameShell) and the wall poster (Room)
// always agree. Backed by LocalStorage; UI layer only, never part of the game save.

import { useSyncExternalStore } from 'react';
import { loadViral, markShown, saveViral, setPoster, type ViralStore } from '../lib/viral';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

let current: ViralStore | null = null;
const listeners = new Set<() => void>();

const read = (): ViralStore => (current ??= loadViral(storage()));
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
function write(next: ViralStore) {
  current = next;
  saveViral(storage(), next);
  listeners.forEach((fn) => fn());
}

export function useViral() {
  const store = useSyncExternalStore(subscribe, read, read);
  return {
    store,
    /** Record that a card was shown today. */
    shown: (id: string, today: string) => write(markShown(read(), id, today)),
    /** Hang a card on the room wall, or take it down with null. */
    hang: (id: string | null) => write(setPoster(read(), id)),
  };
}