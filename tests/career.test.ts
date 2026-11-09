import { describe, expect, it } from 'vitest';
import { acceptOffer, boardListings, jobEligibility, showStudentJobHint, performanceReview, processApplications, refreshListings, resolveInterview } from '../src/engine/career';
import { companyById } from '../src/data/companies';
import { jobById } from '../src/data/jobs';
import { eventById, isEligible, queueEvent } from '../src/engine/events';
import { isWeekend } from '../src/engine/calendar';
import { isClassDay } from '../src/engine/education';
import { performAction, currentEvent, resolveEvent, viewAction } from '../src/engine/simulationEngine';
import type { GameState } from '../src/engine/types';
import { at, makeGame } from './helpers';

describe('career', () => {
  it('flags missing requirements honestly', () => {
    const s = makeGame({ courseId: 'acc' });
    const ai = jobEligibility(s, jobById('ai-eng')!);
    expect(ai.ok).toBe(false);
    expect(ai.missing.join(' ')).toMatch(/experience|Skills/);
    const admin = jobEligibility(s, jobById('admin')!);
    expect(admin.ok).toBe(true);
  });

  it('students cannot take full-time roles', () => {
    const s = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs' });
    expect(jobEligibility(s, jobById('swe')!).ok).toBe(false);
    expect(jobEligibility(s, jobById('barista')!).ok).toBe(true);
  });

  it('goes from application to interview to offer to a job', () => {
    // Seed chosen so the job-board fill and the interview roll land on the expected branch;
    // this test fixes app.score to 100 but a roll above 90 can still reject (see career.ts).
    let s = makeGame({ seed: 1 });
    s.career.listings = [];
    refreshListings(s);
    const listing = s.career.listings[0];
    let r = performAction(s, 'apply-job', listing.id);
    expect(r.feedback.ok).toBe(true);
    s = r.state;
    const app = s.career.applications[0];
    expect(app.status).toBe('pending');
    app.score = 100;
    s.clock.day = app.respondDay;
    processApplications(s);
    expect(app.status).toBe('interview');
    app.score = 100;
    const text = resolveInterview(s, app.id, 'star');
    expect(text).toMatch(/offer/);
    expect(app.status).toBe('offer');
    acceptOffer(s, app.id);
    expect(s.career.job?.jobId).toBe(listing.jobId);
    r = performAction(s, 'water');
    expect(r.feedback.ok).toBe(true);
  });

  it('runs the interview as an event with player choices', () => {
    const s = makeGame();
    s.clock.minute = 9 * 60;
    s.career.applications.push({ id: 'a1', listingId: 'x', jobId: 'admin', companyId: 'tm', appliedDay: 0, respondDay: 0, status: 'interview', interviewDay: 0, offerSalary: 2500, score: 95 });
    const r = performAction(s, 'attend-interview', 'a1');
    expect(r.feedback.ok).toBe(true);
    const ev = currentEvent(r.state)!;
    expect(ev.eventId).toBe('interview');
    const chaos = ev.choices.find((c) => c.id === 'chaos');
    expect(chaos?.disabledReason).toBeTruthy(); // realistic mode
    const done = resolveEvent(r.state, 'star');
    expect(done.feedback.ok).toBe(true);
    expect(['offer', 'rejected']).toContain(done.state.career.applications.find((a) => a.id === 'a1')!.status);
  });

  it('promotes strong performers after a year at their level', () => {
    const s = makeGame({ lifeStage: 'working', jobId: 'swe' });
    const job = s.career.job!;
    job.performance = 90;
    job.levelSinceDay = -400;
    s.skills.tech = 90;
    const salary = job.monthlySalary;
    performanceReview(s);
    expect(s.career.job!.level).toBe(1);
    expect(s.career.job!.monthlySalary).toBeGreaterThan(salary);
    expect(s.career.promotions).toBe(1);
  });

  it('gives increments to average performers and lets go of very poor ones', () => {
    const s = makeGame({ lifeStage: 'working', jobId: 'swe' });
    s.career.job!.performance = 60;
    const salary = s.career.job!.monthlySalary;
    performanceReview(s);
    expect(s.career.job!.monthlySalary).toBeGreaterThan(salary);
    s.career.job!.performance = 10;
    performanceReview(s);
    expect(s.career.job).toBeNull();
  });
});

