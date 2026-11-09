// Small gifts that friends who play online can send each other. FICTIONAL, tiny game effects only:
// a gift never carries cash, savings or debt, and no stat moves by more than 5 points.
// Opening one is the engine action `open-gift` (at most GIFTS_PER_DAY a game day).
import type { Effect } from '../engine/types';

export interface GiftDef {
  id: string;
  icon: string;
  name: string;
  nameMs: string;
  effect: Effect;
}

/** Gifts a player can open in one game day. */
export const GIFTS_PER_DAY = 3;

export const GIFTS: GiftDef[] = [
  { id: 'teh-tarik', icon: '🫖', name: 'Teh tarik', nameMs: 'Teh tarik', effect: { stats: { happiness: 3, stress: -2, satiety: 3 } } },
  { id: 'kuih', icon: '🍡', name: 'Plate of kuih', nameMs: 'Sepinggan kuih', effect: { stats: { happiness: 3, satiety: 5 } } },
  { id: 'bunga', icon: '💐', name: 'Bunch of flowers', nameMs: 'Sejambak bunga', effect: { stats: { happiness: 5, stress: -1 } } },
  { id: 'buku', icon: '📖', name: 'Good book', nameMs: 'Buku best', effect: { stats: { happiness: 2, stress: -3 } } },
  { id: 'kek', icon: '🍰', name: 'Slice of cake', nameMs: 'Sepotong kek', effect: { stats: { happiness: 4, satiety: 4 } } },
  { id: 'pokok', icon: '🪴', name: 'Small plant', nameMs: 'Pokok kecil', effect: { stats: { happiness: 3, stress: -2 } } },
];

export const giftById = (id: string | undefined): GiftDef | undefined => GIFTS.find((g) => g.id === id);
