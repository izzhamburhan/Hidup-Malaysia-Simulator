// Read-only helpers for the dashboard: the current objective, suggested
// actions and upcoming commitments. Pure functions of GameState.

import { holidays } from '../data/holidays';
import { companyById } from '../data/companies';
import { dateOf, dayOfMonth, isLastDayOfMonth } from './calendar';
import { isWorkday } from './career';
import { CLASS_DAYS, isClassDay, semesterDay } from './education';
import { monthlyCommitmentTotal } from './economy';
import { formatRM } from './core';
import { foodById } from '../data/foods';
import { listingsByMatch } from './career';
import { currentHome } from './living';
import { actionById, type ActionView } from './actions';
import { describeAction } from './simulationEngine';
import { festiveSeason, greetReason } from './festive';
import type { GameState } from './types';

export interface Objective {
  icon: string;
  title: string;
  detail: string;
}

export function currentObjective(s: GameState): Objective {
  const hour = s.clock.minute / 60;
  if (s.flags.chapterOffered && !s.ending) return { icon: '📖', title: 'Your chapter is complete', detail: 'Open the life report to see your ending — or keep living.' };
  if (s.stats.energy < 15) return { icon: '😴', title: 'You are exhausted', detail: 'Sleep or nap before you pass out.' };
  if (s.stats.satiety < 20) return { icon: '🍛', title: 'Perut lapar!', detail: 'Eat something. Hunger drains energy and mood.' };
  const interview = s.career.applications.find((a) => a.status === 'interview' && a.interviewDay === s.clock.day);
  if (interview) return { icon: '🎤', title: `Interview today at ${companyById(interview.companyId)?.name}`, detail: 'Go to Life → Career and attend between 8 AM and 5 PM.' };
  const offer = s.career.applications.find((a) => a.status === 'offer');
  if (offer) return { icon: '📨', title: 'You have a job offer', detail: 'Review it in Life → Career: accept, negotiate or decline.' };
  const job = s.career.job;
  if (job && job.schedule !== 'parttime' && isWorkday(s) && !s.career.workedToday && hour < 11 && Number(s.flags.leaveUntil ?? -1) < s.clock.day) {
    return { icon: '💼', title: 'Workday', detail: 'Head to work before 11 AM, or take annual leave.' };
  }
  if (isClassDay(s) && !s.education.attendedToday && hour < 13) return { icon: '🏫', title: 'Classes today', detail: 'Attendance counts towards your GPA.' };
  if (s.education.status === 'studying' && s.education.assignmentsDone < s.education.assignmentsTotal) return { icon: '📝', title: 'Assignment pending', detail: 'Submit before exam week.' };
  if (!job && s.education.status !== 'studying' && s.character.lifeStage !== 'retired' && s.hustles.length === 0) {
    return { icon: '🔎', title: 'Find a job', detail: 'Browse the job board in Life → Career. Polish your CV first.' };
  }
  if (s.finance.debts.some((d) => d.kind === 'overdue')) return { icon: '🧾', title: 'Clear overdue debt', detail: 'Late charges are piling up. Pay it down in Money.' };
  if (s.finance.emergencyFund < 1000 && s.finance.cash > 1500) return { icon: '🛟', title: 'Build an emergency fund', detail: 'Move some cash into your emergency fund.' };
  if (hour >= 22) return { icon: '🌙', title: 'Getting late', detail: 'Sleep 7–8 hours to wake up fresh.' };
  if (s.challenges.active.length === 0) return { icon: '🎯', title: 'Pick a life challenge', detail: 'Choose up to three goals in Menu → Goals.' };
  return { icon: '✨', title: 'Live your life', detail: 'Work, rest, play — or let the routine run for a week.' };
}

export interface Upcoming {
  day: number;
  icon: string;
  label: string;
}