describe('student part-time', () => {
  it('adds three student-friendly part-time jobs', () => {
    for (const [id, pay, hours] of [['bookshop-assistant', 45, 4], ['event-crew', 65, 5], ['promoter', 60, 5]] as const) {
      const job = jobById(id);
      expect(job, id).toBeTruthy();
      expect(job!.schedule).toBe('parttime');
      expect(job!.studentFriendly).toBe(true);
      expect(job!.shiftPay).toBe(pay);
      expect(job!.shiftHours).toBe(hours);
    }
    const s = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs' });
    expect(jobEligibility(s, jobById('promoter')!).ok).toBe(true);
  });
  it('a student with no job sees at least 2 part-time listings after a refresh', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const s = makeGame({ seed, lifeStage: 'student', universityId: 'um', courseId: 'cs' });
      s.career.listings = [];
      refreshListings(s);
      const parttime = s.career.listings.filter((l) => jobById(l.jobId)!.schedule === 'parttime');
      expect(parttime.length, `seed ${seed}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('tops up a board that is full of other roles with part-time listings', () => {
    const s = makeGame({ seed: 3, lifeStage: 'student', universityId: 'um', courseId: 'cs' });
    s.career.listings = Array.from({ length: 12 }, (_, i) => ({ id: `lst-x${i}`, jobId: 'ba', companyId: 'maybank', salary: 3000, postedDay: 0, expiresDay: 99 }));
    refreshListings(s);
    const parttime = s.career.listings.filter((l) => jobById(l.jobId)!.schedule === 'parttime');
    expect(parttime.length).toBeGreaterThanOrEqual(2);
    const keys = s.career.listings.map((l) => `${l.jobId}@${l.companyId}`);
    expect(new Set(keys).size).toBe(keys.length - 11); // the 12 hand-made rows share one key; no other duplicates
  });

  it('does not add part-time listings once the student has a job', () => {
    const s = makeGame({ seed: 3, lifeStage: 'student', universityId: 'um', courseId: 'cs' });
    s.career.job = { jobId: 'barista', companyId: 'startup', title: 'Barista', schedule: 'parttime', monthlySalary: 0, shiftPay: 60, level: 0, startDay: 0, levelSinceDay: 0, performance: 50, lastReviewDay: 0, overtimeHoursThisMonth: 0, daysWorkedThisMonth: 0, absencesThisMonth: 0 };
    s.career.listings = Array.from({ length: 12 }, (_, i) => ({ id: `lst-x${i}`, jobId: 'ba', companyId: 'maybank', salary: 3000, postedDay: 0, expiresDay: 99 }));
    refreshListings(s);
    expect(s.career.listings).toHaveLength(12);
  });

  it("a working adult's board is unchanged by the guarantee", () => {
    // Job ids and employers taken before the guarantee was added (with the three new jobs in the catalogue).
    const expected: Record<number, string[]> = {
      11: ['teacher@sekolah', 'process-eng@intel', 'customer-service@zus', 'data-sci@infineon', 'elec-eng@intel', 'pharmacist@sekolah', 'store-supervisor@agency'],
      22: ['it-support@publicbank', 'ai-eng@maybank', 'maintenance-tech@petronas', 'elec-eng@infineon', 'physiotherapist@klinik', 'accountant@maybank', 'mech-eng@mas'],
      33: ['customer-service@airasia', 'intern-tech@tm', 'pm@startup', 'maintenance-tech@infineon', 'network-eng@tm', 'cloud-eng@carsome', 'hr@zus'],
    };
    for (const [seed, board] of Object.entries(expected)) {
      const s = makeGame({ seed: Number(seed), lifeStage: 'working', jobId: 'swe' });
      s.career.listings = [];
      refreshListings(s);
      expect(s.career.listings.map((l) => `${l.jobId}@${l.companyId}`)).toEqual(board);
    }
  });
  describe('shifts and classes', () => {
    function studentWorker(): GameState {
      const s = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs' });
      s.career.job = { jobId: 'barista', companyId: 'startup', title: 'Part-time Barista', schedule: 'parttime', monthlySalary: 0, shiftPay: 60, level: 0, startDay: 0, levelSinceDay: 0, performance: 50, lastReviewDay: 0, overtimeHoursThisMonth: 0, daysWorkedThisMonth: 0, absencesThisMonth: 0 };
      s.stats.energy = 90;
      return s;
    }
    const findDay = (test: (day: number) => boolean) => {
      for (let d = 0; d < 60; d++) if (test(d)) return d;
      throw new Error('no such day');
    };
    const classDay = (s: GameState) => findDay((d) => isClassDay(s, d));
    const weekendDay = (s: GameState) => findDay((d) => isWeekend(s, d));

    it('student with a part-time job cannot shift on a class day before attending', () => {
      const s = at(studentWorker(), 0, 9);
      s.clock.day = classDay(s);
      const v = viewAction(s, 'work-shift')!;
      expect(v.available).toBe(false);
      expect(v.reason).toBe('You have class today. Attend first, shift after.');
      expect(performAction(s, 'work-shift').feedback.ok).toBe(false);
    });

    it('can shift after attending class', () => {
      const s = at(studentWorker(), 0, 9);
      s.clock.day = classDay(s);
      s.education.attendedToday = true;
      expect(viewAction(s, 'work-shift')!.available).toBe(true);
    });

    it('can shift on a class day once it is 5PM or later', () => {
      const s = at(studentWorker(), 0, 17);
      s.clock.day = classDay(s);
      expect(viewAction(s, 'work-shift')!.available).toBe(true);
    });

    it('can shift at 6PM', () => {
      const s = at(studentWorker(), 0, 18);
      s.clock.day = weekendDay(s);
      expect(viewAction(s, 'work-shift')!.available).toBe(true);
    });

    it('shift at 8PM is unavailable with the window reason', () => {
      const s = at(studentWorker(), 0, 20);
      s.clock.day = weekendDay(s);
      const v = viewAction(s, 'work-shift')!;
      expect(v.available).toBe(false);
      expect(v.reason).toBe('Shifts start 8AM–7PM.');
    });

    it('a shift that would end after 2AM is unavailable, and one that ends in time is fine', () => {
      const late = at(studentWorker(), 0, 19);
      late.clock.day = weekendDay(late);
      late.clock.minute = 18 * 60 + 59;
      const v = viewAction(late, 'work-shift')!;
      expect(v.available).toBe(false);
      expect(v.reason).toBe('Too late: this shift would end after 2AM.');
      const fits = at(studentWorker(), 0, 15);
      fits.clock.day = weekendDay(fits);
      const ok = viewAction(fits, 'work-shift')!;
      expect(ok.available).toBe(true);
      expect(fits.clock.minute + ok.minutes).toBeLessThanOrEqual(26 * 60);
    });

    it('a weekend shift has no class rule', () => {
      const s = at(studentWorker(), 0, 9);
      s.clock.day = weekendDay(s);
      expect(s.education.attendedToday).toBe(false);
      expect(viewAction(s, 'work-shift')!.available).toBe(true);
    });

    it('a working adult is not held back by the class rule', () => {
      const s = at(makeGame({ lifeStage: 'working', jobId: 'swe' }), 0, 9);
      s.career.job!.schedule = 'parttime';
      s.career.job!.shiftPay = 60;
      s.stats.energy = 90;
      expect(viewAction(s, 'work-shift')!.available).toBe(true);
    });

    it('studentShifts counts shifts worked while studying', () => {
      let s = at(studentWorker(), 0, 9);
      s.clock.day = weekendDay(s);
      expect(Number(s.flags.studentShifts ?? 0)).toBe(0);
      s = performAction(s, 'work-shift').state;
      expect(s.flags.studentShifts).toBe(1);
      const adult = at(makeGame({ lifeStage: 'working', jobId: 'swe' }), 0, 9);
      adult.career.job!.schedule = 'parttime';
      adult.career.job!.shiftPay = 60;
      adult.stats.energy = 90;
      expect(performAction(adult, 'work-shift').state.flags.studentShifts).toBeUndefined();
    });
  });
  describe('cover-shift event', () => {
    function studentWithShifts(): GameState {
      const s = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs' });
      s.career.job = { jobId: 'barista', companyId: 'startup', title: 'Part-time Barista', schedule: 'parttime', monthlySalary: 0, shiftPay: 60, level: 0, startDay: 0, levelSinceDay: 0, performance: 50, lastReviewDay: 0, overtimeHoursThisMonth: 0, daysWorkedThisMonth: 0, absencesThisMonth: 0 };
      return s;
    }

    it('is eligible only for a studying player with a part-time job, once per 21 days', () => {
      const def = eventById('cover-shift')!;
      expect(def).toBeTruthy();
      expect(def.contexts).toEqual(['work']);
      expect(def.cooldownDays).toBe(21);
      const s = studentWithShifts();
      expect(isEligible(s, def, ['work'])).toBe(true);
      const noJob = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs' });
      expect(isEligible(noJob, def, ['work'])).toBe(false);
      const adult = makeGame({ lifeStage: 'working', jobId: 'swe' });
      adult.career.job!.schedule = 'parttime';
      expect(isEligible(adult, def, ['work'])).toBe(false);
      const fullTimeStudent = studentWithShifts();
      fullTimeStudent.career.job!.schedule = 'intern';
      expect(isEligible(fullTimeStudent, def, ['work'])).toBe(false);
      s.events.cooldowns['cover-shift'] = s.clock.day - 10;
      expect(isEligible(s, def, ['work'])).toBe(false);
    });

    it('has an always-available choice', () => {
      const def = eventById('cover-shift')!;
      const choices = typeof def.choices === 'function' ? def.choices(studentWithShifts(), {}) : def.choices;
      expect(choices.some((c) => !c.requires && !c.cost)).toBe(true);
      expect(choices.map((c) => c.id)).toEqual(['take', 'decline']);
    });

    it('taking the shift pays the shift pay and costs energy and calm', () => {
      const s = studentWithShifts();
      s.finance.cash = 100;
      s.stats.energy = 80;
      s.stats.stress = 30;
      queueEvent(s, 'cover-shift');
      const r = resolveEvent(s, 'take');
      expect(r.feedback.ok).toBe(true);
      expect(r.state.finance.cash).toBe(160);
      expect(r.state.stats.energy).toBeLessThan(80);
      expect(r.state.stats.stress).toBeGreaterThan(30);
    });

    it('saying no lowers stress and slightly lowers performance', () => {
      const s = studentWithShifts();
      s.stats.stress = 30;
      queueEvent(s, 'cover-shift');
      const r = resolveEvent(s, 'decline');
      expect(r.feedback.ok).toBe(true);
      expect(r.state.stats.stress).toBeLessThan(30);
      expect(r.state.career.job!.performance).toBeLessThan(50);
    });

    it('keeps cash at 0 or above and stats within 0 to 100 for both choices', () => {
      for (const choice of ['take', 'decline']) {
        const s = studentWithShifts();
        s.finance.cash = 0;
        s.stats.energy = 3;
        s.stats.stress = 99;
        queueEvent(s, 'cover-shift');
        const r = resolveEvent(s, choice);
        expect(r.state.finance.cash, choice).toBeGreaterThanOrEqual(0);
        for (const v of Object.values(r.state.stats)) {
          expect(v, choice).toBeGreaterThanOrEqual(0);
          expect(v, choice).toBeLessThanOrEqual(100);
        }
      }
    });
  });
  describe('job board filter and student hint', () => {
    const student = () => makeGame({ seed: 4, lifeStage: 'student', universityId: 'um', courseId: 'cs' });

    it('"parttime" keeps only part-time listings and an industry keeps only that industry', () => {
      const s = student();
      expect(boardListings(s, 'all')).toEqual(s.career.listings);
      const parttime = boardListings(s, 'parttime');
      expect(parttime.length).toBeGreaterThanOrEqual(2);
      for (const l of parttime) expect(jobById(l.jobId)!.schedule).toBe('parttime');
      const retail = boardListings(s, 'retail');
      for (const l of retail) expect(companyById(l.companyId)!.industry).toBe('retail');
    });

    it('shows the student hint only while studying with no job', () => {
      const s = student();
      expect(showStudentJobHint(s)).toBe(true);
      s.career.job = { jobId: 'barista', companyId: 'startup', title: 'Part-time Barista', schedule: 'parttime', monthlySalary: 0, shiftPay: 60, level: 0, startDay: 0, levelSinceDay: 0, performance: 50, lastReviewDay: 0, overtimeHoursThisMonth: 0, daysWorkedThisMonth: 0, absencesThisMonth: 0 };
      expect(showStudentJobHint(s)).toBe(false);
      expect(showStudentJobHint(makeGame({ lifeStage: 'fresh_grad' }))).toBe(false);
    });
  });
});
