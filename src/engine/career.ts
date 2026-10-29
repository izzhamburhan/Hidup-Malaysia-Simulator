// Career system: job board, applications, interviews, offers, shifts,
// performance reviews, promotions and resignations.

import { companies, companyById, type Company } from '../data/companies';
import { jobById, jobs, type Job } from '../data/jobs';
import { universityById } from '../data/universities';
import { addSkills, applyStats, clamp, earn, formatRM, highlight, log, nextId, playerPost, round2, spend } from './core';
import { isWeekend } from './calendar';
import { chance, nextRandom, pick, randInt, randRange } from './rng';
import type { Employment, GameState, JobListing, JobSchedule } from './types';
import { isHoliday } from './holidays';

export const REVIEW_INTERVAL_DAYS = 182;
const LISTING_LIFETIME = 14;

export interface Eligibility {
  ok: boolean;
  missing: string[];
  match: number;
}

const QUAL_RANK = { spm: 0, diploma: 1, degree: 2 } as const;

/** Open listings: ones the player meets every requirement for first, then best match. Pure; the sort is stable. */
export function listingsByMatch(state: GameState): JobListing[] {
  return state.career.listings
    .map((l) => ({ l, e: jobEligibility(state, jobById(l.jobId)!) }))
    .sort((a, b) => Number(b.e.ok) - Number(a.e.ok) || b.e.match - a.e.match)
    .map((x) => x.l);
}

export function jobEligibility(state: GameState, job: Job): Eligibility {
  const missing: string[] = [];
  const edu = state.education;
  const studying = edu.status === 'studying';
  if (studying && job.schedule === 'fulltime') missing.push('Finish your studies first (full-time role)');
  if (job.schedule === 'intern' && !studying) missing.push('Internships are for current students');
  if (job.schedule === 'intern' && studying && edu.semester < edu.totalSemesters - 2) missing.push('Internships open in your final year');
  if (QUAL_RANK[edu.qualification] < QUAL_RANK[job.qualification] && job.schedule === 'fulltime') {
    missing.push(`Requires a ${job.qualification}`);
  }
  let skillGap = 0;
  let skillTotal = 0;
  for (const [key, need] of Object.entries(job.skills)) {
    const have = state.skills[key as keyof typeof state.skills];
    skillTotal += need;
    if (have < need) skillGap += need - have;
  }
  if (skillGap > 15) missing.push('Skills well below requirements');
  const expMonths = state.career.experienceDays / 30;
  if (expMonths < job.minExperienceMonths) missing.push(`Needs ${job.minExperienceMonths} months experience`);
  const fieldMatch = !job.fields || (edu.field !== null && job.fields.includes(edu.field));
  const match = clamp(
    70 - skillGap * 1.5 + (fieldMatch ? 10 : -8) + Math.min(15, expMonths / 2) + (skillTotal === 0 ? 5 : 0) + (state.career.cvQuality - 30) / 3,
  );
  return { ok: missing.length === 0, missing, match: Math.round(match) };
}

function salaryFor(state: GameState, job: Job, company: Company): number {
  const [lo, hi] = job.salaryRange;
  const expBoost = Math.min(0.35, state.career.experienceDays / 365 / 10);
  const base = lo + (hi - lo) * randRange(state, 0.05, 0.6);
  return Math.round((base * company.payFactor * (1 + expBoost)) / 50) * 50;
}

/** Refresh the job board (weekly). Listings mix eligible and stretch roles. */
export function refreshListings(state: GameState): void {
  const day = state.clock.day;
  state.career.listings = state.career.listings.filter((l) => l.expiresDay > day);
  const studying = state.education.status === 'studying';
  const uni = universityById(state.education.universityId);
  const target = 7 + (studying ? (uni?.industryLinks ?? 0) : 0);
  let guard = 0;
  while (state.career.listings.length < target && guard++ < 60) {
    let pool = jobs;
    if (studying) pool = jobs.filter((j) => j.studentFriendly || nextRandom(state) < 0.15);
    const job = pick(state, pool);
    const options = companies.filter((c) => job.industries.includes(c.industry));
    if (!options.length) continue;
    const company = pick(state, options);
    if (state.career.listings.some((l) => l.jobId === job.id && l.companyId === company.id)) continue;
    if (state.career.job && state.career.job.jobId === job.id && state.career.job.companyId === company.id) continue;
    const listing: JobListing = {
      id: nextId(state, 'lst'),
      jobId: job.id,
      companyId: company.id,
      salary: job.schedule === 'parttime' ? job.shiftPay ?? 50 : salaryFor(state, job, company),
      postedDay: day,
      expiresDay: day + LISTING_LIFETIME + randInt(state, 0, 7),
    };
    state.career.listings.push(listing);
  }
  state.career.listingsRefreshedDay = day;
}

