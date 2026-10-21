// Builds a fresh GameState from the character-creation options.

import { backgroundById, lifeStageById } from '../data/backgrounds';
import { companies } from '../data/companies';
import { courseById, courses } from '../data/courses';
import { housingById } from '../data/housing';
import { hustleDefs } from '../data/lifestyle';
import { jobById, type Job } from '../data/jobs';
import { universities } from '../data/universities';
import { addDebt, log, SKILL_KEYS } from './core';
import { refreshListings, startJob } from './career';
import { enroll } from './education';
import { pick, seedFromString } from './rng';
import { generateFeedPosts } from './social';
import type { GameState, NewGameOptions, Skills } from './types';

export const SAVE_VERSION = 1;
export const START_DATE = '2027-01-04';
export const START_MINUTE = 7 * 60;

export function emptyState(): GameState {
  const skills = Object.fromEntries(SKILL_KEYS.map((k) => [k, 5])) as Skills;
  return {
    version: SAVE_VERSION,
    id: '',
    createdAt: '',
    seed: 1,
    rng: 1,
    mode: 'realistic',
    startDate: START_DATE,
    chapterDays: 365,
    character: { name: 'Player', startAge: 23, homeState: 'Selangor', backgroundId: 'middle', lifeStage: 'fresh_grad' },
    clock: { day: 0, minute: START_MINUTE },
    stats: { energy: 80, health: 75, fitness: 40, stress: 25, happiness: 60, reputation: 50, satiety: 55 },
    skills,
    finance: {
      cash: 0,
      savings: 0,
      emergencyFund: 0,
      epfBalance: 0,
      epfEmployerTotal: 0,
      debts: [],
      payslips: [],
      parentAllowance: 0,
      taxYear: { year: 2027, grossIncome: 0, pcbPaid: 0, epfEmployee: 0, socsoEis: 0 },
      pendingTaxSettlement: null,
      monthSpent: 0,
      monthEarned: 0,
      insurance: false,
    },
    career: { job: null, experienceDays: 0, cvQuality: 25, applications: [], listings: [], listingsRefreshedDay: 0, promotions: 0, jobsHeld: 0, workedToday: false, unemployedSinceDay: 0 },
    education: {
      status: 'none', universityId: null, courseId: null, semester: 0, totalSemesters: 0, semesterStartDay: 0, classesHeld: 0, classesAttended: 0,
      assignmentsDone: 0, assignmentsTotal: 0, knowledge: 0, fypProgress: 0, gpaHistory: [], cgpa: 0, attendedToday: false, qualification: 'spm', field: null, scholarship: false,
    },
    housing: { optionId: 'family', sinceDay: 0, depositHeld: 0, ownedPropertyId: null },
    transport: { mode: 'public', vehicleId: null, vehicleCondition: 100, licenceExpiryDay: null, hasLicence: false, pendingFines: 0 },
    food: { today: [], caloriesIn: 0, caloriesOut: 0, water: 0, history: [] },
    fitness: { gymMember: false, gymId: null, sessions: 0, streak: 0, lastWorkoutDay: null },
    relationships: { partner: null, prospects: [], exes: [], family: 60, friends: 50, dates: 0, lastFamilyContactDay: 0, lastFriendsDay: 0, moneyLent: 0 },
    hustles: [],
    inventory: { items: [] },
    feed: [],
    log: [],
    logSeq: 0,
    events: { pending: [], scheduled: [], cooldowns: {}, seen: {}, history: [] },
    achievements: {},
    challenges: { active: [], completed: {}, failed: [] },
    counters: {
      actions: 0, gymSessions: 0, workouts: 0, overtimeHours: 0, trips: 0, festivals: 0, dates: 0, mealsEaten: 0, totalEarned: 0, totalSpent: 0,
      hustleProfit: 0, daysLowSleep: 0, daysHighStress: 0, burnouts: 0, communityActs: 0, gamingHours: 0, booksOrCourses: 0, helpedParentsTotal: 0,
      debtsCleared: 0, bigPurchases: 0,
    },
    today: { earned: 0, spent: 0, sleepMinutes: 0, highlights: [], exercised: false, socialised: false },
    lastSleepMinutes: 480,
    dayReports: [],
    flags: { comparisonAnxiety: true },
    memories: [],
    communityReputation: 30,
    ending: null,
  };
}

function boostSkillsFor(skills: Skills, job: Job, extra: number): void {
  for (const [k, v] of Object.entries(job.skills)) {
    const key = k as keyof Skills;
    skills[key] = Math.max(skills[key], v + extra);
  }
}

