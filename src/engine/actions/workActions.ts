// Work, career and education actions.

import { companyById } from '../../data/companies';
import { courseById } from '../../data/courses';
import { jobById } from '../../data/jobs';
import { universityById } from '../../data/universities';
import { addSkills, applyStats, clamp, earn, formatRM, spend } from '../core';
import { formatDuration, yearOf } from '../calendar';
import {
  acceptOffer, applyForJob, isWorkday, jobEligibility, negotiateOffer, onLeave, overtime, resign, workShift,
} from '../career';
import { attendClass, doAssignment, dropOut, enroll, isClassDay, isFinalSemester, study, tuitionFor, workOnFyp } from '../education';
import { queueEvent } from '../events';
import { commuteLeg, commuteMinutes } from '../living';
import { computePayslip } from '../payroll';
import { chance, randInt } from '../rng';
import { meetSomeone } from '../social';
import type { GameState, SkillKey, TransportMode } from '../types';
import { hoursLabel, needEnergy, withinHours, type ActionDef } from './types';

export const ANNUAL_LEAVE_DAYS = 14;
export const COURSE_FEE = 180;

const hasJob = (s: GameState) => !!s.career.job;
const studying = (s: GameState) => s.education.status === 'studying';

function leaveUsed(s: GameState): number {
  return s.flags.leaveYear === yearOf(s) ? Number(s.flags.leaveUsed ?? 0) : 0;
}

function shiftMinutes(s: GameState): number {
  const job = s.career.job;
  if (!job) return 0;
  const def = jobById(job.jobId)!;
  const lunch = job.schedule === 'parttime' ? 0 : 60;
  return def.shiftHours * 60 + lunch + commuteMinutes(s) * 2;
}

/** Gig work: fictional net pay per hour (after fuel) by how the player gets around. Game estimates. */
export const GIG_RATE_PER_HOUR: Partial<Record<TransportMode, number>> = { motorcycle: 12, car: 10, walk: 7, public: 6 };
export const GIG_MAX_HOURS_PER_DAY = 6;

function gigHoursToday(s: GameState): number {
  return s.flags.gigDay === s.clock.day ? Number(s.flags.gigHours ?? 0) : 0;
}