export function applyForJob(state: GameState, listingId: string): string {
  const listing = state.career.listings.find((l) => l.id === listingId);
  if (!listing) throw new Error('Listing no longer available');
  const job = jobById(listing.jobId)!;
  const elig = jobEligibility(state, job);
  const networking = (state.stats.reputation - 50) / 5;
  const connected = state.character.backgroundId === 'connected' ? 6 : 0;
  const score = clamp(elig.match + networking + connected - (elig.ok ? 0 : 25));
  state.career.applications.unshift({
    id: nextId(state, 'app'),
    listingId,
    jobId: listing.jobId,
    companyId: listing.companyId,
    appliedDay: state.clock.day,
    respondDay: state.clock.day + randInt(state, 2, 6),
    status: 'pending',
    offerSalary: listing.salary,
    score: Math.round(score),
  });
  state.career.listings = state.career.listings.filter((l) => l.id !== listingId);
  return `Application sent to ${companyById(listing.companyId)?.name}. HR usually replies within a week.`;
}

/** Day-start processing of application replies. */
export function processApplications(state: GameState): void {
  const day = state.clock.day;
  for (const app of state.career.applications) {
    const company = companyById(app.companyId)?.name ?? 'The company';
    const job = jobById(app.jobId);
    if (app.status === 'pending' && app.respondDay <= day) {
      const roll = nextRandom(state) * 100;
      if (roll < app.score - 10 || (state.mode === 'chaotic' && roll < app.score)) {
        app.status = 'interview';
        let iday = day + 2;
        while (isWeekend(state, iday)) iday++;
        app.interviewDay = iday;
        log(state, 'event', `📧 ${company} invited you to interview for ${job?.title} on day ${iday + 1}.`);
        highlight(state, `Interview invite from ${company}`);
      } else {
        app.status = 'rejected';
        log(state, 'event', `📧 ${company}: "We regret to inform you..." (${job?.title}). Their loss.`);
        applyStats(state, { happiness: -2 });
      }
    }
    if (app.status === 'interview' && app.interviewDay !== undefined && app.interviewDay < day) {
      app.status = 'expired';
      log(state, 'warning', `You missed the ${company} interview. Ghosted them before they could ghost you.`);
      applyStats(state, { reputation: -2 });
    }
    if (app.status === 'offer' && app.respondDay + 7 < day) {
      app.status = 'expired';
      log(state, 'event', `The offer from ${company} expired.`);
    }
  }
  state.career.applications = state.career.applications.filter((a) => day - a.appliedDay < 60 || a.status === 'offer');
  if (state.career.applications.length > 25) state.career.applications.length = 25;
}

/** Score an interview answer and turn the application into an offer or a rejection. */
export function resolveInterview(state: GameState, appId: string, style: 'star' | 'honest' | 'oversell' | 'chaos'): string {
  const app = state.career.applications.find((a) => a.id === appId);
  if (!app) return 'The interview slot disappeared.';
  const company = companyById(app.companyId)?.name ?? 'the company';
  const comm = state.skills.communication;
  const tired = state.stats.energy < 30 ? -10 : 0;
  const styleBonus = { star: comm >= 30 ? 14 : 6, honest: 8, oversell: chance(state, 0.4) ? 18 : -12, chaos: chance(state, 0.5) ? 22 : -20 }[style];
  const total = app.score + styleBonus + tired + (comm - 30) / 3 + randRange(state, -15, 15);
  if (total >= 62) {
    app.status = 'offer';
    app.respondDay = state.clock.day;
    log(state, 'milestone', `🎉 ${company} made you an offer: ${formatRM(app.offerSalary ?? 0)}${jobById(app.jobId)?.schedule === 'parttime' ? ' per shift' : '/month'}.`);
    highlight(state, `Job offer from ${company}`);
    return `The panel smiled. A lot. ${company} sent an offer letter the same evening.`;
  }
  app.status = 'rejected';
  applyStats(state, { happiness: -3 });
  addSkills(state, { communication: 1 });
  return `Not this time. ${company} went with "a candidate whose profile more closely matches". You learned something, though.`;
}

