// Chat threads with the partner, friends and family. The day's script is a pure pick (it never
// draws from state.rng), and a reply's effect is applied through the core helpers.

import { CHAT_SCRIPTS, CHAT_THREAD_INFO, type ChatScript, type ChatThreadId } from '../data/chats';
import { adjustFamily, adjustFriends, applyStats, clamp, round2 } from './core';
import { seedFromString } from './rng';
import type { GameState } from './types';

export interface ChatThreadView {
  id: ChatThreadId;
  title: string;
  icon: string;
  /** The person to show for the partner thread. */
  partnerName?: string;
  repliedToday: boolean;
}

const repliedKey = (thread: ChatThreadId) => `chat-${thread}-day`;

export function repliedToday(s: GameState, thread: ChatThreadId): boolean {
  return s.flags[repliedKey(thread)] === s.clock.day;
}

export function chatThreads(s: GameState): ChatThreadView[] {
  const out: ChatThreadView[] = [];
  const p = s.relationships.partner;
  if (p) out.push({ id: 'partner', title: p.name, icon: '💞', partnerName: p.name, repliedToday: repliedToday(s, 'partner') });
  for (const id of ['friends', 'family'] as const) out.push({ id, ...CHAT_THREAD_INFO[id], repliedToday: repliedToday(s, id) });
  return out;
}

export function unreadChats(s: GameState): number {
  return chatThreads(s).filter((t) => !t.repliedToday).length;
}

export function chatScriptFor(s: GameState, thread: ChatThreadId): ChatScript | null {
  const p = s.relationships.partner;
  if (thread === 'partner' && !p) return null;
  const pool = CHAT_SCRIPTS.filter((c) => c.thread === thread && (thread !== 'partner' || !c.stages || c.stages.includes(p!.stage)));
  if (!pool.length) return null;
  return pool[seedFromString(`chat|${s.seed}|${thread}|${s.clock.day}`) % pool.length];
}

/** Text with the partner's name filled in. */
export function chatText(s: GameState, text: string): string {
  return text.replace(/\{name\}/g, s.relationships.partner?.name ?? 'Them');
}

export function chatReplyReason(s: GameState, thread: string, replyId: string): string | null {
  if (thread !== 'partner' && thread !== 'friends' && thread !== 'family') return 'Pick a chat.';
  const script = chatScriptFor(s, thread);
  if (!script) return 'No one to chat with there yet.';
  if (repliedToday(s, thread)) return 'You have already replied today. Talk again tomorrow.';
  if (!script.replies.some((r) => r.id === replyId)) return 'Pick one of the replies.';
  return null;
}

/** Apply a reply. Returns the lines to show: what you sent and what came back. */
export function replyToChat(s: GameState, thread: ChatThreadId, replyId: string): string[] {
  const script = chatScriptFor(s, thread);
  const reply = script?.replies.find((r) => r.id === replyId);
  if (!script || !reply) return [];
  const e = reply.effect;
  const p = s.relationships.partner;
  if (thread === 'partner' && p) {
    if (e.trust) p.trust = round2(clamp(p.trust + e.trust));
    if (e.satisfaction) p.satisfaction = round2(clamp(p.satisfaction + e.satisfaction));
    p.lastContactDay = s.clock.day;
  }
  if (e.friends) adjustFriends(s, e.friends);
  if (e.family) adjustFamily(s, e.family);
  if (thread === 'friends') s.relationships.lastFriendsDay = s.clock.day;
  if (thread === 'family') s.relationships.lastFamilyContactDay = s.clock.day;
  if (e.happiness || e.stress) applyStats(s, { happiness: e.happiness ?? 0, stress: e.stress ?? 0 });
  s.flags[repliedKey(thread)] = s.clock.day;
  return [`You: ${chatText(s, reply.text)}`, chatText(s, reply.reply)];
}