// Love life and family actions.

import { BUKA_PUASA, PASAR_RAMADAN } from '../../data/festive';
import { addMemory, adjustFamily, applyStats, canAfford, formatRM, round2, spend } from '../core';
import { bukaPuasa, bukaPuasaReason, isRamadan, pasarRamadan, pasarRamadanReason } from '../festive';
import { isWeekend } from '../calendar';
import { tripMinutes, travelBetween } from '../geography';
import { currentHome } from '../living';
import { breakUp, chatPartner, deepTalk, defineRelationship, goOnDate, marry, propose, startTalking } from '../social';
import type { GameState } from '../types';
import { hoursLabel, needEnergy, withinHours, type ActionDef } from './types';

export const RING_COST = 3500;
export const WEDDINGS: Record<string, { label: string; cost: number; happiness: number }> = {
  simple: { label: 'Simple', cost: 8000, happiness: 0 },
  standard: { label: 'Standard', cost: 25000, happiness: 4 },
  grand: { label: 'Grand', cost: 60000, happiness: 8 },
};

const DATES: Record<string, { label: string; cost: number; minutes: number; quality: number; from: number; to: number }> = {
  mamak: { label: 'Mamak date', cost: 30, minutes: 120, quality: 0, from: 17, to: 2 },
  movie: { label: 'Movie date', cost: 70, minutes: 180, quality: 1, from: 11, to: 23 },
  dinner: { label: 'Fancy dinner', cost: 220, minutes: 180, quality: 3, from: 18, to: 22 },
  hike: { label: 'Morning hike', cost: 15, minutes: 240, quality: 2, from: 6, to: 10 },
};

const hasPartner = (s: GameState) => !!s.relationships.partner;
const stageAtLeast = (s: GameState, stages: string[]) => !!s.relationships.partner && stages.includes(s.relationships.partner.stage);

/** Minutes at the kampung (the there-and-back travel from the map is added on top). */
const BALIK_KAMPUNG_VISIT_MINUTES = 360;

/** The return fare from where you live to your home state (fictional estimate); a short hop in the same state. */
export function baliKampungCost(s: GameState): number {
  if (currentHome(s).familyHome) return 0;
  const fare = travelBetween(s.location.state, s.character.homeState);
  // A motorcycle is cheaper on the road; a flight is a flight.
  return fare.mode === 'road' && s.transport.mode === 'motorcycle' ? Math.round((fare.cost * 0.6) / 5) * 5 : fare.cost;
}

/** Clock minutes for the whole day: travel there and back plus the visit, within one day. */
export function baliKampungMinutes(s: GameState): number {
  return tripMinutes(travelBetween(s.location.state, s.character.homeState), BALIK_KAMPUNG_VISIT_MINUTES);
}

