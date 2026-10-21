// Education: semesters, classes, assignments, exams, CGPA, FYP and graduation.
// A semester is 14 weeks of classes followed by a 2-week break (game pacing).

import { backgroundById } from '../data/backgrounds';
import { courseById } from '../data/courses';
import { universityById } from '../data/universities';
import { addDebt, addSkills, applyStats, clamp, earn, formatRM, highlight, log, playerPost, round2, spend } from './core';
import { isWeekend } from './calendar';
import { isHoliday } from './holidays';
import { lunchBreak } from './career';
import { randRange } from './rng';
import type { GameState } from './types';

export const CLASS_DAYS = 98;
export const BREAK_DAYS = 14;
export const SEMESTER_CYCLE = CLASS_DAYS + BREAK_DAYS;
export const ASSIGNMENTS_PER_SEMESTER = 4;
export const PTPTN_LIVING_ALLOWANCE = 3000;
export const PTPTN_TUITION_CAP = 4000;

export function semesterDay(state: GameState, day = state.clock.day): number {
  return day - state.education.semesterStartDay;
}

export function inSemester(state: GameState, day = state.clock.day): boolean {
  if (state.education.status !== 'studying') return false;
  const d = semesterDay(state, day);
  return d >= 0 && d < CLASS_DAYS;
}

export function isClassDay(state: GameState, day = state.clock.day): boolean {
  return inSemester(state, day) && !isWeekend(state, day) && !isHoliday(state, day);
}

export function isFinalSemester(state: GameState): boolean {
  return state.education.semester >= state.education.totalSemesters;
}

export function enroll(state: GameState, universityId: string, courseId: string, startSemester = 1): void {
  const course = courseById(courseId)!;
  const e = state.education;
  e.status = 'studying';
  e.universityId = universityId;
  e.courseId = courseId;
  e.field = course.field;
  e.totalSemesters = course.semesters;
  e.semester = Math.min(Math.max(1, startSemester), course.semesters);
  e.semesterStartDay = state.clock.day;
  e.gpaHistory = [];
  for (let i = 1; i < e.semester; i++) e.gpaHistory.push(3.0);
  e.cgpa = e.gpaHistory.length ? 3.0 : 0;
  resetSemester(state);
  chargeTuition(state);
}

function resetSemester(state: GameState): void {
  const e = state.education;
  e.classesHeld = 0;
  e.classesAttended = 0;
  e.assignmentsDone = 0;
  e.assignmentsTotal = 0;
  e.knowledge = 10;
  e.attendedToday = false;
}

export function tuitionFor(state: GameState): number {
  return universityById(state.education.universityId)?.tuitionPerSemester ?? 0;
}

/** Charge the semester's tuition: scholarship, PTPTN-style loan (fictional terms) or cash. */
export function chargeTuition(state: GameState): void {
  const fee = tuitionFor(state);
  const bg = backgroundById(state.character.backgroundId);
  if (state.education.scholarship) {
    earn(state, 1200);
    log(state, 'money', `Scholarship covered ${formatRM(fee)} tuition and paid a ${formatRM(1200)} semester allowance.`);
    return;
  }
  if (bg.id === 'connected' || bg.id === 'middle') {
    log(state, 'money', `Family paid this semester's ${formatRM(fee)} tuition. Study hard, they said. Twice.`);
    return;
  }
  const covered = Math.min(fee, PTPTN_TUITION_CAP);
  addDebt(state, 'ptptn', 'Study loan (PTPTN-style, fictional terms)', covered + PTPTN_LIVING_ALLOWANCE, 0, 0.01);
  earn(state, PTPTN_LIVING_ALLOWANCE);
  const rest = fee - covered;
  if (rest > 0) spend(state, rest, 'tuition balance', true);
  log(state, 'money', `Study loan disbursed: ${formatRM(covered)} for fees + ${formatRM(PTPTN_LIVING_ALLOWANCE)} living allowance.${rest > 0 ? ` You paid the ${formatRM(rest)} balance.` : ''}`);
}

