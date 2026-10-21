// Starting backgrounds and life stages. Values are game balance, configurable here.
import type { LifeStage, Skills } from '../engine/types';

export interface Background {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  cash: number;
  savings: number;
  /** Monthly family allowance while studying or living at home. */
  familyAllowance: number;
  /** Optional starting PTPTN-style study loan balance (fictional). */
  studyLoan: number;
  scholarship: boolean;
  skills: Partial<Skills>;
  family: number;
  friends: number;
  reputation: number;
  housing: string;
  /** Starting CV quality / network. */
  cv: number;
  stress: number;
}

export const backgrounds: Background[] = [
  { id: 'scholar', name: 'Scholarship student', icon: '🎓', blurb: 'Fees covered, expectations high. Keep that CGPA up.', cash: 900, savings: 500, familyAllowance: 0, studyLoan: 0, scholarship: true, skills: { data: 8, communication: 5 }, family: 70, friends: 45, reputation: 55, housing: 'room', cv: 30, stress: 30 },
  { id: 'middle', name: 'Middle-class family', icon: '🏠', blurb: 'Some savings, some support, and an aunt asking when you will get married.', cash: 1500, savings: 3000, familyAllowance: 300, studyLoan: 0, scholarship: false, skills: { communication: 6, business: 4 }, family: 65, friends: 55, reputation: 50, housing: 'family', cv: 25, stress: 20 },
  { id: 'struggling', name: 'Financially struggling graduate', icon: '🪙', blurb: 'A study loan, a thin wallet and a strong work ethic.', cash: 350, savings: 0, familyAllowance: 0, studyLoan: 28000, scholarship: false, skills: { communication: 4, cooking: 10 }, family: 60, friends: 40, reputation: 45, housing: 'room', cv: 20, stress: 40 },
  { id: 'fresh-home', name: 'Fresh grad living with family', icon: '🛋️', blurb: 'Free rent and Mak\'s cooking. Long commute and curfews.', cash: 800, savings: 1500, familyAllowance: 0, studyLoan: 18000, scholarship: false, skills: { tech: 6, communication: 4 }, family: 60, friends: 50, reputation: 45, housing: 'family', cv: 25, stress: 25 },
  { id: 'renter', name: 'Young adult renting with friends', icon: '🏘️', blurb: 'Independence, shared bills and a housemate who never buys toilet paper.', cash: 1200, savings: 1000, familyAllowance: 0, studyLoan: 15000, scholarship: false, skills: { communication: 8, cooking: 6 }, family: 50, friends: 65, reputation: 50, housing: 'shared-house', cv: 25, stress: 30 },
  { id: 'connected', name: 'Well-connected graduate', icon: '🤵', blurb: 'Your uncle "knows someone". Doors open; you still have to walk through.', cash: 3000, savings: 6000, familyAllowance: 0, studyLoan: 0, scholarship: false, skills: { communication: 12, business: 8 }, family: 60, friends: 60, reputation: 60, housing: 'family', cv: 45, stress: 20 },
  { id: 'changer', name: 'Career changer', icon: '🔄', blurb: 'Years of experience in one field, starting over in another.', cash: 2500, savings: 8000, familyAllowance: 0, studyLoan: 0, scholarship: false, skills: { business: 15, communication: 15, tech: 8 }, family: 55, friends: 45, reputation: 55, housing: 'apartment', cv: 35, stress: 35 },
];

export const backgroundById = (id: string) => backgrounds.find((b) => b.id === id) ?? backgrounds[1];

export interface LifeStageDef {
  id: LifeStage;
  name: string;
  icon: string;
  defaultAge: number;
  ageRange: [number, number];
  description: string;
  experienceMonths: number;
  qualification: 'spm' | 'diploma' | 'degree';
}

export const lifeStages: LifeStageDef[] = [
  { id: 'student', name: 'University student', icon: '🎒', defaultAge: 19, ageRange: [18, 24], description: 'Classes, assignments, PTPTN and the eternal search for cheap food.', experienceMonths: 0, qualification: 'spm' },
  { id: 'fresh_grad', name: 'Fresh graduate', icon: '🎓', defaultAge: 23, ageRange: [21, 27], description: 'Degree in hand. Job board open. "Min 3 years experience" for entry level.', experienceMonths: 0, qualification: 'degree' },
  { id: 'working', name: 'Working adult', icon: '💼', defaultAge: 26, ageRange: [23, 35], description: 'A job, a commute, and a payslip that disappears by the 5th.', experienceMonths: 30, qualification: 'degree' },
  { id: 'experienced', name: 'Experienced professional', icon: '🧑‍💼', defaultAge: 33, ageRange: [28, 45], description: 'Senior title, more meetings, more commitments.', experienceMonths: 96, qualification: 'degree' },
  { id: 'entrepreneur', name: 'Entrepreneur', icon: '🚀', defaultAge: 27, ageRange: [21, 45], description: 'No boss, no fixed salary, lots of WhatsApp groups.', experienceMonths: 24, qualification: 'degree' },
  { id: 'retired', name: 'Early retirement', icon: '🌴', defaultAge: 55, ageRange: [50, 65], description: 'EPF withdrawn, grandkids possible, finally time for that hobby.', experienceMonths: 300, qualification: 'degree' },
];

export const lifeStageById = (id: LifeStage) => lifeStages.find((s) => s.id === id)!;
