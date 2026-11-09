import { describe, expect, it } from 'vitest';
import { universities } from '../src/data/universities';
import { courses } from '../src/data/courses';
import { companies } from '../src/data/companies';
import { jobs } from '../src/data/jobs';
import { foods } from '../src/data/foods';
import { VEHICLE_SHAPES, vehicles } from '../src/data/vehicles';
import { housingOptions, properties } from '../src/data/housing';
import { hustleDefs, shopItems } from '../src/data/lifestyle';
import { backgrounds, lifeStages } from '../src/data/backgrounds';
import { achievements, challenges } from '../src/data/achievements';
import { holidays } from '../src/data/holidays';
import { actionCatalogue } from '../src/engine/actions';
import { SKILL_KEYS } from '../src/engine/core';
import { newGame } from '../src/engine/newGame';

const unique = (ids: string[]) => new Set(ids).size === ids.length;

describe('data catalogues', () => {
  it('have unique ids', () => {
    for (const list of [universities, courses, companies, jobs, foods, vehicles, housingOptions, properties, hustleDefs, shopItems, backgrounds, achievements, challenges, holidays, actionCatalogue]) {
      expect(unique(list.map((x) => x.id))).toBe(true);
    }
  });

  it('include the required Malaysian institutions', () => {
    const shorts = universities.map((u) => u.short);
    for (const s of ['UM', 'UTM', 'UKM', 'USM', 'UPM', 'UiTM', 'IIUM/UIAM', 'UUM', 'UNIMAS', 'UMS', 'UPSI', 'USIM', 'UMT', 'UTHM', 'UTeM', 'UniMAP', 'UMPSA', 'UniSZA', 'UMK', 'UPNM', 'MMU', 'Monash', "Taylor's", 'Sunway']) {
      expect(shorts).toContain(s);
    }
  });

  it('includes more private universities, courses and jobs to choose from', () => {
    const shorts = universities.map((u) => u.short);
    for (const s of ['UTP', 'UTAR', 'TAR UMT', 'UNITEN', 'UniKL', 'APU', 'UCSI', 'INTI', 'Limkokwing', 'MSU', 'Nottingham', 'Heriot-Watt', 'XMUM', 'Swinburne', 'Curtin', 'AIMST']) {
      expect(shorts).toContain(s);
    }
    for (const id of ['mech', 'chem', 'mech-dip', 'cyber-sec', 'fin', 'biz-dip', 'actuarial', 'ece', 'mbbs', 'physio', 'arch', 'mass-comm', 'nursing-dip']) {
      expect(courses.some((c) => c.id === id), id).toBe(true);
    }
    for (const id of ['cloud-eng', 'ux-designer', 'mech-eng', 'process-eng', 'qs', 'architect', 'maintenance-tech', 'doctor', 'pharmacist', 'physiotherapist', 'staff-nurse', 'auditor', 'fin-analyst', 'hr', 'logistics', 'social-media', 'preschool-teacher', 'cabin-crew', 'customer-service', 'tutor', 'fnb-crew', 'intern-eng']) {
      expect(jobs.some((j) => j.id === id), id).toBe(true);
    }
    // Private tuition stays a fictional estimate above the public range; no fee is implied.
    for (const u of universities) expect(u.tuitionPerSemester, u.id).toBeGreaterThan(0);
  });

  it('every university offers at least one course in the catalogue', () => {
    for (const u of universities) expect(courses.some((c) => u.fields.includes(c.field)), u.id).toBe(true);
  });

  it('every job can be offered by at least one company', () => {
    for (const j of jobs) expect(companies.some((c) => j.industries.includes(c.industry)), j.id).toBe(true);
  });

  it('includes the required job titles and example employers', () => {
    const titles = jobs.map((j) => j.title);
    for (const t of ['AI Engineer', 'Software Developer', 'Data Analyst', 'Data Scientist', 'Network Engineer', 'Cybersecurity Analyst', 'IT Support Engineer', 'Product Manager', 'Business Analyst', 'Accountant', 'Marketing Executive', 'Sales Executive', 'Civil Engineer', 'Electrical Engineer', 'Teacher', 'Healthcare Professional']) {
      expect(titles).toContain(t);
    }
    for (const c of ['petronas', 'tnb', 'simedarby', 'tm', 'axiata', 'carsome', 'maybank', 'cimb', 'publicbank', 'airasia', 'mahb', 'mas', 'intel', 'infineon', 'inari']) {
      expect(companies.some((x) => x.id === c)).toBe(true);
    }
  });

  it('includes real Malaysian coffee chains as drinks and retail employers', () => {
    for (const id of ['zus-coffee', 'kopi-kenangan', 'chagee-tea']) {
      const f = foods.find((x) => x.id === id);
      expect(f, id).toBeDefined();
      expect(f!.category).toBe('drink');
      expect(f!.meal).toBe(false);
    }
    for (const id of ['zus', 'kenangan', 'chagee']) {
      const c = companies.find((x) => x.id === id);
      expect(c, id).toBeDefined();
      expect(c!.industry).toBe('retail');
      expect(c!.fictional).toBeFalsy();
    }
    expect(jobs.find((j) => j.id === 'barista')?.industries).toContain('retail');
    expect(jobs.find((j) => j.id === 'retail')?.industries).toContain('retail');
    expect(jobs.find((j) => j.id === 'store-supervisor')?.industries).toContain('retail');
  });

  it('lets the player open a fictional kopi kiosk, not a named real franchise', () => {
    const kiosk = hustleDefs.find((h) => h.id === 'kopi-kiosk');
    expect(kiosk).toBeDefined();
    expect(kiosk!.name).not.toMatch(/ZUS|Kenangan|Chagee/i);
  });

  it('includes more real Malaysian car models to buy', () => {
    for (const id of ['perodua-bezza-used', 'perodua-alza', 'proton-x50', 'proton-x70', 'honda-city']) {
      const v = vehicles.find((x) => x.id === id);
      expect(v, id).toBeDefined();
      expect(v!.kind).toBe('car');
      expect(v!.price).toBeGreaterThan(0);
    }
  });

  it('has sane game values', () => {
    for (const j of jobs) expect(j.salaryRange[0]).toBeLessThanOrEqual(j.salaryRange[1]);
    for (const f of foods) {
      expect(f.calories).toBeGreaterThan(0);
      expect(f.price).toBeGreaterThanOrEqual(0);
    }
    for (const v of vehicles) expect(v.downPaymentRate).toBeGreaterThan(0);
    for (const v of vehicles) {
      // Drawn as a generic pixel body shape in a paint colour: never a logo or photo.
      expect(VEHICLE_SHAPES, v.id).toContain(v.shape);
      expect(v.color, v.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(v.kind === 'motorcycle', v.id).toBe(v.shape === 'scooter' || v.shape === 'motorbike');
    }
    for (const h of holidays) {
      expect(h.month).toBeGreaterThanOrEqual(1);
      expect(h.month).toBeLessThanOrEqual(12);
    }
    expect(lifeStages).toHaveLength(6);
    expect(backgrounds.length).toBeGreaterThanOrEqual(7);
  });

  it('gives every company a short neutral badge (initials, never a logo)', () => {
    for (const c of companies) {
      expect(c.badge, c.id).toMatch(/^[A-Z]{2,5}$/);
    }
    expect(unique(companies.map((c) => c.badge))).toBe(true);
  });

  it('labels fictional companies as fictional', () => {
    for (const c of companies.filter((x) => x.fictional)) expect(c.name).toMatch(/fictional/i);
  });

  it('every action declares a run function and positive-or-zero time', () => {
    for (const a of actionCatalogue) {
      expect(typeof a.run).toBe('function');
      if (typeof a.minutes === 'number') expect(a.minutes).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('more programmes', () => {
  const NEW_FIELDS = ['law', 'social', 'hospitality', 'science'];
  const NEW_COURSES = ['hrm', 'islamic-fin', 'logistics-scm', 'econ', 'entrepreneurship', 'acc-dip', 'llb', 'psych', 'comm', 'pub-mgmt', 'social-work', 'intl-affairs', 'tourism', 'hospitality-mgmt', 'hotel-dip', 'biotech', 'food-sci', 'agri', 'marine-sci', 'edu-maths', 'counselling'];
  const fieldsOf = (u: { fields: string[] }) => courses.filter((c) => u.fields.includes(c.field));

  it('defines the four new fields', () => {
    for (const f of NEW_FIELDS) expect(courses.some((c) => c.field === f), f).toBe(true);
  });

  it('adds the new courses with sane balance values', () => {
    for (const id of NEW_COURSES) expect(courses.some((c) => c.id === id), id).toBe(true);
    for (const c of courses) {
      expect(c.difficulty, c.id).toBeGreaterThanOrEqual(0.85);
      expect(c.difficulty, c.id).toBeLessThanOrEqual(1.35);
      expect(c.semesters, c.id).toBeGreaterThanOrEqual(5);
      expect(c.semesters, c.id).toBeLessThanOrEqual(10);
      for (const k of Object.keys(c.skills)) expect(SKILL_KEYS, `${c.id}.${k}`).toContain(k);
    }
  });

  it('UUM offers at least 15 courses including law, HR, communication, tourism, psychology and Islamic finance', () => {
    const uum = universities.find((u) => u.id === 'uum')!;
    const offered = fieldsOf(uum).map((c) => c.id);
    expect(offered.length).toBeGreaterThanOrEqual(15);
    for (const id of ['llb', 'hrm', 'comm', 'tourism', 'psych', 'islamic-fin']) expect(offered, id).toContain(id);
  });

  it('every course field is offered by at least one university', () => {
    for (const c of courses) expect(universities.some((u) => u.fields.includes(c.field)), c.id).toBe(true);
  });

  it('every course field is matched by at least one full-time job', () => {
    for (const f of new Set(courses.map((c) => c.field))) {
      expect(jobs.some((j) => j.schedule === 'fulltime' && j.fields?.includes(f)), f).toBe(true);
    }
  });

  it('includes the new jobs for the new fields', () => {
    for (const id of ['legal-exec', 'counsellor', 'admin-officer', 'front-office', 'events-exec', 'lab-exec']) {
      expect(jobs.some((j) => j.id === id), id).toBe(true);
    }
  });

  it('law is offered only where it is widely known, and a UUM law student can start', () => {
    const withLaw = universities.filter((u) => u.fields.includes('law')).map((u) => u.id).sort();
    expect(withLaw).toEqual(['iium', 'mmu', 'taylors', 'uitm', 'ukm', 'um', 'unisza', 'usim', 'uum']);
    const s = newGame({ name: 'T', startAge: 19, homeState: 'Kedah', backgroundId: 'middle', lifeStage: 'student', mode: 'realistic', universityId: 'uum', courseId: 'llb', seed: 7 });
    expect(s.education.universityId).toBe('uum');
    expect(s.education.field).toBe('law');
  });

  it('the new jobs are full-time, cover a new field and have an employer', () => {
    for (const id of ['legal-exec', 'counsellor', 'admin-officer', 'front-office', 'events-exec', 'lab-exec']) {
      const j = jobs.find((x) => x.id === id)!;
      expect(j.schedule, id).toBe('fulltime');
      expect(j.fields?.some((f) => NEW_FIELDS.includes(f)), id).toBe(true);
      expect(companies.some((co) => j.industries.includes(co.industry)), id).toBe(true);
    }
  });

  it('a new game starts for every course, as a student and as a fresh grad', () => {
    for (const c of courses) {
      const uni = universities.find((u) => u.fields.includes(c.field))!;
      for (const lifeStage of ['student', 'fresh_grad'] as const) {
        const s = newGame({ name: 'T', startAge: 21, homeState: 'Kedah', backgroundId: 'middle', lifeStage, mode: 'realistic', universityId: uni.id, courseId: c.id, seed: 7 });
        expect(s.education.field, `${c.id} ${lifeStage}`).toBe(c.field);
      }
    }
  });
});
