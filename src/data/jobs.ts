// Job catalogue. Salary ranges are FICTIONAL GAME ESTIMATES (monthly gross, RM)
// chosen for balance. They are not market data and not offers from any company.
import type { JobSchedule, SkillKey } from '../engine/types';
import type { Industry } from './companies';

export interface Job {
  id: string;
  title: string;
  icon: string;
  industries: Industry[];
  schedule: JobSchedule;
  /** Monthly game salary range for full-time / intern roles. */
  salaryRange: [number, number];
  /** Pay per shift for part-time roles. */
  shiftPay?: number;
  shiftHours: number;
  qualification: 'spm' | 'diploma' | 'degree';
  /** Preferred study fields; other fields can still apply with higher skills. */
  fields?: string[];
  skills: Partial<Record<SkillKey, number>>;
  minExperienceMonths: number;
  /** Skills that grow from each shift. */
  growth: Partial<Record<SkillKey, number>>;
  stress: number;
  /** Rung titles for promotions. */
  ladder: string[];
  studentFriendly?: boolean;
}

export const jobs: Job[] = [
  { id: 'ai-eng', title: 'AI Engineer', icon: '🤖', industries: ['tech', 'finance', 'energy', 'electronics', 'sme'], schedule: 'fulltime', salaryRange: [5500, 8500], shiftHours: 8, qualification: 'degree', fields: ['computing', 'data'], skills: { tech: 45, data: 40 }, minExperienceMonths: 6, growth: { tech: 0.6, data: 0.6 }, stress: 9, ladder: ['AI Engineer', 'Senior AI Engineer', 'Lead AI Engineer', 'Principal AI Engineer', 'Head of AI'] },
  { id: 'swe', title: 'Software Developer', icon: '💻', industries: ['tech', 'finance', 'transport', 'sme'], schedule: 'fulltime', salaryRange: [3800, 6000], shiftHours: 8, qualification: 'degree', fields: ['computing', 'data'], skills: { tech: 30 }, minExperienceMonths: 0, growth: { tech: 0.7, communication: 0.2 }, stress: 8, ladder: ['Software Developer', 'Senior Developer', 'Tech Lead', 'Engineering Manager', 'CTO'] },
  { id: 'data-analyst', title: 'Data Analyst', icon: '📊', industries: ['tech', 'finance', 'energy', 'transport', 'electronics'], schedule: 'fulltime', salaryRange: [3500, 5200], shiftHours: 8, qualification: 'degree', fields: ['data', 'computing', 'business'], skills: { data: 25 }, minExperienceMonths: 0, growth: { data: 0.7, business: 0.2 }, stress: 7, ladder: ['Data Analyst', 'Senior Data Analyst', 'Analytics Lead', 'Analytics Manager', 'Head of Analytics'] },
  { id: 'data-sci', title: 'Data Scientist', icon: '🧪', industries: ['tech', 'finance', 'energy', 'electronics'], schedule: 'fulltime', salaryRange: [5000, 7500], shiftHours: 8, qualification: 'degree', fields: ['data', 'computing'], skills: { data: 45, tech: 30 }, minExperienceMonths: 6, growth: { data: 0.7, tech: 0.3 }, stress: 8, ladder: ['Data Scientist', 'Senior Data Scientist', 'Lead Data Scientist', 'Principal Data Scientist', 'Chief Data Officer'] },
  { id: 'network-eng', title: 'Network Engineer', icon: '📡', industries: ['tech', 'transport', 'energy'], schedule: 'fulltime', salaryRange: [3600, 5500], shiftHours: 8, qualification: 'degree', fields: ['computing', 'engineering'], skills: { tech: 25, engineering: 15 }, minExperienceMonths: 0, growth: { tech: 0.5, engineering: 0.3 }, stress: 8, ladder: ['Network Engineer', 'Senior Network Engineer', 'Network Architect', 'Network Manager', 'Head of Infrastructure'] },
  { id: 'cyber', title: 'Cybersecurity Analyst', icon: '🛡️', industries: ['tech', 'finance', 'energy'], schedule: 'fulltime', salaryRange: [4200, 6500], shiftHours: 8, qualification: 'degree', fields: ['computing'], skills: { tech: 40 }, minExperienceMonths: 3, growth: { tech: 0.6, data: 0.2 }, stress: 9, ladder: ['Security Analyst', 'Senior Security Analyst', 'Security Lead', 'Security Manager', 'CISO'] },
  { id: 'it-support', title: 'IT Support Engineer', icon: '🛠️', industries: ['tech', 'finance', 'transport', 'electronics', 'public', 'sme'], schedule: 'fulltime', salaryRange: [2500, 3600], shiftHours: 8, qualification: 'diploma', fields: ['computing'], skills: { tech: 15 }, minExperienceMonths: 0, growth: { tech: 0.5, communication: 0.3 }, stress: 7, ladder: ['IT Support Engineer', 'Senior IT Support', 'IT Lead', 'IT Manager', 'Head of IT'] },
  { id: 'pm', title: 'Product Manager', icon: '🧭', industries: ['tech', 'finance', 'transport', 'sme'], schedule: 'fulltime', salaryRange: [5500, 8000], shiftHours: 8, qualification: 'degree', skills: { business: 35, communication: 35, tech: 15 }, minExperienceMonths: 12, growth: { business: 0.5, communication: 0.5 }, stress: 9, ladder: ['Product Manager', 'Senior PM', 'Group PM', 'Director of Product', 'CPO'] },
  { id: 'ba', title: 'Business Analyst', icon: '📋', industries: ['tech', 'finance', 'energy', 'transport'], schedule: 'fulltime', salaryRange: [3500, 5200], shiftHours: 8, qualification: 'degree', fields: ['business', 'data', 'computing'], skills: { business: 25, data: 15 }, minExperienceMonths: 0, growth: { business: 0.5, data: 0.3, communication: 0.2 }, stress: 7, ladder: ['Business Analyst', 'Senior BA', 'Lead BA', 'BA Manager', 'Head of Strategy'] },
  { id: 'accountant', title: 'Accountant', icon: '🧾', industries: ['finance', 'energy', 'electronics', 'sme'], schedule: 'fulltime', salaryRange: [3200, 4800], shiftHours: 8, qualification: 'degree', fields: ['business'], skills: { business: 30 }, minExperienceMonths: 0, growth: { business: 0.6, data: 0.2 }, stress: 8, ladder: ['Accountant', 'Senior Accountant', 'Finance Lead', 'Finance Manager', 'CFO'] },
  { id: 'marketing', title: 'Marketing Executive', icon: '📣', industries: ['tech', 'finance', 'transport', 'sme'], schedule: 'fulltime', salaryRange: [2800, 4200], shiftHours: 8, qualification: 'degree', fields: ['business', 'creative'], skills: { communication: 20, creative: 15 }, minExperienceMonths: 0, growth: { communication: 0.4, creative: 0.4, business: 0.2 }, stress: 7, ladder: ['Marketing Executive', 'Senior Executive', 'Marketing Lead', 'Marketing Manager', 'CMO'] },
  { id: 'sales', title: 'Sales Executive', icon: '🤝', industries: ['tech', 'finance', 'transport', 'electronics', 'sme'], schedule: 'fulltime', salaryRange: [2500, 4000], shiftHours: 8, qualification: 'diploma', skills: { communication: 20 }, minExperienceMonths: 0, growth: { communication: 0.6, business: 0.3 }, stress: 9, ladder: ['Sales Executive', 'Senior Sales Exec', 'Key Account Manager', 'Sales Manager', 'Head of Sales'] },
  { id: 'civil-eng', title: 'Civil Engineer', icon: '🏗️', industries: ['energy', 'transport'], schedule: 'fulltime', salaryRange: [3500, 5000], shiftHours: 8, qualification: 'degree', fields: ['engineering'], skills: { engineering: 30 }, minExperienceMonths: 0, growth: { engineering: 0.6, communication: 0.2 }, stress: 8, ladder: ['Civil Engineer', 'Senior Engineer', 'Project Engineer', 'Project Manager', 'Engineering Director'] },
  { id: 'elec-eng', title: 'Electrical Engineer', icon: '⚡', industries: ['energy', 'electronics'], schedule: 'fulltime', salaryRange: [3700, 5400], shiftHours: 8, qualification: 'degree', fields: ['engineering'], skills: { engineering: 30 }, minExperienceMonths: 0, growth: { engineering: 0.6, tech: 0.2 }, stress: 8, ladder: ['Electrical Engineer', 'Senior Engineer', 'Lead Engineer', 'Engineering Manager', 'Chief Engineer'] },
  { id: 'teacher', title: 'Teacher', icon: '🍎', industries: ['public'], schedule: 'fulltime', salaryRange: [2900, 4000], shiftHours: 7, qualification: 'degree', fields: ['education'], skills: { communication: 25 }, minExperienceMonths: 0, growth: { communication: 0.5, care: 0.3 }, stress: 8, ladder: ['Teacher', 'Senior Teacher', 'Head of Panel', 'Senior Assistant', 'Headteacher'] },
  { id: 'nurse', title: 'Healthcare Professional', icon: '🩺', industries: ['public'], schedule: 'fulltime', salaryRange: [3000, 4500], shiftHours: 9, qualification: 'degree', fields: ['health'], skills: { care: 30 }, minExperienceMonths: 0, growth: { care: 0.6, communication: 0.2 }, stress: 10, ladder: ['Healthcare Officer', 'Senior Officer', 'Team Lead', 'Unit Manager', 'Director of Care'] },
  { id: 'designer', title: 'Graphic Designer', icon: '🎨', industries: ['sme', 'tech'], schedule: 'fulltime', salaryRange: [2600, 3800], shiftHours: 8, qualification: 'diploma', fields: ['creative'], skills: { creative: 25 }, minExperienceMonths: 0, growth: { creative: 0.6, tech: 0.2 }, stress: 7, ladder: ['Graphic Designer', 'Senior Designer', 'Art Director', 'Creative Director', 'Chief Creative Officer'] },
  { id: 'chef', title: 'Commis Chef', icon: '👨‍🍳', industries: ['sme'], schedule: 'fulltime', salaryRange: [2200, 3000], shiftHours: 9, qualification: 'spm', skills: { cooking: 20 }, minExperienceMonths: 0, growth: { cooking: 0.7 }, stress: 9, ladder: ['Commis Chef', 'Chef de Partie', 'Sous Chef', 'Head Chef', 'Executive Chef'] },
  { id: 'admin', title: 'Admin Executive', icon: '🗂️', industries: ['energy', 'tech', 'finance', 'transport', 'electronics', 'public', 'sme'], schedule: 'fulltime', salaryRange: [2200, 3000], shiftHours: 8, qualification: 'spm', skills: {}, minExperienceMonths: 0, growth: { business: 0.3, communication: 0.3 }, stress: 6, ladder: ['Admin Executive', 'Senior Admin', 'Office Lead', 'Office Manager', 'Head of Operations'] },
  { id: 'production', title: 'Production Technician', icon: '🏭', industries: ['electronics'], schedule: 'fulltime', salaryRange: [2100, 2900], shiftHours: 9, qualification: 'spm', skills: {}, minExperienceMonths: 0, growth: { engineering: 0.5 }, stress: 7, ladder: ['Technician', 'Senior Technician', 'Line Leader', 'Production Supervisor', 'Plant Manager'] },
  { id: 'intern-tech', title: 'Tech Intern', icon: '🎒', industries: ['tech', 'finance', 'energy', 'electronics', 'sme'], schedule: 'intern', salaryRange: [800, 1500], shiftHours: 7, qualification: 'spm', fields: ['computing', 'data', 'engineering'], skills: { tech: 10 }, minExperienceMonths: 0, growth: { tech: 0.8, communication: 0.3 }, stress: 5, ladder: ['Intern'], studentFriendly: true },
  { id: 'intern-biz', title: 'Business Intern', icon: '🎒', industries: ['finance', 'transport', 'energy', 'sme'], schedule: 'intern', salaryRange: [700, 1300], shiftHours: 7, qualification: 'spm', fields: ['business', 'creative', 'education', 'health'], skills: {}, minExperienceMonths: 0, growth: { business: 0.7, communication: 0.4 }, stress: 5, ladder: ['Intern'], studentFriendly: true },
  { id: 'barista', title: 'Part-time Barista', icon: '☕', industries: ['sme'], schedule: 'parttime', salaryRange: [0, 0], shiftPay: 60, shiftHours: 5, qualification: 'spm', skills: {}, minExperienceMonths: 0, growth: { communication: 0.4, cooking: 0.2 }, stress: 4, ladder: ['Barista'], studentFriendly: true },
  { id: 'retail', title: 'Part-time Retail Assistant', icon: '🛍️', industries: ['sme'], schedule: 'parttime', salaryRange: [0, 0], shiftPay: 55, shiftHours: 5, qualification: 'spm', skills: {}, minExperienceMonths: 0, growth: { communication: 0.4, business: 0.2 }, stress: 4, ladder: ['Retail Assistant'], studentFriendly: true },
];

export const jobById = (id: string | null | undefined) => jobs.find((j) => j.id === id);