export function negotiateOffer(state: GameState, appId: string): string {
  const app = state.career.applications.find((a) => a.id === appId);
  if (!app || app.status !== 'offer' || app.negotiated) return 'Nothing to negotiate.';
  app.negotiated = true;
  const roll = nextRandom(state) + (state.skills.communication - 30) / 200;
  if (roll < 0.12) {
    app.status = 'rejected';
    return 'HR "re-evaluated the budget". The offer was withdrawn. Ouch.';
  }
  if (roll < 0.45) return 'HR held firm: "This is already our best offer." No harm done.';
  const bump = roll > 0.85 ? 0.12 : 0.06;
  app.offerSalary = Math.round(((app.offerSalary ?? 0) * (1 + bump)) / 50) * 50;
  return `Negotiation worked! New offer: ${formatRM(app.offerSalary)}.`;
}

export function acceptOffer(state: GameState, appId: string): string {
  const app = state.career.applications.find((a) => a.id === appId);
  if (!app || app.status !== 'offer') throw new Error('Offer not available');
  const job = jobById(app.jobId)!;
  const company = companyById(app.companyId)!;
  if (state.career.job) {
    log(state, 'event', `You resigned from ${String(state.flags.employerName)} to join ${company.name}.`);
  }
  startJob(state, job, company, app.offerSalary ?? job.salaryRange[0]);
  app.status = 'accepted';
  for (const other of state.career.applications) {
    if (other.status === 'offer' && other.id !== appId) other.status = 'declined';
  }
  return `Welcome aboard! You are now ${job.title} at ${company.name}.`;
}

export function startJob(state: GameState, job: Job, company: Company, salary: number, level = 0): void {
  const day = state.clock.day;
  const employment: Employment = {
    jobId: job.id,
    companyId: company.id,
    title: job.ladder[Math.min(level, job.ladder.length - 1)],
    schedule: job.schedule,
    monthlySalary: job.schedule === 'parttime' ? 0 : salary,
    shiftPay: job.schedule === 'parttime' ? salary : 0,
    level,
    startDay: day,
    levelSinceDay: day,
    performance: 55,
    lastReviewDay: day,
    overtimeHoursThisMonth: 0,
    daysWorkedThisMonth: 0,
    absencesThisMonth: 0,
  };
  state.career.job = employment;
  state.career.jobsHeld += 1;
  state.career.unemployedSinceDay = null;
  state.flags.employerName = company.name;
  if (job.schedule === 'fulltime') {
    if (state.character.lifeStage === 'student' || state.character.lifeStage === 'fresh_grad') state.character.lifeStage = 'working';
    playerPost(state, `New chapter: ${employment.title} @ ${company.name} 💼`);
  }
}

export function resign(state: GameState, reason = 'You resigned.'): void {
  const job = state.career.job;
  if (!job) return;
  log(state, 'event', `${reason} Goodbye, ${String(state.flags.employerName)}.`);
  state.career.job = null;
  state.career.unemployedSinceDay = state.clock.day;
  delete state.flags.employerName;
}

export function isWorkday(state: GameState, day = state.clock.day): boolean {
  return !isWeekend(state, day) && !isHoliday(state, day);
}

export function onLeave(state: GameState, day = state.clock.day): boolean {
  return Number(state.flags.leaveUntil ?? -1) >= day;
}

export interface ShiftResult {
  pay: number;
  lines: string[];
}

/** Resolve one work shift (time is advanced by the action engine). */
export function workShift(state: GameState): ShiftResult {
  const job = state.career.job!;
  const def = jobById(job.jobId)!;
  const company = companyById(job.companyId)!;
  const lines: string[] = [];
  const tired = state.flags.tiredDay === state.clock.day;
  const energyFactor = state.stats.energy < 25 ? 0.4 : state.stats.energy < 50 ? 0.75 : 1;
  const perfGain = (1.6 + (state.skills[Object.keys(def.growth)[0] as keyof typeof state.skills] ?? 0) / 60) * energyFactor * (tired ? 0.5 : 1);
  const paceStress = company.pace === 'intense' ? 4 : company.pace === 'fast' ? 2 : 0;
  job.performance = round2(clamp(job.performance + perfGain - (state.stats.stress > 80 ? 1.5 : 0)));
  job.daysWorkedThisMonth += 1;
  state.career.workedToday = true;
  state.career.experienceDays += 1;
  addSkills(state, def.growth, job.schedule === 'intern' ? 1.3 : 1);
  applyStats(state, { energy: -(def.shiftHours * 4.5), stress: def.stress + paceStress, happiness: -1 - paceStress / 2, satiety: -10 });
  if (tired) lines.push('Running on low sleep: you made sloppy mistakes. Performance gain halved.');
  if (job.schedule !== 'parttime') lines.push(lunchBreak(state, 10, 'Lunch near the office'));
  let pay = 0;
  if (job.schedule === 'parttime') {
    pay = job.shiftPay;
    earn(state, pay);
    state.finance.taxYear.grossIncome = round2(state.finance.taxYear.grossIncome + pay);
    lines.push(`Shift pay: ${formatRM(pay)} (paid daily).`);
  }
  return { pay, lines };
}