export const workActions: ActionDef[] = [
  {
    id: 'gig-work',
    category: 'work',
    icon: '🛵',
    title: (_s, p) => `Delivery gig (${p ?? 2}h)`,
    description: (s) => {
      const rate = GIG_RATE_PER_HOUR[s.transport.mode];
      return rate
        ? `Pick up and drop off orders around town for about ${formatRM(rate)} an hour after fuel (fictional game estimate). Any day, no boss, no payslip.`
        : 'Pick up and drop off orders around town. Needs your own wheels, a bike, or a pair of legs.';
    },
    minutes: (_s, p) => Number(p ?? 2) * 60,
    energy: (_s, p) => -7 * Number(p ?? 2),
    contexts: ['commute'],
    variants: () => [
      { param: '2', label: '2h' },
      { param: '4', label: '4h' },
    ],
    available: (s, p) => {
      const hours = Number(p ?? 2);
      if (!GIG_RATE_PER_HOUR[s.transport.mode]) return 'Gigs need your own wheels, a bike, or walking. Switch your commute mode first.';
      if (!withinHours(s, 7, 22 - hours + 1)) return `Orders run ${hoursLabel(7, 22)}; a ${hours}h gig won't fit now.`;
      if (s.education.status === 'studying' && isClassDay(s) && !s.education.attendedToday && withinHours(s, 0, 17)) {
        return 'You have class today. Attend first, gig after.';
      }
      if (s.career.job?.schedule === 'fulltime' && isWorkday(s) && !onLeave(s) && withinHours(s, 0, 17)) {
        return 'Your shift comes first. Gigs are for after work or days off.';
      }
      if (gigHoursToday(s) + hours > GIG_MAX_HOURS_PER_DAY) return 'You have done enough gig hours today. Rest up, the orders will be there tomorrow.';
      return needEnergy(s, 10 + 7 * hours);
    },
    run: (s, p) => {
      const hours = Number(p ?? 2);
      const rate = GIG_RATE_PER_HOUR[s.transport.mode] ?? 0;
      const pay = Math.round(rate * hours * (randInt(s, 85, 115) / 100));
      earn(s, pay);
      s.flags.gigDay = s.clock.day;
      s.flags.gigHours = gigHoursToday(s) + hours;
      applyStats(s, { energy: -7 * hours, stress: 0.8 * hours, happiness: -0.5 * hours });
      if (s.transport.vehicleId) s.transport.vehicleCondition = Math.max(0, s.transport.vehicleCondition - 0.15 * hours);
      if (s.transport.mode === 'walk') applyStats(s, { fitness: 0.3 * hours });
      return [`${hours} hours of orders. ${formatRM(pay)} in your pocket, after fuel.`];
    },
  },
  {
    id: 'work-shift',
    category: 'work',
    icon: '💼',
    title: (s) => (s.career.job?.schedule === 'parttime' ? 'Work a part-time shift' : 'Go to work'),
    description: (s) => {
      const job = s.career.job;
      if (!job) return '';
      return `${job.title} at ${companyById(job.companyId)?.name}. Includes ${formatDuration(commuteMinutes(s))} commute each way.`;
    },
    minutes: shiftMinutes,
    energy: (s) => -Math.round((jobById(s.career.job?.jobId)?.shiftHours ?? 8) * 4.5),
    contexts: ['work', 'commute'],
    visible: hasJob,
    available: (s) => {
      const job = s.career.job!;
      if (s.career.workedToday) return 'Already worked today.';
      if (job.schedule === 'parttime') {
        return needEnergy(s, 20) ?? (withinHours(s, 8, 17) ? null : `Shifts start ${hoursLabel(8, 17)}.`);
      }
      if (!isWorkday(s)) return 'Not a workday. Enjoy it!';
      if (onLeave(s)) return 'You are on leave today.';
      if (!withinHours(s, 6, 11)) return withinHours(s, 11, 24) ? 'Too late to start a shift today.' : `Shift starts ${hoursLabel(6, 11)}.`;
      return null;
    },
    run: (s) => {
      commuteLeg(s, 2);
      const late = s.clock.minute > 9.5 * 60 && s.career.job!.schedule !== 'parttime';
      const res = workShift(s);
      if (late) {
        s.career.job!.performance = clamp(s.career.job!.performance - 1.5);
        res.lines.push('You arrived late. Your manager glanced at the clock. Twice.');
      }
      return res.lines;
    },
  },
  {
    id: 'overtime',
    category: 'work',
    icon: '🌙',
    title: (_s, p) => `Overtime (${p ?? 2}h)`,
    description: 'Paid at 1.5x your hourly rate on your next payslip. Costs energy and evening plans.',
    minutes: (_s, p) => Number(p ?? 2) * 60,
    energy: (_s, p) => -6 * Number(p ?? 2),
    contexts: ['work'],
    visible: (s) => s.career.job?.schedule === 'fulltime',
    variants: () => [
      { param: '1', label: '1h' },
      { param: '2', label: '2h' },
      { param: '3', label: '3h' },
    ],
    available: (s) => {
      if (!s.career.workedToday) return 'Only after a regular shift today.';
      if (!withinHours(s, 16, 23)) return 'Overtime happens in the evening.';
      return needEnergy(s, 15);
    },
    run: (s, p) => {
      const lines = overtime(s, Number(p ?? 2));
      if (s.fitness.lastWorkoutDay !== s.clock.day && s.fitness.gymMember) lines.push('Gym session missed.');
      return lines;
    },
  },
  {
    id: 'take-leave',
    category: 'work',
    icon: '🏖️',
    title: 'Take annual leave today',
    description: (s) => `Paid day off. ${ANNUAL_LEAVE_DAYS - leaveUsed(s)} of ${ANNUAL_LEAVE_DAYS} days left this year.`,
    minutes: 5,
    visible: (s) => s.career.job?.schedule === 'fulltime',
    available: (s) => {
      if (!isWorkday(s)) return 'Not a workday.';
      if (s.career.workedToday || onLeave(s)) return 'Not today.';
      if (leaveUsed(s) >= ANNUAL_LEAVE_DAYS) return 'No annual leave left this year.';
      return withinHours(s, 0, 12) ? null : 'Apply before noon.';
    },
    run: (s) => {
      s.flags.leaveYear = yearOf(s);
      s.flags.leaveUsed = leaveUsed(s) + 1;
      s.flags.leaveUntil = s.clock.day;
      applyStats(s, { stress: -6, happiness: 4 });
      return ['Leave approved. Out-of-office message: ON.'];
    },
  },
  {
    id: 'resign',
    category: 'work',
    icon: '🚪',
    title: 'Resign',
    description: 'Leave your job. Your income stops, but your evenings come back.',
    minutes: 30,
    visible: hasJob,
    confirm: (s) => {
      const job = s.career.job!;
      return job.schedule === 'parttime'
        ? 'You will stop getting shift pay.'
        : `You will lose your ${formatRM(job.monthlySalary)} monthly salary. Bills continue. Make sure your emergency fund can cover the gap.`;
    },
    run: (s) => {
      applyStats(s, { stress: -10, happiness: 2 });
      resign(s);
    },
  },
  {
    id: 'update-cv',
    category: 'career',
    icon: '📄',
    title: 'Polish your CV',
    description: 'Fix the fonts, quantify achievements, remove "proficient in Microsoft Word".',
    minutes: 60,
    available: (s) => (s.career.cvQuality >= 95 ? 'Your CV is already excellent.' : null),
    run: (s) => {
      s.career.cvQuality = clamp(s.career.cvQuality + 8);
      return [`CV quality: ${Math.round(s.career.cvQuality)}/100.`];
    },
  },
  {
    id: 'online-course',
    category: 'career',
    icon: '🎓',
    title: (_s, p) => `Online course: ${p ?? 'tech'}`,
    description: `Two focused hours on a paid course module (${formatRM(COURSE_FEE)}). Skills compound.`,
    minutes: 120,
    cost: COURSE_FEE,
    energy: -8,
    contexts: ['study', 'home'],
    variants: () =>
      (['tech', 'data', 'business', 'communication', 'creative', 'engineering', 'care'] as SkillKey[]).map((k) => ({ param: k, label: k })),
    available: (s) => needEnergy(s, 12),
    run: (s, p) => {
      const skill = (p ?? 'tech') as SkillKey;
      spend(s, COURSE_FEE, 'online course');
      addSkills(s, { [skill]: 4 });
      s.counters.booksOrCourses += 1;
      s.career.cvQuality = clamp(s.career.cvQuality + 2);
      applyStats(s, { energy: -8, stress: 1 });
      return [`${skill} skill now ${Math.round(s.skills[skill])}.`];
    },
  },
  {
    id: 'self-study',
    category: 'career',
    icon: '🧠',
    title: (_s, p) => `Free self-study: ${p ?? 'tech'}`,
    description: 'Slower than a paid course, but free. Pick a skill.',
    minutes: 120,
    energy: -8,
    contexts: ['study', 'home'],
    variants: () => (['tech', 'data', 'business', 'communication', 'creative', 'cooking'] as SkillKey[]).map((k) => ({ param: k, label: k })),
    available: (s) => needEnergy(s, 12),
    run: (s, p) => {
      const skill = (p ?? 'tech') as SkillKey;
      addSkills(s, { [skill]: 2 });
      applyStats(s, { energy: -8 });
      return [`${skill} skill now ${Math.round(s.skills[skill])}.`];
    },
  },
  {
    id: 'networking',
    category: 'career',
    icon: '🤝',
    title: 'Industry networking event',
    description: 'Free-flow coffee and business cards. Reputation and connections.',
    minutes: 150,
    cost: 30,
    energy: -8,
    contexts: ['social', 'work'],
    available: (s) => (withinHours(s, 18, 22) ? null : `Events run ${hoursLabel(18, 22)}.`),
    run: (s) => {
      spend(s, 30, 'networking event');
      applyStats(s, { reputation: 3, energy: -8 });
      addSkills(s, { communication: 1, business: 0.5 });
      s.career.cvQuality = clamp(s.career.cvQuality + 2);
      const lines: string[] = [];
      if (chance(s, 0.12)) {
        queueEvent(s, 'referral-offer');
        lines.push('Someone says their team is hiring...');
      } else if (!s.relationships.partner && chance(s, 0.1)) {
        const met = meetSomeone(s, 'a networking event');
        if (met) lines.push(met);
      }
      return lines;
    },
  },
  {
    id: 'apply-job',
    category: 'career',
    icon: '📨',
    dedicated: true,
    title: (s, p) => {
      const l = s.career.listings.find((x) => x.id === p);
      return l ? `Apply: ${jobById(l.jobId)?.title}` : 'Apply for job';
    },
    description: 'Tailor your CV and send the application.',
    minutes: 30,
    available: (s, p) => {
      const l = s.career.listings.find((x) => x.id === p);
      if (!l) return 'Listing closed.';
      if (s.career.applications.some((a) => a.listingId === p)) return 'Already applied.';
      const pending = s.career.applications.filter((a) => a.status === 'pending' || a.status === 'interview').length;
      if (pending >= 5) return 'You have 5 active applications. Wait for replies first.';
      return null;
    },
    run: (s, p) => {
      const l = s.career.listings.find((x) => x.id === p)!;
      const elig = jobEligibility(s, jobById(l.jobId)!);
      const msg = applyForJob(s, p!);
      return elig.ok ? [msg] : [msg, 'Long shot: you don\'t meet every requirement.'];
    },
  },
  {
    id: 'attend-interview',
    category: 'career',
    icon: '🎤',
    dedicated: true,
    title: (s, p) => `Interview: ${companyById(s.career.applications.find((a) => a.id === p)?.companyId)?.name ?? ''}`,
    description: 'Iron your shirt. Practise your "tell me about yourself".',
    minutes: (s) => commuteMinutes(s) * 2,
    contexts: ['commute'],
    available: (s, p) => {
      const app = s.career.applications.find((a) => a.id === p);
      if (!app || app.status !== 'interview') return 'No interview scheduled.';
      if (app.interviewDay !== s.clock.day) return `Interview is on day ${(app.interviewDay ?? 0) + 1}.`;
      if (s.career.workedToday && s.career.job?.schedule === 'fulltime') return 'You already went to work today; the slot passed.';
      return withinHours(s, 8, 17) ? null : `Interviews run ${hoursLabel(8, 17)}.`;
    },
    run: (s, p) => {
      const app = s.career.applications.find((a) => a.id === p)!;
      commuteLeg(s, 2);
      queueEvent(s, 'interview', { appId: app.id, company: companyById(app.companyId)?.name ?? 'the company', job: jobById(app.jobId)?.title ?? 'the role' });
      if (s.career.job?.schedule === 'fulltime' && isWorkday(s)) {
        s.flags.leaveUntil = s.clock.day;
        return ['You took the day off for the interview (half-truth: "dentist appointment").'];
      }
      return [];
    },
  },
  {
    id: 'accept-offer',
    category: 'career',
    icon: '✅',
    dedicated: true,
    title: 'Accept offer',
    description: 'Sign the offer letter.',
    minutes: 20,
    confirm: (s, p) => {
      const app = s.career.applications.find((a) => a.id === p);
      if (!app) return null;
      const job = jobById(app.jobId)!;
      if (job.schedule === 'parttime') return `Part-time ${job.title}: ${formatRM(app.offerSalary ?? 0)} per shift.`;
      const slip = computePayslip({ month: '', employer: '', schedule: job.schedule, basic: app.offerSalary ?? 0 });
      const current = s.career.job ? ` You will resign from ${String(s.flags.employerName)}.` : '';
      return `${job.title} at ${companyById(app.companyId)?.name}: ${formatRM(slip.gross)} gross, about ${formatRM(slip.net)} net per month (simplified estimate).${current}`;
    },
    available: (s, p) => (s.career.applications.find((a) => a.id === p)?.status === 'offer' ? null : 'Offer not available.'),
    run: (s, p) => {
      applyStats(s, { happiness: 10, stress: -4 });
      return [acceptOffer(s, p!)];
    },
  },
  {
    id: 'negotiate-offer',
    category: 'career',
    icon: '💬',
    dedicated: true,
    title: 'Negotiate salary',
    description: 'Ask for more. Usually fine; occasionally HR gets cold feet.',
    minutes: 20,
    available: (s, p) => {
      const app = s.career.applications.find((a) => a.id === p);
      if (!app || app.status !== 'offer') return 'Offer not available.';
      return app.negotiated ? 'Already negotiated.' : null;
    },
    run: (s, p) => [negotiateOffer(s, p!)],
  },
  {
    id: 'decline-offer',
    category: 'career',
    icon: '❌',
    dedicated: true,
    title: 'Decline offer',
    description: 'Politely say no thanks.',
    minutes: 5,
    available: (s, p) => (s.career.applications.find((a) => a.id === p)?.status === 'offer' ? null : 'Offer not available.'),
    run: (s, p) => {
      const app = s.career.applications.find((a) => a.id === p)!;
      app.status = 'declined';
      return ['Offer declined. Bridges intact.'];
    },
  },
  // --- Education ---
  {
    id: 'attend-class',
    category: 'study',
    icon: '🏫',
    title: 'Attend classes',
    description: (s) => `Lectures and tutorials. Attendance matters. Commute ${formatDuration(commuteMinutes(s))} each way.`,
    minutes: (s) => 300 + commuteMinutes(s) * 2,
    energy: -14,
    contexts: ['study', 'commute'],
    visible: studying,
    available: (s) => {
      if (!isClassDay(s)) return 'No classes today.';
      if (s.education.attendedToday) return 'Already attended today.';
      return withinHours(s, 7, 13) ? null : withinHours(s, 13, 24) ? 'Classes are over for today.' : 'Classes start at 8 AM.';
    },
    run: (s) => {
      commuteLeg(s, 2);
      return attendClass(s);
    },
  },
  {
    id: 'study',
    category: 'study',
    icon: '📚',
    title: (_s, p) => `Study (${p ?? 2}h)`,
    description: 'Revise notes, do tutorials. Knowledge drives your GPA.',
    minutes: (_s, p) => Number(p ?? 2) * 60,
    energy: (_s, p) => -6 * Number(p ?? 2),
    contexts: ['study', 'home'],
    visible: studying,
    variants: () => [
      { param: '1', label: '1h' },
      { param: '2', label: '2h' },
      { param: '3', label: '3h' },
    ],
    available: (s) => needEnergy(s, 10),
    run: (s, p) => study(s, Number(p ?? 2)),
  },
  {
    id: 'assignment',
    category: 'study',
    icon: '📝',
    title: 'Work on assignment',
    description: (s) => `Released: ${s.education.assignmentsTotal}, submitted: ${s.education.assignmentsDone}.`,
    minutes: 150,
    energy: -12,
    contexts: ['study'],
    visible: studying,
    available: (s) =>
      s.education.assignmentsDone >= s.education.assignmentsTotal ? 'No pending assignments.' : needEnergy(s, 15),
    run: (s) => doAssignment(s),
  },
  {
    id: 'fyp',
    category: 'study',
    icon: '🔬',
    title: 'Final-year project',
    description: (s) => `Progress ${Math.round(s.education.fypProgress)}%. Needs 60%+ to graduate.`,
    minutes: 180,
    energy: -15,
    contexts: ['study'],
    visible: (s) => studying(s) && isFinalSemester(s),
    available: (s) => (s.education.fypProgress >= 100 ? 'FYP complete!' : needEnergy(s, 15)),
    run: (s) => workOnFyp(s),
  },
  {
    id: 'drop-out',
    category: 'study',
    icon: '🚫',
    title: 'Leave university',
    description: 'Stop studying. Loan repayments start; your schedule frees up.',
    minutes: 60,
    visible: studying,
    confirm: () => 'You will leave without a qualification. Study-loan repayments begin next month and your family may be disappointed.',
    run: (s) => {
      dropOut(s);
    },
  },
  {
    id: 'enroll',
    category: 'study',
    icon: '🎒',
    dedicated: true,
    title: (_s, p) => {
      const [u, c] = (p ?? '').split(':');
      return `Enrol: ${courseById(c)?.name ?? ''} @ ${universityById(u)?.short ?? ''}`;
    },
    description: 'Start a new programme from semester 1.',
    minutes: 120,
    confirm: (s, p) => {
      const [u] = (p ?? '').split(':');
      const uni = universityById(u);
      if (!uni) return null;
      const note = s.career.job?.schedule === 'fulltime' ? ' You will resign from your full-time job.' : '';
      return `Tuition about ${formatRM(uni.tuitionPerSemester)} per semester (fictional game estimate), covered by family, scholarship or a study loan depending on your background.${note}`;
    },
    available: (s, p) => {
      if (s.education.status === 'studying') return 'Already studying.';
      const [u, c] = (p ?? '').split(':');
      const uni = universityById(u);
      const course = courseById(c);
      if (!uni || !course) return 'Choose a university and course.';
      if (!uni.fields.includes(course.field)) return `${uni.short} does not offer this field in the game.`;
      if (s.education.qualification === 'degree' && course.level !== 'degree') return 'You already have a higher qualification.';
      return null;
    },
    run: (s, p) => {
      const [u, c] = (p ?? '').split(':');
      if (s.career.job?.schedule === 'fulltime') resign(s, 'You resigned to go back to university.');
      enroll(s, u, c, 1);
      s.character.lifeStage = 'student';
      return [`Welcome to ${universityById(u)?.short}! Semester tuition: ${formatRM(tuitionFor(s))}.`];
    },
  },
];
