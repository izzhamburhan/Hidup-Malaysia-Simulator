// Replying in a chat thread (the chat sheet on the Social tab).

import { chatReplyReason, replyToChat } from '../chat';
import type { ActionDef } from './types';

const parse = (p: string | undefined) => {
  const [thread = '', reply = ''] = (p ?? '').split(':');
  return { thread, reply };
};

export const chatActions: ActionDef[] = [
  {
    id: 'chat-reply',
    category: 'social',
    icon: '💬',
    dedicated: true,
    title: 'Reply in chat',
    description: 'Pick what to say.',
    minutes: 10,
    available: (s, p) => {
      const { thread, reply } = parse(p);
      return chatReplyReason(s, thread, reply);
    },
    run: (s, p) => {
      const { thread, reply } = parse(p);
      return replyToChat(s, thread as 'partner' | 'friends' | 'family', reply);
    },
  },
];