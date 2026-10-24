// Festive seasons: which one is on, and sending festive wishes once per season per year.

import { FESTIVE_SEASONS, GREET_EFFECT, SEASON_WINDOW, type FestiveSeason } from '../data/festive';
import { currentDate } from './calendar';
import { adjustFamily, adjustFriends, applyStats, canAfford, earn, formatRM, spend } from './core';
import type { GameState } from './types';

const DAY_MS = 86_400_000;

/** The season the game's date falls in, if any; the nearest festival wins when windows overlap. Pure. */
export function festiveSeason(s: GameState): FestiveSeason | null {
  const now = currentDate(s);
  const year = now.getUTCFullYear();
  let best: { f: FestiveSeason; dist: number } | null = null;
  for (const f of FESTIVE_SEASONS) {
    // Check the festival in this year and its neighbours, so New Year's window crosses 31 December.
    for (const y of [year - 1, year, year + 1]) {
      const diff = Math.round((now.getTime() - Date.UTC(y, f.month - 1, f.day)) / DAY_MS);
      if (diff >= -SEASON_WINDOW.before && diff <= SEASON_WINDOW.after && (!best || Math.abs(diff) < best.dist)) best = { f, dist: Math.abs(diff) };
    }
  }
  return best?.f ?? null;
}

const greetKey = (s: GameState, f: FestiveSeason) => `festive-${f.id}-${currentDate(s).getUTCFullYear()}`;
export const festiveOutfitKey = (seasonId: string) => `festive-outfit-${seasonId}`;

const married = (s: GameState) => s.relationships.partner?.stage === 'married';

export function greetReason(s: GameState): string | null {
  const f = festiveSeason(s);
  if (!f) return 'No festival right now. Check back when the decorations go up.';
  if (s.flags[greetKey(s, f)] !== undefined) return `You have already sent your ${f.name} wishes this year.`;
  if (f.packet && married(s) && !canAfford(s, f.packet.give)) return `Need ${formatRM(f.packet.give)} for the ${f.packet.label} packets.`;
  return null;
}

export function sendGreetings(s: GameState): string[] {
  const f = festiveSeason(s);
  if (!f) return [];
  adjustFamily(s, GREET_EFFECT.family);
  adjustFriends(s, GREET_EFFECT.friends);
  applyStats(s, { happiness: GREET_EFFECT.happiness });
  s.counters.festivals += 1;
  s.flags[greetKey(s, f)] = s.clock.day;
  const lines = [f.greeting];
  if (f.packet) {
    if (married(s)) {
      spend(s, f.packet.give, `${f.packet.label} packets`);
      lines.push(`Married now, so you hand out the ${f.packet.label}: ${formatRM(f.packet.give)}. The kids are delighted.`);
    } else {
      earn(s, f.packet.receive);
      lines.push(`Still single, so the aunties hand YOU ${f.packet.label}: +${formatRM(f.packet.receive)}. Followed by "bila nak kahwin?"`);
    }
  }
  if (f.outfit && s.flags[festiveOutfitKey(f.id)] === undefined) {
    s.flags[festiveOutfitKey(f.id)] = s.clock.day;
    lines.push('New festive outfit unlocked in your wardrobe! 👕');
  }
  return lines;
}