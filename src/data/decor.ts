// Home decor for the Home room. Prices are FICTIONAL GAME ESTIMATES chosen for balance.
// Generic items only: no brands.

import type { DecorSlot } from '../engine/types';

export type { DecorSlot };

export const DECOR_SLOTS: DecorSlot[] = ['wall', 'left', 'right', 'centre'];

export const DECOR_SLOT_LABEL: Record<DecorSlot, string> = {
  wall: 'On the wall',
  left: 'Big furniture',
  right: 'Corner',
  centre: 'Little touches',
};

export interface DecorItem {
  id: string;
  name: string;
  icon: string;
  slot: DecorSlot;
  price: number;
}

export const decorItems: DecorItem[] = [
  { id: 'family-photo', name: 'Family photo frame', icon: '🖼️', slot: 'wall', price: 25 },
  { id: 'wall-clock', name: 'Wall clock', icon: '🕰️', slot: 'wall', price: 45 },
  { id: 'songket-hanging', name: 'Songket wall hanging', icon: '🎏', slot: 'wall', price: 120 },
  { id: 'big-tv', name: 'Wall-mounted TV', icon: '📺', slot: 'wall', price: 899 },
  { id: 'bookshelf', name: 'Bookshelf', icon: '📚', slot: 'left', price: 220 },
  { id: 'piano', name: 'Digital piano', icon: '🎹', slot: 'left', price: 700 },
  { id: 'comfy-sofa', name: 'Comfy sofa', icon: '🛋️', slot: 'left', price: 650 },
  { id: 'gaming-rig', name: 'Gaming setup', icon: '🖥️', slot: 'left', price: 1800 },
  { id: 'big-plant', name: 'Big monstera plant', icon: '🪴', slot: 'right', price: 60 },
  { id: 'teddy', name: 'Giant teddy bear', icon: '🧸', slot: 'right', price: 40 },
  { id: 'radio', name: 'Retro radio', icon: '📻', slot: 'right', price: 80 },
  { id: 'aquarium', name: 'Fish tank', icon: '🐠', slot: 'right', price: 300 },
  { id: 'cactus', name: 'Tiny cactus', icon: '🌵', slot: 'centre', price: 20 },
  { id: 'pelita', name: 'Pelita lamp', icon: '🪔', slot: 'centre', price: 15 },
  { id: 'lantern', name: 'Paper lantern', icon: '🏮', slot: 'centre', price: 30 },
  { id: 'disco-ball', name: 'Disco ball', icon: '🪩', slot: 'centre', price: 90 },
];

export const decorById = (id: string | null | undefined) => decorItems.find((d) => d.id === id);

/** Happiness per placed item per day, and the daily cap. */
export const DECOR_COMFORT = { perItem: 0.4, max: 1.6 } as const;