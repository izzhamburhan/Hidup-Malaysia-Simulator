// Presentation only: which room and animation an action plays on the Home screen.
// No rules live here; the engine has already resolved the action by the time this runs.

import { actionById, type ActionCategory } from '../../engine/actions';

export type RoomId = 'bedroom' | 'livingroom' | 'kitchen' | 'park' | 'gym' | 'court' | 'office' | 'campus' | 'mamak' | 'mall' | 'street';

export type Motion = 'idle' | 'sleep' | 'eat' | 'run' | 'squat' | 'jump' | 'type' | 'nod' | 'talk' | 'hop' | 'cheer' | 'sway' | 'droop' | 'walk';

export interface RoomDef {
  label: string;
  /** Tailwind gradient classes for the wall. */
  wall: string;
  floor: string;
  /** Decor emoji, left to right, sitting on the floor line. */
  decor: [string, string];
  /** Emoji hung on the wall (window, poster, clock). */
  wallItem: string;
  /** Under the open sky: the wall item gives way to the night sky after dark. */
  outdoor?: boolean;
}

// Every room is drawn in daylight colours; the time of day is a lighting layer on top
// (see `daylight`), so an action can change where the character is, never when.
export const ROOMS: Record<RoomId, RoomDef> = {
  bedroom: { label: 'Bedroom', wall: 'from-[#e4e2f3] to-[#cbc6e6]', floor: '#9a86b0', decor: ['🛏️', '🪴'], wallItem: '🪟' },
  livingroom: { label: 'Living room', wall: 'from-[#f3e3c3] to-[#e8cf9f]', floor: '#b98a5a', decor: ['🛋️', '📺'], wallItem: '🖼️' },
  kitchen: { label: 'Kitchen', wall: 'from-[#e3f1ec] to-[#c4e2d6]', floor: '#c9b28a', decor: ['🍳', '🧊'], wallItem: '🕰️' },
  park: { label: 'Park', wall: 'from-[#9fd6f2] to-[#d8f0c2]', floor: '#6aa84f', decor: ['🌳', '🌴'], wallItem: '☁️', outdoor: true },
  gym: { label: 'Gym', wall: 'from-[#d9dde3] to-[#b8bfc9]', floor: '#4b5563', decor: ['🏋️', '🧴'], wallItem: '🪞' },
  court: { label: 'Court', wall: 'from-[#bfe3f7] to-[#e6f4fb]', floor: '#2f7d4f', decor: ['🥅', '🧃'], wallItem: '☁️', outdoor: true },
  office: { label: 'Office', wall: 'from-[#e6ebf2] to-[#cdd6e3]', floor: '#8b95a5', decor: ['🖥️', '🪴'], wallItem: '📊' },
  campus: { label: 'Campus', wall: 'from-[#fbefcd] to-[#f2d98f]', floor: '#a3866a', decor: ['📚', '🪑'], wallItem: '📋' },
  mamak: { label: 'Mamak', wall: 'from-[#fde4d6] to-[#f5b98f]', floor: '#9c6b43', decor: ['🫖', '🪑'], wallItem: '📺' },
  mall: { label: 'Mall', wall: 'from-[#f6dff0] to-[#e6c3e0]', floor: '#c9c2d6', decor: ['🛍️', '🎬'], wallItem: '💡' },
  street: { label: 'Out and about', wall: 'from-[#ffd59e] to-[#f6b26b]', floor: '#6b6b6b', decor: ['🏪', '🚦'], wallItem: '☀️', outdoor: true },
};

export type Activity =
  | 'idle' | 'sleep' | 'chill' | 'drink' | 'eat' | 'run' | 'workout' | 'stretch' | 'sport' | 'work' | 'study' | 'read'
  | 'admin' | 'phone' | 'social' | 'love' | 'sad' | 'family' | 'play' | 'outing' | 'travel' | 'money' | 'clean'
  | 'move' | 'civic' | 'build' | 'petfeed' | 'petplay' | 'decorate' | 'dressup';

