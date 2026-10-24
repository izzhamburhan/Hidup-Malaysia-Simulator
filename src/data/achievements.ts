// Achievements and life challenges. Conditions are pure functions of GameState.
import type { GameState } from '../engine/types';
import { DECOR_SLOTS } from './decor';
import { MINIGAMES } from './minigames';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  check: (s: GameState) => boolean;
}

const debtTotal = (s: GameState) => s.finance.debts.reduce((a, d) => a + d.balance, 0);
const age = (s: GameState) => s.character.startAge + Math.floor(s.clock.day / 365);

export const achievements: Achievement[] = [
  { id: 'first-day', title: 'Hari Pertama', description: 'Survive your first day.', icon: '🌅', check: (s) => s.clock.day >= 1 },
  { id: 'first-week', title: 'Seminggu Dah', description: 'Make it through a full week.', icon: '📅', check: (s) => s.clock.day >= 7 },
  { id: 'first-salary', title: 'Gaji Masuk!', description: 'Receive your first payslip.', icon: '💰', check: (s) => s.finance.payslips.length > 0 },
  { id: 'saver-1k', title: 'Tabung Pertama', description: 'Have RM1,000 in savings.', icon: '🪙', check: (s) => s.finance.savings >= 1000 },
  { id: 'saver-10k', title: 'Five Figures', description: 'Have RM10,000 in savings.', icon: '🏦', check: (s) => s.finance.savings >= 10000 },
  { id: 'emergency-3', title: 'Rainy Day Ready', description: 'Emergency fund of RM5,000 or more.', icon: '☂️', check: (s) => s.finance.emergencyFund >= 5000 },
  { id: 'debt-free', title: 'Bebas Hutang', description: 'Clear a loan completely.', icon: '🕊️', check: (s) => s.counters.debtsCleared > 0 },
  { id: 'zero-debt', title: 'Totally Debt-Free', description: 'Owe nothing at all after day 30.', icon: '✨', check: (s) => s.clock.day > 30 && debtTotal(s) === 0 },
  { id: 'hired', title: 'Officially Employed', description: 'Land a full-time job.', icon: '💼', check: (s) => s.career.job?.schedule === 'fulltime' },
  { id: 'promoted', title: 'Naik Pangkat', description: 'Get promoted.', icon: '🚀', check: (s) => s.career.promotions > 0 },
  { id: 'job-hopper', title: 'Job Hopper', description: 'Hold three different jobs.', icon: '🦘', check: (s) => s.career.jobsHeld >= 3 },
  { id: 'overtime-king', title: 'OT Champion', description: 'Log 40 hours of overtime.', icon: '🌙', check: (s) => s.counters.overtimeHours >= 40 },
  { id: 'deans-list', title: "Dean's List", description: 'Score a GPA of 3.67 or higher.', icon: '🏅', check: (s) => Number(s.flags.deansList ?? 0) > 0 },
  { id: 'graduate', title: 'Graduan', description: 'Graduate from university.', icon: '🎓', check: (s) => s.education.status === 'graduated' && s.education.gpaHistory.length > 0 },
  { id: 'gym-rat', title: 'Gym Rat', description: '20 gym sessions.', icon: '🏋️', check: (s) => s.counters.gymSessions >= 20 },
  { id: 'streak-7', title: 'Seven Days Strong', description: '7-day workout streak.', icon: '🔥', check: (s) => s.fitness.streak >= 7 },
  { id: 'fit', title: 'Fit Like Fiddle', description: 'Reach 75 fitness.', icon: '💪', check: (s) => s.stats.fitness >= 75 },
  { id: 'foodie', title: 'Makan Expert', description: 'Eat 100 meals.', icon: '🍛', check: (s) => s.counters.mealsEaten >= 100 },
  { id: 'hydrated', title: 'Hydration Station', description: 'Drink 8 glasses of water in a day.', icon: '💧', check: (s) => s.food.water >= 8 },
  { id: 'first-date', title: 'Butterflies', description: 'Go on your first date.', icon: '🦋', check: (s) => s.counters.dates > 0 },
  { id: 'official', title: 'Official', description: 'Enter a committed relationship.', icon: '💑', check: (s) => ['committed', 'engaged', 'married'].includes(s.relationships.partner?.stage ?? '') },
  { id: 'married', title: 'Selamat Pengantin Baru', description: 'Get married.', icon: '💐', check: (s) => s.relationships.partner?.stage === 'married' },
  { id: 'single-happy', title: 'Single & Thriving', description: 'Single, happiness 75+, after 60 days.', icon: '🌻', check: (s) => !s.relationships.partner && s.stats.happiness >= 75 && s.clock.day >= 60 },
  { id: 'anak-soleh', title: 'Anak Kesayangan', description: 'Family relationship 90+.', icon: '🏡', check: (s) => s.relationships.family >= 90 },
  { id: 'social-butterfly', title: 'Social Butterfly', description: 'Friendship 90+.', icon: '🎉', check: (s) => s.relationships.friends >= 90 },
  { id: 'wheels', title: 'Got Wheels', description: 'Own a vehicle.', icon: '🚗', check: (s) => s.transport.vehicleId !== null },
  { id: 'homeowner', title: 'Tuan Rumah', description: 'Own a property.', icon: '🔑', check: (s) => s.housing.ownedPropertyId !== null },
  { id: 'own-place', title: 'Moved Out', description: 'Live somewhere other than the family home.', icon: '📦', check: (s) => s.housing.optionId !== 'family' && s.clock.day > 0 && s.flags.movedOut === true },
  { id: 'hustler', title: 'Side Hustler', description: 'Start a side hustle.', icon: '🛠️', check: (s) => s.hustles.length > 0 },
  { id: 'hustle-1k', title: 'Four Figures on the Side', description: 'RM1,000 total side-hustle profit.', icon: '📈', check: (s) => s.counters.hustleProfit >= 1000 },
  { id: 'founder', title: 'Founder', description: 'Register a company.', icon: '🏢', check: (s) => s.hustles.some((h) => h.registered) },
  { id: 'traveller', title: 'Jalan-Jalan', description: 'Go on 5 trips.', icon: '✈️', check: (s) => s.counters.trips >= 5 },
  { id: 'festive', title: 'Festive Spirit', description: 'Celebrate 3 festivals.', icon: '🪔', check: (s) => s.counters.festivals >= 3 },
  { id: 'community', title: 'Orang Kampung', description: 'Community reputation 75+.', icon: '🤝', check: (s) => s.communityReputation >= 75 },
  { id: 'night-owl', title: 'Night Owl', description: 'Sleep under 6 hours on 5 nights.', icon: '🦉', check: (s) => s.counters.daysLowSleep >= 5 },
  { id: 'gamer', title: 'One More Match', description: '50 hours of gaming.', icon: '🎮', check: (s) => s.counters.gamingHours >= 50 },
  { id: 'zen', title: 'Zen Mode', description: 'Stress under 15 with happiness over 70.', icon: '🧘', check: (s) => s.stats.stress < 15 && s.stats.happiness > 70 },
  { id: 'survivor', title: 'Survived Burnout', description: 'Recover from a burnout episode.', icon: '🌱', check: (s) => s.counters.burnouts > 0 && s.stats.stress < 50 },
  { id: 'year-one', title: 'One Year Older', description: 'Play through a full year.', icon: '🎂', check: (s) => s.clock.day >= 365 && age(s) > s.character.startAge },
  { id: 'pro-gamer-kampung', title: 'Pro Gamer Kampung', description: 'Score 90 or more in every mini-game.', icon: '🕹️', check: (s) => MINIGAMES.every((g) => Number(s.flags[`mg-best-${g.id}`] ?? 0) >= 90) },
  { id: 'rumahku-syurgaku', title: 'Rumahku Syurgaku', description: 'Fill every decor spot in your place.', icon: '🏡', check: (s) => DECOR_SLOTS.every((k) => !!s.decor.placed[k]) },
  { id: 'hamba-kucing', title: 'Hamba Kucing', description: 'Have a cat for a month and keep his mood at 90 or more. You work for him now.', icon: '🐈', check: (s) => !!s.pet && s.pet.mood >= 90 && s.clock.day - s.pet.adoptedDay >= 30 },
];

