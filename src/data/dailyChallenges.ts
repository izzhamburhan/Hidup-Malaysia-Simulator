// Daily challenges: one 7-day scenario per date, the same for every player.
// Numbers are fictional game settings chosen for balance.

import { netWorth } from '../engine/core';
import { adoptPet } from '../engine/pet';
import type { GameState, NewGameOptions } from '../engine/types';

export interface DailyChallenge {
  id: string;
  title: string;
  icon: string;
  blurb: string;
  goal: string;
  options: Pick<NewGameOptions, 'backgroundId' | 'lifeStage' | 'startAge' | 'homeState'> & Partial<Pick<NewGameOptions, 'jobId'>>;
  /** Applied once when the life is created. Deterministic. */
  setup?: (s: GameState) => void;
  /** Pure: has the goal been met? */
  won: (s: GameState) => boolean;
}

const startWorth = (s: GameState) => Number(s.flags['daily-start-worth'] ?? 0);
const startFitness = (s: GameState) => Number(s.flags['daily-start-fitness'] ?? 0);
const overdue = (s: GameState) => s.finance.debts.some((d) => d.kind === 'overdue');

export const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: 'rm50-week',
    title: 'Seminggu RM50',
    icon: '🪙',
    blurb: 'RM50 in your wallet, nothing in the bank. Make it to payday.',
    goal: 'Reach day 7 with no overdue bills and health 40 or more.',
    options: { backgroundId: 'struggling', lifeStage: 'fresh_grad', startAge: 23, homeState: 'Selangor' },
    setup: (s) => {
      s.finance.cash = 50;
      s.finance.savings = 0;
    },
    won: (s) => s.clock.day >= 7 && !overdue(s) && s.stats.health >= 40,
  },
  {
    id: 'job-hunt',
    title: 'Kerja Dalam Seminggu',
    icon: '💼',
    blurb: 'Fresh grad, fresh CV, seven days. Mak is already telling the neighbours.',
    goal: 'Get a job within 7 days.',
    options: { backgroundId: 'fresh-home', lifeStage: 'fresh_grad', startAge: 23, homeState: 'Johor' },
    won: (s) => !!s.career.job,
  },
  {
    id: 'zen-week',
    title: 'Minggu Zen',
    icon: '🧘',
    blurb: 'You are one email away from snapping. Find your calm.',
    goal: 'Bring stress down to 25 or less.',
    options: { backgroundId: 'renter', lifeStage: 'working', startAge: 27, homeState: 'Kuala Lumpur', jobId: 'swe' },
    setup: (s) => {
      s.stats.stress = 75;
    },
    won: (s) => s.stats.stress <= 25,
  },
  {
    id: 'saver-week',
    title: 'Jimat Cermat',
    icon: '🐷',
    blurb: 'Payday was yesterday. How much of it survives the week?',
    goal: 'Grow your net worth by RM300.',
    options: { backgroundId: 'middle', lifeStage: 'working', startAge: 26, homeState: 'Penang', jobId: 'swe' },
    won: (s) => netWorth(s) - startWorth(s) >= 300,
  },
  {
    id: 'social-week',
    title: 'Kawan Ramai',
    icon: '🫖',
    blurb: 'New town, no friends, and the mamak is right downstairs.',
    goal: 'Get your friends meter to 60.',
    options: { backgroundId: 'renter', lifeStage: 'fresh_grad', startAge: 24, homeState: 'Sabah' },
    setup: (s) => {
      s.relationships.friends = 20;
    },
    won: (s) => s.relationships.friends >= 60,
  },
  {
    id: 'fit-week',
    title: 'Badan Sihat',
    icon: '🏃',
    blurb: 'The doctor said "more exercise". You heard "challenge accepted".',
    goal: 'Raise fitness by 6.',
    options: { backgroundId: 'middle', lifeStage: 'fresh_grad', startAge: 25, homeState: 'Perak' },
    won: (s) => s.stats.fitness - startFitness(s) >= 6,
  },
  {
    id: 'oyen-week',
    title: "Oyen's Week",
    icon: '🐈',
    blurb: 'A hungry, grumpy Oyen has moved in. Win him over.',
    goal: "Reach day 7 with Oyen's mood at 80 or more.",
    options: { backgroundId: 'fresh-home', lifeStage: 'fresh_grad', startAge: 24, homeState: 'Melaka' },
    setup: (s) => {
      adoptPet(s);
      s.pet!.fullness = 30;
      s.pet!.mood = 30;
    },
    won: (s) => s.clock.day >= 7 && (s.pet?.mood ?? 0) >= 80,
  },
];

export const dailyChallengeById = (id: unknown) => DAILY_CHALLENGES.find((d) => d.id === id);