export function upcoming(s: GameState, horizon = 31): Upcoming[] {
  const out: Upcoming[] = [];
  const today = s.clock.day;
  for (let d = today; d <= today + horizon; d++) {
    if (dayOfMonth(s, d) === 1 && d !== today) out.push({ day: d, icon: '🧾', label: `Bills day: about ${formatRM(monthlyCommitmentTotal(s))}` });
    if (isLastDayOfMonth(s, d) && s.career.job && s.career.job.schedule !== 'parttime') out.push({ day: d, icon: '💰', label: 'Payday (gaji masuk)' });
    const date = dateOf(s.startDate, d);
    const h = holidays.find((x) => x.month === date.getUTCMonth() + 1 && x.day === date.getUTCDate());
    if (h) out.push({ day: d, icon: '🎉', label: h.name });
  }
  for (const a of s.career.applications) {
    if (a.status === 'interview' && a.interviewDay !== undefined && a.interviewDay >= today) out.push({ day: a.interviewDay, icon: '🎤', label: `Interview: ${companyById(a.companyId)?.name}` });
    if (a.status === 'pending') out.push({ day: a.respondDay, icon: '📧', label: `Reply expected: ${companyById(a.companyId)?.name}` });
  }
  if (s.education.status === 'studying') {
    const examDay = s.education.semesterStartDay + CLASS_DAYS;
    if (examDay >= today && examDay - today <= horizon + 14) out.push({ day: examDay, icon: '📝', label: `Semester ${s.education.semester} results` });
    const sd = semesterDay(s);
    if (sd >= CLASS_DAYS) out.push({ day: s.education.semesterStartDay + CLASS_DAYS + 14, icon: '🎒', label: 'Next semester starts' });
  }
  for (const e of s.events.scheduled) if (e.day - today <= horizon) out.push({ day: e.day, icon: '📌', label: 'Something is coming up…' });
  const lic = s.transport.licenceExpiryDay;
  if (s.transport.hasLicence && lic !== null && lic >= today && lic - today <= 30) out.push({ day: lic, icon: '🪪', label: 'Driving licence expires' });
  return out.sort((a, b) => a.day - b.day).slice(0, 8);
}

export type LifeTabId = 'career' | 'study' | 'food' | 'fitness' | 'people' | 'home' | 'transport' | 'hustle' | 'shop';

/**
 * Orders the Life screen's sub-tabs by relevance to what the player is doing right now.
 * Never removes a tab — every id in `ALL_LIFE_TABS` always comes back exactly once — so no
 * feature (enrolling, starting a hustle) ever becomes unreachable. Pure and read-only.
 */
export const ALL_LIFE_TABS: LifeTabId[] = ['career', 'study', 'food', 'fitness', 'people', 'home', 'transport', 'hustle', 'shop'];

export function rankLifeTabs(s: GameState): LifeTabId[] {
  const studying = s.education.status === 'studying';
  const jobless = !s.career.job && !studying && s.character.lifeStage !== 'retired';
  const score: Record<LifeTabId, number> = {
    career: jobless ? 100 : s.career.job ? 40 : 10,
    study: studying ? 95 : 5,
    food: s.stats.satiety < 50 ? 70 : 30,
    fitness: s.fitness.gymMember || s.fitness.streak > 0 ? 35 : 15,
    people: s.relationships.partner || s.relationships.prospects.length > 0 ? 45 : 25,
    home: 30,
    transport: s.career.job && !s.transport.vehicleId ? 55 : 20,
    hustle: s.hustles.length > 0 ? 50 : 8,
    shop: 12,
  };
  return [...ALL_LIFE_TABS].sort((a, b) => score[b] - score[a]);
}

/** Up to four suggested action ids for the dashboard, based on time and needs. */
export function suggestedActions(s: GameState): { id: string; param?: string }[] {
  const hour = s.clock.minute / 60;
  const out: { id: string; param?: string }[] = [];
  if (s.stats.satiety < 50) out.push({ id: 'eat', param: hour < 11 ? 'nasi-lemak' : 'nasi-campur' });
  if (s.career.job && !s.career.workedToday) out.push({ id: 'work-shift' });
  if (isClassDay(s) && !s.education.attendedToday) out.push({ id: 'attend-class' });
  if (s.career.workedToday && s.career.job?.schedule === 'fulltime' && hour >= 16 && hour < 23) out.push({ id: 'overtime', param: '2' });
  if (hour >= 17 && hour < 23) out.push(s.fitness.gymMember ? { id: 'gym' } : { id: 'run' });
  if (hour >= 18) out.push({ id: 'mamak' });
  if (hour >= 21 || hour < 5) out.push({ id: 'sleep', param: '8' });
  if (s.relationships.partner && s.relationships.partner.lastContactDay < s.clock.day) out.push({ id: 'chat-partner' });
  out.push({ id: 'water' });
  out.push({ id: 'chill' });
  const seen = new Set<string>();
  return out.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true))).slice(0, 4);
}

// ---------------- One-tap play ----------------

function view(s: GameState, id: string, param?: string): ActionView | null {
  const def = actionById(id);
  if (!def || (def.visible && !def.visible(s))) return null;
  const v = describeAction(s, def, param);
  // Meals show the dish's own emoji instead of the generic plate.
  const food = id === 'eat' ? foodById(param?.split(':')[0]) : undefined;
  return food ? { ...v, icon: food.icon } : v;
}

