// Viral Hari Ini: which card to show and when. Pure rules plus a tiny LocalStorage store.
// UI layer only: the engine never imports this and the game save is untouched.

export const VIRAL_KEY = 'hidup-malaysia:viral';

export interface ViralStore {
  /** Local date (YYYY-MM-DD) the card last opened by itself. */
  lastShown: string | null;
  /** Ids of every card the player has been shown, oldest first. */
  seen: string[];
  /** The card hung on the room wall, if any. */
  poster: string | null;
}

export const emptyViral = (): ViralStore => ({ lastShown: null, seen: [], poster: null });

type Reader = Pick<Storage, 'getItem'>;
type Writer = Pick<Storage, 'setItem'>;

export function loadViral(store: Reader | null): ViralStore {
  try {
    const raw = store?.getItem(VIRAL_KEY);
    if (!raw) return emptyViral();
    const p = JSON.parse(raw) as Partial<ViralStore>;
    return {
      lastShown: typeof p.lastShown === 'string' ? p.lastShown : null,
      seen: Array.isArray(p.seen) ? p.seen.filter((s): s is string => typeof s === 'string') : [],
      poster: typeof p.poster === 'string' ? p.poster : null,
    };
  } catch {
    return emptyViral();
  }
}

export function saveViral(store: Writer | null, v: ViralStore): void {
  try {
    store?.setItem(VIRAL_KEY, JSON.stringify(v));
  } catch {
    // Storage full or blocked: the card simply shows again next time.
  }
}

/** A stable number from a date string, so the same day always picks the same card. */
function dayNumber(today: string): number {
  return [...today].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17);
}

/** The card for a date: unseen cards first (rotated by the date), then everything in rotation. */
export function pickViral<T extends { id: string }>(items: readonly T[], today: string, seen: readonly string[]): T | null {
  if (!items.length) return null;
  const unseen = items.filter((i) => !seen.includes(i.id));
  const pool = unseen.length ? unseen : items;
  return pool[dayNumber(today) % pool.length];
}

/** Opens by itself at most once a day, when switched on, and only while something new is left to see. */
export function shouldShowViral(v: ViralStore, today: string, enabled: boolean, items: readonly { id: string }[]): boolean {
  return enabled && v.lastShown !== today && items.some((i) => !v.seen.includes(i.id));
}

export function markShown(v: ViralStore, id: string, today: string): ViralStore {
  return { ...v, lastShown: today, seen: v.seen.includes(id) ? [...v.seen] : [...v.seen, id] };
}

export function setPoster(v: ViralStore, id: string | null): ViralStore {
  return { ...v, poster: id };
}