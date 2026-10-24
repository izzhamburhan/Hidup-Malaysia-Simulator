// Chat scripts for the partner, friends and family threads. Original, friendly humour; all
// names are fictional. `{name}` is replaced with the partner's name.

import type { PartnerStage } from '../engine/types';

export type ChatThreadId = 'partner' | 'friends' | 'family';

export interface ChatEffect {
  trust?: number;
  satisfaction?: number;
  friends?: number;
  family?: number;
  happiness?: number;
  stress?: number;
}

export interface ChatReply {
  id: string;
  /** What the player sends. */
  text: string;
  /** What comes back. */
  reply: string;
  effect: ChatEffect;
}

export interface ChatScript {
  id: string;
  thread: ChatThreadId;
  /** Partner scripts only: the stages this conversation fits. Omitted means any stage. */
  stages?: PartnerStage[];
  opener: string[];
  replies: ChatReply[];
}

export const CHAT_THREAD_INFO: Record<Exclude<ChatThreadId, 'partner'>, { title: string; icon: string }> = {
  friends: { title: 'Geng Lepak', icon: '👥' },
  family: { title: 'Family ❤️', icon: '🏡' },
};

export const CHAT_SCRIPTS: ChatScript[] = [
  // --- Partner ---
  {
    id: 'p-dinner',
    thread: 'partner',
    opener: ['{name}: Dah makan?', "{name}: I'm deciding between nasi lemak and… nasi lemak 🤔"],
    replies: [
      { id: 'jom', text: 'Belum! Jom makan sama-sama?', reply: '{name}: Okay! 7pm, my treat this time 😊', effect: { trust: 4, satisfaction: 4, happiness: 2 } },
      { id: 'joke', text: 'Nasi lemak. Obviously. Then nasi lemak again.', reply: '{name}: This is why I like you 😂', effect: { trust: 2, satisfaction: 3, happiness: 3 } },
      { id: 'busy', text: 'Busy. Later.', reply: '{name}: Oh. Okay.', effect: { trust: -2, satisfaction: -4 } },
    ],
  },
  {
    id: 'p-pizza',
    thread: 'partner',
    stages: ['talking', 'dating'],
    opener: ['{name}: Random question…', '{name}: Pineapple on pizza: yes or no? Choose carefully 👀'],
    replies: [
      { id: 'yes', text: 'Yes, and I will defend it with my life 🍍', reply: '{name}: Finally, someone with taste 😆', effect: { trust: 3, satisfaction: 4, happiness: 2 } },
      { id: 'essay', text: 'Okay so historically speaking, pizza in Naples…', reply: '{name}: Why is this an essay 😂 (I read all of it)', effect: { trust: 2, satisfaction: 2, happiness: 1 } },
      { id: 'lol', text: 'lol', reply: '{name}: …lol', effect: { satisfaction: -3 } },
    ],
  },
  {
    id: 'p-bad-day',
    thread: 'partner',
    stages: ['dating', 'committed', 'engaged', 'married'],
    opener: ['{name}: Today was SO bad 😩', '{name}: My boss made me redo the whole slide deck. Twice.'],
    replies: [
      { id: 'listen', text: 'Nak call? I am here, tell me everything.', reply: '{name}: Thank you. Calling you now 🥹', effect: { trust: 5, satisfaction: 4, stress: 1 } },
      { id: 'quit', text: 'Just quit lah.', reply: "{name}: I can't just quit… but okay.", effect: { satisfaction: -2 } },
      { id: 'meme', text: '*sends a cat meme*', reply: '{name}: Okay that helped a little 😂', effect: { trust: 1, satisfaction: 2, happiness: 1 } },
    ],
  },
  {
    id: 'p-future',
    thread: 'partner',
    stages: ['committed', 'engaged', 'married'],
    opener: ['{name}: Do you ever think about where we will be in 5 years?'],
    replies: [
      { id: 'together', text: 'With you. Somewhere with good wifi.', reply: '{name}: Good wifi is important 🥰', effect: { trust: 5, satisfaction: 5, happiness: 2 } },
      { id: 'talk', text: 'Can we talk about it properly tonight?', reply: "{name}: Yes, let's. Mamak at 9?", effect: { trust: 3, satisfaction: 2 } },
      { id: 'dodge', text: 'Wah, heavy question for a Tuesday.', reply: '{name}: …right.', effect: { trust: -1, satisfaction: -2, happiness: 1 } },
    ],
  },
  {
    id: 'p-wedding-guests',
    thread: 'partner',
    stages: ['engaged'],
    opener: ['{name}: My mum wants 1,000 guests at the wedding 😅', '{name}: She has a spreadsheet.'],
    replies: [
      { id: 'together', text: "Let's sit down with her together this weekend.", reply: '{name}: Thank you for not panicking. I love you.', effect: { trust: 5, satisfaction: 3, stress: 2 } },
      { id: 'elope', text: '1,000?? Can we elope?', reply: '{name}: Tempting. Very tempting 😂', effect: { satisfaction: 2, happiness: 2 } },
      { id: 'cold', text: 'Your family, your problem.', reply: '{name}: Wow. Okay.', effect: { trust: -4, satisfaction: -5 } },
    ],
  },
  {
    id: 'p-dishes',
    thread: 'partner',
    stages: ['married'],
    opener: ['{name}: Pasar after work. Need anything?', "{name}: Also… whose turn is it to wash the dishes 👀"],
    replies: [
      { id: 'mine', text: "Mine. And I'll bring your favourite kuih.", reply: '{name}: Best partner ever, officially 🏆', effect: { trust: 3, satisfaction: 5, stress: 1 } },
      { id: 'rps', text: 'Batu, gunting, kertas for it?', reply: '{name}: Deal. Best of three. No cheating.', effect: { satisfaction: 2, happiness: 2 } },
      { id: 'argue', text: "Didn't I do it yesterday?", reply: '{name}: You did not. I have photos.', effect: { satisfaction: -3, stress: 2 } },
    ],
  },

  // --- Friends: Geng Lepak ---
  {
    id: 'f-mamak',
    thread: 'friends',
    opener: ['Hafiz: Mamak tonight? 10pm, usual spot', "Siti: I'm in. Who's paying this time 👀"],
    replies: [
      { id: 'in', text: 'On my way. Roti canai on me!', reply: 'Hafiz: LEGEND 🙌', effect: { friends: 5, happiness: 3 } },
      { id: 'later', text: "Can't tonight, next week for sure?", reply: 'Siti: Okay, holding you to it!', effect: { friends: 1 } },
      { id: 'ignore', text: '*leaves on read*', reply: 'Hafiz: Seen at 9:14pm. Hmm.', effect: { friends: -3 } },
    ],
  },
  {
    id: 'f-birthday',
    thread: 'friends',
    opener: ["Mei Ling: Reminder: Arjun's birthday is tomorrow 🎂", 'Mei Ling: RM20 each for the cake?'],
    replies: [
      { id: 'yes', text: 'Sure, transferring now!', reply: 'Mei Ling: Received, thank you ❤️', effect: { friends: 5, happiness: 2 } },
      { id: 'half', text: 'Can I do RM10? Broke this month 😅', reply: "Mei Ling: No worries, I'll cover the rest.", effect: { friends: 2 } },
      { id: 'who', text: "Who's Arjun?", reply: 'Arjun: I am IN this group 😭', effect: { friends: -3, happiness: 1 } },
    ],
  },
  {
    id: 'f-meme',
    thread: 'friends',
    opener: ['Arjun: *sends a meme about Monday mornings*', 'Arjun: this is literally me'],
    replies: [
      { id: 'same', text: '😂😂😂 SAME', reply: 'Arjun: Knew you would get it', effect: { friends: 3, happiness: 3 } },
      { id: 'reply', text: '*replies with an even better meme*', reply: 'Siti: Okay this group chat is undefeated', effect: { friends: 4, happiness: 2 } },
      { id: 'seen', text: '*reacts with 👍 only*', reply: 'Arjun: …the thumbs up. Brutal.', effect: { friends: -1 } },
    ],
  },
  {
    id: 'f-advice',
    thread: 'friends',
    opener: ['Siti: Guys. I got a job offer in Singapore 😳', 'Siti: Should I take it??'],
    replies: [
      { id: 'go', text: "Go for it! We'll visit and you buy the food 😆", reply: 'Siti: Deal!! Thank you guys 🥹', effect: { friends: 4, happiness: 1 } },
      { id: 'help', text: "Let's list the pros and cons tonight, I'll help.", reply: 'Siti: You are the best. 9pm?', effect: { friends: 5, stress: 1 } },
      { id: 'selfish', text: 'Then who will come to mamak with us?', reply: 'Siti: Haha… I will still visit?', effect: { friends: 1, happiness: -1 } },
    ],
  },
  {
    id: 'f-badminton',
    thread: 'friends',
    opener: ['Hafiz: Badminton Saturday? Court booked, 8am', 'Hafiz: 8am is not early. I refuse to hear it.'],
    replies: [
      { id: 'in', text: 'Count me in 🏸', reply: 'Hafiz: That is the spirit!', effect: { friends: 4, happiness: 2, stress: -1 } },
      { id: 'later', text: '8am?! Make it 10.', reply: 'Hafiz: Fine. 9:30. Final offer.', effect: { friends: 2, happiness: 1 } },
      { id: 'bed', text: 'My bed and I have plans.', reply: 'Hafiz: Your bed is not a person.', effect: { friends: -1, stress: -2 } },
    ],
  },

  // --- Family ---
  {
    id: 'fam-forward',
    thread: 'family',
    opener: ['Mak: *Forwarded many times*', 'Mak: MINUM AIR SEJUK BOLEH SEBABKAN SAKIT JANTUNG!! SHARE!!'],
    replies: [
      { id: 'kind', text: "Mak, this one isn't true. Here's a proper article ❤️", reply: 'Mak: Oh ya ke? Okay, thank you sayang', effect: { family: 3, happiness: 1 } },
      { id: 'thumb', text: '👍', reply: 'Mak: 👍👍👍', effect: { family: 1 } },
      { id: 'annoyed', text: 'Mak, please stop forwarding these 🙄', reply: 'Mak: Mak just worry only…', effect: { family: -4, stress: 1 } },
    ],
  },
  {
    id: 'fam-weekend',
    thread: 'family',
    opener: ['Mak: Dah makan?', 'Abah: Mak is cooking rendang this weekend. Coming home?'],
    replies: [
      { id: 'yes', text: 'Yes!! Save some for me 😋', reply: 'Mak: Mak masak extra. Drive carefully!', effect: { family: 5, happiness: 2 } },
      { id: 'next', text: "Can't this weekend, next one for sure.", reply: 'Abah: Okay. Mak will freeze some for you.', effect: { family: 1 } },
      { id: 'short', text: 'Dah. Bye.', reply: 'Mak: …okay.', effect: { family: -3 } },
    ],
  },
  {
    id: 'fam-bills',
    thread: 'family',
    opener: ['Abah: Electricity bill went up again this month…', 'Abah: Just telling only, don\'t worry'],
    replies: [
      { id: 'help', text: 'Abah, tell me if you need anything, okay?', reply: 'Abah: Thank you. We are okay. Proud of you.', effect: { family: 5 } },
      { id: 'same', text: 'Mine too 😭 Aircond is expensive', reply: 'Abah: Use the fan lah. Abah has been saying this for years.', effect: { family: 2, happiness: 1 } },
      { id: 'ok', text: 'Okay.', reply: 'Abah: Okay.', effect: {} },
    ],
  },
  {
    id: 'fam-cousin',
    thread: 'family',
    opener: ['Mak Long: Your cousin just got promoted!! 🎉', 'Mak Long: When is your turn? 😊'],
    replies: [
      { id: 'kind', text: "Congrats to them! I'm doing my best too 😊", reply: 'Mak Long: Good, good. Proud of all of you.', effect: { family: 3, stress: -1 } },
      { id: 'soon', text: 'Soon, Mak Long. Very soon 😅', reply: 'Mak Long: I will hold you to it!', effect: { family: 1, stress: 1, happiness: 1 } },
      { id: 'mute', text: '*mutes the group for 8 hours*', reply: '(8 hours later: 214 unread messages)', effect: { family: -2, stress: -3 } },
    ],
  },
  {
    id: 'fam-photo',
    thread: 'family',
    opener: ['Adik: Found our old festive photo 😂', 'Adik: WHY were you wearing that'],
    replies: [
      { id: 'fashion', text: 'Fashion was different okay!! 😭', reply: 'Adik: Printing this for the family album', effect: { family: 4, happiness: 3 } },
      { id: 'delete', text: 'Delete this immediately', reply: 'Adik: Too late. Mak already set it as her wallpaper.', effect: { family: 2, happiness: 2 } },
      { id: 'stranger', text: 'Who is this stranger?', reply: 'Adik: Nice try 😂', effect: { family: 1, happiness: 1 } },
    ],
  },
];

export const chatScriptById = (id: string) => CHAT_SCRIPTS.find((c) => c.id === id);