export function attendClass(state: GameState): string[] {
  const e = state.education;
  const course = courseById(e.courseId)!;
  const uni = universityById(e.universityId);
  const bonus = uni?.strengths.includes(course.field) ? 1.15 : 1;
  const focus = state.stats.energy < 30 || state.flags.tiredDay === state.clock.day ? 0.5 : 1;
  e.classesAttended += 1;
  e.attendedToday = true;
  e.knowledge = round2(clamp(e.knowledge + 2.2 * focus));
  addSkills(state, course.skills, 0.5 * bonus * focus);
  applyStats(state, { energy: -14, stress: 2, satiety: -10 });
  const lines = [lunchBreak(state, 6, 'Cafeteria lunch')];
  if (focus < 1) lines.push('You nodded off in the lecture hall. Half the notes are just "?".');
  return lines;
}

export function study(state: GameState, hours: number): string[] {
  const e = state.education;
  const course = courseById(e.courseId)!;
  const focus = state.stats.energy < 30 ? 0.5 : 1;
  e.knowledge = round2(clamp(e.knowledge + (hours * 2.6 * focus) / course.difficulty));
  addSkills(state, course.skills, 0.35 * hours * focus);
  applyStats(state, { energy: -hours * 6, stress: hours * 1.5 });
  return [];
}

export function doAssignment(state: GameState): string[] {
  const e = state.education;
  e.assignmentsDone = Math.min(e.assignmentsTotal, e.assignmentsDone + 1);
  e.knowledge = round2(clamp(e.knowledge + 2));
  addSkills(state, courseById(e.courseId)!.skills, 0.5);
  applyStats(state, { energy: -12, stress: 4 });
  return [`Assignment submitted (${e.assignmentsDone}/${ASSIGNMENTS_PER_SEMESTER}).`];
}

export function workOnFyp(state: GameState): string[] {
  const e = state.education;
  e.fypProgress = round2(clamp(e.fypProgress + 8 + state.skills.tech / 25));
  addSkills(state, courseById(e.courseId)!.skills, 0.6);
  applyStats(state, { energy: -15, stress: 5 });
  return [`Final-year project at ${Math.round(e.fypProgress)}%.`];
}

/** Semester-level GPA formula (game rule). */
export function computeGpa(state: GameState, noise = 0): number {
  const e = state.education;
  const course = courseById(e.courseId)!;
  const attendance = e.classesHeld > 0 ? Math.min(1, e.classesAttended / e.classesHeld) : 1;
  const assignments = e.assignmentsDone / ASSIGNMENTS_PER_SEMESTER;
  const knowledge = Math.min(1, e.knowledge / (70 * course.difficulty));
  let score = 0.45 * knowledge + 0.25 * attendance + 0.3 * assignments;
  if (isFinalSemester(state)) score = score * 0.7 + 0.3 * (e.fypProgress / 100);
  return round2(clamp(score * 4.2 + noise - 0.2, 0, 4));
}

/** Day-start processing for students. */
export function processEducationDay(state: GameState): void {
  const e = state.education;
  if (e.status !== 'studying') return;
  const d = semesterDay(state);
  // Assignments are released at weeks 2, 5, 8, 11.
  if ([7, 28, 49, 70].includes(d)) {
    e.assignmentsTotal = Math.min(ASSIGNMENTS_PER_SEMESTER, e.assignmentsTotal + 1);
    log(state, 'event', `📚 Assignment ${e.assignmentsTotal} released. Due before exams.`);
  }
  if (d === CLASS_DAYS - 7) log(state, 'warning', '📅 Final exams next week. Time to actually open the notes.');
  if (d === CLASS_DAYS) finishSemester(state);
  if (d === SEMESTER_CYCLE) startNextSemester(state);
}

