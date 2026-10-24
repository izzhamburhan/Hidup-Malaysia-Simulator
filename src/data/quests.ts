// Starter quests: a short guided path for a new life. Rewards are fictional, small top-ups.

import type { GameState } from '../engine/types';

export type QuestTab = 'act' | 'money' | 'life' | 'feed' | 'home';

export interface Quest {
  id: string;
  icon: string;
  title: string;
  hint: string;
  /** Where the Go button takes the player. */
  tab: QuestTab;
  done: (s: GameState) => boolean;
}

export const QUEST_REWARD = { cash: 20, happiness: 2 } as const;

export const QUESTS: Quest[] = [
  { id: 'eat', icon: '🍛', title: 'Makan dulu', hint: 'Eat a proper meal.', tab: 'home', done: (s) => s.counters.mealsEaten >= 1 },
  { id: 'move', icon: '🏃', title: 'Gerak sikit', hint: 'Go for a run or do a workout.', tab: 'home', done: (s) => s.counters.workouts >= 1 },
  {
    id: 'career',
    icon: '💼',
    title: 'Career step',
    hint: 'Apply for a job on Life → Career, or attend a class if you study.',
    tab: 'life',
    done: (s) => s.career.applications.length > 0 || !!s.career.job || s.education.classesAttended > 0,
  },
  {
    id: 'chat',
    icon: '💬',
    title: 'Balas chat',
    hint: 'Reply to your friends or family on the Feed tab.',
    tab: 'feed',
    done: (s) => Object.keys(s.flags).some((k) => /^chat-(partner|friends|family)-day$/.test(k)),
  },
  { id: 'home', icon: '🛋️', title: 'Make it yours', hint: 'Buy something from Decor, or adopt Oyen.', tab: 'home', done: (s) => s.decor.owned.length > 0 || !!s.pet },
  { id: 'day', icon: '🌅', title: 'Survive day one', hint: 'Make it to tomorrow (End day works).', tab: 'home', done: (s) => s.clock.day >= 1 },
];

export const questById = (id: string | undefined) => QUESTS.find((q) => q.id === id);