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
