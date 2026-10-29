// Event content catalogue for HIDUP MALAYSIA. All names, places, parties, prices
// and outcomes are FICTIONAL GAME CONTENT. Money values are game estimates for
// balance, not real prices, fees, fines or tax advice.
//
// NOTE: engine/events.ts imports this file, so only TYPE imports are allowed from
// '../engine/events' to avoid a circular-initialisation crash.

import type { EventChoice, GameEventDef } from '../engine/events';
import type { GameState, SkillKey } from '../engine/types';
import { addDebt, addSkills, applyStats, clamp, earn, formatRM, log, round2, spend } from '../engine/core';
import { jobEligibility, resolveInterview } from '../engine/career';
import { breakUp, deepTalk, meetSomeone } from '../engine/social';
import { adoptPet } from '../engine/pet';
import { PET } from './pets';
import { chance, pick, randInt } from '../engine/rng';
import { backgroundById } from './backgrounds';
import { companies } from './companies';
import { jobById, jobs } from './jobs';
import { housingById } from './housing';
import { vehicleById } from './vehicles';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const hasJob = (s: GameState) => s.career.job !== null;
const isStudying = (s: GameState) => s.education.status === 'studying';
const isRenting = (s: GameState) => s.housing.optionId !== 'family' && s.housing.optionId !== 'owned';
const hasHousemates = (s: GameState) => isRenting(s) && (housingById(s.housing.optionId)?.housemates ?? 0) > 0;
const isSingle = (s: GameState) => s.relationships.partner === null;
const isCommitted = (s: GameState) => {
  const p = s.relationships.partner;
  return p !== null && p.stage !== 'talking';
};

const needPartner = (s: GameState): string | null => (s.relationships.partner ? null : 'You are not seeing anyone right now.');
const needJob = (s: GameState): string | null => (s.career.job ? null : 'You need a job for this.');

function sawFamily(s: GameState): void {
  s.relationships.lastFamilyContactDay = s.clock.day;
}

function sawFriends(s: GameState): void {
  s.relationships.lastFriendsDay = s.clock.day;
  s.today.socialised = true;
}

function communityAct(s: GameState): void {
  s.counters.communityActs += 1;
}

/** One day of pay for the current job (game rule: monthly salary / 26). */
function dayPay(s: GameState): number {
  const j = s.career.job;
  if (!j) return 0;
  return j.schedule === 'parttime' ? j.shiftPay : Math.round(j.monthlySalary / 26);
}

/** The main skill the current job grows. */
function jobSkill(s: GameState): SkillKey {
  const def = jobById(s.career.job?.jobId);
  const key = def ? (Object.keys(def.growth)[0] as SkillKey | undefined) : undefined;
  return key ?? 'communication';
}

function helpParents(s: GameState, amount: number): void {
  s.counters.helpedParentsTotal = round2(s.counters.helpedParentsTotal + amount);
}

/** Create an interview-stage application from a referral or recruiter. */
function createReferral(s: GameState, source: string): string {
  const studying = isStudying(s);
  const pool = jobs.filter(
    (j) =>
      (studying ? j.schedule !== 'fulltime' : j.schedule === 'fulltime') &&
      jobEligibility(s, j).ok &&
      !(s.career.job && s.career.job.jobId === j.id),
  );
  if (!pool.length) return `${source} looked around, but nothing matched your profile right now. Keep levelling up and ask again later.`;
  const job = pick(s, pool);
  const options = companies.filter((c) => job.industries.includes(c.industry));
  if (!options.length) return `${source} couldn't find an opening for you this round.`;
  const company = pick(s, options);
  s.logSeq += 1;
  const id = `ref-${s.logSeq}`;
  const salary = job.schedule === 'parttime' ? (job.shiftPay ?? 50) : job.salaryRange[0];
  s.career.applications.unshift({
    id,
    listingId: id,
    jobId: job.id,
    companyId: company.id,
    appliedDay: s.clock.day,
    respondDay: s.clock.day,
    status: 'interview',
    interviewDay: s.clock.day + 2,
    offerSalary: salary,
    score: 70,
  });
  log(s, 'event', `🤝 Referral: interview for ${job.title} at ${company.name} on day ${s.clock.day + 3}.`);
  return `${source} pushed your CV straight to the hiring manager. Interview for ${job.title} at ${company.name} in 2 days. Iron your shirt.`;
}

/** Settle the pending tax balance (simplified game simulation). */
function settleTax(s: GameState, penalty = 0): string {
  const due = s.finance.pendingTaxSettlement ?? 0;
  s.finance.pendingTaxSettlement = null;
  const note = ' (Simplified game simulation, not LHDN advice.)';
  if (due > 0) {
    spend(s, due + penalty, 'income tax balance', true);
    return `You paid ${formatRM(due + penalty)} in income tax balance${penalty ? `, including a ${formatRM(penalty)} late penalty (fictional)` : ''}.${note}`;
  }
  if (due < 0) {
    earn(s, -due);
    return `Your PCB over-deducted this year. Refund of ${formatRM(-due)} credited. Nice surprise!${note}`;
  }
  return `Nothing owed, no refund. Balanced like a perfectly pulled teh tarik.${note}`;
}

function holidayShiftPay(s: GameState): number {
  return dayPay(s) * 2;
}

interface FestiveOptions {
  id: string;
  title: string;
  icon: string;
  text: string;
  homeLabel: string;
  homeText: string;
  giftLabel: string;
  giftCost: number;
  giftText: string;
  houseLabel: string;
  houseText: string;
  memory: string;
}