export const peopleActions: ActionDef[] = [
  {
    id: 'talk-prospect',
    category: 'love',
    icon: '💬',
    dedicated: true,
    title: (s, p) => `Start talking to ${s.relationships.prospects.find((x) => x.id === p)?.name ?? 'them'}`,
    description: 'Send the first message. Keep it chill.',
    minutes: 30,
    available: (s, p) => {
      if (!s.relationships.prospects.some((x) => x.id === p)) return 'They are no longer around.';
      if (s.relationships.partner && s.relationships.partner.stage !== 'talking') return 'You are already in a relationship.';
      return null;
    },
    run: (s, p) => {
      if (s.relationships.partner?.stage === 'talking') {
        s.relationships.exes.push(s.relationships.partner.name);
        s.relationships.partner = null;
      }
      return [startTalking(s, p!)];
    },
  },
  {
    id: 'chat-partner',
    category: 'love',
    icon: '📱',
    title: (s) => `Text ${s.relationships.partner?.name ?? 'them'}`,
    description: 'Memes, voice notes and "dah makan?".',
    minutes: 30,
    contexts: ['love'],
    visible: hasPartner,
    available: (s) => (s.relationships.partner?.lastContactDay === s.clock.day && Number(s.flags.chatsToday ?? 0) >= 2 ? 'You have talked plenty today.' : null),
    run: (s) => {
      s.flags.chatsToday = s.relationships.partner?.lastContactDay === s.clock.day ? Number(s.flags.chatsToday ?? 0) + 1 : 1;
      return chatPartner(s);
    },
  },
  {
    id: 'date',
    category: 'love',
    icon: '💞',
    title: (s, p) => `${DATES[p ?? 'mamak']?.label ?? 'Date'} with ${s.relationships.partner?.name ?? 'them'}`,
    description: (_s, p) => {
      const d = DATES[p ?? 'mamak'];
      return d ? `${formatRM(d.cost)}, ${hoursLabel(d.from, d.to)}. Quality time builds trust.` : '';
    },
    minutes: (_s, p) => DATES[p ?? 'mamak']?.minutes ?? 120,
    cost: (s, p) => (DATES[p ?? 'mamak']?.cost ?? 0) + (s.relationships.partner?.longDistance ? 150 : 0),
    energy: -6,
    contexts: ['love', 'social'],
    visible: hasPartner,
    variants: () => Object.entries(DATES).map(([k, d]) => ({ param: k, label: d.label })),
    available: (s, p) => {
      const d = DATES[p ?? 'mamak'];
      if (!d) return 'Unknown date';
      if (!withinHours(s, d.from, d.to)) return `Best ${hoursLabel(d.from, d.to)}.`;
      return needEnergy(s, 15);
    },
    run: (s, p) => {
      const d = DATES[p ?? 'mamak'];
      spend(s, d.cost + (s.relationships.partner?.longDistance ? 150 : 0), d.label);
      applyStats(s, { energy: -6 });
      return goOnDate(s, d.quality, d.label);
    },
  },
  {
    id: 'deep-talk',
    category: 'love',
    icon: '🫶',
    title: 'Have a deep talk',
    description: 'Money, family, future, boundaries. Honest conversations build trust.',
    minutes: 75,
    contexts: ['love'],
    visible: (s) => stageAtLeast(s, ['dating', 'committed', 'engaged', 'married']),
    run: (s) => deepTalk(s),
  },
  {
    id: 'gift',
    category: 'love',
    icon: '🎁',
    title: (s) => `Surprise gift for ${s.relationships.partner?.name ?? 'them'}`,
    description: 'Something thoughtful (RM150). Thought beats price.',
    minutes: 40,
    cost: 150,
    visible: (s) => stageAtLeast(s, ['dating', 'committed', 'engaged', 'married']),
    available: (s) => (canAfford(s, 150) ? null : 'Not enough cash.'),
    run: (s) => {
      spend(s, 150, 'gift');
      const p = s.relationships.partner!;
      p.satisfaction = round2(Math.min(100, p.satisfaction + 8));
      p.lastContactDay = s.clock.day;
      return [`${p.name} loved it.`];
    },
  },
  {
    id: 'define-relationship',
    category: 'love',
    icon: '💑',
    title: 'Make it official',
    description: 'Ask the "so... what are we?" question.',
    minutes: 45,
    contexts: ['love'],
    visible: (s) => stageAtLeast(s, ['dating']),
    available: (s) => (s.relationships.partner!.trust >= 55 ? null : 'Build more trust first (dates, deep talks).'),
    run: (s) => defineRelationship(s),
  },
  {
    id: 'propose',
    category: 'love',
    icon: '💍',
    title: 'Propose',
    description: `Ring (${formatRM(RING_COST)}, fictional estimate), a plan, and courage.`,
    minutes: 180,
    cost: RING_COST,
    visible: (s) => stageAtLeast(s, ['committed']),
    confirm: (s) => `Ring costs ${formatRM(RING_COST)}. A wedding later can cost ${formatRM(WEDDINGS.simple.cost)}–${formatRM(WEDDINGS.grand.cost)}. ${s.relationships.partner!.name} might also say "not yet".`,
    available: (s) => {
      const p = s.relationships.partner!;
      if (s.clock.day - p.sinceDay < 90) return 'You have only been together a short while.';
      if (p.trust < 70 || p.satisfaction < 60) return 'The relationship needs more trust and happiness first.';
      return canAfford(s, RING_COST) ? null : 'Not enough cash for a ring.';
    },
    run: (s) => {
      spend(s, RING_COST, 'engagement ring');
      return propose(s);
    },
  },
  {
    id: 'wedding',
    category: 'love',
    icon: '💐',
    title: (_s, p) => `${WEDDINGS[p ?? 'simple']?.label ?? ''} wedding`,
    description: (_s, p) => `Total about ${formatRM(WEDDINGS[p ?? 'simple']?.cost ?? 0)} (fictional estimate), paid from cash then savings.`,
    minutes: 600,
    energy: -25,
    visible: (s) => stageAtLeast(s, ['engaged']),
    variants: () => Object.entries(WEDDINGS).map(([k, w]) => ({ param: k, label: `${w.label} ${formatRM(w.cost)}` })),
    confirm: (s, p) => {
      const w = WEDDINGS[p ?? 'simple'];
      return `${w.label} wedding: ${formatRM(w.cost)}. Cash + savings after: ${formatRM(s.finance.cash + s.finance.savings - w.cost)}. A simpler wedding is just as valid.`;
    },
    available: (s, p) => {
      const w = WEDDINGS[p ?? 'simple'];
      if (!w) return 'Unknown plan';
      if (s.clock.day - s.relationships.partner!.sinceDay < 45) return 'Planning takes at least ~6 weeks after engagement.';
      if (!isWeekend(s)) return 'Weddings are on weekends.';
      return s.finance.cash + s.finance.savings >= w.cost ? null : `Need ${formatRM(w.cost)} in cash + savings.`;
    },
    run: (s, p) => {
      const w = WEDDINGS[p ?? 'simple'];
      const fromCash = Math.min(s.finance.cash, w.cost);
      spend(s, fromCash, 'wedding');
      const rest = round2(w.cost - fromCash);
      if (rest > 0) {
        s.finance.savings = round2(s.finance.savings - rest);
        s.counters.totalSpent = round2(s.counters.totalSpent + rest);
      }
      s.counters.bigPurchases += 1;
      applyStats(s, { happiness: w.happiness, energy: -25 });
      return marry(s, w.label);
    },
  },
  {
    id: 'break-up',
    category: 'love',
    icon: '💔',
    title: 'Break up',
    description: 'End the relationship. Sometimes it is the right call.',
    minutes: 60,
    visible: (s) => hasPartner(s) && s.relationships.partner!.stage !== 'talking',
    confirm: (s) => `End things with ${s.relationships.partner!.name}? Happiness will drop for a while. Being single is a perfectly good life too.`,
    run: (s) => breakUp(s, false),
  },
  // --- Family ---
  {
    id: 'call-parents',
    category: 'family',
    icon: '📞',
    title: 'Video call Mak & Abah',
    description: 'They will ask if you have eaten. Answer honestly.',
    minutes: 25,
    contexts: ['family'],
    run: (s) => {
      adjustFamily(s, 3);
      s.relationships.lastFamilyContactDay = s.clock.day;
      applyStats(s, { happiness: 2, stress: -2 });
    },
  },
  {
    id: 'balik-kampung',
    category: 'family',
    icon: '🏡',
    title: 'Balik kampung for the day',
    description: (s) => `Visit family back in ${s.character.homeState}. Travel ~${formatRM(baliKampungCost(s))}.`,
    minutes: baliKampungMinutes,
    cost: baliKampungCost,
    energy: -12,
    contexts: ['family', 'commute'],
    visible: (s) => !currentHome(s).familyHome,
    available: (s) => {
      if (!isWeekend(s)) return 'Weekends only (or festive holidays via events).';
      if (!withinHours(s, 6, 11)) return 'Leave early: 6–11 AM.';
      return canAfford(s, baliKampungCost(s)) ? null : 'Not enough cash for travel.';
    },
    run: (s) => {
      spend(s, baliKampungCost(s), 'balik kampung travel');
      adjustFamily(s, 10);
      s.relationships.lastFamilyContactDay = s.clock.day;
      s.counters.trips += 1;
      s.food.caloriesIn += 1400;
      s.food.today.push({ foodId: 'mak-cooking', name: "Mak's cooking (lunch + dinner)", calories: 1400, price: 0, minute: s.clock.minute, portion: 2 });
      applyStats(s, { happiness: 8, stress: -8, energy: -12, satiety: 60 });
      addMemory(s, `Balik kampung to ${s.character.homeState}`);
      return ["Mak packed you three containers of food to bring back. You didn't ask. You're not complaining."];
    },
  },
  {
    id: 'family-time',
    category: 'family',
    icon: '👨‍👩‍👧',
    title: 'Family time at home',
    description: 'Dinner together, TV dramas, and unsolicited career advice.',
    minutes: 120,
    contexts: ['family', 'home'],
    visible: (s) => currentHome(s).familyHome,
    available: (s) => (withinHours(s, 18, 23) ? null : 'Family time is in the evening.'),
    run: (s) => {
      adjustFamily(s, 4);
      s.relationships.lastFamilyContactDay = s.clock.day;
      applyStats(s, { happiness: 4, stress: -3 });
    },
  },
  {
    id: 'give-parents',
    category: 'family',
    icon: '🧧',
    title: (_s, p) => `Give parents ${formatRM(Number(p ?? 200))}`,
    description: 'A one-off contribution to the household.',
    minutes: 10,
    cost: (_s, p) => Number(p ?? 200),
    variants: () => [
      { param: '100', label: 'RM100' },
      { param: '300', label: 'RM300' },
    ],
    available: (s, p) => (canAfford(s, Number(p ?? 200)) ? null : 'Not enough cash.'),
    run: (s, p) => {
      const a = Number(p ?? 200);
      spend(s, a, 'gift to parents');
      s.counters.helpedParentsTotal += a;
      adjustFamily(s, a >= 300 ? 6 : 3);
      applyStats(s, { happiness: 3 });
    },
  },
  // --- Ramadan, festive only (everyone is welcome; nothing assumes anyone fasts) ---
  {
    id: 'pasar-ramadan',
    category: 'food',
    icon: '🥘',
    title: 'Pasar Ramadan',
    description: `A bag of bazaar food, ${hoursLabel(PASAR_RAMADAN.from, PASAR_RAMADAN.to)} during Ramadan (${formatRM(PASAR_RAMADAN.price)}, fictional estimate). Everyone is welcome to browse.`,
    minutes: PASAR_RAMADAN.minutes,
    cost: PASAR_RAMADAN.price,
    energy: -2,
    contexts: ['food', 'social'],
    visible: isRamadan,
    available: pasarRamadanReason,
    run: pasarRamadan,
  },
  {
    id: 'buka-puasa',
    category: 'social',
    icon: '🌙',
    title: 'Buka puasa gathering',
    description: BUKA_PUASA.description,
    minutes: BUKA_PUASA.minutes,
    energy: 0,
    contexts: ['social', 'family'],
    visible: isRamadan,
    available: bukaPuasaReason,
    run: bukaPuasa,
  },
  {
    id: 'parent-allowance',
    category: 'family',
    icon: '🤲',
    title: (_s, p) => (Number(p) > 0 ? `Send parents ${formatRM(Number(p))} monthly` : 'Stop monthly allowance'),
    description: 'A recurring commitment paid on bills day.',
    minutes: 10,
    variants: () => [
      { param: '0', label: 'Stop' },
      { param: '200', label: 'RM200/mo' },
      { param: '500', label: 'RM500/mo' },
    ],
    available: (s, p) => (s.finance.parentAllowance === Number(p) ? 'Already set.' : null),
    run: (s, p) => {
      const a = Number(p ?? 0);
      const before = s.finance.parentAllowance;
      s.finance.parentAllowance = a;
      if (a > before) adjustFamily(s, 5);
      else adjustFamily(s, -3);
      return [a > 0 ? `${formatRM(a)} will go to your parents every month.` : 'Monthly allowance stopped. Explained kindly, hopefully.'];
    },
  },
];
