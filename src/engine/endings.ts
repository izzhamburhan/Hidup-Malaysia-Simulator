// Multiple endings and the life report. No ending is "the best" one: each
// archetype describes a different shape of life.

import { companyById } from '../data/companies';
import { courseById } from '../data/courses';
import { universityById } from '../data/universities';
import { vehicleById } from '../data/vehicles';
import { achievements } from '../data/achievements';
import { ageOf } from './calendar';
import { netWorth, round2, totalDebt } from './core';
import { currentHome } from './living';
import { relationshipStatus } from './social';
import type { GameState } from './types';

export interface EndingDef {
  id: string;
  title: string;
  icon: string;
  blurb: string;
  /** Shown as a clue in the ending collection before it is found. */
  hint: string;
  score: (s: GameState) => number;
}

const avg = (...n: number[]) => n.reduce((a, b) => a + b, 0) / n.length;

export const endings: EndingDef[] = [
  { id: 'stable', title: 'Financially Stable', icon: '🏦', blurb: 'Bills paid, buffer built, no 3 AM money panic. Quietly powerful.', hint: 'Build a cash buffer and keep debt low.', score: (s) => Math.min(100, (netWorth(s) / 400) + (s.finance.emergencyFund > 3000 ? 20 : 0) - (totalDebt(s) > 20000 ? 10 : 0)) },
  { id: 'career', title: 'Career-Focused', icon: '🚀', blurb: 'Titles, responsibilities and a calendar full of meetings you actually run.', hint: 'Climb the ladder. Promotions count.', score: (s) => (s.career.job ? 30 : 0) + s.career.promotions * 25 + (s.career.job?.performance ?? 0) / 4 },
  { id: 'entrepreneur', title: 'Entrepreneur', icon: '🧑‍💼', blurb: 'You built something of your own. Messy, risky, yours.', hint: 'Start a side hustle and grow it.', score: (s) => s.hustles.length * 10 + s.counters.hustleProfit / 100 + (s.hustles.some((h) => h.registered) ? 30 : 0) },
  { id: 'traveller', title: 'Adventurous Traveller', icon: '✈️', blurb: 'Memories over money. Your camera roll is a travel guide.', hint: 'Take lots of trips.', score: (s) => s.counters.trips * 12 },
  { id: 'family', title: 'Family-Oriented', icon: '🏡', blurb: 'Your people come first, and they know it.', hint: 'Stay close to your family. Maybe say "I do".', score: (s) => s.relationships.family * 0.6 + (s.relationships.partner?.stage === 'married' ? 30 : s.relationships.partner ? 10 : 0) + Math.min(20, s.counters.helpedParentsTotal / 200) },
  { id: 'fitness', title: 'Fitness-Focused', icon: '💪', blurb: 'Strong body, sharp mind, suspiciously early mornings.', hint: 'Train hard, and often.', score: (s) => s.stats.fitness * 0.8 + Math.min(30, s.counters.gymSessions) },
  { id: 'balanced', title: 'Balanced Life', icon: '⚖️', blurb: 'Not perfect, but steady. Work, rest, people and play in reasonable proportions.', hint: 'Keep mood, health, friends and family all healthy, and stress low.', score: (s) => (Math.min(s.stats.happiness, s.stats.health, 100 - s.stats.stress, s.relationships.friends, s.relationships.family) >= 50 ? 70 : 0) + avg(s.stats.happiness, s.stats.health, 100 - s.stats.stress) / 4 },
  { id: 'burned', title: 'Burned Out', icon: '🔥', blurb: 'You gave everything to everything. Time to give something back to yourself.', hint: 'Push yourself far too hard for far too long.', score: (s) => (s.stats.stress > 80 ? 50 : 0) + (s.stats.health < 35 ? 30 : 0) + s.counters.burnouts * 15 },
  { id: 'debt', title: 'Debt Recovery Arc', icon: '🧾', blurb: 'The numbers were scary. You faced them. The comeback is underway.', hint: 'Fall deep into debt, then fight your way back.', score: (s) => (totalDebt(s) > 15000 ? 40 : 0) + s.counters.debtsCleared * 20 + (s.finance.debts.some((d) => d.kind === 'overdue') ? 20 : 0) },
  { id: 'figuring', title: 'Still Figuring Life Out', icon: '🧭', blurb: 'Plot twist: so is everyone else. The story is still being written.', hint: 'No plan needed. Just live.', score: () => 35 },
];

export interface LifeReport {
  name: string;
  age: number;
  days: number;
  mode: string;
  career: string;
  salary: number;
  netWorth: number;
  savings: number;
  debt: number;
  epf: number;
  housing: string;
  vehicle: string;
  fitness: number;
  wellbeing: number;
  relationship: string;
  education: string;
  achievements: number;
  achievementTotal: number;
  memorable: string[];
  balance: number;
  ending: EndingDef;
  runnerUp: EndingDef;
}

export function rankEndings(state: GameState): EndingDef[] {
  return [...endings].sort((a, b) => b.score(state) - a.score(state));
}

export function lifeReport(state: GameState): LifeReport {
  const [ending, runnerUp] = rankEndings(state);
  const job = state.career.job;
  const e = state.education;
  const education =
    e.status === 'graduated'
      ? `${courseById(e.courseId)?.name ?? 'Graduate'} (CGPA ${e.cgpa.toFixed(2)})`
      : e.status === 'studying'
        ? `Semester ${e.semester}/${e.totalSemesters} at ${universityById(e.universityId)?.short}`
        : e.qualification === 'degree' ? 'Degree holder' : e.qualification === 'diploma' ? 'Diploma holder' : 'SPM';
  const wellbeing = Math.round(avg(state.stats.happiness, state.stats.health, 100 - state.stats.stress));
  const balance = Math.round(avg(wellbeing, state.relationships.friends, state.relationships.family, Math.min(100, 50 + netWorth(state) / 500)));
  return {
    name: state.character.name,
    age: ageOf(state),
    days: state.clock.day,
    mode: state.mode === 'chaotic' ? 'Chaotic' : 'Realistic',
    career: job ? `${job.title} @ ${companyById(job.companyId)?.name}` : state.hustles.length ? 'Self-employed' : 'Between jobs',
    salary: job?.monthlySalary ?? 0,
    netWorth: netWorth(state),
    savings: round2(state.finance.savings + state.finance.emergencyFund),
    debt: totalDebt(state),
    epf: state.finance.epfBalance,
    housing: currentHome(state).name,
    vehicle: vehicleById(state.transport.vehicleId)?.name ?? 'No vehicle',
    fitness: Math.round(state.stats.fitness),
    wellbeing,
    relationship: relationshipStatus(state),
    education,
    achievements: Object.keys(state.achievements).length,
    achievementTotal: achievements.length,
    memorable: [...state.memories.slice(0, 3), ...state.events.history.slice(0, 3).map((h) => h.title)].slice(0, 5),
    balance,
    ending,
    runnerUp,
  };
}

export function shareText(report: LifeReport): string {
  return [
    `🇲🇾 HIDUP MALAYSIA — ${report.ending.icon} ${report.ending.title}`,
    `${report.name}, ${report.age} · ${report.days} days (${report.mode} mode)`,
    `💼 ${report.career}`,
    `💰 Net worth RM${Math.round(report.netWorth).toLocaleString('en-MY')} · ❤️ ${report.relationship}`,
    `🏆 ${report.achievements}/${report.achievementTotal} achievements · ⚖️ Life balance ${report.balance}/100`,
    'Can you build the life you want in Malaysia?',
  ].join('\n');
}