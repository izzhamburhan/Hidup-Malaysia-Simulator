// Mini-games: names, blurbs and the reward table. Rewards are small mood nudges, never cash.

import type { SkillKey, StatKey } from '../engine/types';

export type MinigameId = 'kejar-bas' | 'teh-tarik' | 'ingat-order';

export interface Minigame {
  id: MinigameId;
  name: string;
  icon: string;
  blurb: string;
}

export const MINIGAMES: Minigame[] = [
  { id: 'kejar-bas', name: 'Kejar Bas', icon: '🚌', blurb: 'The bus is leaving. Tap as fast as you can to catch it!' },
  { id: 'teh-tarik', name: 'Teh Tarik', icon: '☕', blurb: 'Hold to pour, let go in the green zone. Three pours.' },
  { id: 'ingat-order', name: 'Ingat Order', icon: '🧾', blurb: 'Remember the table\'s mamak order, then tap it back in order.' },
];

export const minigameById = (id: string) => MINIGAMES.find((g) => g.id === id);

export const MAMAK_MENU = [
  { id: 'roti-canai', label: 'Roti canai', icon: '🫓' },
  { id: 'teh-tarik', label: 'Teh tarik', icon: '☕' },
  { id: 'milo-ais', label: 'Milo ais', icon: '🥤' },
  { id: 'nasi-goreng', label: 'Nasi goreng', icon: '🍛' },
  { id: 'mee-goreng', label: 'Mee goreng', icon: '🍜' },
  { id: 'roti-telur', label: 'Roti telur', icon: '🥚' },
  { id: 'teh-o-ais', label: 'Teh O ais', icon: '🧊' },
  { id: 'maggi-goreng', label: 'Maggi goreng', icon: '🍝' },
];

/** Plays per in-game day that earn the full reward. */
export const MINIGAME_REWARDED_PER_DAY = 3;

/** By tier (score 0-29, 30-59, 60-89, 90-100). */
export const MINIGAME_REWARDS = [
  { happiness: 2, stress: -1 },
  { happiness: 4, stress: -2 },
  { happiness: 6, stress: -3 },
  { happiness: 8, stress: -4 },
];

// ---------------------------------------------------------------------------
// Action games: a quick game before an everyday action. The score nudges the result a
// little (see src/engine/actionGames.ts). Bonuses are small FICTIONAL GAME VALUES, never cash.
// Skipping the game, autopilot and the routine buttons do the action with no bonus.

export type ActionGameKind = 'tap' | 'timing' | 'memory' | 'pour' | 'math' | 'pick';

/** The full bonus, given at a score of 90+. Scores 60-89 give two thirds, 30-59 a third. */
export interface ActionGameBonus {
  stats?: Partial<Record<StatKey, number>>;
  skills?: Partial<Record<SkillKey, number>>;
  /** Work performance (0-100). */
  performance?: number;
  /** Study knowledge (0-100). */
  knowledge?: number;
  cvQuality?: number;
  /** Added to the job application named by the action's param (listing or application id). */
  applicationScore?: number;
  friends?: number;
  family?: number;
  partnerTrust?: number;
}

export interface ActionGame {
  kind: ActionGameKind;
  /** Picks the look and the content: a PICK_PROMPTS or MEMORY_SETS key, or a visual theme. */
  theme: string;
  /** Short instruction shown before the game starts. */
  intro: string;
  bonus: ActionGameBonus;
}

