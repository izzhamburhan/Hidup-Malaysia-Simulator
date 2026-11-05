// A tiny in-memory tally of one sitting, sent as ONE analytics event when the tab is hidden instead of
// one event per action. Holds action ids and category names only (game content), never money, names or
// text. UI layer only; the engine never imports it.

const MAX_MINUTES = 240; // a forgotten open tab must not skew the average
const MAX_TEXT = 40;

export interface SessionSummary {
  actions: number;
  events: number;
  games: number;
  /** In-game days that passed. */
  days: number;
  /** Minutes since the tab was shown or the last summary. */
  minutes: number;
  top1?: string;
  top2?: string;
  top3?: string;
  /** The most used categories with counts, for example "food:5 work:3". */
  mix?: string;
}

export interface SessionStats {
  recordAction(id: string, category: string | undefined): void;
  recordEvent(): void;
  recordGame(): void;
  recordDays(n: number): void;
  /** The tally so far, or null when nothing happened. Does not clear it. */
  summary(nowMs: number): SessionSummary | null;
  /** Clear the tally and start a new sitting now. */
  reset(nowMs: number): void;
  /** Restart only the clock (the tab was shown again), keeping the tally. */
  startClock(nowMs: number): void;
}

function topEntries(counts: Map<string, number>, limit: number): [string, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(0, limit);
}

export function createSessionStats(startMs: number): SessionStats {
  let start = startMs;
  let actions = 0;
  let events = 0;
  let games = 0;
  let days = 0;
  let byAction = new Map<string, number>();
  let byCategory = new Map<string, number>();

  return {
    recordAction(id, category) {
      actions += 1;
      byAction.set(id, (byAction.get(id) ?? 0) + 1);
      if (category) byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
    },
    recordEvent() {
      events += 1;
    },
    recordGame() {
      games += 1;
    },
    recordDays(n) {
      if (Number.isFinite(n) && n > 0) days += Math.floor(n);
    },
    summary(nowMs) {
      if (actions + events + games + days === 0) return null;
      const out: SessionSummary = {
        actions,
        events,
        games,
        days,
        minutes: Math.min(MAX_MINUTES, Math.max(0, Math.round((nowMs - start) / 60_000))),
      };
      const top = topEntries(byAction, 3);
      if (top[0]) out.top1 = top[0][0].slice(0, MAX_TEXT);
      if (top[1]) out.top2 = top[1][0].slice(0, MAX_TEXT);
      if (top[2]) out.top3 = top[2][0].slice(0, MAX_TEXT);
      const mix = topEntries(byCategory, 3).map(([c, n]) => `${c}:${n}`).join(' ');
      if (mix) out.mix = mix.slice(0, MAX_TEXT);
      return out;
    },
    reset(nowMs) {
      start = nowMs;
      actions = events = games = days = 0;
      byAction = new Map();
      byCategory = new Map();
    },
    startClock(nowMs) {
      start = nowMs;
    },
  };
}