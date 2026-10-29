import { describe, expect, it } from 'vitest';
import { events } from '../src/data/events';
import { jobById } from '../src/data/jobs';
import { companyById } from '../src/data/companies';
import { acceptOffer, performanceReview, promotionBar, startJob } from '../src/engine/career';
import { addSkills, SKILL_KEYS } from '../src/engine/core';
import { processEducationDay, CLASS_DAYS } from '../src/engine/education';
import { performAction, resolveEvent, runAutopilot, currentEvent } from '../src/engine/simulationEngine';
import { startHustle, workHustle, XP_PER_LEVEL } from '../src/engine/business';
import type { GameState } from '../src/engine/types';
import { makeGame } from './helpers';

/** A working player in the Software Developer ladder with a track record. */
function seasoned(level: number, perf = 95, seed = 1234): GameState {
  const s = makeGame({ lifeStage: 'working', seed });
  startJob(s, jobById('swe')!, companyById('tm')!, 5000, level);
  s.clock.day = 800;
  const job = s.career.job!;
  job.levelSinceDay = 800 - 400;
  job.startDay = 800 - 400;
  job.performance = perf;
  s.skills.tech = 100;
  return s;
}

function live(state: GameState, days: number, onDay?: (s: GameState) => void): { state: GameState; counts: Record<string, number> } {
  let s = state;
  const seen = new Set<string>();
  const counts: Record<string, number> = {};
  const target = s.clock.day + days;
  for (let i = 0; i < days * 3 && s.clock.day < target; i++) {
    s = runAutopilot(s, 1).state;
    let guard = 0;
    while (s.events.pending.length && guard++ < 5) {
      const ev = currentEvent(s)!;
      const choice = ev.choices.find((c) => !c.disabledReason && !c.cost) ?? ev.choices.find((c) => !c.disabledReason)!;
      s = resolveEvent(s, choice.id).state;
    }
    for (const h of s.events.history) {
      const k = `${h.day}:${h.eventId}`;
      if (!seen.has(k)) {
        seen.add(k);
        counts[h.eventId] = (counts[h.eventId] ?? 0) + 1;
      }
    }
    onDay?.(s);
  }
  return { state: s, counts };
}

describe('skill mastery', () => {
  it('moves gains past 100 into mastery and keeps skills at 100 or below', () => {
    const s = makeGame();
    s.skills.tech = 99.9;
    addSkills(s, { tech: 3 });
    expect(s.skills.tech).toBe(100);
    expect(s.mastery.tech).toBeGreaterThan(0);
    const before = s.mastery.tech;
    addSkills(s, { tech: 3 });
    expect(s.skills.tech).toBe(100);
    expect(s.mastery.tech).toBeGreaterThan(before);
    for (const k of SKILL_KEYS) expect(s.skills[k]).toBeLessThanOrEqual(100);
  });

  it('adds no mastery while a skill is still below 100', () => {
    const s = makeGame();
    s.skills.data = 40;
    addSkills(s, { data: 2 });
    expect(s.mastery.data).toBe(0);
    expect(s.skills.data).toBeGreaterThan(40);
  });

  it('never lowers mastery on a negative skill change', () => {
    const s = makeGame();
    s.skills.tech = 100;
    s.mastery.tech = 7;
    addSkills(s, { tech: -5 });
    expect(s.skills.tech).toBe(95);
    expect(s.mastery.tech).toBe(7);
  });
});

describe('career ladder past the first promotion', () => {
  it('asks for more at every rung', () => {
    const bars = [0, 1, 2, 3].map(promotionBar);
    for (let i = 1; i < bars.length; i++) {
      expect(bars[i].performance).toBeGreaterThan(bars[i - 1].performance);
      expect(bars[i].mastery).toBeGreaterThanOrEqual(bars[i - 1].mastery);
    }
    expect(bars[0].mastery).toBe(0);
    expect(bars[3].mastery).toBeGreaterThan(0);
  });

  it('promotes on a performance a junior can pass but a senior cannot', () => {
    const junior = seasoned(0, 78);
    performanceReview(junior);
    expect(junior.career.job!.level).toBe(1);

    const senior = seasoned(2, 78);
    senior.mastery.tech = 50;
    performanceReview(senior);
    expect(senior.career.job!.level).toBe(2);
    expect(senior.career.job!.monthlySalary).toBeGreaterThan(0);
  });

  it('keeps the top rungs behind mastery, then lets a master through to the top', () => {
    const s = seasoned(2, 95);
    s.mastery.tech = 0;
    performanceReview(s);
    expect(s.career.job!.level).toBe(2);
    expect(s.log.some((l) => /mastery/i.test(l.text))).toBe(true);

    const m = seasoned(2, 95);
    m.mastery.tech = promotionBar(2).mastery;
    performanceReview(m);
    expect(m.career.job!.level).toBe(3);

    const top = seasoned(3, 99);
    top.mastery.tech = promotionBar(3).mastery;
    performanceReview(top);
    expect(top.career.job!.level).toBe(4);
    expect(top.career.job!.title).toBe('CTO');
    performanceReview(top);
    expect(top.career.job!.level).toBe(4);
  });

  it('gives a high performer more than one promotion in two seeded years', () => {
    const s = makeGame({ lifeStage: 'working', backgroundId: 'middle', seed: 1 });
    const { state } = live(s, 730);
    expect(state.career.promotions).toBeGreaterThanOrEqual(2);
    for (const k of SKILL_KEYS) expect(state.skills[k]).toBeLessThanOrEqual(100);
  });
});