export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Current progress and target, for the progress bar. */
  progress: (s: GameState) => { current: number; target: number };
  /** Optional failure condition (deadline). */
  failed?: (s: GameState) => boolean;
  reward: string;
}

export const challenges: Challenge[] = [
  { id: 'save-10k-28', title: 'RM10k before 28', description: 'Save RM10,000 (savings + emergency fund) before you turn 28.', icon: '🎯', progress: (s) => ({ current: s.finance.savings + s.finance.emergencyFund, target: 10000 }), failed: (s) => age(s) >= 28 && s.finance.savings + s.finance.emergencyFund < 10000, reward: '+10 happiness and bragging rights' },
  { id: 'promo-3y', title: 'Promotion in 3 years', description: 'Get promoted within three simulated years.', icon: '📈', progress: (s) => ({ current: s.career.promotions, target: 1 }), failed: (s) => s.clock.day > 365 * 3 && s.career.promotions === 0, reward: '+5 reputation' },
  { id: 'car-no-drain', title: 'Car without draining savings', description: 'Own a vehicle while keeping RM3,000+ in your emergency fund.', icon: '🚗', progress: (s) => ({ current: (s.transport.vehicleId ? 1 : 0) + (s.finance.emergencyFund >= 3000 ? 1 : 0), target: 2 }), reward: '+8 happiness' },
  { id: 'gym-streak', title: 'Gym streak', description: 'Reach a 14-day workout streak.', icon: '🔥', progress: (s) => ({ current: s.fitness.streak, target: 14 }), reward: '+5 fitness' },
  { id: 'cgpa', title: 'CGPA 3.5', description: 'Graduate with CGPA 3.50 or higher.', icon: '🎓', progress: (s) => ({ current: s.education.status === 'graduated' && s.education.cgpa >= 3.5 ? 1 : 0, target: 1 }), failed: (s) => s.education.status === 'graduated' && s.education.cgpa < 3.5, reward: '+10 reputation' },
  { id: 'hustle-success', title: 'Successful side hustle', description: 'Reach RM5,000 total side-hustle profit.', icon: '💼', progress: (s) => ({ current: Math.max(0, s.counters.hustleProfit), target: 5000 }), reward: '+10 happiness' },
  { id: 'pay-off-loan', title: 'Pay off a loan', description: 'Fully repay any loan.', icon: '🕊️', progress: (s) => ({ current: s.counters.debtsCleared, target: 1 }), reward: '-15 stress' },
  { id: 'festive-no-debt', title: 'Debt-free festive season', description: 'Celebrate 2 festivals with no overdue debt.', icon: '🧧', progress: (s) => ({ current: s.finance.debts.some((d) => d.kind === 'overdue') ? 0 : Math.min(2, s.counters.festivals), target: 2 }), reward: '+8 family' },
  { id: 'balance', title: 'Work-life balance', description: 'Hold stress under 40, happiness over 60 and energy over 50 at once while employed.', icon: '⚖️', progress: (s) => ({ current: [s.stats.stress < 40, s.stats.happiness > 60, s.stats.energy > 50, !!s.career.job].filter(Boolean).length, target: 4 }), reward: '+10 health' },
  { id: 'emergency-6', title: 'Six-month buffer', description: 'Emergency fund covering 6 months of commitments.', icon: '🛟', progress: (s) => ({ current: s.finance.emergencyFund, target: Math.max(3000, 6 * (s.flags.lastCommitments as number ?? 1500)) }), reward: '-10 stress' },
];

export const MAX_ACTIVE_CHALLENGES = 3;