export const ACTION_GAMES: Record<string, ActionGame> = {
  run: { kind: 'tap', theme: 'run', intro: 'Tap fast to keep your pace up to the lamp post!', bonus: { stats: { fitness: 1, happiness: 2 } } },
  'home-workout': { kind: 'tap', theme: 'pushup', intro: 'Tap fast for as many push-ups as you can!', bonus: { stats: { fitness: 1, happiness: 1 } } },
  gym: { kind: 'timing', theme: 'lift', intro: 'Tap when the marker is in the green zone to lift clean. Three reps.', bonus: { stats: { fitness: 1, stress: -2 } } },
  badminton: { kind: 'timing', theme: 'smash', intro: 'Tap when the marker is in the green zone to smash. Three shots.', bonus: { stats: { happiness: 3, fitness: 0.5 } } },
  futsal: { kind: 'timing', theme: 'kick', intro: 'Tap in the green zone to shoot. Three shots on goal.', bonus: { stats: { happiness: 3, fitness: 0.5 } } },
  football: { kind: 'timing', theme: 'kick', intro: 'Tap in the green zone to shoot. Three shots on goal.', bonus: { stats: { happiness: 3, fitness: 0.5 } } },
  'work-shift': { kind: 'memory', theme: 'office', intro: "Your boss lists today's tasks. Remember them, then do them in order.", bonus: { performance: 2 } },
  overtime: { kind: 'memory', theme: 'office', intro: 'One more round of tasks before you can go home.', bonus: { performance: 1 } },
  'work-hustle': { kind: 'memory', theme: 'hustle', intro: 'Customers are waiting. Remember the orders, then fill them in order.', bonus: { stats: { happiness: 2, stress: -2 } } },
  mamak: { kind: 'pour', theme: 'teh', intro: 'Pull your own teh tarik: hold to pour, let go in the green zone.', bonus: { stats: { happiness: 3 } } },
  'attend-class': { kind: 'math', theme: 'class', intro: 'Pop quiz! Answer as many sums as you can.', bonus: { knowledge: 1.5 } },
  study: { kind: 'math', theme: 'class', intro: 'Warm up your brain: answer as many sums as you can.', bonus: { knowledge: 1.5 } },
  assignment: { kind: 'math', theme: 'class', intro: 'Check your working: answer as many sums as you can.', bonus: { knowledge: 1.5 } },
  fyp: { kind: 'math', theme: 'class', intro: 'Crunch the numbers for your project results.', bonus: { knowledge: 1 } },
  'self-study': { kind: 'math', theme: 'class', intro: 'Quick drill before you start.', bonus: { stats: { stress: -2 } } },
  'apply-job': { kind: 'pick', theme: 'cv', intro: 'Pick the strongest line for your application.', bonus: { applicationScore: 8 } },
  'update-cv': { kind: 'pick', theme: 'cv', intro: 'Pick the strongest line for your CV.', bonus: { cvQuality: 4 } },
  'attend-interview': { kind: 'pick', theme: 'interview', intro: 'Practise: pick the best answer to each question.', bonus: { applicationScore: 8 } },
  'call-friend': { kind: 'pick', theme: 'chat', intro: 'Your friend is chatting. Pick the kindest reply.', bonus: { friends: 2 } },
  'chat-partner': { kind: 'pick', theme: 'chat', intro: 'Pick the reply that shows you were listening.', bonus: { partnerTrust: 2 } },
  'deep-talk': { kind: 'pick', theme: 'chat', intro: 'A real talk. Pick the reply that shows you care.', bonus: { partnerTrust: 2 } },
  'call-parents': { kind: 'pick', theme: 'family', intro: 'Your parents are on the line. Pick the best reply.', bonus: { family: 2 } },
  'family-time': { kind: 'pick', theme: 'family', intro: 'Family time. Pick the best reply.', bonus: { family: 2 } },
};

export interface PickPrompt {
  prompt: string;
  options: [string, string, string];
  /** Index of the best option. */
  best: number;
}

