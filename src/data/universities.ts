// Real Malaysian institutions used as catalogue entries only.
// Tuition values are FICTIONAL GAME ESTIMATES for balance, not official fees.
// No rankings or entry requirements are implied.

export type InstitutionType = 'public' | 'private';

export interface University {
  id: string;
  name: string;
  short: string;
  type: InstitutionType;
  state: string;
  /** Course fields offered in the game. */
  fields: string[];
  /** Fictional per-semester tuition estimate in RM. */
  tuitionPerSemester: number;
  /** Small flavour bonus to skills gained in these fields (game rule, not a quality claim). */
  strengths: string[];
  /** Extra internship listings in the game (industry-link flavour, not a claim). */
  industryLinks: number;
}

const ALL = ['computing', 'engineering', 'business', 'data', 'education', 'health', 'creative'];

export const universities: University[] = [
  { id: 'um', name: 'Universiti Malaya', short: 'UM', type: 'public', state: 'Kuala Lumpur', fields: ALL, tuitionPerSemester: 1800, strengths: ['health', 'data'], industryLinks: 1 },
  { id: 'utm', name: 'Universiti Teknologi Malaysia', short: 'UTM', type: 'public', state: 'Johor', fields: ['computing', 'engineering', 'data', 'business'], tuitionPerSemester: 1700, strengths: ['engineering', 'computing'], industryLinks: 1 },
  { id: 'ukm', name: 'Universiti Kebangsaan Malaysia', short: 'UKM', type: 'public', state: 'Selangor', fields: ALL, tuitionPerSemester: 1700, strengths: ['health', 'education'], industryLinks: 1 },
  { id: 'usm', name: 'Universiti Sains Malaysia', short: 'USM', type: 'public', state: 'Pulau Pinang', fields: ALL, tuitionPerSemester: 1700, strengths: ['engineering', 'health'], industryLinks: 1 },
  { id: 'upm', name: 'Universiti Putra Malaysia', short: 'UPM', type: 'public', state: 'Selangor', fields: ALL, tuitionPerSemester: 1650, strengths: ['data', 'business'], industryLinks: 1 },
  { id: 'uitm', name: 'Universiti Teknologi MARA', short: 'UiTM', type: 'public', state: 'Selangor', fields: ALL, tuitionPerSemester: 1200, strengths: ['business', 'creative'], industryLinks: 1 },
  { id: 'iium', name: 'International Islamic University Malaysia', short: 'IIUM/UIAM', type: 'public', state: 'Selangor', fields: ALL, tuitionPerSemester: 1700, strengths: ['business', 'health'], industryLinks: 1 },
  { id: 'uum', name: 'Universiti Utara Malaysia', short: 'UUM', type: 'public', state: 'Kedah', fields: ['business', 'data', 'computing', 'education'], tuitionPerSemester: 1500, strengths: ['business'], industryLinks: 0 },
  { id: 'unimas', name: 'Universiti Malaysia Sarawak', short: 'UNIMAS', type: 'public', state: 'Sarawak', fields: ['computing', 'engineering', 'health', 'creative'], tuitionPerSemester: 1500, strengths: ['creative'], industryLinks: 0 },
  { id: 'ums', name: 'Universiti Malaysia Sabah', short: 'UMS', type: 'public', state: 'Sabah', fields: ['computing', 'business', 'health', 'education'], tuitionPerSemester: 1500, strengths: ['health'], industryLinks: 0 },
  { id: 'upsi', name: 'Universiti Pendidikan Sultan Idris', short: 'UPSI', type: 'public', state: 'Perak', fields: ['education', 'creative', 'computing'], tuitionPerSemester: 1400, strengths: ['education'], industryLinks: 0 },
  { id: 'usim', name: 'Universiti Sains Islam Malaysia', short: 'USIM', type: 'public', state: 'Negeri Sembilan', fields: ['business', 'health', 'computing'], tuitionPerSemester: 1500, strengths: ['business'], industryLinks: 0 },
  { id: 'umt', name: 'Universiti Malaysia Terengganu', short: 'UMT', type: 'public', state: 'Terengganu', fields: ['data', 'engineering', 'business'], tuitionPerSemester: 1450, strengths: ['data'], industryLinks: 0 },
  { id: 'uthm', name: 'Universiti Tun Hussein Onn Malaysia', short: 'UTHM', type: 'public', state: 'Johor', fields: ['engineering', 'computing', 'education'], tuitionPerSemester: 1450, strengths: ['engineering'], industryLinks: 0 },
  { id: 'utem', name: 'Universiti Teknikal Malaysia Melaka', short: 'UTeM', type: 'public', state: 'Melaka', fields: ['engineering', 'computing', 'business'], tuitionPerSemester: 1450, strengths: ['engineering', 'computing'], industryLinks: 0 },
  { id: 'unimap', name: 'Universiti Malaysia Perlis', short: 'UniMAP', type: 'public', state: 'Perlis', fields: ['engineering', 'computing'], tuitionPerSemester: 1400, strengths: ['engineering'], industryLinks: 0 },
  { id: 'umpsa', name: 'Universiti Malaysia Pahang Al-Sultan Abdullah', short: 'UMPSA', type: 'public', state: 'Pahang', fields: ['engineering', 'computing', 'data'], tuitionPerSemester: 1450, strengths: ['engineering'], industryLinks: 0 },
  { id: 'unisza', name: 'Universiti Sultan Zainal Abidin', short: 'UniSZA', type: 'public', state: 'Terengganu', fields: ['health', 'business', 'computing'], tuitionPerSemester: 1400, strengths: ['health'], industryLinks: 0 },
  { id: 'umk', name: 'Universiti Malaysia Kelantan', short: 'UMK', type: 'public', state: 'Kelantan', fields: ['business', 'creative', 'data'], tuitionPerSemester: 1400, strengths: ['business', 'creative'], industryLinks: 0 },
  { id: 'upnm', name: 'Universiti Pertahanan Nasional Malaysia', short: 'UPNM', type: 'public', state: 'Kuala Lumpur', fields: ['engineering', 'computing', 'health'], tuitionPerSemester: 1500, strengths: ['engineering'], industryLinks: 0 },
  { id: 'mmu', name: 'Multimedia University', short: 'MMU', type: 'private', state: 'Selangor', fields: ['computing', 'engineering', 'creative', 'business', 'data'], tuitionPerSemester: 7500, strengths: ['computing', 'creative'], industryLinks: 2 },
  { id: 'monash', name: 'Monash University Malaysia', short: 'Monash', type: 'private', state: 'Selangor', fields: ['computing', 'engineering', 'business', 'health', 'data'], tuitionPerSemester: 19000, strengths: ['data', 'health'], industryLinks: 3 },
  { id: 'taylors', name: "Taylor's University", short: "Taylor's", type: 'private', state: 'Selangor', fields: ['business', 'creative', 'computing', 'health'], tuitionPerSemester: 14000, strengths: ['business', 'creative'], industryLinks: 3 },
  { id: 'sunway', name: 'Sunway University', short: 'Sunway', type: 'private', state: 'Selangor', fields: ['business', 'computing', 'data', 'creative', 'health'], tuitionPerSemester: 14500, strengths: ['business', 'data'], industryLinks: 3 },
];

export const universityById = (id: string | null | undefined) => universities.find((u) => u.id === id);
