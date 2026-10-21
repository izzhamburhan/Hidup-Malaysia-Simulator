// Daily needs, food, fitness and leisure actions.

import { foodById, portions } from '../../data/foods';
import { gymById, gyms } from '../../data/lifestyle';
import { addSkills, applyStats, clamp, formatRM, highlight, round2, spend } from '../core';
import { MINUTES_PER_DAY } from '../calendar';
import { currentHome } from '../living';
import { chance } from '../rng';
import { meetSomeone } from '../social';
import type { GameState } from '../types';
import { hoursLabel, needEnergy, withinHours, type ActionDef } from './types';

function parseFood(param?: string) {
  const [foodId, portionId] = (param ?? '').split(':');
  const food = foodById(foodId);
  const portion = portions.find((p) => p.id === portionId) ?? portions[1];
  return { food, portion };
}

function exercise(state: GameState, calories: number, gym = false): void {
  state.food.caloriesOut = round2(state.food.caloriesOut + calories);
  state.today.exercised = true;
  state.counters.workouts += 1;
  const f = state.fitness;
  if (f.lastWorkoutDay !== state.clock.day) {
    f.streak = f.lastWorkoutDay !== null && state.clock.day - f.lastWorkoutDay <= 2 ? f.streak + 1 : 1;
  }
  f.lastWorkoutDay = state.clock.day;
  if (gym) {
    f.sessions += 1;
    state.counters.gymSessions += 1;
  }
}

/** Sleep-hour helper: which day will the player wake up on? */
function wakeDay(state: GameState, minutes: number): number {
  return state.clock.day + Math.floor((state.clock.minute + minutes) / MINUTES_PER_DAY);
}