describe('job-hop offers', () => {
  it('sometimes arrive after a good review, pay more, and are never accepted for the player', () => {
    let found = 0;
    for (let seed = 1; seed <= 60 && found === 0; seed++) {
      const s = seasoned(1, 90, seed);
      const jobBefore = s.career.job!.jobId;
      const salaryBefore = s.career.job!.monthlySalary;
      performanceReview(s);
      const offer = s.career.applications.find((a) => a.status === 'offer');
      if (!offer) continue;
      found++;
      expect(offer.offerSalary!).toBeGreaterThan(salaryBefore);
      expect(s.career.job!.jobId).toBe(jobBefore);
      const held = s.career.jobsHeld;
      acceptOffer(s, offer.id);
      expect(s.career.job!.jobId).toBe(offer.jobId);
      expect(s.career.job!.level).toBe(0);
      expect(s.career.jobsHeld).toBe(held + 1);
    }
    expect(found).toBe(1);
  });

  it('do not arrive for someone with a poor record', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = seasoned(1, 55, seed);
      performanceReview(s);
      expect(s.career.applications.some((a) => a.status === 'offer')).toBe(false);
    }
  });
});

describe('hustle tiers', () => {
  it('hold the top tier until the hustle skill has some mastery', () => {
    const s = makeGame({ lifeStage: 'working' });
    s.inventory.items.push('laptop');
    s.finance.cash = 5000;
    startHustle(s, 'freelance-dev');
    const h = s.hustles[0];
    h.level = 5;
    h.xp = XP_PER_LEVEL * 5;
    workHustle(s, 'freelance-dev');
    expect(h.level).toBe(5);
    s.mastery.tech = 50;
    h.xp = XP_PER_LEVEL * 5;
    workHustle(s, 'freelance-dev');
    expect(h.level).toBe(6);
  });
});

describe('student stress', () => {
  function studentAt(semesterDay: number): GameState {
    const s = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs', backgroundId: 'scholar', seed: 3 });
    s.clock.day = s.education.semesterStartDay + semesterDay;
    s.stats.stress = 20;
    s.finance.cash = 800;
    return s;
  }

  it('rises in exam week but not in an ordinary week', () => {
    const ordinary = studentAt(30);
    processEducationDay(ordinary);
    const exam = studentAt(CLASS_DAYS - 3);
    processEducationDay(exam);
    expect(exam.stats.stress).toBeGreaterThan(ordinary.stats.stress);
    expect(exam.stats.stress).toBeLessThanOrEqual(100);
  });

  it('rises with an unfinished assignment close to exams and with an empty wallet', () => {
    const done = studentAt(CLASS_DAYS - 15);
    done.education.assignmentsTotal = 4;
    done.education.assignmentsDone = 4;
    processEducationDay(done);
    const pending = studentAt(CLASS_DAYS - 15);
    pending.education.assignmentsTotal = 4;
    pending.education.assignmentsDone = 1;
    processEducationDay(pending);
    expect(pending.stats.stress).toBeGreaterThan(done.stats.stress);

    const broke = studentAt(30);
    broke.finance.cash = 10;
    processEducationDay(broke);
    const fine = studentAt(30);
    processEducationDay(fine);
    expect(broke.stats.stress).toBeGreaterThan(fine.stats.stress);
  });

  it('worries a jobless fresh graduate with no cash, but not one who is employed', () => {
    const jobless = makeGame({ lifeStage: 'fresh_grad', seed: 5 });
    jobless.career.job = null;
    jobless.finance.cash = 10;
    jobless.stats.stress = 20;
    processEducationDay(jobless);
    expect(jobless.stats.stress).toBeGreaterThan(20);

    const employed = seasoned(0);
    employed.character.lifeStage = 'fresh_grad';
    employed.finance.cash = 10;
    employed.stats.stress = 20;
    processEducationDay(employed);
    expect(employed.stats.stress).toBe(20);
  });

  it('does not burn out a student on routine over a semester', () => {
    const s = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs', backgroundId: 'scholar', seed: 3 });
    let sum = 0;
    let n = 0;
    let max = 0;
    live(s, 98, (st) => {
      sum += st.stats.stress;
      n++;
      max = Math.max(max, st.stats.stress);
    });
    expect(sum / n).toBeGreaterThan(3);
    expect(sum / n).toBeLessThan(40);
    expect(max).toBeLessThan(90);
  });
});

describe('fewer repeat events', () => {
  it('give the most repeated events long cooldowns', () => {
    for (const id of ['stray-oyen', 'birthday-celebration', 'noisy-neighbours']) {
      expect(events.find((e) => e.id === id)!.cooldownDays!, id).toBeGreaterThanOrEqual(120);
    }
  });

  it('fire at most a few times a year over 730 seeded days', () => {
    const { counts } = live(makeGame({ lifeStage: 'fresh_grad', backgroundId: 'struggling', seed: 1 }), 730);
    expect(counts['stray-oyen'] ?? 0).toBeLessThanOrEqual(6);
    expect(counts['birthday-celebration'] ?? 0).toBeLessThanOrEqual(6);
    expect(counts['noisy-neighbours'] ?? 0).toBeLessThanOrEqual(6);
    for (const [id, n] of Object.entries(counts)) {
      if (id === 'interview' || id === 'broke') continue;
      expect(n, id).toBeLessThanOrEqual(8);
    }
  });
});

describe('determinism and purity', () => {
  it('replays to the same state from the same seed', () => {
    const a = live(makeGame({ lifeStage: 'working', seed: 7 }), 200).state;
    const b = live(makeGame({ lifeStage: 'working', seed: 7 }), 200).state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('does not mutate the input state when an action grows a maxed skill', () => {
    const s = makeGame({ lifeStage: 'working' });
    s.skills.tech = 100;
    s.stats.energy = 100;
    const snapshot = JSON.stringify(s);
    performAction(s, 'self-study');
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