export interface ActivityDef {
  room: RoomId;
  motion: Motion;
  /** Prop held in front of the character while it plays. */
  held?: string;
  /** Emoji that float up around the character. */
  float: string[];
  bubble: string;
}

export const ACTIVITIES: Record<Activity, ActivityDef> = {
  idle: { room: 'livingroom', motion: 'idle', float: [], bubble: '' },
  sleep: { room: 'bedroom', motion: 'sleep', float: ['💤', '💤', '💤'], bubble: 'Zzz…' },
  chill: { room: 'livingroom', motion: 'sway', held: '☕', float: ['🎵'], bubble: 'Ahh, rehat' },
  drink: { room: 'kitchen', motion: 'eat', held: '💧', float: ['💦'], bubble: 'Glug glug' },
  eat: { room: 'kitchen', motion: 'eat', held: '🍽️', float: ['😋', '✨'], bubble: 'Sedapnya!' },
  run: { room: 'park', motion: 'run', float: ['💦', '💨'], bubble: 'Huff, huff' },
  workout: { room: 'gym', motion: 'squat', held: '🏋️', float: ['💪', '💦'], bubble: 'One more rep!' },
  stretch: { room: 'livingroom', motion: 'squat', float: ['💪', '💦'], bubble: 'Stretch it out' },
  sport: { room: 'court', motion: 'jump', held: '⚽', float: ['💨', '🔥'], bubble: 'Goal!' },
  work: { room: 'office', motion: 'type', held: '💻', float: ['📎', '☕'], bubble: 'Kerja kerja' },
  study: { room: 'campus', motion: 'nod', held: '📚', float: ['✏️', '💡'], bubble: 'Focus…' },
  read: { room: 'livingroom', motion: 'nod', held: '📖', float: ['💡'], bubble: 'One more chapter' },
  admin: { room: 'livingroom', motion: 'nod', held: '📝', float: ['📄', '✅'], bubble: 'Settle paperwork' },
  phone: { room: 'livingroom', motion: 'talk', held: '📱', float: ['💬', '😄'], bubble: 'Hello?' },
  social: { room: 'mamak', motion: 'talk', held: '🫖', float: ['💬', '😂'], bubble: 'Lepak dulu' },
  love: { room: 'mamak', motion: 'hop', float: ['💕', '💖', '💗'], bubble: 'Eee, sweet' },
  sad: { room: 'livingroom', motion: 'droop', float: ['💧'], bubble: '…' },
  family: { room: 'livingroom', motion: 'hop', float: ['🏡', '❤️'], bubble: 'Family time' },
  play: { room: 'livingroom', motion: 'sway', held: '🎮', float: ['⭐', '🎵'], bubble: 'One more game' },
  outing: { room: 'mall', motion: 'walk', float: ['🛍️', '✨'], bubble: 'Jalan-jalan' },
  travel: { room: 'street', motion: 'walk', float: ['🚗', '💨'], bubble: 'On the road' },
  money: { room: 'livingroom', motion: 'cheer', float: ['🪙', '🪙', '💸'], bubble: 'Kira duit' },
  clean: { room: 'livingroom', motion: 'sway', held: '🧹', float: ['✨', '🫧'], bubble: 'Sapu sapu' },
  move: { room: 'street', motion: 'walk', held: '📦', float: ['🏠'], bubble: 'Pindah rumah!' },
  civic: { room: 'street', motion: 'cheer', held: '🧤', float: ['🤝', '✨'], bubble: 'Gotong-royong' },
  build: { room: 'street', motion: 'type', held: '🛠️', float: ['🚀', '🪙'], bubble: 'Hustle mode' },
  petfeed: { room: 'kitchen', motion: 'nod', held: '🐟', float: ['😻', '✨'], bubble: 'Makan, Oyen!' },
  petplay: { room: 'livingroom', motion: 'hop', held: '🧶', float: ['🐾', '💕'], bubble: 'Meow!' },
  dressup: { room: 'bedroom', motion: 'cheer', float: ['✨', '💫'], bubble: 'Lawa!' },
  decorate: { room: 'livingroom', motion: 'cheer', held: '🔨', float: ['✨', '🛋️'], bubble: 'Cantiknya!' },
};