export function newGame(options: NewGameOptions): GameState {
  const s = emptyState();
  const bg = backgroundById(options.backgroundId);
  const stage = lifeStageById(options.lifeStage);
  s.seed = options.seed ?? seedFromString(`${options.name}|${options.backgroundId}|${options.lifeStage}|${options.mode}`);
  s.rng = s.seed;
  s.id = `life-${s.seed.toString(36)}`;
  s.mode = options.mode;
  s.chapterDays = Math.round((options.chapterYears ?? 1) * 365);
  const [lo, hi] = stage.ageRange;
  s.character = {
    name: options.name.trim().slice(0, 24) || 'Ali',
    startAge: Math.min(hi, Math.max(lo, Math.round(options.startAge || stage.defaultAge))),
    homeState: options.homeState,
    backgroundId: bg.id,
    lifeStage: options.lifeStage,
  };

  // Background resources.
  s.finance.cash = bg.cash;
  s.finance.savings = bg.savings;
  s.stats.stress = bg.stress;
  s.stats.reputation = bg.reputation;
  s.relationships.family = bg.family;
  s.relationships.friends = bg.friends;
  s.career.cvQuality = bg.cv;
  for (const [k, v] of Object.entries(bg.skills)) s.skills[k as keyof Skills] += v;
  // Students have only borrowed for the semesters already completed.
  const loanShare = options.lifeStage === 'student' ? Math.max(0, (options.startSemester ?? 1) - 1) / 8 : 1;
  const studyLoan = Math.round(bg.studyLoan * loanShare);
  if (studyLoan > 0) addDebt(s, 'ptptn', 'Study loan (PTPTN-style, fictional terms)', studyLoan, Math.max(120, Math.round(studyLoan / 120)), 0.01);

  const home = housingById(bg.housing) ?? housingById('family')!;
  s.housing = { optionId: home.id, sinceDay: 0, depositHeld: home.rent * home.depositMonths, ownedPropertyId: null };
  s.career.experienceDays = stage.experienceMonths * 30;
  s.education.qualification = stage.qualification;
  s.transport.hasLicence = options.lifeStage !== 'student';
  s.transport.licenceExpiryDay = s.transport.hasLicence ? 200 : null;

  const course = courseById(options.courseId) ?? pick(s, courses);
  s.education.field = course.field;

  switch (options.lifeStage) {
    case 'student': {
      if (!home.familyHome) {
        const hostel = housingById('hostel')!;
        s.housing = { optionId: hostel.id, sinceDay: 0, depositHeld: hostel.rent * hostel.depositMonths, ownedPropertyId: null };
      }
      const uni = universities.find((u) => u.id === options.universityId && u.fields.includes(course.field)) ?? universities.find((u) => u.fields.includes(course.field))!;
      s.education.scholarship = bg.scholarship;
      enroll(s, uni.id, course.id, options.startSemester ?? 1);
      break;
    }
    case 'fresh_grad': {
      graduatePreset(s, course.id, 3.1);
      break;
    }
    case 'working':
    case 'experienced': {
      graduatePreset(s, course.id, 3.2);
      const job = jobById(options.jobId) ?? jobById('swe')!;
      const level = options.lifeStage === 'experienced' ? 2 : 0;
      boostSkillsFor(s.skills, job, options.lifeStage === 'experienced' ? 30 : 8);
      const company = pick(s, companies.filter((c) => job.industries.includes(c.industry)));
      const base = job.salaryRange[0] + (job.salaryRange[1] - job.salaryRange[0]) * 0.5;
      const salary = Math.round((base * company.payFactor * (level ? 1.6 : 1.1)) / 50) * 50;
      startJob(s, job, company, salary, level);
      s.career.job!.startDay = -Math.round(stage.experienceMonths * 30 * 0.4);
      s.career.job!.lastReviewDay = -60;
      s.career.job!.levelSinceDay = -200;
      s.career.jobsHeld = options.lifeStage === 'experienced' ? 2 : 1;
      s.finance.epfBalance = options.lifeStage === 'experienced' ? 85000 : 12000;
      if (options.lifeStage === 'experienced') s.finance.savings += 12000;
      s.feed = [];
      break;
    }
    case 'entrepreneur': {
      graduatePreset(s, course.id, 3.0);
      const def = s.skills.tech >= 20 ? hustleDefs.find((h) => h.id === 'tutoring')! : hustleDefs.find((h) => h.id === 'online-shop')!;
      s.skills.business += 15;
      s.skills.communication = Math.max(s.skills.communication, 25);
      s.finance.savings += 6000;
      s.hustles.push({
        id: def.id, level: 2, xp: 0, reputation: 45, satisfaction: 65, revenueTotal: 0, expenseTotal: 0, monthRevenue: 0, monthExpense: 0,
        startedDay: 0, lastWorkedDay: 0, employees: 0, registered: false,
      });
      break;
    }
    case 'retired': {
      graduatePreset(s, course.id, 3.0);
      s.finance.savings += 150000;
      s.finance.epfBalance = 0;
      s.stats.fitness = 30;
      s.stats.stress = 15;
      s.skills.cooking += 20;
      break;
    }
  }

  refreshListings(s);
  generateFeedPosts(s);
  log(s, 'system', `Welcome to HIDUP MALAYSIA, ${s.character.name}! ${s.mode === 'chaotic' ? 'Chaotic mode: expect the unexpected.' : 'Realistic mode.'}`);
  log(s, 'system', 'Tip: every action costs time. Eat, sleep, work, and watch your money on bills day (1st of the month).');
  return s;
}

function graduatePreset(s: GameState, courseId: string, cgpa: number): void {
  const course = courseById(courseId)!;
  s.education.status = 'graduated';
  s.education.courseId = courseId;
  s.education.field = course.field;
  s.education.cgpa = cgpa;
  s.education.qualification = course.level === 'degree' ? 'degree' : 'diploma';
  s.education.universityId = universities.find((u) => u.fields.includes(course.field))?.id ?? null;
  for (const [k, v] of Object.entries(course.skills)) s.skills[k as keyof Skills] += v * 18;
}
