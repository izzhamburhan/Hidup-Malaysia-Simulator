// Festive seasons: which one is on, and sending festive wishes once per season per year.

import { BUKA_PUASA, FESTIVE_SEASONS, GREET_EFFECT, PASAR_RAMADAN, SEASON_WINDOW, type FestiveSeason } from '../data/festive';
import { currentDate } from './calendar';
import { adjustFamily, adjustFriends, adjustPartner, applyStats, canAfford, earn, formatRM, spend } from './core';
import { chance, pick } from './rng';
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
      const w = f.window ?? SEASON_WINDOW;
      if (diff >= -w.before && diff <= w.after && (!best || Math.abs(diff) < best.dist)) best = { f, dist: Math.abs(diff) };
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

// --- Ramadan, festive only: the bazaar and the buka puasa table. Nothing here assumes anyone fasts. ---

export const isRamadan = (s: GameState) => festiveSeason(s)?.id === 'ramadan';

const pasarKey = 'pasar-ramadan-day';
const bukaKey = 'buka-puasa-day';
const NOT_RAMADAN = 'Only during Ramadan. Check back when the crescent and stars go up.';

export function pasarRamadanReason(s: GameState): string | null {
  if (!isRamadan(s)) return `The Ramadan bazaar is not on. ${NOT_RAMADAN}`;
  if (s.flags[pasarKey] === s.clock.day) return 'You already got your bazaar haul today. Leave some for tomorrow.';
  const h = s.clock.minute / 60;
  if (h < PASAR_RAMADAN.from || h >= PASAR_RAMADAN.to) return 'The bazaar stalls are open 4-7 PM.';
  if (!canAfford(s, PASAR_RAMADAN.price)) return `Need ${formatRM(PASAR_RAMADAN.price)} for a bag of bazaar food.`;
  return null;
}

export function pasarRamadan(s: GameState): string[] {
  spend(s, PASAR_RAMADAN.price, 'pasar Ramadan');
  s.flags[pasarKey] = s.clock.day;
  s.food.caloriesIn += PASAR_RAMADAN.calories;
  s.food.today.push({ foodId: 'pasar-ramadan', name: 'Pasar Ramadan bag', calories: PASAR_RAMADAN.calories, price: PASAR_RAMADAN.price, minute: s.clock.minute, portion: 1 });
  applyStats(s, { happiness: PASAR_RAMADAN.happiness, satiety: PASAR_RAMADAN.satiety });
  const lines = [`You wander the bazaar and come home with a bag of goodies: ~${PASAR_RAMADAN.calories} kcal (estimate).`];
  if (chance(s, PASAR_RAMADAN.findChance)) lines.push(`Lucky find: ${pick(s, PASAR_RAMADAN.finds)}.`);
  return lines;
}

export function bukaPuasaReason(s: GameState): string | null {
  if (!isRamadan(s)) return `The buka puasa gatherings are not on. ${NOT_RAMADAN}`;
  if (s.flags[bukaKey] === s.clock.day) return 'You already shared a buka puasa table today.';
  if (s.clock.minute < BUKA_PUASA.from || s.clock.minute >= BUKA_PUASA.to) return 'The table is set around sunset: 6:30-8:30 PM.';
  return null;
}

export function bukaPuasa(s: GameState): string[] {
  s.flags[bukaKey] = s.clock.day;
  adjustFriends(s, BUKA_PUASA.friends);
  adjustFamily(s, BUKA_PUASA.family);
  s.relationships.lastFriendsDay = s.clock.day;
  s.relationships.lastFamilyContactDay = s.clock.day;
  const p = s.relationships.partner;
  if (p) {
    adjustPartner(s, 1, 2);
    p.lastContactDay = s.clock.day;
  }
  s.today.socialised = true;
  s.food.caloriesIn += BUKA_PUASA.calories;
  s.food.today.push({ foodId: 'buka-puasa', name: 'Buka puasa together', calories: BUKA_PUASA.calories, price: 0, minute: s.clock.minute, portion: 1 });
  applyStats(s, { happiness: BUKA_PUASA.happiness, stress: BUKA_PUASA.stress, satiety: BUKA_PUASA.satiety });
  return ['Plates are passed around, everyone brings something, and nobody counts who ate what. A warm evening.'];
}
