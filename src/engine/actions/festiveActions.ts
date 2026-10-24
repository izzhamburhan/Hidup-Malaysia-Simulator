// Sending festive wishes during a festive season.

import { festiveSeason, greetReason, sendGreetings } from '../festive';
import type { ActionDef } from './types';

export const festiveActions: ActionDef[] = [
  {
    id: 'festive-greet',
    category: 'family',
    icon: '🎊',
    title: (s) => `Send ${festiveSeason(s)?.name ?? 'festive'} wishes`,
    description: 'Messages to family and friends, and maybe a packet or two.',
    minutes: 20,
    visible: (s) => !!festiveSeason(s),
    available: (s) => greetReason(s),
    run: (s) => sendGreetings(s),
  },
];