/** Shifts and class days include a bought lunch (game estimate). Goes into debt only if unavoidable. */
export function lunchBreak(state: GameState, price: number, label: string): string {
  if (state.finance.cash < price) {
    applyStats(state, { happiness: -2 });
    return 'No cash for lunch. You survived on office biscuits and willpower.';
  }
  spend(state, price, label);
  state.food.caloriesIn += 600;
  state.food.today.push({ foodId: 'lunch', name: label, calories: 600, price, minute: 12 * 60, portion: 1 });
  applyStats(state, { satiety: 45, energy: 6 });
  return `${label}: ${formatRM(price)}, ~600 kcal (estimate).`;
}

export function overtime(state: GameState, hours: number): string[] {
  const job = state.career.job!;
  job.overtimeHoursThisMonth += hours;
  state.counters.overtimeHours += hours;
  job.performance = round2(clamp(job.performance + hours * 0.6));
  state.career.experienceDays += hours / 16;
  applyStats(state, { energy: -hours * 6, stress: hours * 2.5, happiness: -hours * 1.2 });
  const rate = round2((job.monthlySalary / 26 / 8) * 1.5);
  return [`${hours}h overtime logged: about ${formatRM(rate * hours)} extra on your next payslip.`];
}

/** Twice-yearly review: increments, promotions, or a warning / termination. */
export function performanceReview(state: GameState): void {
  const job = state.career.job;
  if (!job || job.schedule !== 'fulltime') return;
  const def = jobById(job.jobId)!;
  job.lastReviewDay = state.clock.day;
  const perf = job.performance;
  const tenureAtLevel = (state.clock.day - job.levelSinceDay) / 365;
  const mainSkill = Object.keys(def.skills)[0] as keyof typeof state.skills | undefined;
  const skillOk = !mainSkill || state.skills[mainSkill] >= (def.skills[mainSkill] ?? 0) + 12 * (job.level + 1);
  if (perf >= 75 && tenureAtLevel >= 1 && skillOk && job.level < def.ladder.length - 1) {
    job.level += 1;
    job.levelSinceDay = state.clock.day;
    job.title = def.ladder[job.level];
    job.monthlySalary = Math.round((job.monthlySalary * 1.15) / 50) * 50;
    state.career.promotions += 1;
    applyStats(state, { happiness: 12, reputation: 6, stress: 3 });
    log(state, 'milestone', `🚀 Promoted to ${job.title}! New salary ${formatRM(job.monthlySalary)}.`);
    highlight(state, `Promoted to ${job.title}`);
    playerPost(state, `Finally got promoted! ${job.title} 🙏`);
  } else if (perf >= 50) {
    const pct = perf >= 80 ? 0.07 : perf >= 65 ? 0.05 : 0.03;
    job.monthlySalary = Math.round((job.monthlySalary * (1 + pct)) / 10) * 10;
    log(state, 'milestone', `Performance review: rated ${perf >= 80 ? 'Excellent' : perf >= 65 ? 'Good' : 'Meets expectations'}. ${Math.round(pct * 100)}% increment to ${formatRM(job.monthlySalary)}.`);
    if (!skillOk && perf >= 75) log(state, 'system', 'Your manager says you need stronger core skills before a promotion.');
  } else if (perf >= 25) {
    log(state, 'warning', 'Performance review: "Needs improvement". No increment this cycle. HR is watching.');
    applyStats(state, { stress: 8, happiness: -5 });
  } else {
    applyStats(state, { stress: 12, happiness: -10, reputation: -5 });
    resign(state, 'After a poor review, your contract was not continued.');
  }
  if (state.career.job) state.career.job.performance = round2(clamp(perf * 0.85 + 50 * 0.15));
}

export const scheduleLabel: Record<JobSchedule, string> = {
  fulltime: 'Full-time, Mon-Fri',
  parttime: 'Part-time shifts',
  intern: 'Internship, Mon-Fri',
};