/** A sensible meal for the time of day (first one that is available). */
export function mealFor(s: GameState): ActionView | null {
  const hour = s.clock.minute / 60;
  const home = currentHome(s);
  const options = [
    ...(home.familyHome ? ['mak-cooking'] : []),
    ...(hour < 11 ? ['nasi-lemak', 'roti-canai'] : hour < 16 ? ['nasi-campur', 'chicken-rice'] : ['nasi-campur', 'mee-goreng', 'chicken-rice']),
    ...(home.kitchen ? ['home-cooked'] : []),
    'maggi',
  ];
  let fallback: ActionView | null = null;
  for (const id of options) {
    const v = view(s, 'eat', id);
    if (v?.available) return v;
    fallback ??= v;
  }
  return fallback;
}

/** The best open job listing the player can apply for (highest match). */
export function bestListing(s: GameState): ActionView | null {
  for (const l of listingsByMatch(s)) {
    const v = view(s, 'apply-job', l.id);
    if (v?.available) return v;
  }
  return null;
}

const usable = (v: ActionView | null | undefined): v is ActionView => !!v && v.available;

/** The single most sensible action right now, for the big play button. */
export function primaryAction(s: GameState): ActionView | null {
  if (s.events.pending.length || s.ending) return null;
  const hour = s.clock.minute / 60;
  const pick = (...vs: (ActionView | null | undefined)[]) => vs.find(usable) ?? null;
  if (s.stats.energy < 15) {
    const rest = pick(view(s, 'sleep', '8'), view(s, 'nap'));
    if (rest) return rest;
  }
  if (s.stats.satiety < 25) {
    const meal = mealFor(s);
    if (usable(meal)) return meal;
  }
  const interview = s.career.applications.find((a) => a.status === 'interview' && a.interviewDay === s.clock.day);
  if (interview) {
    const v = view(s, 'attend-interview', interview.id);
    if (usable(v)) return v;
  }
  const offer = s.career.applications.find((a) => a.status === 'offer');
  if (offer) {
    const v = view(s, 'accept-offer', offer.id);
    if (usable(v)) return v;
  }
  const work = pick(view(s, 'work-shift'), view(s, 'attend-class'));
  if (work) return work;
  if (hour >= 22 || hour < 5) {
    const bed = pick(view(s, 'sleep', '8'), view(s, 'sleep', '7'));
    if (bed) return bed;
  }
  if (s.stats.satiety < 50) {
    const meal = mealFor(s);
    if (usable(meal)) return meal;
  }
  const studying = s.education.status === 'studying';
  if (studying) {
    const study = pick(view(s, 'assignment'), view(s, 'fyp'));
    if (study) return study;
  }
  if (!s.career.job && !studying && s.character.lifeStage !== 'retired') {
    if (s.hustles.length) {
      const h = view(s, 'work-hustle', s.hustles[0].id);
      if (usable(h)) return h;
    }
    const pending = s.career.applications.filter((a) => a.status === 'pending' || a.status === 'interview').length;
    if (pending < 3) {
      const apply = bestListing(s);
      if (apply) return apply;
    }
  }
  return null;
}

/** Up to six one-tap tiles for the play screen, available ones first. */
export function quickActions(s: GameState): ActionView[] {
  const hour = s.clock.minute / 60;
  const studying = s.education.status === 'studying';
  const candidates: (ActionView | null)[] = [
    festiveSeason(s) && !greetReason(s) ? view(s, 'festive-greet') : null,
    mealFor(s),
    s.pet && s.pet.fullness < 50 ? view(s, 'feed-pet') : null,
    s.career.job ? view(s, 'work-shift') : null,
    studying ? view(s, 'attend-class') : null,
    studying ? view(s, 'study', '2') : null,
    !s.career.job && !studying ? bestListing(s) ?? view(s, 'update-cv') : null,
    s.hustles.length ? view(s, 'work-hustle', s.hustles[0].id) : null,
    s.career.workedToday && s.career.job?.schedule === 'fulltime' ? view(s, 'overtime', '2') : null,
    s.fitness.gymMember ? view(s, 'gym') : view(s, 'run'),
    s.relationships.partner ? view(s, 'chat-partner') : hour >= 17 ? view(s, 'mamak') : view(s, 'call-friend'),
    hour >= 20 || hour < 6 ? view(s, 'sleep', '8') : view(s, 'nap'),
    view(s, 'water'),
    view(s, 'chill'),
    view(s, 'call-parents'),
    view(s, 'mobile-gaming'),
  ];
  const seen = new Set<string>();
  const unique = candidates.filter((v): v is ActionView => {
    if (!v) return false;
    const key = `${v.id}:${v.param ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...unique.filter((v) => v.available), ...unique.filter((v) => !v.available)].slice(0, 6);
}