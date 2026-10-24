// Day boundary processing: end-of-day consequences and start-of-day schedules
// (bills, payday, holidays, classes, applications, reviews, scheduled events).

import { holidayStartingOn } from '../data/holidays';
import { applyStats, clamp, highlight, log, round2 } from './core';
import { dateOf, isLastDayOfMonth } from './calendar';
import { isWorkday, onLeave, performanceReview, processApplications, refreshListings, REVIEW_INTERVAL_DAYS } from './career';
import { isClassDay, processEducationDay } from './education';
import { processMonthStart, processNewYear, runPayroll } from './economy';
import { processScheduledEvents, queueEvent } from './events';
import { dailyRelationships, generateFeedPosts } from './social';
import { staffDay } from './business';
import { petDayEnd } from './pet';
import type { GameState } from './types';

export const BASE_DAILY_BURN = 1900;

export function processDayEnd(state: GameState): void {
  const day = state.clock.day;

  // Absence: a scheduled workday with no shift and no leave.
  const job = state.career.job;
  if (job && job.schedule !== 'parttime' && isWorkday(state, day) && !state.career.workedToday && !onLeave(state, day) && day > job.startDay) {
    job.absencesThisMonth += 1;
    job.performance = round2(clamp(job.performance - 7));
    applyStats(state, { stress: 4, reputation: -2 });
    log(state, 'warning', 'You skipped work today without leave. Unpaid absence recorded; your manager noticed.');
    highlight(state, 'Unrecorded absence at work');
  }

  // Students: every class day counts toward attendance.
  if (isClassDay(state, day)) {
    state.education.classesHeld += 1;
    if (!state.education.attendedToday) highlight(state, 'Skipped class');
  }

  // Food and calorie summary (estimates only).
  const food = state.food;
  food.caloriesOut = round2(food.caloriesOut + BASE_DAILY_BURN);
  food.history.unshift({ day, caloriesIn: Math.round(food.caloriesIn), caloriesOut: Math.round(food.caloriesOut), water: food.water });
  if (food.history.length > 30) food.history.length = 30;
  const meals = food.today.length;
  if (food.caloriesIn < 1100 && meals < 2) applyStats(state, { health: -1.5, happiness: -1 });
  if (food.caloriesIn > 3300) applyStats(state, { health: -1 });
  if (food.water >= 6) applyStats(state, { health: 0.6 });

  petDayEnd(state);

  // Fitness slowly fades without exercise; health follows lifestyle.
  if (!state.today.exercised) {
    const last = state.fitness.lastWorkoutDay;
    if (last === null || day - last >= 3) applyStats(state, { fitness: -0.6 });
  }
  if (state.fitness.lastWorkoutDay !== null && day - state.fitness.lastWorkoutDay > 2) state.fitness.streak = 0;
  if (state.stats.stress > 80) {
    state.counters.daysHighStress += 1;
    applyStats(state, { health: -1, happiness: -1 });
  }
  if (state.stats.fitness > 60) applyStats(state, { health: 0.4 });
  // Moods drift back toward a baseline so no single habit maxes them out.
  const stressBase =
    15 +
    (job?.schedule === 'fulltime' ? 12 : job ? 5 : 0) +
    (state.education.status === 'studying' ? 8 : 0) +
    (state.finance.debts.some((d) => d.kind === 'overdue') ? 10 : 0);
  const healthBase = 55 + state.stats.fitness * 0.4;
  applyStats(state, {
    // Small daily frictions (chores, queues, notifications) plus drift toward 58.
    happiness: (58 - state.stats.happiness) * 0.15 - 2.5,
    stress: (stressBase - state.stats.stress) * 0.08,
    health: (healthBase - state.stats.health) * 0.04,
  });
  const stage = state.character.lifeStage;
  if (!state.career.job && state.education.status !== 'studying' && stage !== 'retired' && stage !== 'entrepreneur' && state.hustles.length === 0) {
    // Job-hunting pressure (family asks "dah dapat kerja?").
    applyStats(state, { stress: 1.2, happiness: -0.8 });
  }
  if (!state.today.socialised && state.relationships.friends > 20) state.relationships.friends = round2(clamp(state.relationships.friends - 0.3));

  dailyRelationships(state);
  staffDay(state);

  // Burnout check: sustained stress plus poor health.
  if (state.stats.stress >= 92 && state.stats.health < 40 && !state.events.pending.some((p) => p.eventId === 'burnout')) {
    queueEvent(state, 'burnout');
  }

  state.dayReports.unshift({
    day,
    earned: state.today.earned,
    spent: state.today.spent,
    caloriesIn: Math.round(food.caloriesIn),
    caloriesOut: Math.round(food.caloriesOut),
    sleepHours: round2(state.lastSleepMinutes / 60),
    highlights: [...state.today.highlights],
    statsEnd: { ...state.stats },
  });
  if (state.dayReports.length > 14) state.dayReports.length = 14;
}

export function processDayStart(state: GameState): void {
  const day = state.clock.day;
  state.today = { earned: 0, spent: 0, sleepMinutes: 0, highlights: [], exercised: false, socialised: false };
  state.food.today = [];
  state.food.caloriesIn = 0;
  state.food.caloriesOut = 0;
  state.food.water = 0;
  state.career.workedToday = false;
  state.education.attendedToday = false;

  const date = dateOf(state.startDate, day);
  const month = date.getUTCMonth() + 1;
  const dom = date.getUTCDate();

  if (month === 1 && dom === 1) processNewYear(state);
  if (dom === 1) processMonthStart(state);

  const holiday = holidayStartingOn(month, dom);
  if (holiday) {
    log(state, 'event', `🎉 ${holiday.name}: ${holiday.greeting}`);
    highlight(state, holiday.name);
    if (holiday.eventId) queueEvent(state, holiday.eventId);
    if (holiday.festive) state.counters.festivals += 1;
  }

  processEducationDay(state);
  processApplications(state);
  if (day - state.career.listingsRefreshedDay >= 7) refreshListings(state);

  const job = state.career.job;
  if (job && job.schedule === 'fulltime' && day - job.lastReviewDay >= REVIEW_INTERVAL_DAYS) performanceReview(state);

  // Driving licence renewal reminders (civic system).
  const lic = state.transport.licenceExpiryDay;
  if (state.transport.hasLicence && lic !== null && lic - day === 14) log(state, 'warning', '🪪 Your driving licence expires in 2 weeks. Renew it at the counter or online.');
  if (state.transport.hasLicence && lic !== null && lic === day) {
    log(state, 'warning', '🪪 Your driving licence has expired. Driving now risks a summons.');
  }

  if (isLastDayOfMonth(state, day)) runPayroll(state, day);

  // Safety net: when the wallet is empty, family, friends or gigs can help.
  const lastBroke = state.events.cooldowns.broke;
  if (state.finance.cash < 15 && (lastBroke === undefined || day - lastBroke >= 10) && !state.events.pending.some((p) => p.eventId === 'broke')) {
    queueEvent(state, 'broke');
  }

  generateFeedPosts(state);
  processScheduledEvents(state);
}