const BY_ID: Record<string, Activity> = {
  sleep: 'sleep', nap: 'sleep', chill: 'chill', water: 'drink', wait: 'idle', eat: 'eat',
  run: 'run', gym: 'workout', 'home-workout': 'stretch', badminton: 'sport', futsal: 'sport', football: 'sport',
  'mobile-gaming': 'play', 'pc-gaming': 'play', 'scroll-feed': 'phone', read: 'read',
  movie: 'outing', shopping: 'outing', concert: 'outing', 'buy-item': 'outing', photography: 'travel', 'road-trip': 'travel',
  mamak: 'social', karaoke: 'social', 'meet-people': 'social', networking: 'social', 'call-friend': 'phone', 'dating-app': 'phone',
  'talk-prospect': 'phone', 'chat-partner': 'phone', 'call-parents': 'phone', 'break-up': 'sad',
  'work-shift': 'work', overtime: 'work', 'attend-interview': 'work', 'take-leave': 'chill',
  'attend-class': 'study', study: 'study', assignment: 'study', fyp: 'study', 'online-course': 'study', 'self-study': 'read',
  'balik-kampung': 'travel', 'family-time': 'family', 'give-parents': 'money', 'parent-allowance': 'money',
  'move-home': 'move', 'clean-house': 'clean', 'buy-property': 'money', 'sell-property': 'money',
  'buy-vehicle': 'travel', 'sell-vehicle': 'money', 'service-vehicle': 'travel',
  'chat-reply': 'phone', 'festive-greet': 'family',
  'change-outfit': 'dressup', 'play-minigame': 'play',
  'buy-decor': 'decorate', 'place-decor': 'decorate',
  'adopt-cat': 'petplay', 'feed-pet': 'petfeed', 'play-pet': 'petplay',
  'gotong-royong': 'civic', volunteer: 'civic', 'start-hustle': 'build', 'work-hustle': 'build', 'hire-staff': 'build',
};

const BY_CATEGORY: Record<ActionCategory, Activity> = {
  daily: 'idle', food: 'eat', fitness: 'workout', leisure: 'play', social: 'social', work: 'admin', career: 'admin',
  study: 'admin', love: 'love', family: 'family', money: 'money', home: 'admin', transport: 'admin', civic: 'admin', hustle: 'admin',
};

export function activityFor(actionId: string, _param?: string): Activity {
  const direct = BY_ID[actionId];
  if (direct) return direct;
  const def = actionById(actionId);
  return def ? BY_CATEGORY[def.category] : 'idle';
}

export type Daylight = 'morning' | 'day' | 'dusk' | 'night';

/** Time of day from the game clock alone; no action changes it. */
export function daylight(minute: number): Daylight {
  const h = minute / 60;
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 16) return 'day';
  if (h >= 16 && h < 19.5) return 'dusk';
  return 'night';
}

const SKY: Record<Daylight, string> = { morning: '🌤️', day: '☀️', dusk: '🌇', night: '🌙' };

/** Lighting layer drawn over whichever room is showing. */
export const LIGHTING: Record<Daylight, string> = {
  morning: 'opacity-0',
  day: 'opacity-0',
  dusk: 'bg-[#ff7a2f] opacity-15',
  night: 'bg-[#0b1230] opacity-30',
};

/** At night a warm lamp lights the scene, switched off while the character sleeps. */
export const lampOn = (minute: number, motion: Motion) => daylight(minute) === 'night' && motion !== 'sleep';

export const skyIcon = (minute: number) => SKY[daylight(minute)];

export const wallItemFor = (room: RoomDef, minute: number) => (room.outdoor && daylight(minute) === 'night' ? '⭐' : room.wallItem);

/** The room the character is in when nothing is playing. */
export function idleRoom(minute: number): RoomId {
  const h = minute / 60;
  return h >= 21 || h < 6 ? 'bedroom' : 'livingroom';
}