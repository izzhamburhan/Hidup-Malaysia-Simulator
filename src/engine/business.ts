// Side hustles and small businesses: gradual growth, volatile revenue, staff.

import { hustleDefById } from '../data/lifestyle';
import { addSkills, applyStats, clamp, earn, formatRM, highlight, log, playerPost, round2, spend } from './core';
import { isWeekend } from './calendar';
import { nextRandom, randRange } from './rng';
import type { GameState, Hustle } from './types';

export const XP_PER_LEVEL = 100;
export const MAX_HUSTLE_LEVEL = 6;
export const REGISTRATION_FEE = 1000;
export const EMPLOYEE_COST_NOTE = 'A helper costs RM1,900/month (fictional estimate), charged on bills day. They run sessions on weekdays while you work.';

export function hustleRequirements(state: GameState, id: string): string | null {
  const def = hustleDefById(id);
  if (!def) return 'Unknown hustle';
  if (state.hustles.some((h) => h.id === id)) return 'Already running.';
  if (def.requiresItem && !state.inventory.items.includes(def.requiresItem)) return `Requires: ${def.requiresItem.replace('-', ' ')}.`;
  for (const [k, v] of Object.entries(def.requiresSkill ?? {})) {
    const have = state.skills[k as keyof typeof state.skills];
    if (have < v) return `Needs ${k} skill ${v} (you have ${Math.round(have)}).`;
  }
  if (state.hustles.length >= 3) return 'Three hustles is already a lot.';
  return null;
}

export function startHustle(state: GameState, id: string): string {
  const def = hustleDefById(id)!;
  if (def.startupCost > 0) spend(state, def.startupCost, `${def.name} startup costs`);
  state.hustles.push({
    id,
    level: 1,
    xp: 0,
    reputation: 30,
    satisfaction: 60,
    revenueTotal: 0,
    expenseTotal: def.startupCost,
    monthRevenue: 0,
    monthExpense: def.startupCost,
    startedDay: state.clock.day,
    lastWorkedDay: state.clock.day,
    employees: 0,
    registered: false,
  });
  log(state, 'milestone', `Started a side hustle: ${def.name}.`);
  playerPost(state, `New side hustle unlocked: ${def.name} ${def.icon} Support local!`);
  return `${def.name} is open for business.`;
}

/** One work session. Revenue grows with level, reputation and skill; never guaranteed. */
export function workHustle(state: GameState, id: string): string[] {
  const h = state.hustles.find((x) => x.id === id)!;
  const def = hustleDefById(id)!;
  const skill = state.skills[def.skill];
  const swing = 1 + (nextRandom(state) * 2 - 1) * def.volatility;
  const levelFactor = 1 + (h.level - 1) * 0.2;
  const repFactor = 0.7 + h.reputation / 200;
  const skillFactor = 0.8 + skill / 250;
  const tiredFactor = state.stats.energy < 30 ? 0.7 : 1;
  const revenue = round2(Math.max(0, def.baseRevenue * swing * levelFactor * repFactor * skillFactor * tiredFactor));
  const cost = round2(revenue * def.costRate);
  const profit = round2(revenue - cost);
  if (cost > 0) spend(state, cost, `${def.name} costs`, true);
  if (revenue > 0) earn(state, revenue);
  h.revenueTotal = round2(h.revenueTotal + revenue);
  h.expenseTotal = round2(h.expenseTotal + cost);
  h.monthRevenue = round2(h.monthRevenue + revenue);
  h.monthExpense = round2(h.monthExpense + cost);
  h.lastWorkedDay = state.clock.day;
  state.counters.hustleProfit = round2(state.counters.hustleProfit + profit);
  state.finance.taxYear.grossIncome = round2(state.finance.taxYear.grossIncome + Math.max(0, profit));

  // Satisfaction depends on effort quality; reputation follows satisfaction.
  const quality = skillFactor * tiredFactor + randRange(state, -0.25, 0.2);
  h.satisfaction = round2(clamp(h.satisfaction + (quality > 1 ? 3 : quality < 0.85 ? -4 : 1)));
  h.reputation = round2(clamp(h.reputation + (h.satisfaction - 55) / 20));
  h.xp += 12 + skill / 10;
  addSkills(state, { [def.skill]: 0.8, business: 0.4 });
  applyStats(state, { energy: -def.energy, stress: 2, happiness: profit > def.baseRevenue ? 3 : 0 });

  const lines = [`${def.name}: revenue ${formatRM(revenue)}, costs ${formatRM(cost)}, profit ${formatRM(profit)}.`];
  if (h.xp >= XP_PER_LEVEL * h.level && h.level < MAX_HUSTLE_LEVEL) {
    h.xp = 0;
    h.level += 1;
    lines.push(`${def.name} grew to level ${h.level}! More customers are finding you.`);
    log(state, 'milestone', `${def.name} reached level ${h.level}.`);
    highlight(state, `${def.name} level ${h.level}`);
  }
  return lines;
}

/** Staff run sessions on weekdays while you're away (called at day end). */
export function staffDay(state: GameState): void {
  if (isWeekend(state)) return;
  for (const h of state.hustles) {
    if (h.employees <= 0) continue;
    const def = hustleDefById(h.id)!;
    const revenue = round2(h.employees * def.baseRevenue * (1 + (h.level - 1) * 0.2) * (0.7 + h.reputation / 200) * randRange(state, 0.6, 1.15));
    const cost = round2(revenue * def.costRate);
    earn(state, revenue - cost);
    h.revenueTotal = round2(h.revenueTotal + revenue);
    h.expenseTotal = round2(h.expenseTotal + cost);
    h.monthRevenue = round2(h.monthRevenue + revenue);
    h.monthExpense = round2(h.monthExpense + cost);
    state.counters.hustleProfit = round2(state.counters.hustleProfit + revenue - cost);
  }
}

export function hustleProfitTotal(h: Hustle): number {
  return round2(h.revenueTotal - h.expenseTotal);
}