function finishSemester(state: GameState): void {
  const e = state.education;
  const gpa = computeGpa(state, randRange(state, -0.2, 0.2));
  e.gpaHistory.push(gpa);
  e.cgpa = round2(e.gpaHistory.reduce((a, b) => a + b, 0) / e.gpaHistory.length);
  log(state, 'milestone', `📝 Semester ${e.semester} results: GPA ${gpa.toFixed(2)}, CGPA ${e.cgpa.toFixed(2)}.`);
  highlight(state, `Semester GPA ${gpa.toFixed(2)}`);
  if (gpa >= 3.67) {
    applyStats(state, { happiness: 10, reputation: 4 });
    log(state, 'milestone', "Dean's List! 🏅 Your family group chat is very proud.");
    state.flags.deansList = Number(state.flags.deansList ?? 0) + 1;
  } else if (gpa < 2) {
    applyStats(state, { happiness: -8, stress: 10 });
  }
  if (state.education.scholarship && e.cgpa < 3.0) {
    state.education.scholarship = false;
    log(state, 'warning', 'Your CGPA fell below the scholarship requirement (game rule: 3.00). Scholarship suspended.');
  }

  if (isFinalSemester(state)) {
    if (e.cgpa >= 2 && e.fypProgress >= 60) {
      graduate(state);
    } else {
      log(state, 'warning', e.fypProgress < 60 ? 'Final-year project incomplete. You need an extra semester.' : 'CGPA below 2.00. You need an extra semester to pull it up.');
      state.flags.extendedSemesters = Number(state.flags.extendedSemesters ?? 0) + 1;
      e.totalSemesters += 1;
    }
  } else if (gpa < 2) {
    const probation = Number(state.flags.probation ?? 0) + 1;
    state.flags.probation = probation;
    log(state, 'warning', `Academic probation (${probation}). Repeat this semester's workload next semester.`);
    e.totalSemesters += 1;
  } else {
    state.flags.probation = 0;
  }
}

function startNextSemester(state: GameState): void {
  const e = state.education;
  if (e.status !== 'studying') return;
  e.semester += 1;
  e.semesterStartDay = state.clock.day;
  resetSemester(state);
  log(state, 'event', `🎒 Semester ${e.semester} of ${e.totalSemesters} begins.`);
  chargeTuition(state);
}

export function graduate(state: GameState): void {
  const e = state.education;
  leaveHostel(state);
  const course = courseById(e.courseId)!;
  e.status = 'graduated';
  e.qualification = course.level === 'degree' ? 'degree' : 'diploma';
  if (state.character.lifeStage === 'student') state.character.lifeStage = 'fresh_grad';
  const loan = state.finance.debts.find((d) => d.kind === 'ptptn');
  if (loan) loan.monthlyPayment = Math.max(120, Math.round(loan.balance / 120));
  applyStats(state, { happiness: 20, reputation: 8 });
  log(state, 'milestone', `🎓 Graduated: ${course.name}, CGPA ${e.cgpa.toFixed(2)}!`);
  highlight(state, 'Graduation day!');
  playerPost(state, `Officially a graduate! ${course.name} done 🎓 Thank you Mak, Abah and everyone.`);
}

/** Hostel places end with studies; the player moves back home. */
function leaveHostel(state: GameState): void {
  if (state.housing.optionId !== 'hostel') return;
  state.housing = { optionId: 'family', sinceDay: state.clock.day, depositHeld: 0, ownedPropertyId: null };
  log(state, 'event', 'You moved out of the campus hostel and back home with family.');
}

export function dropOut(state: GameState): void {
  const e = state.education;
  leaveHostel(state);
  e.status = 'dropped';
  const loan = state.finance.debts.find((d) => d.kind === 'ptptn');
  if (loan) loan.monthlyPayment = Math.max(120, Math.round(loan.balance / 120));
  if (state.character.lifeStage === 'student') state.character.lifeStage = 'working';
  applyStats(state, { stress: -10, happiness: -5 });
  state.relationships.family = clamp(state.relationships.family - 10);
  log(state, 'event', 'You left university. Not the end - just a different road.');
}
