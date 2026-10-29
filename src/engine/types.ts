// Core types shared by the simulation engine, the data catalogues and the UI.
// The engine never imports React; the UI never mutates GameState directly.

export type GameMode = 'realistic' | 'chaotic';

export type StatKey = 'energy' | 'health' | 'fitness' | 'stress' | 'happiness' | 'reputation' | 'satiety';
export type Stats = Record<StatKey, number>;

export type SkillKey = 'tech' | 'data' | 'business' | 'communication' | 'creative' | 'engineering' | 'care' | 'cooking';
export type Skills = Record<SkillKey, number>;

export type LifeStage = 'student' | 'fresh_grad' | 'working' | 'experienced' | 'entrepreneur' | 'retired';

export interface Clock {
  /** Days since the game's start date (day 0). */
  day: number;
  /** Minutes since midnight, 0..1439. */
  minute: number;
}

export type HairStyle = 'short' | 'side' | 'spiky' | 'curly' | 'long' | 'bun' | 'bald';
export type Outfit = 'tshirt' | 'kemeja' | 'hoodie' | 'blazer' | 'baju-kurung' | 'baju-melayu' | 'jersey' | 'batik' | 'grad-gown' | 'chef' | 'suit' | 'cheongsam' | 'kurta' | 'christmas-sweater' | 'merdeka-tee';
export type Headwear = 'none' | 'tudung' | 'songkok' | 'cap' | 'grad-cap' | 'helmet' | 'crown';
export type Gender = 'male' | 'female';
export type Mood = 'happy' | 'neutral' | 'tired' | 'stressed' | 'unwell';

/** Cosmetic pixel-character look. Indexes point into src/data/appearance.ts palettes. */
export interface Appearance {
  skin: number;
  hair: HairStyle;
  hairColor: number;
  outfit: Outfit;
  outfitColor: number;
  headwear: Headwear;
  glasses: boolean;
}

export interface Character {
  name: string;
  /** Chosen at creation; null for lives started before v7. Cosmetic: sets the default look only. */
  gender: Gender | null;
  appearance: Appearance;
  startAge: number;
  homeState: string;
  backgroundId: string;
  lifeStage: LifeStage;
}

export type DebtKind = 'ptptn' | 'car' | 'motorcycle' | 'mortgage' | 'personal' | 'overdue' | 'family';

export interface Debt {
  id: string;
  kind: DebtKind;
  label: string;
  principal: number;
  balance: number;
  monthlyPayment: number;
  /** Simple annual interest rate applied monthly to the outstanding balance (game rule). */
  annualRate: number;
}

export interface PayslipLine {
  label: string;
  amount: number;
}

export interface Payslip {
  month: string; // YYYY-MM
  employer: string;
  gross: number;
  basic: number;
  overtime: number;
  bonus: number;
  allowance: number;
  unpaidLeave: number;
  epfEmployee: number;
  socsoEmployee: number;
  eisEmployee: number;
  pcb: number;
  zakatOrOther: number;
  net: number;
  epfEmployer: number;
  socsoEmployer: number;
  eisEmployer: number;
  simplified: true;
}

export interface Finance {
  cash: number;
  savings: number;
  emergencyFund: number;
  epfBalance: number;
  epfEmployerTotal: number;
  debts: Debt[];
  payslips: Payslip[];
  /** Monthly support the player has committed to send their parents. */
  parentAllowance: number;
  /** Tax year tracking for the annual e-filing scenario. */
  taxYear: { year: number; grossIncome: number; pcbPaid: number; epfEmployee: number; socsoEis: number };
  pendingTaxSettlement: number | null;
  monthSpent: number;
  monthEarned: number;
  insurance: boolean;
  /** Fictional Seri Harapan unit trust balance (game rule; not a real fund). Never spendable cash directly. */
  unitTrust: number;
}

export type JobSchedule = 'fulltime' | 'parttime' | 'intern';

export interface Employment {
  jobId: string;
  companyId: string;
  title: string;
  schedule: JobSchedule;
  monthlySalary: number;
  /** For part-time roles: pay per shift instead of a monthly salary. */
  shiftPay: number;
  level: number;
  startDay: number;
  levelSinceDay: number;
  performance: number;
  lastReviewDay: number;
  overtimeHoursThisMonth: number;
  daysWorkedThisMonth: number;
  absencesThisMonth: number;
}