export const lifeActions: ActionDef[] = [
  {
    id: 'sleep',
    category: 'daily',
    icon: '😴',
    title: (_s, p) => `Sleep ${p ?? 8} hours`,
    description: 'Recover energy and reduce stress. Under 6 hours leaves you groggy tomorrow.',
    minutes: (_s, p) => Number(p ?? 8) * 60,
    energy: (_s, p) => Math.round(Number(p ?? 8) * 11.5),
    asleep: true,
    contexts: ['home', 'night'],
    variants: () => [
      { param: '5', label: '5h' },
      { param: '7', label: '7h' },
      { param: '8', label: '8h' },
      { param: '10', label: '10h' },
    ],
    available: (s) =>
      withinHours(s, 20, 6) || s.stats.energy < 25 ? null : `Bedtime is ${hoursLabel(20, 6)} (or when exhausted). Try a nap instead.`,
    run: (s, p) => {
      const hours = Number(p ?? 8);
      const minutes = hours * 60;
      s.lastSleepMinutes = minutes;
      s.flags.awakeMinutes = 0;
      const lines: string[] = [];
      if (hours < 6) {
        s.flags.tiredDay = wakeDay(s, minutes);
        s.counters.daysLowSleep += 1;
        lines.push('Short sleep: you will be less effective tomorrow.');
      } else if (hours >= 7) {
        applyStats(s, { health: 0.8, happiness: 0.5 });
      }
      return lines;
    },
  },
  {
    id: 'nap',
    category: 'daily',
    icon: '🛌',
    title: 'Power nap',
    description: 'A 45-minute nap. Restores a bit of energy without wrecking tonight.',
    minutes: 45,
    energy: 8,
    asleep: true,
    contexts: ['home'],
    available: (s) => (withinHours(s, 11, 20) ? null : `Naps work best ${hoursLabel(11, 20)}.`),
    run: (s) => {
      s.flags.awakeMinutes = Math.max(0, Number(s.flags.awakeMinutes ?? 0) - 120);
    },
  },
  {
    id: 'chill',
    category: 'daily',
    icon: '🛋️',
    title: 'Chill at home',
    description: 'Do nothing productive for an hour. Underrated.',
    minutes: 60,
    energy: 2,
    contexts: ['home'],
    run: (s) => {
      const comfort = currentHome(s).comfort;
      // Diminishing returns: the third lazy hour in a day helps less than the first.
      const n = s.flags.chillDay === s.clock.day ? Number(s.flags.chillCount ?? 0) : 0;
      s.flags.chillDay = s.clock.day;
      s.flags.chillCount = n + 1;
      const k = 1 / (1 + n * 0.6);
      applyStats(s, { stress: (-2 - comfort / 4) * k, happiness: (0.5 + comfort / 8) * k, energy: 3 });
    },
  },
  {
    id: 'water',
    category: 'daily',
    icon: '💧',
    title: 'Drink water',
    description: 'A glass of plain water. Your kidneys say thank you.',
    minutes: 5,
    run: (s) => {
      s.food.water += 1;
      applyStats(s, { energy: 1 });
      return [`Water today: ${s.food.water} glasses.`];
    },
  },
  {
    id: 'wait',
    category: 'daily',
    icon: '⏳',
    title: (_s, p) => `Wait ${p ?? 1} hour${p === '1' || !p ? '' : 's'}`,
    description: 'Let time pass. Scroll, think, stare at the ceiling fan.',
    minutes: (_s, p) => Number(p ?? 1) * 60,
    variants: () => [
      { param: '1', label: '1h' },
      { param: '3', label: '3h' },
    ],
    run: () => [],
  },
  {
    id: 'eat',
    category: 'food',
    icon: '🍽️',
    dedicated: true,
    title: (_s, p) => {
      const { food, portion } = parseFood(p);
      return food ? `${food.name}${portion.id !== 'regular' ? ` (${portion.label.toLowerCase()})` : ''}` : 'Eat';
    },
    description: (_s, p) => {
      const { food, portion } = parseFood(p);
      return food ? `~${Math.round(food.calories * portion.factor)} kcal (estimate)` : '';
    },
    minutes: (_s, p) => parseFood(p).food?.minutes ?? 20,
    cost: (_s, p) => {
      const { food, portion } = parseFood(p);
      return food ? round2(food.price * portion.factor) : 0;
    },
    energy: (_s, p) => parseFood(p).food?.energy ?? 0,
    contexts: ['food'],
    available: (s, p) => {
      const { food } = parseFood(p);
      if (!food) return 'Unknown food';
      if (food.needsKitchen && !currentHome(s).kitchen) return 'Your place has no kitchen. Buy cookware or move.';
      if (food.id === 'mak-cooking' && !currentHome(s).familyHome) return "Only when you live with family (or balik kampung).";
      if (s.stats.satiety > 92 && food.meal) return "You're too full. Maybe later.";
      return null;
    },
    run: (s, p) => {
      const { food, portion } = parseFood(p);
      if (!food) return [];
      const price = round2(food.price * portion.factor);
      if (price > 0) spend(s, price, food.name);
      const calories = Math.round(food.calories * portion.factor);
      s.food.today.push({ foodId: food.id, name: food.name, calories, price, minute: s.clock.minute, portion: portion.factor });
      s.food.caloriesIn += calories;
      s.counters.mealsEaten += food.meal ? 1 : 0;
      // Each extra meal today is a little less exciting than the first.
      const k = 0.5 / (1 + s.food.today.length * 0.6);
      applyStats(s, {
        satiety: food.satiety * portion.factor,
        energy: food.energy,
        health: food.health * portion.factor,
        happiness: food.happiness * k,
      });
      if (food.id === 'home-cooked') addSkills(s, { cooking: 0.8 });
      const lines = [`+${calories} kcal (estimate). Today: ${Math.round(s.food.caloriesIn)} kcal.`];
      if (food.id === 'teh-tarik' || food.id === 'kopi-ais') s.flags.lastCaffeine = s.clock.day * 1440 + s.clock.minute;
      return lines;
    },
  },
  {
    id: 'gym',
    category: 'fitness',
    icon: '🏋️',
    title: 'Gym session',
    description: (s) => (s.fitness.gymMember ? 'Lift, sweat, repeat. Builds fitness and burns stress.' : `No membership: day pass ${formatRM(gyms[0].dayPass)}.`),
    minutes: 80,
    cost: (s) => (s.fitness.gymMember ? 0 : gyms[0].dayPass),
    energy: -16,
    contexts: ['gym'],
    available: (s) => needEnergy(s, 20) ?? (withinHours(s, 6, 23) ? null : `Gym hours ${hoursLabel(6, 23)}.`),
    run: (s) => {
      if (!s.fitness.gymMember) spend(s, gyms[0].dayPass, 'gym day pass');
      const premium = gymById(s.fitness.gymId)?.id === 'premium-gym';
      applyStats(s, { energy: -16, fitness: premium ? 2.6 : 2.2, stress: -7, health: 0.8, happiness: 2, satiety: -12 });
      exercise(s, 420, true);
      const lines = [`Gym streak: ${s.fitness.streak} day(s).`];
      if (s.fitness.streak === 7) highlight(s, '7-day workout streak');
      return lines;
    },
  },
  {
    id: 'run',
    category: 'fitness',
    icon: '🏃',
    title: 'Go for a run',
    description: 'Free cardio around the taman. Mind the dogs.',
    minutes: 45,
    energy: -12,
    contexts: ['gym'],
    available: (s) => needEnergy(s, 18) ?? (withinHours(s, 5, 22) ? null : `Too dark. Run ${hoursLabel(5, 22)}.`),
    run: (s) => {
      applyStats(s, { energy: -12, fitness: 1.8, stress: -6, health: 0.6, satiety: -8 });
      exercise(s, 360);
      if (chance(s, 0.15)) {
        applyStats(s, { happiness: 3 });
        return ['Runner\'s high! The sunset over the flats looked amazing.'];
      }
      return [];
    },
  },
  {
    id: 'home-workout',
    category: 'fitness',
    icon: '🤸',
    title: 'Home workout',
    description: '30 minutes of push-ups, planks and regret. No equipment needed.',
    minutes: 30,
    energy: -7,
    contexts: ['home'],
    available: (s) => needEnergy(s, 12),
    run: (s) => {
      applyStats(s, { energy: -7, fitness: 1, stress: -3, satiety: -4 });
      exercise(s, 180);
    },
  },
  {
    id: 'badminton',
    category: 'fitness',
    icon: '🏸',
    title: 'Badminton night',
    description: 'Court booking with friends. Fitness and friendship.',
    minutes: 120,
    cost: 15,
    energy: -18,
    contexts: ['gym', 'social'],
    available: (s) =>
      !s.inventory.items.includes('racket') ? 'Buy a badminton racket first.' : needEnergy(s, 22) ?? (withinHours(s, 17, 24) ? null : `Courts are booked ${hoursLabel(17, 24)}.`),
    run: (s) => {
      spend(s, 15, 'court booking');
      applyStats(s, { energy: -18, fitness: 2, stress: -7, happiness: 5, satiety: -12 });
      s.relationships.friends = clamp(s.relationships.friends + 3);
      s.relationships.lastFriendsDay = s.clock.day;
      s.today.socialised = true;
      exercise(s, 450);
    },
  },
  {
    id: 'futsal',
    category: 'fitness',
    icon: '⚽',
    title: 'Futsal with the boys/girls',
    description: 'Late-night futsal. Glory or a twisted ankle.',
    minutes: 90,
    cost: 10,
    energy: -18,
    contexts: ['gym', 'social', 'night'],
    available: (s) =>
      !s.inventory.items.includes('boots') ? 'Buy futsal shoes first.' : needEnergy(s, 22) ?? (withinHours(s, 18, 1) ? null : `Courts open ${hoursLabel(18, 1)}.`),
    run: (s) => {
      spend(s, 10, 'futsal court');
      applyStats(s, { energy: -18, fitness: 2.2, stress: -6, happiness: 5, satiety: -12 });
      s.relationships.friends = clamp(s.relationships.friends + 3);
      s.relationships.lastFriendsDay = s.clock.day;
      s.today.socialised = true;
      exercise(s, 500);
      if (chance(s, 0.08)) {
        applyStats(s, { health: -6, happiness: -4 });
        return ['You rolled your ankle. Minyak angin and pride damage.'];
      }
      return [];
    },
  },
  {
    id: 'football',
    category: 'fitness',
    icon: '🥅',
    title: 'Kick-about at the padang',
    description: 'Free football at the field. Bring water.',
    minutes: 120,
    energy: -16,
    contexts: ['gym', 'social'],
    available: (s) => needEnergy(s, 22) ?? (withinHours(s, 7, 10) || withinHours(s, 16, 19) ? null : 'Field games happen 7–10 AM or 4–7 PM.'),
    run: (s) => {
      applyStats(s, { energy: -16, fitness: 2, stress: -5, happiness: 4, satiety: -12 });
      s.relationships.friends = clamp(s.relationships.friends + 2);
      s.today.socialised = true;
      exercise(s, 480);
    },
  },
  {
    id: 'mobile-gaming',
    category: 'leisure',
    icon: '📱',
    title: 'Mobile gaming',
    description: 'One more match. Then another one. Fun, but late nights cost sleep.',
    minutes: 60,
    energy: -2,
    contexts: ['home', 'night'],
    run: (s) => {
      s.counters.gamingHours += 1;
      applyStats(s, { happiness: 4, stress: -4 });
      if (withinHours(s, 0, 5)) return ['Gaming past midnight. Tomorrow-you will not be amused.'];
      return [];
    },
  },
  {
    id: 'pc-gaming',
    category: 'leisure',
    icon: '🖥️',
    title: (_s, p) => `PC gaming (${p ?? 2}h)`,
    description: 'Ranked grind on your rig. Great fun; terrible for bedtime.',
    minutes: (_s, p) => Number(p ?? 2) * 60,
    energy: (_s, p) => -2 * Number(p ?? 2),
    contexts: ['home', 'night'],
    variants: () => [
      { param: '1', label: '1h' },
      { param: '3', label: '3h' },
    ],
    available: (s) => (s.inventory.items.includes('gaming-pc') ? null : 'You need a gaming PC.'),
    run: (s, p) => {
      const h = Number(p ?? 2);
      s.counters.gamingHours += h;
      applyStats(s, { happiness: 5 * h, stress: -4 * h, energy: -2 * h });
      if (h >= 3) addSkills(s, { tech: 0.3 });
    },
  },
  {
    id: 'read',
    category: 'leisure',
    icon: '📖',
    title: 'Read a book',
    description: 'An hour with a good book. Calm mind, sharper words.',
    minutes: 60,
    contexts: ['home'],
    run: (s) => {
      applyStats(s, { stress: -4, happiness: 2 });
      addSkills(s, { communication: 0.5 });
    },
  },
  {
    id: 'movie',
    category: 'leisure',
    icon: '🎬',
    title: 'Movie at the cinema',
    description: 'Popcorn combo included. Aircon set to Arctic.',
    minutes: 150,
    cost: 30,
    contexts: ['social', 'shopping'],
    available: (s) => (withinHours(s, 11, 24) ? null : `Showtimes ${hoursLabel(11, 24)}.`),
    run: (s) => {
      spend(s, 30, 'movie ticket');
      applyStats(s, { happiness: 7, stress: -6, energy: -3 });
    },
  },
  {
    id: 'shopping',
    category: 'leisure',
    icon: '🛍️',
    title: (_s, p) => (p === 'spree' ? 'Shopping spree' : 'Window shopping'),
    description: (_s, p) => (p === 'spree' ? 'Retail therapy: feels great now, statement later.' : 'Walk the mall, touch things, buy nothing. Mostly.'),
    minutes: 120,
    cost: (_s, p) => (p === 'spree' ? 350 : 0),
    contexts: ['shopping'],
    variants: () => [
      { param: 'window', label: 'Window' },
      { param: 'spree', label: 'Spree RM350' },
    ],
    available: (s) => (withinHours(s, 10, 22) ? null : `Malls open ${hoursLabel(10, 22)}.`),
    run: (s, p) => {
      if (p === 'spree') {
        spend(s, 350, 'shopping spree');
        applyStats(s, { happiness: 10, stress: -5, energy: -6 });
        s.counters.bigPurchases += 0;
        return ['New clothes, new shoes, new regret level unlocked.'];
      }
      applyStats(s, { happiness: 3, stress: -2, energy: -6 });
      if (chance(s, 0.25)) {
        spend(s, 25, 'impulse buy', true);
        return ['You "only window shopped" and came home with an RM25 bubble tea and phone stand.'];
      }
      return [];
    },
  },
  {
    id: 'concert',
    category: 'leisure',
    icon: '🎤',
    title: 'Concert night',
    description: 'Live music, screaming, and RM15 water bottles.',
    minutes: 240,
    cost: 280,
    energy: -12,
    contexts: ['social', 'night'],
    available: (s) => (withinHours(s, 18, 22) ? null : 'Concerts start between 6 PM and 10 PM.'),
    run: (s) => {
      spend(s, 280, 'concert ticket');
      applyStats(s, { happiness: 16, stress: -10, energy: -12 });
      s.today.socialised = true;
      return ['Voice gone. Soul restored.'];
    },
  },
  {
    id: 'photography',
    category: 'leisure',
    icon: '📷',
    title: 'Photo walk',
    description: 'Shoot street scenes in old town. Builds a creative skill that can pay later.',
    minutes: 120,
    energy: -8,
    available: (s) => (s.inventory.items.includes('camera') ? null : 'You need a camera.') ?? (withinHours(s, 7, 20) ? null : 'Not enough light right now.'),
    run: (s) => {
      addSkills(s, { creative: 2 });
      applyStats(s, { happiness: 5, stress: -4, energy: -8 });
    },
  },
  {
    id: 'road-trip',
    category: 'leisure',
    icon: '🛣️',
    title: 'Weekend road trip',
    description: 'Cameron Highlands strawberries, Ipoh white coffee, or Melaka cendol.',
    minutes: 660,
    cost: 260,
    energy: -18,
    contexts: ['social', 'commute'],
    available: (s) => {
      const w = new Date(Date.parse(`${s.startDate}T00:00:00Z`) + s.clock.day * 86400000).getUTCDay();
      if (w !== 0 && w !== 6) return 'Road trips are weekend things.';
      return withinHours(s, 6, 11) ? null : 'Leave early: 6–11 AM.';
    },
    run: (s) => {
      spend(s, 260, 'road trip');
      s.counters.trips += 1;
      s.today.socialised = true;
      s.relationships.friends = clamp(s.relationships.friends + 5);
      applyStats(s, { happiness: 14, stress: -14, energy: -18 });
      highlight(s, 'Road trip!');
      return ['Bad singalongs, good food, great memories.'];
    },
  },
  {
    id: 'mamak',
    category: 'social',
    icon: '🫖',
    title: 'Mamak session with friends',
    description: 'Teh tarik, roti, and solving the world\'s problems till late.',
    minutes: 150,
    cost: 18,
    energy: -4,
    contexts: ['social', 'food', 'night'],
    available: (s) => (withinHours(s, 17, 3) ? null : `Mamak sessions happen ${hoursLabel(17, 3)}.`),
    run: (s) => {
      spend(s, 18, 'mamak');
      s.food.caloriesIn += 480;
      s.food.today.push({ foodId: 'mamak-session', name: 'Mamak session (teh tarik + roti)', calories: 480, price: 18, minute: s.clock.minute, portion: 1 });
      s.relationships.friends = clamp(s.relationships.friends + 4);
      s.relationships.lastFriendsDay = s.clock.day;
      s.today.socialised = true;
      applyStats(s, { happiness: 6, stress: -6, satiety: 20, energy: -4 });
      const lines: string[] = [];
      if (!s.relationships.partner && chance(s, 0.15)) {
        const met = meetSomeone(s, 'the mamak');
        if (met) lines.push(met);
      }
      return lines;
    },
  },
  {
    id: 'karaoke',
    category: 'social',
    icon: '🎶',
    title: 'Karaoke night',
    description: 'Three hours of power ballads and one person hogging the mic.',
    minutes: 180,
    cost: 45,
    contexts: ['social', 'night'],
    available: (s) => (withinHours(s, 14, 2) ? null : `Karaoke boxes open ${hoursLabel(14, 2)}.`),
    run: (s) => {
      spend(s, 45, 'karaoke');
      s.relationships.friends = clamp(s.relationships.friends + 4);
      s.relationships.lastFriendsDay = s.clock.day;
      s.today.socialised = true;
      applyStats(s, { happiness: 8, stress: -8, energy: -6 });
    },
  },
  {
    id: 'call-friend',
    category: 'social',
    icon: '☎️',
    title: 'Catch up with a friend',
    description: 'A quick call or voice note marathon.',
    minutes: 25,
    contexts: ['social'],
    run: (s) => {
      s.relationships.friends = clamp(s.relationships.friends + 2);
      s.relationships.lastFriendsDay = s.clock.day;
      applyStats(s, { happiness: 2, stress: -2 });
    },
  },
  {
    id: 'meet-people',
    category: 'social',
    icon: '✨',
    title: 'Go to a social event',
    description: 'A meetup, a friend-of-a-friend party, a community event. New faces.',
    minutes: 180,
    cost: 40,
    energy: -6,
    contexts: ['social', 'love'],
    available: (s) => (withinHours(s, 18, 23) ? null : `Events run ${hoursLabel(18, 23)}.`),
    run: (s) => {
      spend(s, 40, 'social event');
      s.today.socialised = true;
      applyStats(s, { happiness: 4, energy: -6 });
      addSkills(s, { communication: 0.5 });
      if (chance(s, 0.6)) {
        const met = meetSomeone(s, 'a social event');
        if (met) return [met];
      }
      return ['Nice crowd, but no sparks tonight. Still, good vibes.'];
    },
  },
  {
    id: 'dating-app',
    category: 'social',
    icon: '💘',
    title: 'Try a dating app',
    description: 'Swipe for 30 minutes. Bios full of hiking and "foodie".',
    minutes: 30,
    contexts: ['love'],
    visible: (s) => !s.relationships.partner || s.relationships.partner.stage === 'talking',
    run: (s) => {
      if (chance(s, 0.5)) {
        const met = meetSomeone(s, 'a dating app');
        if (met) return [met];
      }
      applyStats(s, { happiness: -1 });
      return ['No matches worth replying to. The algorithm is judging you.'];
    },
  },
  {
    id: 'scroll-feed',
    category: 'leisure',
    icon: '📲',
    title: 'Scroll social media',
    description: 'Catch up on everyone\'s highlight reels.',
    minutes: 20,
    dedicated: true,
    run: (s) => {
      applyStats(s, { happiness: 1 });
      if (s.flags.comparisonAnxiety !== false && s.stats.happiness < 55 && chance(s, 0.5)) {
        applyStats(s, { stress: 3, happiness: -4 });
        return ['Everyone seems to be on holiday, engaged or promoted. Comparison anxiety +1. (Their lives have bad days too.)'];
      }
      return [];
    },
  },
];
