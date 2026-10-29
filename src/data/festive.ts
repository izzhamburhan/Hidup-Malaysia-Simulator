// Festive seasons on the game's SIMULATED calendar (the same pinned dates as holidays.ts; lunar and
// Islamic festivals move every year in reality). Everyone can join every festival.

import type { Outfit } from '../engine/types';

export interface FestiveSeason {
  id: string;
  name: string;
  month: number;
  day: number;
  /** Garland strung across the room during the season. */
  garland: string[];
  greeting: string;
  /** Raya and CNY: duit raya / angpau changes hands. */
  packet?: { label: string; receive: number; give: number };
  outfit?: Outfit;
  /** Own window in days around the date, when it differs from SEASON_WINDOW (`after` may be negative). */
  window?: { before: number; after: number };
}

/** Days before and after the date that count as the season. */
export const SEASON_WINDOW = { before: 3, after: 4 } as const;

export const FESTIVE_SEASONS: FestiveSeason[] = [
  { id: 'new-year', name: 'New Year', month: 1, day: 1, garland: ['🎆', '🎉', '✨', '🎊'], greeting: 'Happy New Year! Same bank balance, new hopes.' },
  { id: 'cny', name: 'Chinese New Year', month: 2, day: 6, garland: ['🏮', '🧧', '🍊', '🏮'], greeting: 'Gong Xi Fa Cai! Huat ah! 🧧', packet: { label: 'angpau', receive: 30, give: 50 }, outfit: 'cheongsam' },
  // Ramadan is festive only: decorations, bazaar and buka puasa tables that everyone is welcome at. It is
  // anchored on Hari Raya Aidilfitri (21 March) and runs from 21 February up to the day before the Raya
  // season (which starts 3 days ahead of the date) takes over. Nothing in the game assumes anyone fasts.
  { id: 'ramadan', name: 'Ramadan', month: 3, day: 21, window: { before: 28, after: -4 }, garland: ['🌙', '⭐', '✨', '🌙'], greeting: 'Ramadan Mubarak! A month of sharing: everyone is welcome at the buka puasa table. 🌙' },
  { id: 'raya', name: 'Hari Raya Aidilfitri', month: 3, day: 21, garland: ['🌙', '🪔', '✨', '🌙'], greeting: 'Selamat Hari Raya, maaf zahir dan batin. 🌙', packet: { label: 'duit raya', receive: 30, give: 50 } },
  { id: 'wesak', name: 'Wesak Day', month: 5, day: 12, garland: ['🪷', '🕯️', '🪷', '🕯️'], greeting: 'Selamat Hari Wesak. Peace and kindness to all.' },
  { id: 'haji', name: 'Hari Raya Aidiladha', month: 5, day: 28, garland: ['🌙', '✨', '🕌', '✨'], greeting: 'Selamat Hari Raya Aidiladha.' },
  { id: 'kaamatan', name: 'Pesta Kaamatan', month: 5, day: 30, garland: ['🌾', '🎶', '🌾', '🎶'], greeting: 'Kotobian Tadau Tagazo do Kaamatan! 🌾' },
  { id: 'gawai', name: 'Hari Gawai', month: 6, day: 1, garland: ['🌾', '🥁', '🌾', '🥁'], greeting: 'Selamat Hari Gawai, gayu guru gerai nyamai! 🌾' },
  { id: 'merdeka', name: 'Merdeka Day', month: 8, day: 31, garland: ['🇲🇾', '🎆', '🇲🇾', '🎆'], greeting: 'Selamat Hari Merdeka! 🇲🇾', outfit: 'merdeka-tee' },
  { id: 'malaysia-day', name: 'Malaysia Day', month: 9, day: 16, garland: ['🇲🇾', '🤝', '🇲🇾', '🤝'], greeting: 'Selamat Hari Malaysia. One country, many kuih.' },
  { id: 'deepavali', name: 'Deepavali', month: 10, day: 29, garland: ['🪔', '🌸', '✨', '🪔'], greeting: 'Happy Deepavali! May the light win. 🪔', outfit: 'kurta' },
  { id: 'christmas', name: 'Christmas', month: 12, day: 25, garland: ['🎄', '⭐', '🎁', '🎄'], greeting: 'Merry Christmas! 🎄', outfit: 'christmas-sweater' },
];

/**
 * Pasar Ramadan, the evening bazaar. FICTIONAL GAME ESTIMATES: the price, calories and effects are chosen
 * for balance, not market data. Open to everyone in the Ramadan season, late afternoon.
 */
export const PASAR_RAMADAN = {
  from: 16,
  to: 19,
  price: 18,
  minutes: 60,
  calories: 420,
  satiety: 15,
  happiness: 4,
  /** Chance of a fun find on a visit. */
  findChance: 0.3,
  finds: [
    'a bag of bubur lambuk, handed over with a smile',
    'the last tray of kuih seri muka',
    'an ayam percik stall with a queue worth joining',
    'a stall selling ice-cold air tebu',
    'a freshly made murtabak, still warm',
    'a lemang seller who threw in an extra stick',
  ],
} as const;

/** Buka puasa gathering: everyone is welcome at the table. Free (everyone brings a dish). Fictional estimates. */
export const BUKA_PUASA = {
  /** Clock minutes of the window: 6:30 PM to 8:30 PM. */
  from: 18.5 * 60,
  to: 20.5 * 60,
  minutes: 120,
  calories: 650,
  friends: 4,
  family: 3,
  happiness: 5,
  stress: -3,
  satiety: 25,
  description: 'Dinner with friends or family around sunset. Everyone is welcome at the buka puasa table, and everyone brings a dish.',
} as const;

/** Relationship and mood boost for sending festive wishes. */
export const GREET_EFFECT = { family: 4, friends: 3, happiness: 4 } as const;

export const festiveSeasonById = (id: string | undefined) => FESTIVE_SEASONS.find((f) => f.id === id);