export type ApplicationStatus = 'pending' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'declined' | 'expired';

export interface JobApplication {
  id: string;
  listingId: string;
  jobId: string;
  companyId: string;
  appliedDay: number;
  respondDay: number;
  status: ApplicationStatus;
  interviewDay?: number;
  offerSalary?: number;
  negotiated?: boolean;
  score: number;
}

export interface JobListing {
  id: string;
  jobId: string;
  companyId: string;
  salary: number;
  postedDay: number;
  expiresDay: number;
}

export interface Career {
  job: Employment | null;
  experienceDays: number;
  cvQuality: number;
  applications: JobApplication[];
  listings: JobListing[];
  listingsRefreshedDay: number;
  promotions: number;
  jobsHeld: number;
  workedToday: boolean;
  unemployedSinceDay: number | null;
}

export type EducationStatus = 'none' | 'studying' | 'graduated' | 'dropped';

export interface Education {
  status: EducationStatus;
  universityId: string | null;
  courseId: string | null;
  semester: number;
  totalSemesters: number;
  semesterStartDay: number;
  classesHeld: number;
  classesAttended: number;
  assignmentsDone: number;
  assignmentsTotal: number;
  knowledge: number;
  fypProgress: number;
  gpaHistory: number[];
  cgpa: number;
  attendedToday: boolean;
  /** Highest qualification obtained, used by the job board. */
  qualification: 'spm' | 'diploma' | 'degree';
  field: string | null;
  scholarship: boolean;
}

export interface Housing {
  optionId: string;
  sinceDay: number;
  /** Deposit held by the landlord, refunded (mostly) when moving out. */
  depositHeld: number;
  ownedPropertyId: string | null;
}

export type TransportMode = 'walk' | 'public' | 'motorcycle' | 'car' | 'ehailing';

export interface Transport {
  mode: TransportMode;
  vehicleId: string | null;
  vehicleCondition: number;
  licenceExpiryDay: number | null;
  hasLicence: boolean;
  pendingFines: number;
}

export interface FoodEntry {
  foodId: string;
  name: string;
  calories: number;
  price: number;
  minute: number;
  portion: number;
}

export interface FoodLog {
  today: FoodEntry[];
  caloriesIn: number;
  caloriesOut: number;
  water: number;
  history: { day: number; caloriesIn: number; caloriesOut: number; water: number }[];
}

export interface Fitness {
  gymMember: boolean;
  gymId: string | null;
  sessions: number;
  streak: number;
  lastWorkoutDay: number | null;
}

export type PartnerStage = 'talking' | 'dating' | 'committed' | 'engaged' | 'married';

export interface Person {
  id: string;
  name: string;
  trait: string;
  interest: string;
}

export interface Partner extends Person {
  stage: PartnerStage;
  trust: number;
  compatibility: number;
  satisfaction: number;
  sinceDay: number;
  lastContactDay: number;
  longDistance: boolean;
  memories: string[];
}

export interface Relationships {
  partner: Partner | null;
  prospects: (Person & { compatibility: number; metDay: number })[];
  exes: string[];
  family: number;
  friends: number;
  dates: number;
  lastFamilyContactDay: number;
  lastFriendsDay: number;
  /** Money lent to friends that may or may not come back. */
  moneyLent: number;
}

export interface Hustle {
  id: string;
  level: number;
  xp: number;
  reputation: number;
  satisfaction: number;
  revenueTotal: number;
  expenseTotal: number;
  monthRevenue: number;
  monthExpense: number;
  startedDay: number;
  lastWorkedDay: number;
  employees: number;
  registered: boolean;
}

export interface Post {
  id: string;
  day: number;
  minute: number;
  author: string;
  handle: string;
  text: string;
  kind: 'friend' | 'player' | 'world' | 'invite';
  likes: number;
  liked: boolean;
  /** Optional invitation the player can accept from the feed. */
  invite?: { eventId: string; label: string; used: boolean };
}

export interface LogEntry {
  id: number;
  day: number;
  minute: number;
  kind: 'action' | 'event' | 'money' | 'system' | 'milestone' | 'warning';
  text: string;
}

export type DecorSlot = 'wall' | 'left' | 'right' | 'centre';

export interface Pet {
  name: string;
  species: 'cat';
  adoptedDay: number;
  /** 0 starving to 100 stuffed. */
  fullness: number;
  /** 0 sulking to 100 purring. */
  mood: number;
  lastFedDay: number;
  lastPlayedDay: number;
  timesFed: number;
}

