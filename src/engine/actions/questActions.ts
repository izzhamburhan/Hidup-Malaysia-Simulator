// Claiming a finished starter quest (from the Home card).

import { claimQuest, claimReason } from '../quests';
import type { ActionDef } from './types';

export const questActions: ActionDef[] = [
  {
    id: 'claim-quest',
    category: 'daily',
    icon: '🎯',
    dedicated: true,
    title: 'Claim quest reward',
    description: 'A small top-up for finishing a starter quest.',
    minutes: 1,
    available: (s, p) => claimReason(s, p),
    run: (s, p) => (p ? claimQuest(s, p) : []),
  },
];