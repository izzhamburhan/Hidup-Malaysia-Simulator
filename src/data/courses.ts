// Courses are generic programme titles, not any university's official course list.
// Skill gains and difficulty are game balance values.
// Fields: computing, engineering, business, data, education, health, creative, law, social,
// hospitality, science. A university's `fields` decides which courses it offers in the game.
import type { SkillKey } from '../engine/types';

export interface Course {
  id: string;
  name: string;
  field: string;
  level: 'diploma' | 'degree';
  semesters: number;
  /** Skills that grow when attending classes and studying. */
  skills: Partial<Record<SkillKey, number>>;
  /** 0.85 easy .. 1.3 hard; scales how much study a good GPA needs. */
  difficulty: number;
}

export const courses: Course[] = [
  { id: 'cs', name: 'Bachelor of Computer Science', field: 'computing', level: 'degree', semesters: 8, skills: { tech: 1.2, data: 0.5 }, difficulty: 1.15 },
  { id: 'se', name: 'Bachelor of Software Engineering', field: 'computing', level: 'degree', semesters: 8, skills: { tech: 1.3, communication: 0.3 }, difficulty: 1.1 },
  { id: 'it-dip', name: 'Diploma in Information Technology', field: 'computing', level: 'diploma', semesters: 6, skills: { tech: 1.0 }, difficulty: 0.95 },
  { id: 'ds', name: 'Bachelor of Data Science', field: 'data', level: 'degree', semesters: 8, skills: { data: 1.3, tech: 0.6 }, difficulty: 1.2 },
  { id: 'ee', name: 'Bachelor of Electrical Engineering', field: 'engineering', level: 'degree', semesters: 8, skills: { engineering: 1.3, tech: 0.4 }, difficulty: 1.25 },
  { id: 'civil', name: 'Bachelor of Civil Engineering', field: 'engineering', level: 'degree', semesters: 8, skills: { engineering: 1.3, business: 0.2 }, difficulty: 1.2 },
  { id: 'acc', name: 'Bachelor of Accounting', field: 'business', level: 'degree', semesters: 8, skills: { business: 1.2, data: 0.4 }, difficulty: 1.05 },
  { id: 'bba', name: 'Bachelor of Business Administration', field: 'business', level: 'degree', semesters: 7, skills: { business: 1.0, communication: 0.6 }, difficulty: 0.95 },
  { id: 'mkt', name: 'Bachelor of Marketing', field: 'business', level: 'degree', semesters: 7, skills: { business: 0.8, communication: 0.7, creative: 0.4 }, difficulty: 0.9 },
  { id: 'tesl', name: 'Bachelor of Education (TESL)', field: 'education', level: 'degree', semesters: 8, skills: { communication: 1.1, care: 0.5 }, difficulty: 1.0 },
  { id: 'nursing', name: 'Bachelor of Nursing', field: 'health', level: 'degree', semesters: 8, skills: { care: 1.3, communication: 0.4 }, difficulty: 1.2 },
  { id: 'pharm', name: 'Bachelor of Pharmacy', field: 'health', level: 'degree', semesters: 8, skills: { care: 1.1, data: 0.5 }, difficulty: 1.3 },
  { id: 'design', name: 'Bachelor of Creative Multimedia', field: 'creative', level: 'degree', semesters: 7, skills: { creative: 1.3, tech: 0.3 }, difficulty: 0.95 },
  { id: 'culinary', name: 'Diploma in Culinary Arts', field: 'creative', level: 'diploma', semesters: 5, skills: { cooking: 1.4, business: 0.3 }, difficulty: 0.9 },
  { id: 'cyber-sec', name: 'Bachelor of Cybersecurity', field: 'computing', level: 'degree', semesters: 8, skills: { tech: 1.3, data: 0.3 }, difficulty: 1.15 },
  { id: 'actuarial', name: 'Bachelor of Actuarial Science', field: 'data', level: 'degree', semesters: 8, skills: { data: 1.3, business: 0.5 }, difficulty: 1.3 },
  { id: 'mech', name: 'Bachelor of Mechanical Engineering', field: 'engineering', level: 'degree', semesters: 8, skills: { engineering: 1.3, tech: 0.3 }, difficulty: 1.25 },
  { id: 'chem', name: 'Bachelor of Chemical Engineering', field: 'engineering', level: 'degree', semesters: 8, skills: { engineering: 1.2, data: 0.4 }, difficulty: 1.3 },
  { id: 'mech-dip', name: 'Diploma in Mechanical Engineering', field: 'engineering', level: 'diploma', semesters: 6, skills: { engineering: 1.0, tech: 0.2 }, difficulty: 0.95 },
  { id: 'fin', name: 'Bachelor of Finance', field: 'business', level: 'degree', semesters: 7, skills: { business: 1.1, data: 0.5 }, difficulty: 1.0 },
  { id: 'biz-dip', name: 'Diploma in Business Studies', field: 'business', level: 'diploma', semesters: 5, skills: { business: 0.9, communication: 0.5 }, difficulty: 0.85 },
  { id: 'ece', name: 'Bachelor of Early Childhood Education', field: 'education', level: 'degree', semesters: 7, skills: { care: 0.9, communication: 0.8 }, difficulty: 0.95 },
  { id: 'mbbs', name: 'Bachelor of Medicine and Bachelor of Surgery', field: 'health', level: 'degree', semesters: 10, skills: { care: 1.4, data: 0.4 }, difficulty: 1.35 },
  { id: 'physio', name: 'Bachelor of Physiotherapy', field: 'health', level: 'degree', semesters: 8, skills: { care: 1.2, communication: 0.4 }, difficulty: 1.15 },
  { id: 'nursing-dip', name: 'Diploma in Nursing', field: 'health', level: 'diploma', semesters: 6, skills: { care: 1.1, communication: 0.3 }, difficulty: 1.0 },
  { id: 'arch', name: 'Bachelor of Science in Architecture', field: 'creative', level: 'degree', semesters: 7, skills: { creative: 1.0, engineering: 0.6 }, difficulty: 1.15 },
  { id: 'mass-comm', name: 'Bachelor of Mass Communication', field: 'creative', level: 'degree', semesters: 7, skills: { communication: 1.0, creative: 0.7 }, difficulty: 0.95 },
  // Business programmes
  { id: 'hrm', name: 'Bachelor of Human Resource Management', field: 'business', level: 'degree', semesters: 7, skills: { business: 0.8, communication: 0.8, care: 0.2 }, difficulty: 0.95 },
  { id: 'islamic-fin', name: 'Bachelor of Islamic Finance and Banking', field: 'business', level: 'degree', semesters: 7, skills: { business: 1.1, data: 0.4 }, difficulty: 1.0 },
  { id: 'logistics-scm', name: 'Bachelor of Logistics and Supply Chain Management', field: 'business', level: 'degree', semesters: 7, skills: { business: 1.0, data: 0.5 }, difficulty: 1.0 },
  { id: 'econ', name: 'Bachelor of Economics', field: 'business', level: 'degree', semesters: 7, skills: { business: 0.9, data: 0.7 }, difficulty: 1.05 },
  { id: 'entrepreneurship', name: 'Bachelor of Entrepreneurship', field: 'business', level: 'degree', semesters: 7, skills: { business: 1.0, creative: 0.4, communication: 0.3 }, difficulty: 0.9 },
  { id: 'acc-dip', name: 'Diploma in Accountancy', field: 'business', level: 'diploma', semesters: 6, skills: { business: 1.0, data: 0.3 }, difficulty: 0.95 },
  // Law
  { id: 'llb', name: 'Bachelor of Laws (LLB)', field: 'law', level: 'degree', semesters: 8, skills: { communication: 1.1, business: 0.5 }, difficulty: 1.25 },
  // Social sciences
  { id: 'psych', name: 'Bachelor of Psychology', field: 'social', level: 'degree', semesters: 7, skills: { care: 0.9, communication: 0.8 }, difficulty: 1.0 },
  { id: 'comm', name: 'Bachelor of Communication', field: 'social', level: 'degree', semesters: 7, skills: { communication: 1.1, creative: 0.4 }, difficulty: 0.9 },
  { id: 'pub-mgmt', name: 'Bachelor of Public Management', field: 'social', level: 'degree', semesters: 7, skills: { business: 0.7, communication: 0.8 }, difficulty: 0.9 },
  { id: 'social-work', name: 'Bachelor of Social Work', field: 'social', level: 'degree', semesters: 7, skills: { care: 1.0, communication: 0.6 }, difficulty: 0.95 },
  { id: 'intl-affairs', name: 'Bachelor of International Affairs Management', field: 'social', level: 'degree', semesters: 7, skills: { communication: 0.9, business: 0.5 }, difficulty: 1.0 },
  // Tourism and hospitality
  { id: 'tourism', name: 'Bachelor of Tourism Management', field: 'hospitality', level: 'degree', semesters: 7, skills: { communication: 0.8, business: 0.7 }, difficulty: 0.9 },
  { id: 'hospitality-mgmt', name: 'Bachelor of Hospitality Management', field: 'hospitality', level: 'degree', semesters: 7, skills: { communication: 0.7, business: 0.5, cooking: 0.4 }, difficulty: 0.9 },
  { id: 'hotel-dip', name: 'Diploma in Hotel Management', field: 'hospitality', level: 'diploma', semesters: 5, skills: { communication: 0.8, cooking: 0.5 }, difficulty: 0.85 },
  // Sciences
  { id: 'biotech', name: 'Bachelor of Science (Biotechnology)', field: 'science', level: 'degree', semesters: 8, skills: { data: 0.8, care: 0.4 }, difficulty: 1.15 },
  { id: 'food-sci', name: 'Bachelor of Food Science', field: 'science', level: 'degree', semesters: 8, skills: { data: 0.7, cooking: 0.6 }, difficulty: 1.05 },
  { id: 'agri', name: 'Bachelor of Agricultural Science', field: 'science', level: 'degree', semesters: 8, skills: { data: 0.6, engineering: 0.4, care: 0.3 }, difficulty: 1.0 },
  { id: 'marine-sci', name: 'Bachelor of Marine Science', field: 'science', level: 'degree', semesters: 8, skills: { data: 0.8, engineering: 0.3 }, difficulty: 1.1 },
  // Education
  { id: 'edu-maths', name: 'Bachelor of Education (Mathematics)', field: 'education', level: 'degree', semesters: 8, skills: { communication: 0.8, data: 0.6 }, difficulty: 1.05 },
  { id: 'counselling', name: 'Bachelor of Counselling', field: 'education', level: 'degree', semesters: 8, skills: { care: 0.9, communication: 0.9 }, difficulty: 1.0 },
];

export const courseById = (id: string | null | undefined) => courses.find((c) => c.id === id);