export interface PendingEvent {
  eventId: string;
  params?: Record<string, string | number>;
}

export interface EventState {
  pending: PendingEvent[];
  /** Follow-up or dated events waiting for their day. */
  scheduled: { eventId: string; day: number; params?: Record<string, string | number> }[];
  cooldowns: Record<string, number>;
  seen: Record<string, number>;
  history: { day: number; eventId: string; choiceId: string; title: string }[];
}

export interface DayReport {
  day: number;
  earned: number;
  spent: number;
  caloriesIn: number;
  caloriesOut: number;
  sleepHours: number;
  highlights: string[];
  statsEnd: Stats;
}

export interface DayTracker {
  earned: number;
  spent: number;
  sleepMinutes: number;
  highlights: string[];
  exercised: boolean;
  socialised: boolean;
}

export interface Counters {
  actions: number;
  gymSessions: number;
  workouts: number;
  overtimeHours: number;
  trips: number;
  festivals: number;
  dates: number;
  mealsEaten: number;
  totalEarned: number;
  totalSpent: number;
  hustleProfit: number;
  daysLowSleep: number;
  daysHighStress: number;
  burnouts: number;
  communityActs: number;
  gamingHours: number;
  booksOrCourses: number;
  helpedParentsTotal: number;
  debtsCleared: number;
  bigPurchases: number;
}

export interface Inventory {
  items: string[];
}

export interface Settings {
  comparisonAnxiety: boolean;
  reducedMotion: boolean;
  confirmMajor: boolean;
}

export interface Ending {
  id: string;
  title: string;
  summary: string;
  day: number;
}

export interface GameState {
  version: number;
  id: string;
  createdAt: string;
  seed: number;
  rng: number;
  mode: GameMode;
  /** ISO date of day 0. */
  startDate: string;
  /** Chapter length in days after which the life report ending is offered. */
  chapterDays: number;
  character: Character;
  clock: Clock;
  stats: Stats;
  skills: Skills;
  /** Practice past skill 100, per skill (0 and up). Unlocks senior roles and hustle tiers. */
  mastery: Skills;
  /** Where the player lives now (a MALAYSIA state name). Drives fictional cost and pay factors. */
  location: { state: string };
  /** Jelajah Malaysia: state name -> day the player first visited on a trip. */
  travel: { stamps: Record<string, number> };
  finance: Finance;
  career: Career;
  education: Education;
  housing: Housing;
  transport: Transport;
  food: FoodLog;
  fitness: Fitness;
  relationships: Relationships;
  hustles: Hustle[];
  inventory: Inventory;
  feed: Post[];
  log: LogEntry[];
  logSeq: number;
  events: EventState;
  achievements: Record<string, number>;
  challenges: { active: string[]; completed: Record<string, number>; failed: string[] };
  counters: Counters;
  today: DayTracker;
  lastSleepMinutes: number;
  dayReports: DayReport[];
  flags: Record<string, number | boolean | string>;
  memories: string[];
  communityReputation: number;
  pet: Pet | null;
  decor: { owned: string[]; placed: Partial<Record<DecorSlot, string>> };
  ending: Ending | null;
}

/** Declarative effect bundle used by events and some actions. */
export interface Effect {
  cash?: number;
  savings?: number;
  stats?: Partial<Stats>;
  skills?: Partial<Skills>;
  family?: number;
  friends?: number;
  partnerTrust?: number;
  partnerSatisfaction?: number;
  performance?: number;
  community?: number;
  minutes?: number;
  flags?: Record<string, number | boolean | string>;
  addDebt?: { kind: DebtKind; label: string; amount: number; monthlyPayment: number; annualRate: number };
  memory?: string;
  post?: string;
}

export interface ActionFeedback {
  ok: boolean;
  title: string;
  lines: string[];
  deltas: { label: string; value: number; unit?: 'RM' | 'min' | 'pt' | 'kcal' }[];
  error?: string;
}

export interface NewGameOptions {
  name: string;
  startAge: number;
  homeState: string;
  backgroundId: string;
  lifeStage: LifeStage;
  mode: GameMode;
  universityId?: string;
  courseId?: string;
  startSemester?: number;
  jobId?: string;
  chapterYears?: number;
  seed?: number;
  appearance?: Appearance;
  gender?: Gender;
}