/** Pick-the-best-reply rounds. Original, friendly and fictional. */
export const PICK_PROMPTS: Record<'cv' | 'interview' | 'chat' | 'family', PickPrompt[]> = {
  cv: [
    { prompt: 'Describe your last project.', options: ['Did some stuff on a team.', 'Led a 3-person team that cut report time by 40%.', 'Very hardworking, can work under pressure.'], best: 1 },
    { prompt: 'Your skills section says…', options: ['Proficient in Microsoft Word.', 'Excel (pivot tables, lookups), SQL basics, Canva.', 'Fast learner, very fast, fastest.'], best: 1 },
    { prompt: 'Your email address on the CV:', options: ['budak.comel.92@…', 'nama.penuh@…', 'xXgamerXx@…'], best: 1 },
    { prompt: 'Why this company?', options: ['Near my house.', 'Your community projects match what I want to build.', 'My mak said apply.'], best: 1 },
    { prompt: 'Your internship line:', options: ['Intern. Made coffee.', 'Handled 50+ customer tickets a week with a 95% happy rating.', 'Was there for 3 months.'], best: 1 },
    { prompt: 'Your CV photo:', options: ['A clear, smiling photo in a collared shirt.', 'Raya selfie with the whole family.', 'Your cat. Very photogenic.'], best: 0 },
  ],
  interview: [
    { prompt: '"Tell me about yourself."', options: ['Born in a hospital, then…', 'My studies, one win, and why this role fits.', 'What do you want to know?'], best: 1 },
    { prompt: '"What is your weakness?"', options: ['I have none.', 'I over-plan, so now I time-box my planning.', 'I always come late. Like today.'], best: 1 },
    { prompt: '"Where do you see yourself in five years?"', options: ['In your chair, boss.', 'Leading projects here, with skills I built on this team.', 'Honestly, no idea.'], best: 1 },
    { prompt: '"Any questions for us?"', options: ['No.', 'What does a great first three months look like here?', 'Can I WFH every day?'], best: 1 },
    { prompt: '"Why did you leave your last job?"', options: ['My boss was the worst.', 'I wanted room to grow, and this role offers it.', 'They forgot my birthday.'], best: 1 },
  ],
  chat: [
    { prompt: '"I got the job!!"', options: ['ok', 'WAH congrats!! Makan to celebrate, I belanja!', 'Mine pays more.'], best: 1 },
    { prompt: '"Today was so tiring…"', options: ['Same.', 'Aww, want to talk about it, or should I just send memes?', 'Sleep lah.'], best: 1 },
    { prompt: '"Do you remember what I said yesterday?"', options: ['Yes, the presentation! How did it go?', 'Er… yes?', 'You talk a lot.'], best: 0 },
    { prompt: '"I failed my driving test."', options: ['Haha noob.', 'Aiyo. Many people pass the second time. You got this!', 'Just take e-hailing.'], best: 1 },
    { prompt: '"Mamak tonight?"', options: ['Can! Same place, 9pm?', 'Seen.', 'Maybe next year.'], best: 0 },
    { prompt: '"I miss hanging out."', options: ['K.', 'Me too! This Saturday, you pick the place.', 'Busy.'], best: 1 },
  ],
  family: [
    { prompt: '"Have you eaten?"', options: ['Not yet, busy.', 'Sudah. Nasi lemak. How are you both?', 'Why?'], best: 1 },
    { prompt: '"When are you coming home?"', options: ['Next long weekend. I miss your cooking.', "Don't know.", 'Traffic jam lah.'], best: 0 },
    { prompt: '"Your cousin got married."', options: ['So?', 'Wah, send them my congrats!', "Don't start."], best: 1 },
    { prompt: '"The roof is leaking again."', options: ["I'll help find a contractor this weekend.", 'Old house mah.', 'Use a bucket.'], best: 0 },
    { prompt: '"Are you sleeping enough?"', options: ['Who needs sleep.', 'Trying. Thanks for worrying about me.', 'Please lah.'], best: 1 },
  ],
};

/** Item sets for memory games. */
export const MEMORY_SETS: Record<'office' | 'hustle' | 'mamak', { id: string; label: string; icon: string }[]> = {
  office: [
    { id: 'email', label: 'Reply email', icon: '📧' },
    { id: 'meeting', label: 'Meeting', icon: '👥' },
    { id: 'report', label: 'Report', icon: '📊' },
    { id: 'call', label: 'Client call', icon: '📞' },
    { id: 'print', label: 'Print', icon: '🖨️' },
    { id: 'file', label: 'File docs', icon: '🗂️' },
    { id: 'slides', label: 'Slides', icon: '📽️' },
    { id: 'sign', label: 'Sign off', icon: '✍️' },
  ],
  hustle: [
    { id: 'kuih', label: 'Kuih', icon: '🍡' },
    { id: 'parcel', label: 'Parcel', icon: '📦' },
    { id: 'cake', label: 'Cake', icon: '🎂' },
    { id: 'shirt', label: 'T-shirt', icon: '👕' },
    { id: 'cookies', label: 'Cookies', icon: '🍪' },
    { id: 'flowers', label: 'Flowers', icon: '💐' },
    { id: 'phone-case', label: 'Phone case', icon: '📱' },
    { id: 'candle', label: 'Candle', icon: '🕯️' },
  ],
  mamak: MAMAK_MENU,
};