/** Shared shape for the festive holiday events. */
function festive(o: FestiveOptions): GameEventDef {
  return {
    id: o.id,
    title: o.title,
    icon: o.icon,
    category: 'festive',
    trigger: 'scheduled',
    text: o.text,
    choices: [
      {
        id: 'balik',
        label: o.homeLabel,
        hint: 'Family +, happiness +, energy -. Peak-season travel costs extra.',
        cost: (s) => (s.housing.optionId === 'family' ? 60 : s.transport.vehicleId ? 150 : 240),
        outcomes: [
          {
            text: o.homeText,
            effect: { family: 12, stats: { happiness: 10, energy: -15, stress: -6, satiety: 25 }, minutes: 300, memory: o.memory },
            apply: (s) => {
              s.counters.trips += 1;
              sawFamily(s);
            },
          },
        ],
      },
      {
        id: 'gift',
        label: o.giftLabel,
        cost: o.giftCost,
        outcomes: [
          {
            text: o.giftText,
            effect: { family: 5, friends: 3, community: 2, stats: { happiness: 5 } },
            apply: (s) => sawFamily(s),
          },
        ],
      },
      {
        id: 'openhouse',
        label: o.houseLabel,
        hint: 'Free. Everyone is welcome.',
        outcomes: [
          {
            text: o.houseText,
            effect: { friends: 6, community: 2, stats: { happiness: 6, satiety: 30, energy: -6 }, minutes: 180 },
            apply: (s) => sawFriends(s),
          },
        ],
      },
      {
        id: 'shift',
        label: 'Volunteer for the holiday shift',
        hint: 'Double day pay (game rule). Family -.',
        requires: needJob,
        outcomes: [
          {
            text: 'The office is quiet, the aircon is cold, and your manager owes you one.',
            effect: { family: -6, performance: 4, stats: { happiness: -4, energy: -10 }, minutes: 480 },
            apply: (s) => {
              const pay = holidayShiftPay(s);
              earn(s, pay);
              return `Holiday shift pay: ${formatRM(pay)}.`;
            },
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

const interviewChoice = (id: 'star' | 'honest' | 'oversell' | 'chaos', label: string, hint: string, flavour: string): EventChoice => ({
  id,
  label,
  hint,
  requires: id === 'chaos' ? (s) => (s.mode === 'chaotic' ? null : 'Only in Chaotic mode. Realistic panels prefer answers to kuih.') : undefined,
  outcomes: [
    {
      text: flavour,
      effect: { minutes: 90, stats: { energy: -8, stress: 4 } },
      apply: (s, p) => resolveInterview(s, String(p.appId), id),
    },
  ],
});

export const events: GameEventDef[] = [
  // ===================== Scheduled: engine-referenced =====================
  {
    id: 'broke',
    title: 'Wallet: RM0. Perut: empty.',
    icon: '🪫',
    category: 'money',
    trigger: 'scheduled',
    text: 'Your bank app shows a number that makes you laugh so you don\'t cry. Dinner is a question mark. Time to ask for help or hustle something up.',
    choices: [
      {
        id: 'family',
        label: 'Call home and ask for help',
        hint: 'Family sends money. Pride takes a small hit.',
        outcomes: [
          {
            text: 'Mak didn\'t even ask why. RM200 arrived in ten minutes, with a voice note telling you to eat properly.',
            effect: { cash: 200, family: 2, stats: { stress: -6, happiness: -2 } },
            apply: (s) => sawFamily(s),
          },
        ],
      },
      {
        id: 'gig',
        label: 'Do quick delivery gigs all day',
        hint: 'Earn some cash, lose a day of energy.',
        outcomes: [
          { text: 'Ten hours of deliveries. Sore legs, RM130 in your pocket, and a new appreciation for riders.', effect: { cash: 130, minutes: 480, stats: { energy: -25, stress: 5 } } },
        ],
      },
      {
        id: 'friend',
        label: 'A friend belanja you makan',
        hint: 'You will owe them one.',
        outcomes: [
          { text: '{friend} sends RM80 and says "pay back when you can, bro". You will.', effect: { cash: 80, friends: 2, addDebt: { kind: 'family', label: 'Owe a friend (makan money)', amount: 80, monthlyPayment: 40, annualRate: 0 } } },
        ],
      },
    ],
  },
  {
    id: 'interview',
    title: 'Interview at {company}',
    icon: '🎤',
    category: 'work',
    trigger: 'scheduled',
    text: 'Three people, one long table, one jug of water nobody touches. The panel at {company} looks up from your CV for the {job} role: "So, tell us about yourself."',
    choices: [
      interviewChoice('star', 'Answer with a STAR story', 'Situation, Task, Action, Result. Works best with good communication.', 'You take a deep breath and walk them through a real situation, step by step...'),
      interviewChoice('honest', 'Be honest about your gaps', 'Steady and safe.', 'You admit what you don\'t know yet, and what you\'re doing about it...'),
      interviewChoice('oversell', 'Oversell confidently', 'High risk, high reward.', 'You describe yourself as "basically a 10x synergy ninja"...'),
      interviewChoice('chaos', 'Bring kuih for the panel', 'Chaotic mode only. Kuih lapis diplomacy.', 'You open a container of kuih lapis. The panel exchanges glances...'),
    ],
  },
  {
    id: 'burnout',
    title: 'Running on empty',
    icon: '🔥',
    category: 'health',
    trigger: 'scheduled',
    text: 'You stared at the same email for twenty minutes. Your chest feels tight, sleep isn\'t helping, and everything feels heavy. This is burnout, and your body is asking for a pause.',
    choices: [
      {
        id: 'leave',
        label: 'Take a week of medical leave',
        hint: 'Big recovery. Performance -5.',
        outcomes: [
          {
            text: 'The clinic doctor writes you an MC without blinking. You sleep, eat properly, and slowly feel human again.',
            effect: { stats: { stress: -35, health: 10, happiness: 8, energy: 20 }, performance: -5 },
            apply: (s) => {
              s.flags.leaveUntil = s.clock.day + 5;
              s.counters.burnouts += 1;
            },
          },
        ],
      },
      {
        id: 'push',
        label: 'Push through',
        hint: 'Nothing gets better. Health and happiness drop.',
        outcomes: [
          {
            text: 'You power through on kopi and willpower. It works, sort of, for now.',
            effect: { stats: { health: -8, happiness: -6 } },
            apply: (s) => {
              s.counters.burnouts += 1;
            },
          },
        ],
      },
      {
        id: 'counsellor',
        label: 'Talk to a counsellor',
        hint: 'RM150 session. Stress -25.',
        cost: 150,
        outcomes: [
          {
            text: 'Saying it out loud to someone trained to listen helps more than you expected. You leave with a plan, not just a pep talk.',
            effect: { stats: { stress: -25, health: 5, happiness: 4 } },
            apply: (s) => {
              s.counters.burnouts += 1;
            },
          },
        ],
      },
    ],
  },
  {
    id: 'relationship-crisis',
    title: 'We need to talk',
    icon: '💬',
    category: 'love',
    trigger: 'scheduled',
    text: (s) =>
      s.relationships.partner
        ? `${s.relationships.partner.name} texts: "Can we talk tonight? Properly." Things have felt distant lately, and you both know it.`
        : 'The conversation you were dreading has quietly passed. Still, it leaves you thinking.',
    choices: [
      {
        id: 'deep',
        label: 'Have an honest deep talk',
        requires: needPartner,
        outcomes: [
          {
            text: 'You sit down with {partner}, phones face down.',
            effect: { partnerTrust: 4, minutes: 90 },
            apply: (s) => deepTalk(s).join(' '),
          },
        ],
      },
      {
        id: 'space',
        label: 'Agree to take some space',
        requires: needPartner,
        outcomes: [
          {
            text: 'You both agree to breathe for a few days. It\'s not a fix, but it lowers the temperature.',
            effect: { partnerSatisfaction: 3, stats: { stress: -4 } },
          },
        ],
      },
      {
        id: 'breakup',
        label: 'End the relationship',
        requires: needPartner,
        outcomes: [
          {
            text: 'You say what you\'ve both been thinking.',
            apply: (s) => breakUp(s, false).join(' '),
          },
        ],
      },
      {
        id: 'later',
        label: 'Not tonight. Sleep on it',
        outcomes: [{ text: 'You put it off for another day. The worry comes to bed with you.', effect: { stats: { stress: 3 } } }],
      },
    ],
  },
  {
    id: 'tax-filing',
    title: 'e-Filing season',
    icon: '🧾',
    category: 'money',
    trigger: 'scheduled',
    text: (s) => {
      const due = s.finance.pendingTaxSettlement;
      const status =
        due === null ? 'Your records show nothing pending.' : due > 0 ? `Your estimate says you owe about ${formatRM(due)}.` : due < 0 ? `Your estimate says you're due a refund of about ${formatRM(-due)}.` : 'Your PCB seems to match exactly.';
      return `It's income tax filing season. Your group chat is full of "eh how to claim lifestyle relief ah?" ${status} (Simplified game simulation, not LHDN advice.)`;
    },
    choices: [
      {
        id: 'file',
        label: 'File it now',
        outcomes: [{ text: 'You log in, find your EA form, and click through the boxes.', effect: { minutes: 60, stats: { stress: 2 } }, apply: (s) => settleTax(s) }],
      },
      {
        id: 'later',
        label: 'Procrastinate',
        hint: 'Deadline is a problem for future you.',
        outcomes: [{ text: 'You add "file tax" to your to-do list, right below "file tax" from last week.', effect: { stats: { stress: 3 } }, followUp: { eventId: 'tax-late', inDays: 21 } }],
      },
      {
        id: 'agent',
        label: 'Hire a tax agent',
        hint: 'RM200, zero headache.',
        cost: 200,
        outcomes: [{ text: 'A calm uncle with three calculators sorts it out in fifteen minutes.', effect: { stats: { stress: -6, happiness: 3 } }, apply: (s) => settleTax(s) }],
      },
    ],
  },
  {
    id: 'tax-late',
    title: 'Tax filing overdue',
    icon: '⏰',
    category: 'money',
    trigger: 'scheduled',
    text: (s) => {
      const due = s.finance.pendingTaxSettlement;
      if (due !== null && due > 0) return `Oops. The deadline passed. You still owe about ${formatRM(due)}, and late filing comes with a fictional RM100 penalty in this game.`;
      return 'The deadline passed, but you weren\'t owing anything. Still, better get it done.';
    },
    choices: [
      {
        id: 'pay',
        label: 'Pay it all now',
        outcomes: [
          {
            text: 'You file and pay. Lesson learned (probably).',
            effect: { minutes: 60, stats: { stress: -2 } },
            apply: (s) => settleTax(s, (s.finance.pendingTaxSettlement ?? 0) > 0 ? 100 : 0),
          },
        ],
      },
      {
        id: 'instalment',
        label: 'Ask for an instalment plan',
        hint: 'Spread it out as a debt (game rule).',
        outcomes: [
          {
            text: 'You file and arrange to pay over a few months.',
            effect: { minutes: 90, stats: { stress: 2 } },
            apply: (s) => {
              const due = s.finance.pendingTaxSettlement ?? 0;
              if (due <= 0) return settleTax(s);
              s.finance.pendingTaxSettlement = null;
              const total = due + 100;
              addDebt(s, 'overdue', 'Tax instalment', total, Math.max(50, round2(total / 6)), 0.05);
              return `${formatRM(total)} (including a fictional RM100 penalty) moved to an instalment plan. (Simplified game simulation, not LHDN advice.)`;
            },
          },
        ],
      },
    ],
  },
  {
    id: 'new-year-resolution',
    title: 'New year, new me',
    icon: '🎆',
    category: 'world',
    trigger: 'scheduled',
    text: 'Fireworks over the city, a hundred "new year new me" posts on your feed. What\'s your resolution this year?',
    choices: [
      { id: 'gym', label: 'Get fit (for real this time)', outcomes: [{ text: 'You download three workout apps. A strong start.', effect: { flags: { resolution: 'gym' }, stats: { happiness: 3, fitness: 1 } } }] },
      { id: 'save', label: 'Save more money', outcomes: [{ text: 'You make a budget spreadsheet with colour coding. Very motivating.', effect: { flags: { resolution: 'save' }, stats: { happiness: 2, stress: -2 } } }] },
      { id: 'learn', label: 'Learn a new skill', outcomes: [{ text: 'You bookmark seventeen online courses. Step one complete.', effect: { flags: { resolution: 'learn' }, skills: { communication: 1 }, stats: { happiness: 2 } } }] },
      { id: 'vibes', label: 'No resolution, just vibes', outcomes: [{ text: 'You resolve to have no resolutions. Undefeated.', effect: { flags: { resolution: 'vibes' }, stats: { stress: -4, happiness: 3 } } }] },
    ],
  },
  festive({
    id: 'festive-cny',
    title: 'Chinese New Year',
    icon: '🧧',
    text: 'Gong Xi Fa Cai! Red lanterns everywhere, mandarin oranges stacked like gold, and the highway north is already a parking lot. Reunion dinner plans are flying in the family chat.',
    homeLabel: 'Balik kampung to {home} for reunion dinner',
    homeText: 'Steamboat, yee sang tossed sky-high, and relatives asking about your salary. Worth every minute of the jam.',
    giftLabel: 'Give ang pao to the little ones',
    giftCost: 200,
    giftText: 'The kids bow politely, then compare ang pao thickness when they think you aren\'t looking.',
    houseLabel: 'Visit {friend}\'s CNY open house',
    houseText: 'Pineapple tarts, love letters, bak kwa, and a lion dance at the gate. Everyone\'s welcome, and you eat like it.',
    memory: 'CNY reunion dinner in {home}',
  }),
  festive({
    id: 'festive-raya',
    title: 'Hari Raya Aidilfitri',
    icon: '🌙',
    text: 'Selamat Hari Raya, maaf zahir dan batin! Pelita lights, ketupat being woven, and the playlist of Raya classics on repeat at every mall.',
    homeLabel: 'Balik kampung to {home}',
    homeText: 'Rendang tok, lemang by the fire, salam with every aunty in the taman. Your heart (and stomach) is full.',
    giftLabel: 'Hand out duit raya',
    giftCost: 200,
    giftText: 'Neat green packets for the kids. One of them thanks you with a full bow; another asks if you have a QR code option.',
    houseLabel: 'Go open-house hopping with {friend}',
    houseText: 'Four open houses, three kinds of rendang, two kuih bangkit tins demolished. Everyone\'s welcome, and everyone feeds you.',
    memory: 'Raya at home in {home}',
  }),
  festive({
    id: 'festive-haji',
    title: 'Hari Raya Aidiladha',
    icon: '🐄',
    text: 'Hari Raya Aidiladha. The community gathers early, and the korban meat is shared with neighbours and families in need. A day about sacrifice and sharing.',
    homeLabel: 'Head home to {home} to be with family',
    homeText: 'A quiet, warm day with family, followed by a feast of daging masak hitam.',
    giftLabel: 'Chip in for community food packs',
    giftCost: 150,
    giftText: 'Your contribution helps the surau committee pack food for families in the area. The volunteers wave as you leave.',
    houseLabel: 'Help out at {friend}\'s neighbourhood gathering',
    houseText: 'You help carry trays and pack containers for the neighbours. Everyone\'s welcome to lend a hand.',
    memory: 'Aidiladha with family',
  }),
  festive({
    id: 'festive-deepavali',
    title: 'Deepavali',
    icon: '🪔',
    text: 'Happy Deepavali! Colourful kolam at the doorsteps, oil lamps glowing, and the smell of murukku drifting through the neighbourhood.',
    homeLabel: 'Head home to {home} for the festival',
    homeText: 'Lamps lit at dusk, banana-leaf feast, fireworks with the cousins. A bright, happy day.',
    giftLabel: 'Bring a box of sweets and gifts',
    giftCost: 80,
    giftText: 'Your box of mithai and cookies is received with big smiles and a refill of your plate.',
    houseLabel: 'Visit {friend}\'s Deepavali open house',
    houseText: 'Mutton varuval, murukku, and a very insistent aunty who refills your plate twice. Everyone\'s welcome.',
    memory: 'Deepavali lights at {friend}\'s house',
  }),
  festive({
    id: 'festive-christmas',
    title: 'Christmas',
    icon: '🎄',
    text: 'Merry Christmas! The mall has fake snow in 33-degree weather and the carols are on loop. Your friends are planning a get-together.',
    homeLabel: 'Head home to {home} for the holidays',
    homeText: 'A long lunch with family, too much roast chicken, and board games that end in friendly arguments.',
    giftLabel: 'Join the Secret Santa gift exchange',
    giftCost: 80,
    giftText: 'You got {friend} the perfect gift. You received a mug that says "World\'s Okayest Adult". Fair.',
    houseLabel: 'Go to {friend}\'s Christmas open house',
    houseText: 'Turkey, curry devil, and fruitcake. Everyone\'s welcome, and the carolling gets surprisingly competitive.',
    memory: 'Christmas get-together with friends',
  }),
  {
    id: 'merdeka',
    title: 'Merdeka Day',
    icon: '🇲🇾',
    category: 'civic',
    trigger: 'scheduled',
    text: 'Merdeka! Flags on every balcony, patriotic songs on the radio, and the whole country on a public holiday. How do you celebrate?',
    choices: [
      { id: 'parade', label: 'Watch the parade', outcomes: [{ text: 'Jets fly overhead, the crowd cheers, and you get unexpectedly emotional during the national anthem.', effect: { community: 3, stats: { happiness: 6, energy: -6 }, minutes: 180 } }] },
      { id: 'flag', label: 'Hang the Jalur Gemilang', cost: 25, outcomes: [{ text: 'Your flag flutters proudly off the balcony. The neighbours follow suit.', effect: { community: 3, stats: { happiness: 4 } }, apply: (s) => communityAct(s) }] },
      {
        id: 'mamak',
        label: 'Mamak with friends for the match',
        cost: 35,
        outcomes: [
          {
            text: 'Big screen, roti canai, and a whole mamak chanting together. Win or lose, it was a good night.',
            effect: { friends: 6, stats: { happiness: 7, satiety: 25, energy: -6 }, minutes: 180 },
            apply: (s) => sawFriends(s),
          },
        ],
      },
      { id: 'rest', label: 'Sleep in. Patriotically.', outcomes: [{ text: 'You rest for the nation. Someone has to.', effect: { stats: { energy: 15, stress: -5 } } }] },
    ],
  },
  {
    id: 'trip-invite',
    title: 'Group trip with {friend}',
    icon: '🏝️',
    category: 'social',
    trigger: 'scheduled',
    text: '{friend} is organising a long-weekend island trip: beach, seafood, sunset photos. Flights and the shared villa come to about RM900 each.',
    choices: [
      {
        id: 'join',
        label: 'Join the trip',
        cost: 900,
        outcomes: [
          {
            text: 'Sunburn, grilled seafood, and a group photo that will be everyone\'s profile picture for a year.',
            effect: { friends: 8, stats: { happiness: 15, stress: -12, energy: -10 }, memory: 'Island trip with {friend}', post: 'Island mode activated 🏝️' },
            apply: (s) => {
              s.counters.trips += 1;
              sawFriends(s);
            },
          },
        ],
      },
      {
        id: 'credit',
        label: 'Join on credit',
        hint: 'Personal loan RM900 at 18%/yr (game rule).',
        outcomes: [
          {
            text: 'The trip is amazing. The statement next month is less amazing.',
            effect: {
              friends: 8,
              stats: { happiness: 12, stress: -8, energy: -10 },
              addDebt: { kind: 'personal', label: 'Trip on credit', amount: 900, monthlyPayment: 150, annualRate: 0.18 },
              memory: 'Island trip with {friend}',
            },
            apply: (s) => {
              s.counters.trips += 1;
              sawFriends(s);
            },
          },
        ],
      },
      { id: 'decline', label: 'Decline politely', outcomes: [{ text: '"Next trip confirm I join!" You enjoy their photos from your couch.', effect: { friends: -2, stats: { happiness: -2 } } }] },
    ],
  },
  {
    id: 'futsal-invite',
    title: 'Futsal night',
    icon: '⚽',
    category: 'social',
    trigger: 'scheduled',
    text: '{friend}: "Court booked 9 PM, we\'re short one player. You in?"',
    choices: [
      {
        id: 'join',
        label: 'Lace up and play',
        requires: (s) => (s.stats.energy >= 25 ? null : 'Too tired to run (need 25 energy).'),
        outcomes: [
          {
            weight: 5,
            text: 'You score one, miss three, and celebrate all four. Teh ais after hits different.',
            effect: { friends: 6, stats: { fitness: 3, happiness: 6, stress: -6, energy: -18 }, minutes: 120 },
            apply: (s) => sawFriends(s),
          },
          {
            weight: 1,
            text: 'You twist your ankle chasing a ball that was clearly going out. Ice pack and pride both bruised.',
            effect: { friends: 4, stats: { fitness: 1, health: -6, energy: -20, happiness: 1 }, minutes: 120 },
            apply: (s) => sawFriends(s),
          },
        ],
      },
      { id: 'decline', label: 'Pass this time', outcomes: [{ text: 'You send a thumbs-up and a "next week". They find someone else.', effect: { friends: -1 } }] },
    ],
  },
  {
    id: 'friend-wedding',
    title: '{friend}\'s wedding',
    icon: '💐',
    category: 'social',
    trigger: 'scheduled',
    text: 'The invite card is gorgeous. {friend} is getting married and wants you there!',
    choices: [
      {
        id: 'attend',
        label: 'Attend and give duit kahwin',
        cost: 100,
        outcomes: [{ text: 'Nasi minyak, a heartfelt hug, and a door gift. Lovely day.', effect: { friends: 6, stats: { happiness: 6, satiety: 30, energy: -8 }, minutes: 240 }, apply: (s) => sawFriends(s) }],
      },
      {
        id: 'big',
        label: 'Attend with a bigger gift',
        cost: 300,
        outcomes: [
          {
            text: '{friend} tears up a little when they see you. You\'re clearly in the "close friend" table.',
            effect: { friends: 10, stats: { happiness: 8, satiety: 30, energy: -8 }, minutes: 240, memory: '{friend}\'s wedding' },
            apply: (s) => sawFriends(s),
          },
        ],
      },
      { id: 'wishes', label: 'Send warm wishes only', outcomes: [{ text: 'A sincere message and a cute sticker. {friend} replies with hearts.', effect: { friends: 1 } }] },
    ],
  },
  {
    id: 'referral-offer',
    title: '{friend} wants to refer you',
    icon: '🤝',
    category: 'opportunity',
    trigger: 'scheduled',
    text: '{friend}: "Eh, my company is hiring. Send me your CV, I\'ll pass it to my boss directly."',
    choices: [
      { id: 'send', label: 'Send your CV', outcomes: [{ text: 'You polish your CV and send it over with a thank-you sticker.', effect: { friends: 2 }, apply: (s, p) => createReferral(s, String(p.friend ?? 'Your friend')) }] },
      { id: 'decline', label: 'Thank them, but not now', outcomes: [{ text: '"No worries, the offer stands!" Good friend.', effect: { friends: 1 } }] },
    ],
  },

  // ===================== Scheduled: follow-ups =====================
  {
    id: 'loan-repaid',
    title: '{friend} paid you back',
    icon: '💸',
    category: 'money',
    trigger: 'scheduled',
    text: (_s, p) => `Notification: ${String(p.friend)} transferred ${formatRM(Number(p.amount ?? 0))}. "Thanks for helping me out bro/sis!" Faith in humanity: restored.`,
    choices: [
      {
        id: 'thank',
        label: 'Say thanks',
        outcomes: [
          {
            text: 'Money back, friendship intact. Best outcome.',
            effect: { friends: 4, stats: { happiness: 4 } },
            apply: (s, p) => {
              const amt = Number(p.amount ?? 0);
              earn(s, amt);
              s.relationships.moneyLent = round2(Math.max(0, s.relationships.moneyLent - amt));
            },
          },
        ],
      },
      {
        id: 'treat',
        label: 'Tell them to keep RM50 and belanja you next time',
        outcomes: [
          {
            text: 'They insist on supper this weekend. Generous friends attract generous friends.',
            effect: { friends: 7, stats: { happiness: 5 } },
            apply: (s, p) => {
              const amt = Number(p.amount ?? 0);
              earn(s, Math.max(0, amt - 50));
              s.relationships.moneyLent = round2(Math.max(0, s.relationships.moneyLent - amt));
            },
          },
        ],
      },
    ],
  },
  {
    id: 'loan-ghosted',
    title: 'Where\'s the money, {friend}?',
    icon: '👻',
    category: 'money',
    trigger: 'scheduled',
    text: (_s, p) => `It's been weeks since you lent ${String(p.friend)} ${formatRM(Number(p.amount ?? 0))}. They've been posting cafe photos daily, but your messages are on "seen".`,
    choices: [
      {
        id: 'remind',
        label: 'Send a gentle reminder',
        outcomes: [
          {
            weight: 2,
            text: '"Sorry sorry! Forgot!" They pay back half now, half "next month".',
            effect: { stats: { stress: -2 } },
            apply: (s, p) => {
              const half = Math.round(Number(p.amount ?? 0) / 2);
              earn(s, half);
              s.relationships.moneyLent = round2(Math.max(0, s.relationships.moneyLent - half));
              return `Received ${formatRM(half)}.`;
            },
          },
          { weight: 1, text: 'Blue ticks. No reply. The silence is loud.', effect: { stats: { stress: 4, happiness: -3 }, friends: -2 } },
        ],
      },
      {
        id: 'letgo',
        label: 'Let it go',
        hint: 'Write it off. Peace of mind.',
        outcomes: [
          {
            text: 'You write it off as the price of a lesson. Next time, lend only what you can afford to lose.',
            effect: { stats: { happiness: -3, stress: -3 } },
            apply: (s, p) => {
              s.relationships.moneyLent = round2(Math.max(0, s.relationships.moneyLent - Number(p.amount ?? 0)));
            },
          },
        ],
      },
      {
        id: 'vague',
        label: 'Post a vague status about "some people"',
        outcomes: [{ text: 'Three mutual friends react with 👀. {friend} unfollows you. Money still missing.', effect: { friends: -5, stats: { stress: 3 }, post: 'Some people ah... borrow fast, return slow 🙂' } }],
      },
    ],
  },
  {
    id: 'scheme-collapse',
    title: 'The "investment" vanished',
    icon: '🕳️',
    category: 'money',
    trigger: 'scheduled',
    text: 'The "guaranteed returns" group chat has been renamed "Deleted Account". The website is down. Your money is gone. Classic: if it\'s guaranteed and too good to be true, it usually isn\'t either.',
    choices: [
      { id: 'report', label: 'Report it to the authorities', outcomes: [{ text: 'You file a police report and a complaint with the regulator. It may help the next victim.', effect: { community: 4, stats: { stress: 4, happiness: -4 }, minutes: 120 }, apply: (s) => communityAct(s) }] },
      { id: 'warn', label: 'Warn your friends', outcomes: [{ text: 'Your long post about red flags gets shared widely. Two friends were about to join.', effect: { friends: 4, stats: { reputation: 3, happiness: -3 }, post: 'PSA: "guaranteed returns" = guaranteed red flag. Learned the hard way 🙏' } }] },
    ],
  },

  // ===================== Commute =====================
  {
    id: 'car-breakdown',
    title: 'Breakdown on the road',
    icon: '🛠️',
    category: 'commute',
    trigger: 'random',
    contexts: ['commute'],
    cooldownDays: 20,
    when: (s) => s.transport.vehicleId !== null,
    weight: (s) => 0.5 + (100 - s.transport.vehicleCondition) / 40,
    text: (s) => `Your ${vehicleById(s.transport.vehicleId)?.name ?? 'ride'} coughs, shudders, and stops by the roadside. Hazard lights on. Sigh.`,
    choices: [
      {
        id: 'workshop',
        label: 'Tow it to a proper workshop',
        hint: 'Expensive, but properly fixed.',
        cost: (s) => (vehicleById(s.transport.vehicleId)?.kind === 'motorcycle' ? 200 : 480),
        outcomes: [
          {
            text: 'The mechanic replaces the parts with the confidence of a surgeon. It runs like new(ish).',
            effect: { stats: { stress: 4 }, minutes: 120 },
            apply: (s) => {
              s.transport.vehicleCondition = Math.max(s.transport.vehicleCondition, 80);
            },
          },
        ],
      },
      {
        id: 'friend',
        label: 'Call your mechanic friend',
        cost: 120,
        outcomes: [
          {
            weight: 2,
            text: '{friend} arrives with a toolbox and a can-do attitude. Fixed by sunset, payment in teh tarik plus parts.',
            effect: { friends: 3, minutes: 90 },
            apply: (s) => {
              s.transport.vehicleCondition = Math.max(s.transport.vehicleCondition, 60);
            },
          },
          {
            weight: 1,
            text: '"Should be okay already." It is not okay already. It dies again two streets later. You take an e-hailing ride home.',
            effect: { cash: -30, stats: { stress: 6 }, minutes: 120 },
          },
        ],
      },
      { id: 'ehailing', label: 'Leave it and take e-hailing', outcomes: [{ text: 'Problem postponed. The car will still be broken tomorrow.', effect: { cash: -40, stats: { stress: 3 }, minutes: 45 } }] },
    ],
  },
  {
    id: 'traffic-jam',
    title: 'Highway jam',
    icon: '🚗',
    category: 'commute',
    trigger: 'random',
    contexts: ['commute'],
    cooldownDays: 7,
    when: (s) => s.transport.mode === 'car' || s.transport.mode === 'ehailing',
    text: 'An accident three lanes away has turned the highway into a car park. Waze says "+45 min". The car next to you is doing full karaoke.',
    choices: [
      { id: 'wait', label: 'Sit tight and listen to a podcast', outcomes: [{ text: 'You learn a lot about ancient Rome. Arrival: very late.', effect: { minutes: 45, stats: { stress: 4 }, skills: { communication: 0.5 } } }] },
      { id: 'detour', label: 'Take the "shortcut" through the taman', outcomes: [{ weight: 1, text: 'It works! You beat the jam and feel like a genius.', effect: { minutes: 15, stats: { happiness: 3 } } }, { weight: 1, text: 'Everyone else had the same idea. Now you\'re stuck behind a lorry in a taman.', effect: { minutes: 60, stats: { stress: 7 } } }] },
      { id: 'mamak', label: 'Exit and wait it out at a mamak', cost: 12, outcomes: [{ text: 'Roti telur and teh tarik while the jam clears. Zen.', effect: { minutes: 60, stats: { stress: -3, satiety: 20 } } }] },
    ],
  },
  {
    id: 'rain-530',
    title: '5:30 PM downpour',
    icon: '🌧️',
    category: 'commute',
    trigger: 'random',
    contexts: ['commute'],
    cooldownDays: 6,
    text: 'Clear sky all day. At exactly 5:30 PM, the sky opens like it has a personal grudge against your commute.',
    choices: [
      { id: 'wait', label: 'Wait it out under shelter', outcomes: [{ text: 'You scroll your phone for 40 minutes until it eases to a drizzle.', effect: { minutes: 40, stats: { stress: 2 } } }] },
      { id: 'brave', label: 'Brave it', outcomes: [{ weight: 2, text: 'Soaked to the socks, but home on time.', effect: { stats: { health: -3, happiness: -2 } } }, { weight: 1, text: 'Soaked, and you catch a sniffle.', effect: { stats: { health: -6, energy: -5 } } }] },
      { id: 'grab', label: 'Book a ride (surge pricing!)', outcomes: [{ text: 'Surge price x2.3. Dry, but poorer.', effect: { cash: -35, minutes: 30 } }] },
    ],
  },
  {
    id: 'flash-flood',
    title: 'Flash flood!',
    icon: '🌊',
    category: 'commute',
    trigger: 'random',
    contexts: ['commute'],
    cooldownDays: 30,
    text: 'One hour of rain and the underpass is now a river. Cars are turning back. Someone is filming a fish swimming past.',
    choices: [
      { id: 'reroute', label: 'Turn back and take the long way', outcomes: [{ text: 'An extra hour, but you and your belongings stay dry.', effect: { minutes: 60, stats: { stress: 5 } } }] },
      { id: 'help', label: 'Help push a stalled car to higher ground', outcomes: [{ text: 'You and three strangers push an auntie\'s car to safety. She gives you all kuih from her back seat.', effect: { minutes: 45, community: 4, stats: { happiness: 5, energy: -8, health: -2 } }, apply: (s) => communityAct(s) }] },
      { id: 'wait', label: 'Wait at a nearby kopitiam', cost: 10, outcomes: [{ text: 'Kopi O and a front-row seat to the chaos. The water recedes after two hours.', effect: { minutes: 120, stats: { stress: -2 } } }] },
    ],
  },
  {
    id: 'train-delay',
    title: 'Train delay',
    icon: '🚆',
    category: 'commute',
    trigger: 'random',
    contexts: ['commute'],
    cooldownDays: 8,
    when: (s) => s.transport.mode === 'public',
    text: '"We apologise for the inconvenience. Due to a technical issue, services are delayed." The platform fills up like a sardine tin.',
    choices: [
      { id: 'wait', label: 'Wait for the next train', outcomes: [{ text: 'Thirty minutes later you squeeze in, face-to-armpit with a stranger.', effect: { minutes: 30, stats: { stress: 4, energy: -3 } } }] },
      { id: 'bus', label: 'Take the shuttle bus', outcomes: [{ text: 'The free shuttle takes the scenic route through every traffic light in the city.', effect: { minutes: 50, stats: { stress: 2 } } }] },
      { id: 'ehailing', label: 'Book an e-hailing ride', outcomes: [{ text: 'Everyone had the same idea. Surge pricing, but you get there.', effect: { cash: -28, minutes: 25 } }] },
    ],
  },
  {
    id: 'motorcycle-rain',
    title: 'Rain on the motorbike',
    icon: '🏍️',
    category: 'commute',
    trigger: 'random',
    contexts: ['commute'],
    cooldownDays: 6,
    when: (s) => s.transport.mode === 'motorcycle',
    text: 'Dark clouds ahead. Every rider on the highway is pulling under the flyover to put on raincoats.',
    choices: [
      { id: 'flyover', label: 'Shelter under the flyover', outcomes: [{ text: 'You join the flyover community. Twenty minutes later, the rain lets up.', effect: { minutes: 25, stats: { stress: 1 } } }] },
      { id: 'raincoat', label: 'Raincoat on, ride carefully', outcomes: [{ text: 'Slow and steady. Wet shoes, safe arrival.', effect: { minutes: 15, stats: { energy: -4, health: -1 } } }] },
      { id: 'rush', label: 'Rush through it', outcomes: [{ weight: 2, text: 'You arrive drenched, but on time.', effect: { stats: { health: -4, stress: 3 } } }, { weight: 1, text: 'You skid on a slippery patch. Just scrapes, but it\'s a scare. Slow down next time.', effect: { stats: { health: -10, stress: 8 }, cash: -60 } }] },
    ],
  },
  {
    id: 'parking-summons',
    title: 'Parking summons',
    icon: '🎫',
    category: 'commute',
    trigger: 'random',
    contexts: ['commute', 'shopping', 'food'],
    cooldownDays: 20,
    when: (s) => s.transport.mode === 'car',
    text: 'You were gone "five minutes". A summons is tucked under your wiper. The parking app says your session expired 12 minutes ago.',
    choices: [
      {
        id: 'accept',
        label: 'Accept it and pay later',
        hint: 'Adds a fictional RM30 to your pending fines.',
        outcomes: [{ text: 'Into the glovebox it goes, joining its friends.', effect: { stats: { stress: 2 } }, apply: (s) => { s.transport.pendingFines = round2(s.transport.pendingFines + 30); } }],
      },
      { id: 'pay', label: 'Pay it right away online', cost: 30, outcomes: [{ text: 'Paid in two minutes. Adulting achievement unlocked.', effect: { stats: { stress: -1 } } }] },
      { id: 'appeal', label: 'Write a heartfelt appeal', outcomes: [{ weight: 1, text: 'Your appeal is accepted with a warning. Your writing skills pay off.', effect: { skills: { communication: 1 }, minutes: 30 } }, { weight: 2, text: 'Appeal rejected. The summons stands.', effect: { minutes: 30, stats: { stress: 3 } }, apply: (s) => { s.transport.pendingFines = round2(s.transport.pendingFines + 30); } }] },
    ],
  },
  {
    id: 'toll-empty',
    title: 'Toll card: insufficient balance',
    icon: '🚧',
    category: 'commute',
    trigger: 'random',
    contexts: ['commute'],
    cooldownDays: 15,
    when: (s) => s.transport.mode === 'car',
    text: 'BEEP. Red light. "Baki tidak mencukupi." The honking behind you starts immediately.',
    choices: [
      { id: 'reload', label: 'Reload at the counter, apologising to everyone', outcomes: [{ text: 'Sweaty, red-faced, but done. You reload extra this time.', effect: { cash: -50, minutes: 10, stats: { stress: 5, reputation: -1 } } }] },
      { id: 'lane', label: 'Reverse into the next lane', outcomes: [{ text: 'A careful three-point turn with an audience. Another car lets you in. Malaysian kindness exists.', effect: { minutes: 10, stats: { stress: 6 } } }] },
    ],
  },

  // ===================== Work =====================
  {
    id: 'office-emergency',
    title: 'Office emergency',
    icon: '🚨',
    category: 'work',
    trigger: 'random',
    contexts: ['work'],
    cooldownDays: 14,
    when: hasJob,
    text: 'A client issue just landed at {employer}. "All hands on deck." It\'s 4:45 PM.',
    choices: [
      { id: 'stay', label: 'Stay back and fix it', outcomes: [{ text: 'You fix it by 8 PM. The team cheers in the group chat.', effect: { performance: 6, minutes: 120, stats: { stress: 6, energy: -10 } } }] },
      { id: 'help', label: 'Help for an hour, then hand over', outcomes: [{ text: 'You document everything neatly and hand over. Balanced.', effect: { performance: 2, minutes: 60, stats: { stress: 2 } } }] },
      { id: 'leave', label: 'Leave on time (your hours are your hours)', outcomes: [{ text: 'You leave at 6. Someone else handles it. Your manager notices.', effect: { performance: -3, stats: { stress: -2, happiness: 2 } } }] },
    ],
  },
  {
    id: 'boss-quick-call',
    title: '"Quick call?" at 5:59 PM',
    icon: '📞',
    category: 'chaos',
    trigger: 'random',
    modes: ['chaotic'],
    contexts: ['work'],
    cooldownDays: 10,
    when: hasJob,
    text: 'Your laptop is half closed. Your manager pings: "Quick call?" History tells you nothing is ever quick.',
    choices: [
      { id: 'join', label: 'Join the call', outcomes: [{ text: 'The "quick call" lasts 74 minutes and ends with "let\'s sync again tomorrow".', effect: { performance: 3, minutes: 75, stats: { stress: 6, happiness: -3 } } }] },
      { id: 'tomorrow', label: '"Can we do 9 AM tomorrow?"', outcomes: [{ weight: 2, text: '"Sure, no rush!" It really wasn\'t urgent. Boundaries work.', effect: { stats: { stress: -2 } } }, { weight: 1, text: '"Hmm okay..." The ellipsis haunts you all night.', effect: { performance: -2, stats: { stress: 4 } } }] },
      { id: 'tunnel', label: 'Pretend you\'re in a tunnel', outcomes: [{ text: '"Hello? Hel...ksshh..." You are in your living room. It somehow works.', effect: { stats: { happiness: 3 }, performance: -1 } }] },
    ],
  },
  {
    id: 'credit-stolen',
    title: 'Who did the slides?',
    icon: '🦊',
    category: 'work',
    trigger: 'random',
    contexts: ['work'],
    cooldownDays: 30,
    when: hasJob,
    text: 'In the big meeting, {friend} presents YOUR analysis as "something I put together over the weekend".',
    choices: [
      { id: 'speak', label: 'Speak up calmly in the meeting', outcomes: [{ weight: 1, text: '"Happy to take questions on the methodology since I built it." The room gets it.', effect: { performance: 5, stats: { reputation: 3, stress: 3 } } }, { weight: 1, text: 'It comes out awkward. Everyone looks at their notebooks.', effect: { stats: { stress: 6, reputation: -1 } } }] },
      { id: 'email', label: 'Send a follow-up email with the files attached', outcomes: [{ text: 'A neat email, CC your manager, with version history. Receipts win.', effect: { performance: 4, skills: { communication: 1 }, minutes: 20 } }] },
      { id: 'let', label: 'Let it go this time', outcomes: [{ text: 'You stay quiet. It stings, and you make a note to share your work earlier next time.', effect: { stats: { happiness: -4, stress: 3 } } }] },
    ],
  },
  {
    id: 'teambuilding-rest-day',
    title: 'Mandatory fun on Saturday',
    icon: '🎯',
    category: 'chaos',
    trigger: 'random',
    modes: ['chaotic'],
    contexts: ['work'],
    cooldownDays: 45,
    when: hasJob,
    text: 'HR announces a team-building event: Saturday, 7 AM, matching T-shirts, "attendance strongly encouraged". There will be a tug-of-war.',
    choices: [
      { id: 'go', label: 'Go and give it your all', outcomes: [{ text: 'Your team wins the tug-of-war. You are now best friends with Accounts.', effect: { friends: 3, performance: 3, stats: { energy: -15, happiness: 3, fitness: 2 }, minutes: 300 } }] },
      { id: 'excuse', label: '"Sorry, family kenduri."', outcomes: [{ text: 'Your excuse is accepted. You spend Saturday guiltlessly asleep.', effect: { stats: { energy: 12, stress: -4 }, performance: -1 } }] },
      { id: 'half', label: 'Show up for the lunch only', outcomes: [{ text: 'You arrive exactly when the nasi briyani does. Strategic.', effect: { stats: { satiety: 30, happiness: 3 }, minutes: 120 } }] },
    ],
  },
  {
    id: 'free-training',
    title: 'Free training course',
    icon: '🎓',
    category: 'work',
    trigger: 'random',
    contexts: ['work'],
    cooldownDays: 40,
    when: hasJob,
    text: '{employer} is sponsoring a two-day training course. It\'s free, but it eats into your schedule.',
    choices: [
      {
        id: 'join',
        label: 'Sign up',
        outcomes: [
          {
            text: 'Long slides, good coffee, and genuinely useful skills.',
            effect: { performance: 3, minutes: 240, stats: { energy: -8 } },
            apply: (s) => {
              addSkills(s, { [jobSkill(s)]: 3 });
              s.counters.booksOrCourses += 1;
              s.career.cvQuality = clamp(s.career.cvQuality + 3);
            },
          },
        ],
      },
      { id: 'skip', label: 'Skip it, too busy', outcomes: [{ text: 'You keep up with your tasks. Maybe next quarter.', effect: { stats: { stress: -1 } } }] },
    ],
  },
  {
    id: 'payday-trip-pressure',
    title: 'Payday plans',
    icon: '💳',
    category: 'work',
    trigger: 'random',
    contexts: ['work', 'social'],
    cooldownDays: 30,
    when: hasJob,
    text: 'Salary just came in. Your colleagues: "Weekend highlands trip! Only RM250 each lah, steamboat and strawberries!"',
    choices: [
      { id: 'go', label: 'Join them', cost: 250, outcomes: [{ text: 'Cold air, strawberries, steamboat at midnight. You bond with the team.', effect: { friends: 5, performance: 1, stats: { happiness: 8, stress: -6, energy: -8 } }, apply: (s) => { s.counters.trips += 1; sawFriends(s); } }] },
      { id: 'decline', label: 'Decline, money is for bills', outcomes: [{ text: 'You budget instead. Future you sends a thank-you note.', effect: { stats: { happiness: -2, stress: -2 } } }] },
      { id: 'dinner', label: 'Skip the trip, join the farewell dinner', cost: 40, outcomes: [{ text: 'A cheaper compromise. Still part of the gang.', effect: { friends: 2, stats: { happiness: 3, satiety: 25 } } }] },
    ],
  },
  {
    id: 'recruiter-headhunt',
    title: 'A recruiter slides into your DMs',
    icon: '🕵️',
    category: 'opportunity',
    trigger: 'random',
    contexts: ['work', 'any'],
    cooldownDays: 60,
    weight: 0.7,
    when: (s) => hasJob(s) && s.career.experienceDays >= 60,
    text: '"Hi! I came across your profile and think you\'d be a GREAT fit for an exciting opportunity." Could be real. Let\'s find out.',
    choices: [
      { id: 'talk', label: 'Hear them out', outcomes: [{ text: 'A real recruiter with a real role. They set up an interview.', effect: { minutes: 30 }, apply: (s) => createReferral(s, 'The recruiter') }] },
      { id: 'ignore', label: 'Not interested right now', outcomes: [{ text: 'You stay put. Loyalty, or comfort? Either is fine.', effect: { stats: { stress: -1 } } }] },
    ],
  },
  {
    id: 'report-mistake',
    title: 'Mistake in the report',
    icon: '😬',
    category: 'work',
    trigger: 'random',
    contexts: ['work'],
    cooldownDays: 25,
    when: hasJob,
    text: 'You spot a mistake in the report you sent to your manager yesterday. A wrong number. In bold. On page one.',
    choices: [
      { id: 'own', label: 'Own up and send a correction', outcomes: [{ text: '"Thanks for catching it." Honesty earns quiet respect.', effect: { performance: 2, stats: { stress: 2, reputation: 1 } } }] },
      { id: 'quiet', label: 'Fix it quietly and hope', outcomes: [{ weight: 1, text: 'Nobody noticed. Phew.', effect: { stats: { stress: 3 } } }, { weight: 1, text: 'Your manager noticed first. "Why didn\'t you flag it?" Ouch.', effect: { performance: -6, stats: { stress: 7 } } }] },
      { id: 'excel', label: 'Blame Excel', outcomes: [{ text: 'Excel did not, in fact, make the mistake. Everyone knows.', effect: { performance: -3, stats: { reputation: -2 } } }] },
    ],
  },
  {
    id: 'manager-praise',
    title: 'Shout-out from your manager',
    icon: '🌟',
    category: 'work',
    trigger: 'random',
    contexts: ['work'],
    cooldownDays: 30,
    when: (s) => hasJob(s) && (s.career.job?.performance ?? 0) >= 55,
    text: 'In the team meeting, your manager says: "Special thanks to {name} for the great work this month."',
    choices: [
      { id: 'growth', label: 'Ask about a growth path afterwards', outcomes: [{ text: 'Your manager outlines what a promotion would need. Clear targets!', effect: { performance: 4, stats: { happiness: 5 }, skills: { communication: 1 } } }] },
      { id: 'share', label: 'Share credit with the team', outcomes: [{ text: '"It was a team effort." The team remembers that.', effect: { performance: 3, friends: 3, stats: { happiness: 4, reputation: 2 } } }] },
    ],
  },

  // ===================== Study =====================
  {
    id: 'group-freeloader',
    title: 'The group assignment ghost',
    icon: '👥',
    category: 'study',
    trigger: 'random',
    contexts: ['study'],
    cooldownDays: 20,
    when: isStudying,
    text: 'Deadline in three days. One group member\'s only contribution so far: "ok noted 👍".',
    choices: [
      { id: 'cover', label: 'Do their part yourself', outcomes: [{ text: 'The assignment is excellent. You are exhausted.', effect: { minutes: 180, stats: { stress: 6, energy: -10 } }, apply: (s) => { s.education.knowledge = round2(clamp(s.education.knowledge + 3)); } }] },
      { id: 'confront', label: 'Message them kindly but firmly', outcomes: [{ weight: 2, text: 'Turns out they were going through something. They deliver their part, late but solid.', effect: { friends: 2, skills: { communication: 1 } } }, { weight: 1, text: '"ok noted 👍" again. Sigh.', effect: { stats: { stress: 4 } } }] },
      { id: 'report', label: 'Tell the lecturer (peer evaluation)', outcomes: [{ text: 'The lecturer adjusts marks fairly. Justice, academic edition.', effect: { stats: { stress: -2 }, friends: -1 } }] },
    ],
  },
  {
    id: 'class-cancelled',
    title: 'Class cancelled!',
    icon: '🎉',
    category: 'study',
    trigger: 'random',
    contexts: ['study'],
    cooldownDays: 10,
    when: isStudying,
    text: 'You arrive at the lecture hall. A note on the door: "Class cancelled today. Please read Chapter 7." Nobody will read Chapter 7.',
    choices: [
      { id: 'library', label: 'Actually read Chapter 7', outcomes: [{ text: 'You are the only one. You will remember this during finals.', effect: { minutes: 90 }, apply: (s) => { s.education.knowledge = round2(clamp(s.education.knowledge + 4)); } }] },
      { id: 'mamak', label: 'Mamak with coursemates', cost: 12, outcomes: [{ text: 'Roti canai and an extended debate about which lecturer is the strictest.', effect: { friends: 4, stats: { happiness: 5, satiety: 20 }, minutes: 90 }, apply: (s) => sawFriends(s) }] },
      { id: 'nap', label: 'Go back and nap', outcomes: [{ text: 'The best nap of the semester.', effect: { stats: { energy: 15, stress: -3 }, minutes: 90 } }] },
    ],
  },
  {
    id: 'surprise-quiz',
    title: 'Surprise quiz',
    icon: '📝',
    category: 'study',
    trigger: 'random',
    contexts: ['study'],
    cooldownDays: 14,
    when: isStudying,
    text: '"Okay class, take out a piece of paper." The room goes silent. Someone audibly whispers "astaga".',
    choices: [
      {
        id: 'try',
        label: 'Give it your best',
        outcomes: [
          {
            text: 'You read the questions carefully.',
            effect: { minutes: 30 },
            apply: (s) => {
              if (s.education.knowledge >= 45) {
                applyStats(s, { happiness: 5, stress: -2 });
                return 'You actually know this! Full marks feel close.';
              }
              applyStats(s, { stress: 6, happiness: -3 });
              return 'You recognise the words but not their meaning. Time to study more.';
            },
          },
        ],
      },
      { id: 'guess', label: 'Guess strategically', outcomes: [{ weight: 1, text: 'Somehow you get 6 out of 10. Luck is a skill.', effect: { stats: { happiness: 3 } } }, { weight: 1, text: '2 out of 10. The guessing strategy needs work.', effect: { stats: { stress: 4 } } }] },
    ],
  },
  {
    id: 'career-fair',
    title: 'Campus career fair',
    icon: '🏛️',
    category: 'study',
    trigger: 'random',
    contexts: ['study'],
    cooldownDays: 60,
    when: isStudying,
    text: 'The main hall is full of booths, free pens and recruiters. You have a backpack and, hopefully, a CV.',
    choices: [
      { id: 'network', label: 'Work the room', outcomes: [{ text: 'You talk to six recruiters, get feedback on your CV, and collect 14 pens.', effect: { minutes: 150, skills: { communication: 2 }, stats: { energy: -8 } }, apply: (s) => { s.career.cvQuality = clamp(s.career.cvQuality + 6); } }] },
      { id: 'freebies', label: 'Just collect freebies', outcomes: [{ text: 'Tote bags, keychains, a stress ball. Your stress, however, remains.', effect: { minutes: 60, stats: { happiness: 3 } } }] },
      { id: 'skip', label: 'Skip it, study instead', outcomes: [{ text: 'You hit the books.', effect: { minutes: 60 }, apply: (s) => { s.education.knowledge = round2(clamp(s.education.knowledge + 2)); } }] },
    ],
  },
  {
    id: 'scholarship-flyer',
    title: 'Scholarship opportunity',
    icon: '🎗️',
    category: 'study',
    trigger: 'random',
    contexts: ['study'],
    cooldownDays: 90,
    when: (s) => isStudying(s) && !s.education.scholarship,
    text: 'A flyer on the faculty board: a (fictional) foundation is offering scholarships for students with strong results and an essay about their goals.',
    choices: [
      {
        id: 'apply',
        label: 'Write the essay and apply',
        outcomes: [
          {
            text: 'You spend a weekend writing about your dreams and your family.',
            effect: { minutes: 240, stats: { energy: -10, stress: 4 }, skills: { communication: 1 } },
            apply: (s) => {
              const strong = s.education.cgpa >= 3.3 || (s.education.gpaHistory.length === 0 && s.education.knowledge >= 50);
              if (strong && chance(s, 0.5)) {
                s.education.scholarship = true;
                applyStats(s, { happiness: 15, stress: -8 });
                log(s, 'milestone', '🎗️ Scholarship awarded! Tuition covered from next semester (game rule: keep CGPA ≥ 3.00).');
                return 'Weeks later: "Congratulations!" You got the scholarship!';
              }
              applyStats(s, { happiness: -3 });
              return 'A polite rejection. The feedback says to strengthen your results and try again.';
            },
          },
        ],
      },
      { id: 'skip', label: 'Not this time', outcomes: [{ text: 'You take a photo of the flyer. It joins 900 other photos in your gallery.', effect: {} }] },
    ],
  },

  // ===================== Money =====================
  {
    id: 'phone-crack',
    title: 'Crack!',
    icon: '📱',
    category: 'money',
    trigger: 'random',
    contexts: ['any'],
    cooldownDays: 60,
    weight: 0.7,
    text: 'Your phone slips out of your pocket and lands face-down on the tiles. You turn it over slowly. Spiderweb.',
    choices: [
      { id: 'official', label: 'Official service centre repair', cost: 380, outcomes: [{ text: 'Good as new, and it only took three days.', effect: { stats: { happiness: 2 } } }] },
      { id: 'shop', label: 'Phone shop in the mall', cost: 150, outcomes: [{ weight: 3, text: 'Fixed in an hour. Touchscreen is slightly... enthusiastic now.', effect: { minutes: 60 } }, { weight: 1, text: 'Cheap screen. It cracks again in a week. Lesson learned.', effect: { minutes: 60, stats: { happiness: -4 } } }] },
      { id: 'live', label: 'Live with the cracks', outcomes: [{ text: 'Every swipe is a small adventure. Your thumb now has a tiny cut.', effect: { stats: { happiness: -3 } } }] },
    ],
  },
  {
    id: 'flash-sale',
    title: 'Midnight flash sale',
    icon: '🛒',
    category: 'money',
    trigger: 'random',
    contexts: ['night', 'home', 'shopping'],
    cooldownDays: 21,
    text: '12:00 AM. MEGA FLASH SALE. "Up to 90% off!" The cart has 11 items you didn\'t know you needed an hour ago.',
    choices: [
      { id: 'checkout', label: 'Check out everything', cost: 280, outcomes: [{ text: 'Dopamine hit! Seven parcels are on their way. You\'ll forget what three of them are.', effect: { stats: { happiness: 6 } } }] },
      { id: 'one', label: 'Buy just the one thing you need', cost: 45, outcomes: [{ text: 'Disciplined. Your wallet nods in approval.', effect: { stats: { happiness: 2 } } }] },
      { id: 'close', label: 'Close the app and sleep', outcomes: [{ text: 'The cart remains, haunting you. But your bank balance thanks you.', effect: { stats: { energy: 3, happiness: -1 } } }] },
    ],
  },
  {
    id: 'friend-borrow',
    title: '{friend} needs a loan',
    icon: '🤲',
    category: 'money',
    trigger: 'random',
    contexts: ['social', 'any'],
    cooldownDays: 45,
    params: (s) => ({ amount: pick(s, [200, 300, 500]) }),
    text: (_s, p) => `${String(p.friend)} messages: "Bro/sis, can borrow ${formatRM(Number(p.amount))}? Car repair, I'll pay back end of month, promise." They sound stressed.`,
    choices: [
      {
        id: 'lend',
        label: 'Lend the money',
        cost: (_s, p) => Number(p.amount ?? 0),
        outcomes: [
          { weight: 3, text: '"Thank you so much!" They seem genuinely relieved.', effect: { friends: 5 }, apply: (s, p) => { s.relationships.moneyLent = round2(s.relationships.moneyLent + Number(p.amount ?? 0)); }, followUp: { eventId: 'loan-repaid', inDays: 21 } },
          { weight: 2, text: '"Thank you so much!" They seem genuinely relieved.', effect: { friends: 5 }, apply: (s, p) => { s.relationships.moneyLent = round2(s.relationships.moneyLent + Number(p.amount ?? 0)); }, followUp: { eventId: 'loan-ghosted', inDays: 30 } },
        ],
      },
      { id: 'part', label: 'Lend RM100 only, what you can spare', cost: 100, outcomes: [{ text: '"It helps, thank you." A smaller risk.', effect: { friends: 2 }, apply: (s) => { s.relationships.moneyLent = round2(s.relationships.moneyLent + 100); } }] },
      { id: 'no', label: 'Kindly say you can\'t', outcomes: [{ text: '"No worries, I understand." Boundaries are healthy.', effect: { friends: -2, stats: { stress: 1 } } }] },
    ],
  },
  {
    id: 'scam-parcel',
    title: '"Your parcel is held at customs"',
    icon: '📦',
    category: 'money',
    trigger: 'random',
    contexts: ['any'],
    cooldownDays: 30,
    text: 'An SMS: "Your parcel is held at customs. Pay RM2.50 handling fee to release: hxxp://parcel-myy-release.co". Then a call from an "officer" who knows your full name.',
    choices: [
      { id: 'report', label: 'Ignore, block, and report', outcomes: [{ text: 'Blocked and reported. You warn the family group chat too.', effect: { family: 2, community: 2, stats: { stress: -1 } } }] },
      {
        id: 'click',
        label: 'Click the link, just in case',
        outcomes: [
          { weight: 1, text: 'Your bank\'s fraud team freezes the transaction and calls you. Close call!', effect: { stats: { stress: 8 } } },
          {
            weight: 2,
            text: 'You enter your card details for the "RM2.50 fee".',
            effect: { stats: { stress: 12, happiness: -10 } },
            apply: (s) => {
              const lost = Math.min(s.finance.cash, 480);
              if (lost > 0) spend(s, lost, 'scam');
              return `Minutes later: ${formatRM(lost)} gone. Never click links from unknown senders. Call your bank's official line immediately.`;
            },
          },
        ],
      },
    ],
  },
  {
    id: 'insurance-offer',
    title: 'Medical card offer',
    icon: '🩹',
    category: 'money',
    trigger: 'random',
    contexts: ['any', 'social'],
    cooldownDays: 60,
    when: (s) => !s.finance.insurance,
    text: 'Your secondary-school classmate {friend}, now an insurance agent, invites you for coffee. "Medical card only RM150 a month. Hospital bills are no joke."',
    choices: [
      { id: 'signup', label: 'Sign up (RM150/month)', outcomes: [{ text: 'Covered. One less worry if things go wrong.', effect: { stats: { stress: -4 } }, apply: (s) => { s.finance.insurance = true; } }] },
      { id: 'compare', label: 'Ask for a comparison of plans first', outcomes: [{ text: 'You compare three plans and learn what "deductible" means. Smart.', effect: { minutes: 60, skills: { business: 1 } } }] },
      { id: 'no', label: 'Politely decline', outcomes: [{ text: '"Okay, but if anything happens, call me ah." The coffee was nice.', effect: {} }] },
    ],
  },
  {
    id: 'guaranteed-returns',
    title: '"Guaranteed 30% returns!"',
    icon: '📈',
    category: 'money',
    trigger: 'random',
    contexts: ['social', 'any'],
    cooldownDays: 90,
    text: '{friend} adds you to a group: "Invest RM1,000, get 30% monthly, GUARANTEED. My cousin already bought a car!" There are lots of rocket emojis.',
    choices: [
      { id: 'invest', label: 'Invest RM1,000', cost: 1000, outcomes: [{ text: 'A week later, a RM50 "dividend" arrives. Exciting! (That\'s how they get you.)', effect: { cash: 50, stats: { happiness: 4 } }, followUp: { eventId: 'scheme-collapse', inDays: 14 } }] },
      { id: 'licence', label: 'Ask if they\'re licensed by the regulator', outcomes: [{ text: 'Silence. Then you get removed from the group. That answers it.', effect: { skills: { business: 1 }, stats: { reputation: 1 } } }] },
      { id: 'leave', label: 'Leave the group', outcomes: [{ text: 'If it sounds too good to be true, it probably is. Your money stays safe.', effect: { stats: { stress: -1 } } }] },
    ],
  },
  {
    id: 'bank-promo',
    title: 'Savings promo',
    icon: '🏦',
    category: 'money',
    trigger: 'random',
    contexts: ['any', 'shopping'],
    cooldownDays: 60,
    text: 'Your bank app pops up: "Promo! Higher interest on new savings deposits this quarter (game rate)." Tempting for once.',
    choices: [
      {
        id: 'deposit',
        label: 'Move RM500 into savings',
        requires: (s) => (s.finance.cash >= 500 ? null : 'Need RM500 cash.'),
        outcomes: [
          {
            text: 'RM500 moved to savings, plus a small welcome bonus. Future you is pleased.',
            effect: { stats: { stress: -2, happiness: 2 } },
            apply: (s) => {
              s.finance.cash = round2(s.finance.cash - 500);
              s.finance.savings = round2(s.finance.savings + 510);
            },
          },
        ],
      },
      { id: 'ignore', label: 'Ignore, the T&C has 14 pages', outcomes: [{ text: 'You close the app. Your money stays liquid (and spendable).', effect: {} }] },
    ],
  },
  {
    id: 'family-topup',
    title: 'Mak can tell something is off',
    icon: '💌',
    category: 'money',
    trigger: 'random',
    contexts: ['any'],
    cooldownDays: 60,
    weight: 6,
    when: (s) => {
      const overdue = s.finance.debts.filter((d) => d.kind === 'overdue').reduce((sum, d) => sum + d.balance, 0);
      const brokeLast = s.events.cooldowns.broke;
      const supported = backgroundById(s.character.backgroundId).familyAllowance > 0 && (isStudying(s) || s.housing.optionId === 'family') && !hasJob(s);
      return s.finance.cash < 50 && overdue >= 100 && !supported && (brokeLast === undefined || s.clock.day - brokeLast >= 14);
    },
    text: 'Mak calls "just to ask if you ate". Then, gently: "Money tight, is it? Abah and I put a little aside. Take it, we don\'t need to talk about it. Well, maybe a little."',
    choices: [
      {
        id: 'gift',
        label: 'Accept RM300 and listen to the advice',
        hint: 'Family +, stress -. Pride takes a small hit, and you will hear about eating properly.',
        outcomes: [
          {
            text: 'RM300 lands in ten minutes. The call lasts forty. You promise to eat vegetables and to visit soon.',
            effect: { cash: 300, family: 3, stats: { stress: -6, happiness: -2 }, minutes: 30 },
            apply: (s) => sawFamily(s),
          },
        ],
      },
      {
        id: 'loan',
        label: 'Take RM400 as a loan and repay RM50 a month',
        hint: 'Family +. You keep your pride, but it is a small monthly commitment.',
        outcomes: [
          {
            text: '"Pay back when you can, no rush." You set RM50 a month anyway. Abah approves of the spreadsheet.',
            effect: {
              cash: 400,
              family: 2,
              stats: { stress: -4 },
              addDebt: { kind: 'family', label: 'Borrowed from Mak and Abah', amount: 400, monthlyPayment: 50, annualRate: 0 },
              minutes: 30,
            },
            apply: (s) => sawFamily(s),
          },
        ],
      },
      {
        id: 'decline',
        label: 'Thank Mak and say you will manage',
        hint: 'Free. Pride intact, wallet still thin.',
        outcomes: [
          {
            text: '"Okay, but the offer stands." You hang up feeling proud and a little hungry. Maybe a delivery gig tomorrow.',
            effect: { family: 1, stats: { happiness: 1, stress: 2 }, minutes: 15 },
            apply: (s) => sawFamily(s),
          },
        ],
      },
    ],
  },

  // ===================== Family =====================
  {
    id: 'family-kenduri',
    title: 'Family kenduri',
    icon: '🍛',
    category: 'family',
    trigger: 'random',
    contexts: ['family', 'home', 'any'],
    cooldownDays: 45,
    text: 'The family group chat: "Kenduri this Saturday at Tok\'s house in {home}! Everyone come, need help with the cooking." 23 relatives have replied with stickers.',
    choices: [
      { id: 'help', label: 'Go early and help cook', cost: 60, outcomes: [{ text: 'You stir a giant pot of rendang for three hours. The aunties approve of you now.', effect: { family: 10, skills: { cooking: 2 }, stats: { energy: -14, happiness: 6, satiety: 30 }, minutes: 300 }, apply: (s) => sawFamily(s) }] },
      { id: 'eat', label: 'Show up just to eat', cost: 40, outcomes: [{ text: 'You arrive as the food is served. Some aunties notice. Most are just happy to see you.', effect: { family: 5, stats: { happiness: 5, satiety: 35 }, minutes: 180 }, apply: (s) => sawFamily(s) }] },
      { id: 'skip', label: 'Send apologies', outcomes: [{ text: 'You send a long apology voice note. Mak forwards it to the group.', effect: { family: -4 } }] },
    ],
  },
  {
    id: 'sibling-school-fees',
    title: 'Adik needs help',
    icon: '🎒',
    category: 'family',
    trigger: 'random',
    contexts: ['family', 'any'],
    cooldownDays: 60,
    when: (s) => s.finance.cash > 100,
    text: 'Your younger sibling texts quietly: "Can help with RM200 for school trip and books? Don\'t tell Abah."',
    choices: [
      { id: 'pay', label: 'Send the RM200', cost: 200, outcomes: [{ text: '"THANK YOU! Best kakak/abang ever!" Worth it.', effect: { family: 8, stats: { happiness: 5 } }, apply: (s) => { helpParents(s, 200); sawFamily(s); } }] },
      { id: 'half', label: 'Send RM80 and a pep talk', cost: 80, outcomes: [{ text: 'Some help and some life advice. They take both (one more enthusiastically).', effect: { family: 4 }, apply: (s) => { helpParents(s, 80); sawFamily(s); } }] },
      { id: 'no', label: 'Explain you\'re tight this month', outcomes: [{ text: '"Okay, it\'s fine." They understand. You still feel a bit bad.', effect: { family: -2, stats: { happiness: -2 } } }] },
    ],
  },
  {
    id: 'parents-roof',
    title: 'Roof leak at home',
    icon: '🏚️',
    category: 'family',
    trigger: 'random',
    contexts: ['family', 'home', 'any'],
    cooldownDays: 90,
    text: 'Mak sends a photo: three pails in the living room catching drips. "The roof leaking again. The contractor says RM600."',
    choices: [
      { id: 'pay', label: 'Pay for the full repair', cost: 600, outcomes: [{ text: 'Fixed before the monsoon. Abah calls just to say thank you, which he never does.', effect: { family: 12, stats: { happiness: 6 } }, apply: (s) => { helpParents(s, 600); sawFamily(s); } }] },
      { id: 'diy', label: 'Go home and patch it yourself', outcomes: [{ text: 'A weekend on a ladder with Abah, a tub of sealant and YouTube. It holds.', effect: { family: 9, cash: -80, stats: { energy: -15, fitness: 2 }, skills: { engineering: 1 }, minutes: 360 }, apply: (s) => sawFamily(s) }] },
      { id: 'later', label: '"Can we fix it next month?"', outcomes: [{ text: 'Mak says "ok". More pails are deployed.', effect: { family: -4, stats: { stress: 3 } } }] },
    ],
  },
  {
    id: 'mak-marriage',
    title: '"So, when are you getting married?"',
    icon: '💍',
    category: 'family',
    trigger: 'random',
    contexts: ['family', 'home', 'any'],
    cooldownDays: 60,
    when: (s) => s.character.startAge + s.clock.day / 365 >= 23 && s.relationships.partner?.stage !== 'married',
    text: (s) =>
      s.relationships.partner
        ? `Mak, on the phone: "So when are you and ${s.relationships.partner.name} getting married? Your cousin already has two kids."`
        : 'Mak, on the phone: "Your cousin is getting engaged. When is your turn? Should I ask Makcik Ros, her son is single..."',
    choices: [
      { id: 'boundary', label: 'Set a kind boundary', outcomes: [{ text: '"Mak, I\'ll know when I\'m ready. I\'m happy with my life now." She sighs, but she hears you.', effect: { family: 1, stats: { stress: -3, happiness: 3 }, skills: { communication: 1 } } }] },
      { id: 'joke', label: 'Joke your way out', outcomes: [{ text: '"After I finish paying my PTPTN, Mak." She laughs. The question will return.', effect: { family: 2, stats: { happiness: 2 } } }] },
      { id: 'setup', label: '"Okay fine, introduce lah."', outcomes: [{ text: 'Mak is delighted. You now have a "coffee" next weekend.', effect: { family: 5, stats: { stress: 3 } }, apply: (s) => (isSingle(s) ? meetSomeone(s, 'a family introduction') ?? undefined : undefined) }] },
    ],
  },
  {
    id: 'cousin-wedding',
    title: 'Cousin\'s wedding',
    icon: '👰',
    category: 'family',
    trigger: 'random',
    contexts: ['family', 'any'],
    cooldownDays: 90,
    text: 'Your cousin is getting married in {home}! The family wants matching outfits for the photo.',
    choices: [
      { id: 'full', label: 'Go, matching outfit and all', cost: 250, outcomes: [{ text: 'You look great in the family photo. The DJ plays the same three songs all night.', effect: { family: 10, stats: { happiness: 6, energy: -10, satiety: 30 }, minutes: 300 }, apply: (s) => sawFamily(s) }] },
      { id: 'simple', label: 'Go in your existing best outfit', cost: 80, outcomes: [{ text: 'Slightly off-colour in the photo, but present and happy.', effect: { family: 6, stats: { happiness: 4, energy: -10 }, minutes: 300 }, apply: (s) => sawFamily(s) }] },
      { id: 'skip', label: 'Can\'t make it, send a gift', outcomes: [{ text: 'A gift via e-wallet and warm wishes. Your aunt notices your absence.', effect: { family: -3, cash: -50 } }] },
    ],
  },
  {
    id: 'parent-health-check',
    title: 'Abah\'s check-up',
    icon: '🩺',
    category: 'family',
    trigger: 'random',
    contexts: ['family', 'any'],
    cooldownDays: 90,
    text: 'Abah has been feeling dizzy lately but says "nothing lah". Mak wants someone to take him for a proper check-up.',
    choices: [
      { id: 'take', label: 'Take a day to bring him to the clinic', cost: 150, outcomes: [{ text: 'Blood pressure a bit high, caught early. Abah grumbles but takes his meds now.', effect: { family: 12, stats: { stress: -3, energy: -8 }, minutes: 300, memory: 'Taking Abah for his check-up' }, apply: (s) => { helpParents(s, 150); sawFamily(s); } }] },
      { id: 'pay', label: 'Pay for it, ask a sibling to bring him', cost: 150, outcomes: [{ text: 'Your sibling takes him. You pay. Teamwork.', effect: { family: 6 }, apply: (s) => helpParents(s, 150) }] },
      { id: 'call', label: 'Call and convince him to go himself', outcomes: [{ weight: 1, text: 'He agrees. Eventually.', effect: { family: 2 } }, { weight: 1, text: '"Nothing lah!" He doesn\'t go. You worry.', effect: { stats: { stress: 5 } } }] },
    ],
  },
  // Family duties: kind requests for money, only for players who hold a job and have some to spare.
  // Every one has a free choice. Amounts are fictional game estimates.
  {
    id: 'family-clinic-bill',
    title: 'Mak\'s clinic bill',
    icon: '🏥',
    category: 'family',
    trigger: 'random',
    contexts: ['family', 'any'],
    cooldownDays: 150,
    when: (s) => hasJob(s) && s.finance.cash >= 1000,
    text: 'Mak mentions, very casually, that her knee clinic visit came to RM450 and she "will manage". Abah is quietly doing the sums on his pension.',
    choices: [
      { id: 'full', label: 'Cover the full RM450', cost: 450, outcomes: [{ text: '"Eh, no need lah..." she says, then keeps your transfer. Abah squeezes your shoulder.', effect: { family: 10, stats: { happiness: 4, stress: -2 } }, apply: (s) => { helpParents(s, 450); sawFamily(s); } }] },
      { id: 'share', label: 'Pay RM200 and share the rest with Abang and Kak Long', cost: 200, outcomes: [{ text: 'The sibling chat is busy for an hour, then the bill is sorted. Teamwork.', effect: { family: 6 }, apply: (s) => { helpParents(s, 200); sawFamily(s); } }] },
      { id: 'accompany', label: 'Take her to the next appointment instead', outcomes: [{ text: 'You sit in the waiting room, listen to her stories about the neighbours, and carry her bag. She enjoys it more than the money.', effect: { family: 5, stats: { energy: -6, happiness: 2 }, minutes: 180 }, apply: (s) => sawFamily(s) }] },
    ],
  },
  {
    id: 'sibling-tuition',
    title: 'Adik\'s semester fees',
    icon: '📚',
    category: 'family',
    trigger: 'random',
    contexts: ['family', 'any'],
    cooldownDays: 180,
    when: (s) => hasJob(s) && s.finance.cash >= 1500,
    text: 'Your younger sibling is in college and the semester fees are RM900 more than the loan covers. They have not asked. Mak mentions it anyway.',
    choices: [
      { id: 'full', label: 'Cover the RM900', cost: 900, outcomes: [{ text: 'They promise to pay you back "once I get a job". You both know you will say no.', effect: { family: 12, stats: { happiness: 5 } }, apply: (s) => { helpParents(s, 900); sawFamily(s); } }] },
      { id: 'part', label: 'Send RM400 and help them find a bursary', cost: 400, outcomes: [{ text: 'You fill in forms together until midnight. The bursary reply comes later. The effort counts.', effect: { family: 7, skills: { communication: 1 }, stats: { energy: -4 } }, apply: (s) => { helpParents(s, 400); sawFamily(s); } }] },
      { id: 'guide', label: 'Help them budget and look for part-time work', outcomes: [{ text: 'A spreadsheet, a lot of teh tarik and one clear plan. They leave looking more confident than before.', effect: { family: 5, skills: { communication: 1 }, stats: { energy: -5 }, minutes: 120 }, apply: (s) => sawFamily(s) }] },
    ],
  },
  {
    id: 'sibling-wedding-fund',
    title: 'Kakak\'s wedding fund',
    icon: '💐',
    category: 'family',
    trigger: 'random',
    contexts: ['family', 'any'],
    cooldownDays: 200,
    when: (s) => hasJob(s) && s.finance.cash >= 1200 && s.character.startAge + s.clock.day / 365 >= 24,
    text: 'Your older sister is getting married and the family is pooling money for the dais, the catering and the hantaran. Everyone is asked to contribute what they can.',
    choices: [
      { id: 'generous', label: 'Contribute RM500', cost: 500, outcomes: [{ text: 'Your name goes on the family list. Mak looks very proud.', effect: { family: 10, stats: { happiness: 4 } }, apply: (s) => { helpParents(s, 500); sawFamily(s); } }] },
      { id: 'usual', label: 'Contribute RM200', cost: 200, outcomes: [{ text: 'A fair amount, gratefully received. Everyone else gave about the same.', effect: { family: 6 }, apply: (s) => { helpParents(s, 200); sawFamily(s); } }] },
      { id: 'hands', label: 'Give your time: help with the preparations', outcomes: [{ text: 'You fold hundreds of door-gift boxes with the aunties. Your back disagrees, your heart does not.', effect: { family: 8, stats: { energy: -14, happiness: 3 }, minutes: 300 }, apply: (s) => sawFamily(s) }] },
    ],
  },
  {
    id: 'parents-fridge',
    title: 'The old fridge gives up',
    icon: '🧊',
    category: 'family',
    trigger: 'random',
    contexts: ['family', 'home', 'any'],
    cooldownDays: 240,
    when: (s) => hasJob(s) && s.finance.cash >= 1500,
    text: 'The fridge at home has made a strange noise for weeks and now it is warm inside. Mak is cooking in small portions "so nothing is wasted". A new one is about RM1,200.',
    choices: [
      { id: 'new', label: 'Buy them a new one (RM1,200)', cost: 1200, outcomes: [{ text: 'It arrives with a sticker on the door that Abah refuses to peel off. Mak fills it with kuih immediately.', effect: { family: 12, stats: { happiness: 6, stress: -3 } }, apply: (s) => { helpParents(s, 1200); sawFamily(s); } }] },
      { id: 'secondhand', label: 'Find a good second-hand one (RM450)', cost: 450, outcomes: [{ text: 'A neighbour\'s cousin knows a seller. It hums quietly and works well. Everyone is happy.', effect: { family: 7, stats: { happiness: 3 } }, apply: (s) => { helpParents(s, 450); sawFamily(s); } }] },
      { id: 'repair', label: 'Call a repairman and haggle with him for them', outcomes: [{ text: 'You spend an afternoon on the phone and in the kitchen. The repairman gives you a small discount and a long lecture. It runs again.', effect: { family: 5, stats: { energy: -8 }, minutes: 180 }, apply: (s) => sawFamily(s) }] },
    ],
  },

  // ===================== Social =====================
  {
    id: 'friend-otw',
    title: '"OTW!"',
    icon: '🐌',
    category: 'chaos',
    trigger: 'random',
    modes: ['chaotic'],
    contexts: ['social', 'food'],
    cooldownDays: 14,
    text: '{friend} texted "OTW!" 40 minutes ago. Their live location shows they are still at home. Possibly in the shower.',
    choices: [
      { id: 'wait', label: 'Wait patiently', outcomes: [{ text: 'They arrive 55 minutes later with bubble tea as an apology. Accepted.', effect: { minutes: 55, friends: 3, stats: { stress: 2 } } }] },
      { id: 'order', label: 'Order without them', cost: 20, outcomes: [{ text: 'By the time they arrive, you\'re on dessert.', effect: { stats: { satiety: 30, happiness: 3 } } }] },
      { id: 'call', label: 'Call them out in the group chat', outcomes: [{ text: 'You post a screenshot of their live location. The group chat erupts.', effect: { friends: 1, stats: { happiness: 4 } } }] },
    ],
  },
  {
    id: 'mamak-invite',
    title: 'Mamak session?',
    icon: '🫖',
    category: 'social',
    trigger: 'random',
    contexts: ['night', 'social', 'home'],
    cooldownDays: 7,
    text: '{friend}: "Mamak? 10 PM. Same place." It\'s already 9:45 PM.',
    choices: [
      { id: 'go', label: 'Go', cost: 15, outcomes: [{ text: 'Roti tisu, Milo ais, and a two-hour debate about nothing. Perfect.', effect: { friends: 5, stats: { happiness: 6, stress: -4, satiety: 20, energy: -6 }, minutes: 120 }, apply: (s) => sawFriends(s) }] },
      { id: 'short', label: 'Go for one drink only', cost: 5, outcomes: [{ text: '"Just one drink" becomes three. Still home before midnight.', effect: { friends: 3, stats: { happiness: 3 }, minutes: 60 }, apply: (s) => sawFriends(s) }] },
      { id: 'no', label: 'Stay in tonight', outcomes: [{ text: '"Next time!" You enjoy your quiet night.', effect: { stats: { energy: 4 } } }] },
    ],
  },
  {
    id: 'birthday-celebration',
    title: '{friend}\'s birthday',
    icon: '🎂',
    category: 'social',
    trigger: 'random',
    contexts: ['social', 'any'],
    cooldownDays: 30,
    text: 'It\'s {friend}\'s birthday! The group is planning a surprise dinner with a cake that has a slightly unflattering photo of them on it.',
    choices: [
      { id: 'join', label: 'Join and chip in for the gift', cost: 70, outcomes: [{ text: 'The surprise works. {friend} cries, laughs, then eats the cake with their own face on it.', effect: { friends: 7, stats: { happiness: 6, satiety: 25 }, minutes: 180 }, apply: (s) => sawFriends(s) }] },
      { id: 'wish', label: 'Send a heartfelt birthday message', outcomes: [{ text: 'A long, sincere message. {friend} screenshots it.', effect: { friends: 2 } }] },
    ],
  },
  {
    id: 'karaoke-night',
    title: 'Karaoke night',
    icon: '🎤',
    category: 'social',
    trigger: 'random',
    contexts: ['night', 'social'],
    cooldownDays: 21,
    text: 'The gang booked a karaoke room for three hours. Someone already queued four ballads in a row.',
    choices: [
      { id: 'sing', label: 'Grab the mic', cost: 40, outcomes: [{ text: 'You belt out a power ballad. You are not good. You are, however, iconic.', effect: { friends: 6, stats: { happiness: 8, stress: -6, energy: -8 }, minutes: 180 }, apply: (s) => sawFriends(s) }] },
      { id: 'tambourine', label: 'Go, but only on tambourine', cost: 40, outcomes: [{ text: 'The tambourine is a vital instrument and you are its master.', effect: { friends: 4, stats: { happiness: 5 }, minutes: 180 }, apply: (s) => sawFriends(s) }] },
      { id: 'no', label: 'Skip, save your voice', outcomes: [{ text: 'You watch the videos on Instagram the next day. Good choice? Debatable.', effect: { friends: -1 } }] },
    ],
  },
  {
    id: 'startup-pitch',
    title: '{friend}\'s startup',
    icon: '🚀',
    category: 'social',
    trigger: 'random',
    contexts: ['social', 'food'],
    cooldownDays: 60,
    text: '{friend} pitches over teh tarik: "It\'s like an app for... nasi lemak subscriptions. Uber for sambal. Want in? RM500 for 1%."',
    choices: [
      {
        id: 'invest',
        label: 'Invest RM500',
        cost: 500,
        outcomes: [
          { weight: 3, text: 'Six months later, the app pivots to pet food, then quietly closes. Your 1% is now a memory.', effect: { friends: 3, stats: { happiness: -2 } } },
          { weight: 1, text: 'It actually gets traction! A small payout comes back.', effect: { friends: 5, cash: 800, stats: { happiness: 8 } } },
        ],
      },
      { id: 'advice', label: 'Offer honest feedback instead', outcomes: [{ text: 'You poke holes in the plan kindly. {friend} takes notes, then buys your teh tarik.', effect: { friends: 4, skills: { business: 1 } } }] },
      { id: 'cheer', label: 'Cheer them on, no money', outcomes: [{ text: '"Go for it!" Support doesn\'t always need cash.', effect: { friends: 2 } }] },
    ],
  },
  {
    id: 'durian-party',
    title: 'Neighbour\'s durian party',
    icon: '🌵',
    category: 'social',
    trigger: 'random',
    contexts: ['home', 'social', 'food'],
    cooldownDays: 60,
    text: 'The smell arrives before the invitation. Your neighbour is hosting a durian party in the car porch: Musang King, D24, and very strong opinions.',
    choices: [
      { id: 'chip', label: 'Join and chip in', cost: 30, outcomes: [{ text: 'Creamy, bitter-sweet, glorious. You make friends with three neighbours.', effect: { community: 4, friends: 3, stats: { happiness: 7, satiety: 25 }, minutes: 120 }, apply: (s) => sawFriends(s) }] },
      { id: 'drinks', label: 'Bring drinks instead', cost: 15, outcomes: [{ text: 'You bring cold drinks and salt water (an old trick). Everyone is grateful.', effect: { community: 3, stats: { happiness: 4 }, minutes: 90 } }] },
      { id: 'no', label: 'Politely decline (not a durian person)', outcomes: [{ text: 'Totally valid. You close the windows and light a candle.', effect: {} }] },
    ],
  },

  // ===================== Love =====================
  {
    id: 'late-reply',
    title: 'Seen, no reply',
    icon: '📵',
    category: 'love',
    trigger: 'random',
    contexts: ['love', 'any'],
    cooldownDays: 21,
    when: (s) => s.relationships.partner !== null,
    text: 'You sent {partner} a message three hours ago. Double blue ticks. No reply. Your brain starts writing a whole drama series.',
    choices: [
      { id: 'ask', label: 'Ask kindly if everything\'s okay', outcomes: [{ text: '{partner}: "Sorry! Back-to-back meetings and my phone died 😭". All good.', effect: { partnerTrust: 3, partnerSatisfaction: 2, stats: { stress: -3 } } }] },
      { id: 'overthink', label: 'Overthink it', outcomes: [{ text: 'You spiral until midnight. They were just busy. You both feel a little off the next day.', effect: { partnerSatisfaction: -3, stats: { stress: 6, happiness: -3 }, flags: { misunderstanding: true } } }] },
      { id: 'space', label: 'Give them space', outcomes: [{ text: 'You carry on with your evening. They call later with a long, sweet apology.', effect: { partnerTrust: 2, stats: { stress: -1 } } }] },
    ],
  },
  {
    id: 'anniversary-forgot',
    title: 'Wait... what\'s today?',
    icon: '📅',
    category: 'love',
    trigger: 'random',
    contexts: ['love', 'any'],
    cooldownDays: 120,
    when: (s) => isCommitted(s) && s.clock.day - (s.relationships.partner?.sinceDay ?? s.clock.day) >= 30,
    text: '{partner} posts "Happy anniversary to my favourite person ❤️". You... completely forgot.',
    choices: [
      { id: 'dinner', label: 'Rush to book a nice dinner', cost: 180, outcomes: [{ text: 'You pull it off. They know you forgot, but they love the effort.', effect: { partnerSatisfaction: 6, partnerTrust: 2, stats: { stress: 3 }, minutes: 150 } }] },
      { id: 'honest', label: 'Apologise honestly and plan something properly', outcomes: [{ text: '"I forgot, and I\'m sorry. Let me make it up to you this weekend." Honesty helps.', effect: { partnerSatisfaction: -2, partnerTrust: 3 } }] },
      { id: 'pretend', label: 'Pretend you had a "surprise" planned', outcomes: [{ weight: 1, text: 'Your improvised "surprise" is a 7-Eleven cake. They laugh. Barely saved.', effect: { cash: -15, partnerSatisfaction: 1 } }, { weight: 1, text: 'They see right through it.', effect: { partnerTrust: -5, partnerSatisfaction: -5 } }] },
    ],
  },
  {
    id: 'meet-partner-family',
    title: 'Meet the family',
    icon: '👨‍👩‍👧',
    category: 'love',
    trigger: 'random',
    contexts: ['love', 'family', 'any'],
    cooldownDays: 120,
    when: (s) => {
      const p = s.relationships.partner;
      return p !== null && (p.stage === 'dating' || p.stage === 'committed' || p.stage === 'engaged');
    },
    text: '{partner}: "My parents want to meet you. Sunday lunch?" Your heart rate: elevated.',
    choices: [
      { id: 'gift', label: 'Go with a nice fruit basket', cost: 80, outcomes: [{ weight: 3, text: 'Their parents warm up to you by dessert. Their dad shows you his fish tank. Big honour.', effect: { partnerTrust: 6, partnerSatisfaction: 5, stats: { stress: 3, happiness: 4 }, minutes: 180 } }, { weight: 1, text: 'Slightly awkward, but polite. Mostly the dad asked about your job.', effect: { partnerTrust: 3, stats: { stress: 6 }, minutes: 180 } }] },
      { id: 'casual', label: 'Go as you are', outcomes: [{ text: 'You\'re yourself, and that\'s mostly fine. Their mum asks if you eat enough.', effect: { partnerTrust: 4, stats: { stress: 5 }, minutes: 180 } }] },
      { id: 'postpone', label: 'Ask to postpone', outcomes: [{ text: '{partner} understands, but looks a bit disappointed.', effect: { partnerSatisfaction: -4 } }] },
    ],
  },
  {
    id: 'long-distance-offer',
    title: '{partner} got a job offer elsewhere',
    icon: '✈️',
    category: 'love',
    trigger: 'random',
    contexts: ['love', 'any'],
    cooldownDays: 180,
    once: true,
    when: (s) => {
      const p = s.relationships.partner;
      return p !== null && !p.longDistance && p.stage !== 'talking' && s.clock.day - p.sinceDay >= 30;
    },
    text: '{partner}: "I got an offer in another state. It\'s a big step for my career... What do you think?"',
    choices: [
      { id: 'support', label: 'Support them, try long distance', outcomes: [{ text: 'Video calls, weekend bus rides, and a shared countdown app. You\'re doing this.', effect: { partnerTrust: 8, partnerSatisfaction: 4, stats: { stress: 4 } }, apply: (s) => { if (s.relationships.partner) s.relationships.partner.longDistance = true; } }] },
      { id: 'remote', label: 'Suggest they ask about remote work', outcomes: [{ weight: 1, text: 'The company agrees to hybrid! Best of both worlds.', effect: { partnerTrust: 4, partnerSatisfaction: 6 } }, { weight: 1, text: 'No remote option. They take the job anyway. Long distance it is.', effect: { partnerSatisfaction: -2 }, apply: (s) => { if (s.relationships.partner) s.relationships.partner.longDistance = true; } }] },
      { id: 'stay', label: 'Ask them to stay', outcomes: [{ text: 'They decline the offer. They say it\'s okay, but something feels unspoken.', effect: { partnerTrust: -4, partnerSatisfaction: -6 } }] },
    ],
  },
  {
    id: 'gym-crush',
    title: 'Gym crush',
    icon: '💪',
    category: 'love',
    trigger: 'random',
    contexts: ['gym'],
    cooldownDays: 30,
    when: isSingle,
    text: 'Someone at the gym keeps choosing the treadmill next to yours. They just asked if you\'re done with the 10kg dumbbells.',
    choices: [
      { id: 'talk', label: 'Strike up a conversation', outcomes: [{ text: 'You chat between sets.', effect: { stats: { happiness: 4 } }, apply: (s) => meetSomeone(s, 'the gym') ?? 'Nice chat, but nothing more.' }] },
      { id: 'focus', label: 'Focus on the workout', outcomes: [{ text: 'Eyes on the prize. You hit a personal best.', effect: { stats: { fitness: 1, happiness: 2 } } }] },
    ],
  },

  // ===================== Health =====================
  {
    id: 'food-poisoning',
    title: 'Food poisoning',
    icon: '🤢',
    category: 'health',
    trigger: 'random',
    contexts: ['food'],
    cooldownDays: 45,
    weight: 0.6,
    text: 'That roadside seafood looked amazing. Your stomach now strongly disagrees.',
    choices: [
      { id: 'clinic', label: 'Go to the clinic', cost: 50, outcomes: [{ text: 'Meds, rehydration salts, and an MC. You recover by tomorrow.', effect: { stats: { health: -3, energy: -10 }, minutes: 90 } }] },
      { id: 'ride', label: 'Ride it out at home', outcomes: [{ text: 'A long, long night. You and the bathroom are now close.', effect: { stats: { health: -8, energy: -20, happiness: -5 } } }] },
    ],
  },
  {
    id: 'sore-back',
    title: 'Desk-job back',
    icon: '🪑',
    category: 'health',
    trigger: 'random',
    contexts: ['work', 'study'],
    cooldownDays: 45,
    when: (s) => hasJob(s) || isStudying(s),
    text: 'You stand up after eight hours and your back makes a sound like old furniture.',
    choices: [
      { id: 'chair', label: 'Buy a proper ergonomic chair', cost: 350, outcomes: [{ text: 'Your spine sends a thank-you note.', effect: { stats: { health: 6, stress: -2 }, flags: { ergoChair: true } } }] },
      { id: 'massage', label: 'Get a massage', cost: 80, outcomes: [{ text: 'The masseur finds knots you didn\'t know existed. Painful, then blissful.', effect: { stats: { health: 4, stress: -5 }, minutes: 60 } }] },
      { id: 'stretch', label: 'Stretch with a YouTube video', outcomes: [{ text: 'Twenty minutes of stretches. Better, and free.', effect: { stats: { health: 2, fitness: 1 }, minutes: 20 } }] },
    ],
  },
  {
    id: 'dengue-scare',
    title: 'High fever',
    icon: '🦟',
    category: 'health',
    trigger: 'random',
    modes: ['realistic'],
    contexts: ['any'],
    cooldownDays: 90,
    weight: 0.5,
    text: 'High fever, body aches, and there\'s been a dengue warning in your area. It might be nothing, but it might not be.',
    choices: [
      { id: 'clinic', label: 'Get a blood test at the clinic', cost: 60, outcomes: [{ weight: 3, text: 'Just a viral fever. Rest, fluids, and you\'re fine in a few days.', effect: { stats: { health: -4, energy: -10, stress: -2 }, minutes: 120 } }, { weight: 1, text: 'Early dengue, caught in time. The doctor monitors you closely, and you recover with plenty of rest.', effect: { cash: -150, stats: { health: -12, energy: -25, stress: 6 }, minutes: 180 } }] },
      { id: 'rest', label: 'Rest at home and hydrate', outcomes: [{ weight: 2, text: 'The fever breaks after two days. Phew.', effect: { stats: { health: -6, energy: -15 } } }, { weight: 1, text: 'It gets worse. You end up at the clinic anyway. Next time, go early.', effect: { cash: -180, stats: { health: -15, energy: -25, stress: 8 } } }] },
      { id: 'clean', label: 'Also clear stagnant water around the house', outcomes: [{ text: 'You check every pot and drain. The neighbours follow your lead.', effect: { community: 3, stats: { health: -4, energy: -12 }, minutes: 60 }, apply: (s) => communityAct(s) }] },
    ],
  },
  {
    id: 'health-screening',
    title: 'Health screening reminder',
    icon: '🩸',
    category: 'health',
    trigger: 'random',
    contexts: ['any'],
    cooldownDays: 180,
    text: 'A pharmacy promo: full blood panel and health screening for RM120 (game estimate). You haven\'t had one since... ever?',
    choices: [
      { id: 'go', label: 'Book the screening', cost: 120, outcomes: [{ text: 'Cholesterol slightly high. Now you know, and you can do something about it.', effect: { stats: { health: 5, stress: -3 }, minutes: 90 } }] },
      { id: 'skip', label: 'Maybe next year', outcomes: [{ text: 'Ignorance is bliss. For now.', effect: {} }] },
    ],
  },
  {
    id: 'gym-injury',
    title: 'Pulled a muscle',
    icon: '🦵',
    category: 'health',
    trigger: 'random',
    contexts: ['gym'],
    cooldownDays: 45,
    weight: 0.6,
    text: 'You tried to match the guy who deadlifts while grunting. Your hamstring files a formal complaint.',
    choices: [
      { id: 'physio', label: 'See a physiotherapist', cost: 120, outcomes: [{ text: 'Proper treatment and exercises. You\'ll be back stronger.', effect: { stats: { health: 2, stress: -2 }, minutes: 90 } }] },
      { id: 'rest', label: 'Rest and ice it', outcomes: [{ text: 'A week of hobbling around. Ego bruised more than muscle.', effect: { stats: { health: -6, fitness: -2, happiness: -3 } } }] },
    ],
  },

  // ===================== Housing =====================
  {
    id: 'housemate-unpaid',
    title: 'Housemate owes rent',
    icon: '🏠',
    category: 'housing',
    trigger: 'random',
    contexts: ['home'],
    cooldownDays: 45,
    when: hasHousemates,
    text: 'Your housemate {friend} hasn\'t paid their share of the bills for two months. The electricity company doesn\'t care about excuses.',
    choices: [
      { id: 'cover', label: 'Cover it for now', cost: 120, outcomes: [{ weight: 1, text: '{friend} pays you back the following week, embarrassed and grateful.', effect: { friends: 3 }, apply: (s) => { earn(s, 120); } }, { weight: 1, text: '{friend} says "will pay soon". Soon is a flexible concept.', effect: { stats: { stress: 3 } } }] },
      { id: 'talk', label: 'Have a calm house meeting', outcomes: [{ text: 'You agree on a shared bills app. Awkward, but fair.', effect: { skills: { communication: 1 }, stats: { stress: -2 }, minutes: 45 } }] },
      { id: 'note', label: 'Leave a passive-aggressive sticky note', outcomes: [{ text: 'The note gets a reply note. A note war begins. Bills remain unpaid.', effect: { stats: { stress: 4, happiness: 1 } } }] },
    ],
  },
  {
    id: 'rent-raise',
    title: 'Landlord raises the rent',
    icon: '📈',
    category: 'housing',
    trigger: 'random',
    contexts: ['home'],
    cooldownDays: 180,
    when: isRenting,
    text: 'Landlord on WhatsApp: "Hi, due to rising costs, rent will go up. Please top up RM150 for adjustment." (Simplified: a one-off adjustment in this game.)',
    choices: [
      { id: 'accept', label: 'Accept it', outcomes: [{ text: 'You pay up. Not worth the fight.', effect: { cash: -150, stats: { stress: 2 } } }] },
      {
        id: 'negotiate',
        label: 'Negotiate politely',
        outcomes: [
          {
            text: 'You point out you\'ve always paid on time and kept the place clean.',
            effect: { minutes: 20 },
            apply: (s) => {
              if (s.skills.communication >= 30 || chance(s, 0.35)) {
                applyStats(s, { happiness: 4 });
                return 'The landlord agrees to keep it as is. "Good tenants are hard to find."';
              }
              spend(s, 75, 'rent adjustment', true);
              return 'You meet in the middle: RM75 instead.';
            },
          },
        ],
      },
    ],
  },
  {
    id: 'water-disruption',
    title: 'Water disruption',
    icon: '🚱',
    category: 'housing',
    trigger: 'random',
    contexts: ['home'],
    cooldownDays: 60,
    text: 'Scheduled water disruption for 24 hours in your area. You find out after you\'ve applied shampoo.',
    choices: [
      { id: 'bottled', label: 'Buy bottled water', cost: 20, outcomes: [{ text: 'You rinse with mineral water. Fancy, in a sad way.', effect: { stats: { stress: 2 } } }] },
      { id: 'gym', label: 'Shower at the gym', requires: (s) => (s.fitness.gymMember ? null : 'You need a gym membership.'), outcomes: [{ text: 'Your gym membership finally earns its keep.', effect: { minutes: 45, stats: { stress: -1 } } }] },
      { id: 'wait', label: 'Wait it out', outcomes: [{ text: 'You hang out at a cafe until the water returns. Shampoo hair under a cap.', effect: { stats: { happiness: -3 }, minutes: 60 } }] },
    ],
  },
  {
    id: 'noisy-neighbours',
    title: 'Noisy neighbours',
    icon: '🔊',
    category: 'housing',
    trigger: 'random',
    contexts: ['home', 'night'],
    cooldownDays: 30,
    text: 'It\'s 1 AM. Your neighbour is renovating? Moving furniture? Bowling? The thumps continue.',
    choices: [
      { id: 'talk', label: 'Knock and ask nicely', outcomes: [{ weight: 2, text: 'They apologise. They were assembling a wardrobe for their kid. It stops.', effect: { community: 2, stats: { stress: -2 } } }, { weight: 1, text: 'They shrug. It continues for another hour.', effect: { stats: { stress: 4, energy: -5 } } }] },
      { id: 'management', label: 'Complain to building management', outcomes: [{ text: 'Management sends a polite notice. Next week is quieter.', effect: { stats: { stress: -1 }, minutes: 15 } }] },
      { id: 'earplugs', label: 'Buy earplugs', cost: 15, outcomes: [{ text: 'Silence. Bliss. You now also can\'t hear your alarm.', effect: { stats: { energy: 4 } } }] },
    ],
  },
  {
    id: 'aircon-broke',
    title: 'Aircon died',
    icon: '🥵',
    category: 'housing',
    trigger: 'random',
    contexts: ['home', 'night'],
    cooldownDays: 90,
    when: (s) => s.housing.optionId !== 'family',
    text: 'The aircon makes a dramatic clunk and starts blowing warm air. It\'s 33 degrees at night.',
    choices: [
      { id: 'fix', label: 'Call a technician', cost: 250, outcomes: [{ text: 'Gas top-up and cleaning. Cold air returns. You hug the unit (metaphorically).', effect: { stats: { happiness: 4 } } }] },
      { id: 'landlord', label: 'Ask the landlord to fix it', requires: (s) => (isRenting(s) ? null : 'You own this place. You are the landlord.'), outcomes: [{ weight: 1, text: 'Fixed in two days, at no cost to you.', effect: { stats: { stress: -1 } } }, { weight: 1, text: 'Two weeks of "will send someone". Many sweaty nights.', effect: { stats: { energy: -10, stress: 5, health: -2 } } }] },
      { id: 'fan', label: 'Buy a standing fan', cost: 80, outcomes: [{ text: 'Old-school cooling. It works. Mostly.', effect: { stats: { energy: -3 } } }] },
      { id: 'windows', label: 'Open the windows and suffer', outcomes: [{ text: 'Mosquitoes, humidity and a restless night. Free, though.', effect: { stats: { energy: -8, stress: 3 } } }] },
    ],
  },

  // ===================== Civic (fictional) =====================
  {
    id: 'gotong-royong',
    title: 'Gotong-royong',
    icon: '🧹',
    category: 'civic',
    trigger: 'random',
    contexts: ['home', 'any'],
    cooldownDays: 45,
    text: 'The residents\' association is organising a gotong-royong this Saturday morning: clear drains, cut grass, then free nasi lemak.',
    choices: [
      { id: 'join', label: 'Join in', outcomes: [{ text: 'Three hours of honest work, a sunburnt neck, and the best nasi lemak of your life.', effect: { community: 6, friends: 2, stats: { fitness: 2, energy: -12, happiness: 5, satiety: 25 }, minutes: 180 }, apply: (s) => communityAct(s) }] },
      { id: 'donate', label: 'Donate drinks for volunteers', cost: 40, outcomes: [{ text: 'Your cold drinks are the MVP of the morning.', effect: { community: 3 }, apply: (s) => communityAct(s) }] },
      { id: 'skip', label: 'Sleep in', outcomes: [{ text: 'You hear the grass cutters from bed. A small pang of guilt.', effect: { stats: { energy: 5 }, community: -1 } }] },
    ],
  },
  {
    id: 'town-hall-bus',
    title: 'Town hall: Bus Route 88',
    icon: '🚌',
    category: 'civic',
    trigger: 'random',
    contexts: ['any'],
    cooldownDays: 90,
    text: 'The (fictional) Seri Harapan council is holding a town hall about rerouting Bus 88. Residents want input on stops and frequency.',
    choices: [
      { id: 'speak', label: 'Attend and share your view', outcomes: [{ text: 'You suggest a stop near the clinic. The councillor writes it down. Democracy, in action.', effect: { community: 5, skills: { communication: 1 }, minutes: 120 }, apply: (s) => communityAct(s) }] },
      { id: 'survey', label: 'Fill in the online survey', outcomes: [{ text: 'Five minutes, done. Small contributions count.', effect: { community: 2, minutes: 10 } }] },
      { id: 'skip', label: 'Skip it', outcomes: [{ text: 'Someone else will decide your bus route. Hopefully well.', effect: {} }] },
    ],
  },
  {
    id: 'election-day',
    title: 'Election day in Seri Harapan',
    icon: '🗳️',
    category: 'civic',
    trigger: 'random',
    contexts: ['any'],
    once: true,
    weight: 0.6,
    text: 'It\'s the (fictional) Seri Harapan by-election. Parti Kopi Ais Rakyat promises more shaded bus stops; Gabungan Teh Tarik Bersatu promises better drains and parks. Both have very catchy jingles.',
    choices: [
      { id: 'vote', label: 'Go vote', outcomes: [{ text: 'A short queue, a purple finger, and a quiet sense of pride. Whoever wins, you had your say.', effect: { community: 5, stats: { happiness: 4 }, minutes: 90, post: 'Done my part 🗳️ Purple finger gang.' }, apply: (s) => communityAct(s) }] },
      { id: 'agent', label: 'Volunteer as a polling-station helper', outcomes: [{ text: 'A long day keeping things orderly and fair. Tiring, but meaningful.', effect: { community: 8, stats: { energy: -18, happiness: 5 }, skills: { communication: 1 }, minutes: 480 }, apply: (s) => communityAct(s) }] },
      { id: 'skip', label: 'Skip it this time', outcomes: [{ text: 'You stay home. The results come in that night either way.', effect: { community: -2 } }] },
    ],
  },
  {
    id: 'pothole-report',
    title: 'The legendary pothole',
    icon: '🕳️',
    category: 'civic',
    trigger: 'random',
    contexts: ['commute', 'any'],
    cooldownDays: 60,
    text: 'There\'s a pothole on your road so deep it has its own ecosystem. Everyone swerves. Nobody reports it.',
    choices: [
      { id: 'report', label: 'Report it via the council\'s complaint app', outcomes: [{ text: 'Two weeks later, it\'s patched. You feel like a superhero.', effect: { community: 4, minutes: 10 }, apply: (s) => communityAct(s) }] },
      { id: 'post', label: 'Post a funny photo of it', outcomes: [{ text: 'Your post "Pothole or swimming pool?" goes mildly viral. Then it gets fixed.', effect: { community: 3, stats: { reputation: 2, happiness: 3 }, post: 'Our taman\'s new swimming pool 🏊 #pothole' } }] },
      { id: 'swerve', label: 'Keep swerving', outcomes: [{ text: 'You and the pothole have an understanding.', effect: {} }] },
    ],
  },
  {
    id: 'pay-summons',
    title: 'Summons discount week',
    icon: '💳',
    category: 'civic',
    trigger: 'random',
    contexts: ['any'],
    cooldownDays: 30,
    when: (s) => s.transport.pendingFines > 0,
    text: (s) => `A (fictional) discount campaign: settle outstanding summonses online at 50% off this week. You have ${formatRM(s.transport.pendingFines)} pending.`,
    choices: [
      {
        id: 'pay',
        label: 'Pay online at 50% off',
        cost: (s) => round2(s.transport.pendingFines / 2),
        outcomes: [{ text: 'Cleared! Your record is clean.', effect: { stats: { stress: -4 } }, apply: (s) => { s.transport.pendingFines = 0; } }],
      },
      { id: 'later', label: 'Deal with it later', outcomes: [{ text: 'The discount ends. The summonses don\'t.', effect: { stats: { stress: 2 } } }] },
    ],
  },

  // ===================== Chaos =====================
  {
    id: 'mamak-habit',
    title: 'Your mamak knows your order',
    icon: '🍳',
    category: 'chaos',
    trigger: 'random',
    modes: ['chaotic'],
    contexts: ['food', 'night'],
    cooldownDays: 30,
    text: 'The waiter sees you and shouts "Boss, roti telur bawang, teh tarik kurang manis, satu!" before you sit. You did the math: your mamak is now your most expensive weekly habit.',
    choices: [
      { id: 'embrace', label: 'Embrace it. This is home.', cost: 15, outcomes: [{ text: 'They give you a free papadom. You are family now.', effect: { stats: { happiness: 6, satiety: 25 } } }] },
      { id: 'cut', label: 'Cut back to twice a week', outcomes: [{ text: 'You cook at home more. Your wallet improves. You miss the vibes.', effect: { skills: { cooking: 1 }, stats: { happiness: -2 }, flags: { mamakDiet: true } } }] },
    ],
  },
  {
    id: 'battery-dies-late',
    title: 'Battery dead. Already late.',
    icon: '🔋',
    category: 'chaos',
    trigger: 'random',
    modes: ['chaotic'],
    contexts: ['commute'],
    cooldownDays: 30,
    when: (s) => s.transport.vehicleId !== null,
    text: 'You\'re already 10 minutes late. You turn the key. "Click click click." The battery has chosen today.',
    choices: [
      { id: 'jump', label: 'Ask the neighbour for a jump start', outcomes: [{ text: 'Uncle next door appears with cables and a sarong. Legend.', effect: { community: 2, minutes: 30, stats: { stress: 4 } } }] },
      { id: 'new', label: 'Call the battery delivery service', cost: 220, outcomes: [{ text: 'New battery installed in your car porch in 25 minutes. Modern miracles.', effect: { minutes: 30 } }] },
      { id: 'ehailing', label: 'E-hailing and deal with it later', outcomes: [{ text: 'You arrive late and sweaty, the battery still dead at home.', effect: { cash: -30, performance: -1, stats: { stress: 5 } } }] },
    ],
  },
  {
    id: 'office-surprise-kenduri',
    title: 'Surprise office kenduri',
    icon: '🍗',
    category: 'chaos',
    trigger: 'random',
    modes: ['chaotic'],
    contexts: ['work'],
    cooldownDays: 30,
    when: hasJob,
    text: '11:30 AM email: "Pantry. Now. Kenduri for the boss\'s promotion." There is nasi briyani, ayam masak merah, and 40 people converging.',
    choices: [
      { id: 'eat', label: 'Abandon all work and eat', outcomes: [{ text: 'Two plates, a nap-inducing afternoon, zero regrets.', effect: { friends: 3, stats: { satiety: 40, happiness: 6, energy: -6 }, minutes: 60 } }] },
      { id: 'tapau', label: 'Tapau and keep working', outcomes: [{ text: 'Efficient. Your boss notices your dedication (and your container).', effect: { performance: 2, stats: { satiety: 30 } } }] },
    ],
  },
  {
    id: 'stray-oyen',
    title: 'A ginger visitor',
    icon: '🐈',
    category: 'housing',
    trigger: 'random',
    contexts: ['home', 'commute'],
    weight: 3,
    cooldownDays: 20,
    when: (s) => !s.pet,
    text: 'A chubby ginger cat follows you all the way home and sits at your door, meowing like he pays rent. The neighbours call him Oyen.',
    choices: [
      {
        id: 'adopt',
        label: 'Take him in (vet check)',
        hint: 'He will need food every day.',
        cost: PET.adoptionFee,
        outcomes: [{ text: 'Oyen walks in like he owns the place. He does now.', apply: (s) => void adoptPet(s) }],
      },
      { id: 'bye', label: 'Give him some water and say bye', outcomes: [{ text: 'He drinks, judges you, and saunters off. You might see him again.', effect: { stats: { happiness: 2 } } }] },
    ],
  },
  {
    id: 'cat-keyboard',
    title: 'Cat on the keyboard',
    icon: '🐈',
    category: 'chaos',
    trigger: 'random',
    modes: ['chaotic'],
    contexts: ['work', 'home', 'study'],
    cooldownDays: 30,
    text: 'During a video meeting, a neighbourhood cat walks in through the window, across your keyboard, and unmutes you mid-yawn. The chat types "🐱🐱🐱".',
    choices: [
      { id: 'introduce', label: 'Introduce the cat to the meeting', outcomes: [{ text: 'Everyone loves the cat. The meeting ends 10 minutes early. Morale up.', effect: { friends: 3, stats: { happiness: 6 }, performance: 1 } }] },
      { id: 'pro', label: 'Stay professional and carry on', outcomes: [{ text: 'You carry on while the cat sits on your notes. Very composed.', effect: { stats: { stress: 2, reputation: 1 } } }] },
    ],
  },
  {
    id: 'viral-video',
    title: 'You went viral',
    icon: '📹',
    category: 'chaos',
    trigger: 'random',
    modes: ['chaotic'],
    contexts: ['any'],
    cooldownDays: 90,
    text: 'Someone filmed you dramatically dancing in the rain while waiting for your food delivery. 1.2 million views overnight.',
    choices: [
      { id: 'embrace', label: 'Embrace the fame', outcomes: [{ text: 'You repost it with "Yes, that\'s me." Brands start DMing you.', effect: { stats: { reputation: 6, happiness: 6 }, post: 'Yes, that\'s me in the video. No, I won\'t do it again. (I will.) 💃', cash: 150 } }] },
      { id: 'hide', label: 'Lay low', outcomes: [{ text: 'You wear a cap for a week. The internet moves on by Thursday.', effect: { stats: { stress: 3 } } }] },
    ],
  },
  {
    id: 'auntie-network',
    title: 'The auntie network',
    icon: '👵',
    category: 'chaos',
    trigger: 'random',
    modes: ['chaotic'],
    contexts: ['family', 'social', 'any'],
    cooldownDays: 60,
    text: 'Your aunt\'s friend\'s neighbour\'s son works at a company that "needs young people". The auntie network has activated on your behalf.',
    choices: [
      { id: 'accept', label: 'Accept the auntie referral', outcomes: [{ text: 'An auntie WhatsApp voice note is forwarded to an HR manager.', effect: { family: 3 }, apply: (s) => createReferral(s, 'The auntie network') }] },
      { id: 'thanks', label: 'Thank them, but no', outcomes: [{ text: '"Okay but if you change your mind ah..." They will remember this offer forever.', effect: { family: 1 } }] },
    ],
  },
  {
    id: 'race-lane-mixup',
    title: 'Wrong lane, wrong crowd',
    icon: '🛵',
    category: 'chaos',
    trigger: 'random',
    modes: ['chaotic'],
    contexts: ['commute', 'night'],
    cooldownDays: 60,
    when: (s) => s.transport.mode === 'motorcycle',
    text: 'At a red light at midnight, a group of loud modified bikes pulls up beside your humble kapcai. One of them revs at you. You have a basket with groceries in it.',
    choices: [
      { id: 'calm', label: 'Signal, wave, and ride home at the speed limit', outcomes: [{ text: 'They zoom off. You arrive home safely, groceries intact. The real winner.', effect: { stats: { stress: -1, happiness: 2 } } }] },
      { id: 'detour', label: 'Take a different road to avoid them', outcomes: [{ text: 'A longer route, but quiet and safe. Also, you discover a new burger stall.', effect: { minutes: 15, cash: -8, stats: { satiety: 20 } } }] },
    ],
  },

  // ===================== Opportunity =====================
  {
    id: 'freelance-gig',
    title: 'Freelance gig request',
    icon: '💼',
    category: 'opportunity',
    trigger: 'random',
    contexts: ['any', 'home'],
    cooldownDays: 30,
    when: (s) => s.skills.tech >= 25 || s.skills.creative >= 25,
    text: (s) =>
      s.skills.tech >= s.skills.creative
        ? '{friend}\'s cousin runs a small bakery and needs a simple website. "Can do by next week? RM450."'
        : '{friend}\'s cousin runs a small bakery and needs a new logo and menu design. "Can do by next week? RM450."',
    choices: [
      { id: 'take', label: 'Take the gig', outcomes: [{ text: 'A few late nights later, the client is happy and pays on time (rare!).', effect: { cash: 450, minutes: 240, stats: { energy: -15, stress: 4, reputation: 2 }, skills: { business: 1 } }, apply: (s) => { addSkills(s, s.skills.tech >= s.skills.creative ? { tech: 1 } : { creative: 1 }); } }] },
      { id: 'decline', label: 'Decline, no bandwidth', outcomes: [{ text: 'You refer them to someone else. Good karma.', effect: { friends: 1 } }] },
    ],
  },
  {
    id: 'hustle-spike',
    title: 'Customer rush!',
    icon: '📦',
    category: 'opportunity',
    trigger: 'random',
    contexts: ['any', 'home'],
    cooldownDays: 21,
    when: (s) => s.hustles.length > 0,
    text: 'Your side hustle suddenly gets a flood of orders. Someone with lots of followers mentioned you.',
    choices: [
      {
        id: 'grind',
        label: 'Work late to fulfil them all',
        outcomes: [
          {
            text: 'You fulfil every order by 2 AM. Exhausted, but the money is real.',
            effect: { minutes: 180, stats: { energy: -18, stress: 5, happiness: 5 } },
            apply: (s) => {
              const h = s.hustles[0];
              const revenue = randInt(s, 200, 400);
              earn(s, revenue);
              h.revenueTotal = round2(h.revenueTotal + revenue);
              h.monthRevenue = round2(h.monthRevenue + revenue);
              h.reputation = round2(clamp(h.reputation + 3));
              s.counters.hustleProfit = round2(s.counters.hustleProfit + revenue);
              return `Extra revenue: ${formatRM(revenue)}.`;
            },
          },
        ],
      },
      { id: 'cap', label: 'Cap orders and keep quality high', outcomes: [{ text: '"Sold out!" Scarcity makes you look even more popular.', effect: { stats: { happiness: 3 } }, apply: (s) => { const h = s.hustles[0]; h.reputation = round2(clamp(h.reputation + 2)); } }] },
    ],
  },
  {
    id: 'food-blogger',
    title: 'Featured by a food blogger',
    icon: '📸',
    category: 'opportunity',
    trigger: 'random',
    contexts: ['any'],
    cooldownDays: 60,
    weight: 0.6,
    when: (s) => s.hustles.length > 0,
    text: 'A local food and lifestyle blogger wants to feature your side business. "Free sample for review?"',
    choices: [
      { id: 'yes', label: 'Send a free sample', cost: 40, outcomes: [{ weight: 3, text: 'Glowing review! New customers follow.', effect: { stats: { reputation: 5, happiness: 6 } }, apply: (s) => { const h = s.hustles[0]; h.reputation = round2(clamp(h.reputation + 6)); } }, { weight: 1, text: '"It was... okay." Lukewarm, but exposure is exposure.', effect: { stats: { happiness: -1 } } }] },
      { id: 'no', label: 'Politely decline', outcomes: [{ text: 'You focus on your regulars. Steady wins too.', effect: {} }] },
    ],
  },
  {
    id: 'speaking-invite',
    title: 'Speaking invite',
    icon: '🎙️',
    category: 'opportunity',
    trigger: 'random',
    contexts: ['any', 'work', 'study'],
    cooldownDays: 90,
    when: (s) => s.skills.communication >= 30 || (s.career.job?.performance ?? 0) >= 70,
    text: 'Your old university wants you to give a talk to students: "Life after graduation: the real version".',
    choices: [
      { id: 'accept', label: 'Accept', outcomes: [{ text: 'Your honest talk gets laughs and real questions. Students line up afterwards.', effect: { minutes: 180, stats: { reputation: 6, stress: 5, happiness: 5 }, skills: { communication: 2 }, community: 3 } }] },
      { id: 'decline', label: 'Decline, public speaking is scary', outcomes: [{ text: 'Maybe next year, when you\'re more ready.', effect: {} }] },
    ],
  },

  // ===================== World =====================
  {
    id: 'festival-sale',
    title: 'Year-end mall sale',
    icon: '🛍️',
    category: 'world',
    trigger: 'random',
    contexts: ['shopping'],
    cooldownDays: 45,
    text: 'The mall is having its biggest sale of the year. "Buy 2 free 1" signs everywhere. Your willpower is being tested.',
    choices: [
      { id: 'clothes', label: 'Buy new work clothes', cost: 200, outcomes: [{ text: 'You look sharp. Confidence boosted.', effect: { stats: { happiness: 5, reputation: 2 } } }] },
      { id: 'window', label: 'Window-shop only', outcomes: [{ text: 'You walk 8,000 steps in aircon. Free exercise.', effect: { stats: { fitness: 1, happiness: 1 }, minutes: 60 } }] },
    ],
  },
  {
    id: 'fuel-price-change',
    title: 'Fuel price adjustment',
    icon: '⛽',
    category: 'world',
    trigger: 'random',
    contexts: ['any', 'commute'],
    cooldownDays: 60,
    when: (s) => s.transport.vehicleId !== null,
    text: 'News: (fictional) fuel prices go up by a few sen from midnight. Petrol stations already have queues.',
    choices: [
      { id: 'queue', label: 'Queue to fill up tonight', outcomes: [{ text: 'You save a bit compared to next week. It took 40 minutes.', effect: { cash: 15, minutes: 40, stats: { stress: 2 } } }] },
      { id: 'carpool', label: 'Start carpooling with a colleague', requires: needJob, outcomes: [{ text: 'You split fuel costs and gain a commute buddy.', effect: { friends: 3, cash: 20 } }] },
      { id: 'shrug', label: 'Shrug it off', outcomes: [{ text: 'Your fuel spending creeps up a little this month.', effect: { cash: -25 } }] },
    ],
  },
  {
    id: 'heatwave',
    title: 'Heatwave',
    icon: '☀️',
    category: 'world',
    trigger: 'random',
    contexts: ['any'],
    cooldownDays: 45,
    text: '37 degrees. The air feels like a hairdryer. Even the cats are lying flat.',
    choices: [
      { id: 'hydrate', label: 'Stay hydrated, cold drinks', cost: 10, outcomes: [{ text: 'Air bandung ais saves the day.', effect: { stats: { health: 2, happiness: 2 } } }] },
      { id: 'aircon', label: 'Aircon on full blast', outcomes: [{ text: 'Comfortable. Your electricity bill will be less comfortable.', effect: { cash: -30, stats: { energy: 5 } } }] },
      { id: 'tough', label: 'Tough it out', outcomes: [{ text: 'You sweat through everything. Mild heat exhaustion.', effect: { stats: { health: -5, energy: -10 } } }] },
    ],
  },
  {
    id: 'haze',
    title: 'Haze season',
    icon: '🌫️',
    category: 'world',
    trigger: 'random',
    contexts: ['any'],
    cooldownDays: 60,
    text: 'The air quality index is unhealthy. You can\'t see the building across the road. Your throat feels scratchy.',
    choices: [
      { id: 'indoors', label: 'Stay indoors', outcomes: [{ text: 'Windows shut, air purifier on (or a fan with a wet towel). Safe but a bit stir-crazy.', effect: { stats: { happiness: -3, energy: 5, fitness: -1 } } }] },
      { id: 'mask', label: 'Buy proper masks', cost: 25, outcomes: [{ text: 'Protected. You look like everyone else on the street.', effect: { stats: { health: 2 } } }] },
      { id: 'jog', label: 'Go jogging anyway', outcomes: [{ text: 'Bad idea. You cough for two days.', effect: { stats: { health: -8, fitness: 1 } } }] },
    ],
  },
];
