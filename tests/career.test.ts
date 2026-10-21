import { describe, expect, it } from 'vitest';
import { acceptOffer, jobEligibility, performanceReview, processApplications, refreshListings, resolveInterview } from '../src/engine/career';
import { jobById } from '../src/data/jobs';
import { performAction, currentEvent, resolveEvent } from '../src/engine/simulationEngine';
import { makeGame } from './helpers';

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
    let s = makeGame();
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
