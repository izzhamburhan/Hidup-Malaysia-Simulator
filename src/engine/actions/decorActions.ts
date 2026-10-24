// The home decor shop (opened from the Home room).

import { decorById, decorItems } from '../../data/decor';
import { formatRM } from '../core';
import { buyDecor, placeDecor } from '../decor';
import type { ActionDef } from './types';

export const decorActions: ActionDef[] = [
  {
    id: 'buy-decor',
    category: 'home',
    icon: '🛋️',
    dedicated: true,
    title: (_s, p) => `Buy ${decorById(p)?.name ?? 'decor'}`,
    description: (_s, p) => {
      const item = decorById(p);
      return item ? `${item.icon} ${item.name} for your place. Moves with you when you move.` : '';
    },
    minutes: 40,
    cost: (_s, p) => decorById(p)?.price ?? 0,
    contexts: ['shopping'],
    variants: () => decorItems.map((d) => ({ param: d.id, label: d.name })),
    available: (s, p) => {
      const item = decorById(p);
      if (!item) return 'Pick something from the shop.';
      if (s.decor.owned.includes(item.id)) return `You already have the ${item.name.toLowerCase()}.`;
      return null;
    },
    confirm: (s, p) => {
      const item = decorById(p);
      if (!item || item.price < 500) return null;
      return `${formatRM(item.price)} from your wallet. Cash after: ${formatRM(s.finance.cash - item.price)}.`;
    },
    run: (s, p) => {
      if (p) buyDecor(s, p);
    },
  },
  {
    id: 'place-decor',
    category: 'home',
    icon: '🔨',
    dedicated: true,
    title: (_s, p) => `Put up the ${decorById(p)?.name.toLowerCase() ?? 'decor'}`,
    description: 'Rearrange your place.',
    minutes: 10,
    available: (s, p) => {
      const item = decorById(p);
      if (!item || !s.decor.owned.includes(item.id)) return 'Buy it first.';
      if (s.decor.placed[item.slot] === item.id) return 'Already up.';
      return null;
    },
    run: (s, p) => {
      if (p) placeDecor(s, p);
    },
  },
];