# Plan: chat with your partner, friends and family

## Why

Players asked for a chat. Texting today is one tap (`chat-partner`) with no conversation. Make it
a real little thread: they message you, you pick a reply, they answer, and the reply matters.

## Decisions

- **Three threads**: your partner (any stage, named), the "Geng Lepak" friends group, and the
  family group (Mak forwards things). Friends and family are always there; the partner thread only
  when you have one.
- **Scripts are data** (`src/data/chats.ts`): each has a thread, optional partner stages, the
  opener lines, and 3 replies, each with the player's text, the answer, and a small effect
  (trust, satisfaction, friends, family, happiness, stress; all within +/-8). Original Malaysian
  humour, no stereotypes, no real people.
- **Rules in the engine** (`src/engine/chat.ts`): `chatThreads(state)`, `chatScriptFor(state,
  thread)` (a pure pick from the seed, thread and day, so it never draws from `state.rng`),
  `replyToChat(state, thread, replyId)`. One reply per thread per day, tracked in `state.flags`
  (`chat-<thread>-day`). Partner replies update `lastContactDay`; friends and family update their
  last-contact days. **No shape change**, no save bump.
- **Action** `chat-reply` (dedicated, 10 minutes, param `<thread>:<replyId>`): refused with a
  reason when the thread is not there, already answered today, or the reply is not in today's
  script.
- **UI**: a Chats card at the top of the Feed (now "Social" in BM) with an unread dot per
  thread; a chat sheet with bubbles, reply chips and a short typing pause before the answer. Home
  shows "💬 n new chats" in the inbox chips. The old one-tap `chat-partner` stays for the routine.

## Tests (tests/chat.test.ts)

1. Threads: friends and family always, partner only with a partner.
2. Scripts: unique ids, 3 replies with unique ids, openers present, effects within +/-8, a
   script for every partner stage and for friends and family.
3. The day's script is deterministic and fits the partner's stage.
4. Replying through `performAction` applies the effect, marks the thread, does not mutate the
   input; a second reply the same day is refused; a reply not in the script is refused.
5. A partner reply updates trust and `lastContactDay`.

## Commands

```bash
npx vitest run tests/chat.test.ts
npm run check
```