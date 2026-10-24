// Mini-games: names, blurbs and the reward table. Rewards are small mood nudges, never cash.

export type MinigameId = 'kejar-bas' | 'teh-tarik' | 'ingat-order';

export interface Minigame {
  id: MinigameId;
  name: string;
  icon: string;
  blurb: string;
}

export const MINIGAMES: Minigame[] = [
  { id: 'kejar-bas', name: 'Kejar Bas', icon: '🚌', blurb: 'The bus is leaving. Tap as fast as you can to catch it!' },
  { id: 'teh-tarik', name: 'Teh Tarik', icon: '☕', blurb: 'Hold to pour, let go in the green zone. Three pours.' },
  { id: 'ingat-order', name: 'Ingat Order', icon: '🧾', blurb: 'Remember the table\'s mamak order, then tap it back in order.' },
];

export const minigameById = (id: string) => MINIGAMES.find((g) => g.id === id);

export const MAMAK_MENU = [
  { id: 'roti-canai', label: 'Roti canai', icon: '🫓' },
  { id: 'teh-tarik', label: 'Teh tarik', icon: '☕' },
  { id: 'milo-ais', label: 'Milo ais', icon: '🥤' },
  { id: 'nasi-goreng', label: 'Nasi goreng', icon: '🍛' },
  { id: 'mee-goreng', label: 'Mee goreng', icon: '🍜' },
  { id: 'roti-telur', label: 'Roti telur', icon: '🥚' },
  { id: 'teh-o-ais', label: 'Teh O ais', icon: '🧊' },
  { id: 'maggi-goreng', label: 'Maggi goreng', icon: '🍝' },
];

/** Plays per in-game day that earn the full reward. */
export const MINIGAME_REWARDED_PER_DAY = 3;

/** By tier (score 0-29, 30-59, 60-89, 90-100). */
export const MINIGAME_REWARDS = [
  { happiness: 2, stress: -1 },
  { happiness: 4, stress: -2 },
  { happiness: 6, stress: -3 },
  { happiness: 8, stress: -4 },
];