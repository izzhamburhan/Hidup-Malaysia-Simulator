// Low-level state mutation helpers. Every system goes through these so that
// money, stats and logs stay consistent. They mutate a draft state that the
// engine cloned at the start of an action.

import type { DebtKind, Effect, GameState, LogEntry, Post, SkillKey, Stats, StatKey } from './types';

export const STAT_KEYS: StatKey[] = ['energy', 'health', 'fitness', 'stress', 'happiness', 'reputation', 'satiety'];
export const SKILL_KEYS: SkillKey[] = ['tech', 'data', 'business', 'communication', 'creative', 'engineering', 'care', 'cooking'];

export const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
export const round2 = (value: number) => Math.round(value * 100) / 100;

export function nextId(state: GameState, prefix: string): string {
  state.logSeq += 1;
  return `${prefix}-${state.logSeq}`;
}

const MAX_LOG = 120;

export function log(state: GameState, kind: LogEntry['kind'], text: string): void {
  state.logSeq += 1;
  state.log.unshift({ id: state.logSeq, day: state.clock.day, minute: state.clock.minute, kind, text });
  if (state.log.length > MAX_LOG) state.log.length = MAX_LOG;
}

export function highlight(state: GameState, text: string): void {
  if (state.today.highlights.length < 8) state.today.highlights.push(text);
}

/** Add income to wallet cash. */
export function earn(state: GameState, amount: number): void {
  if (amount <= 0) return;
  const value = round2(amount);
  state.finance.cash = round2(state.finance.cash + value);
  state.finance.monthEarned = round2(state.finance.monthEarned + value);
  state.today.earned = round2(state.today.earned + value);
  state.counters.totalEarned = round2(state.counters.totalEarned + value);
}

export function canAfford(state: GameState, amount: number): boolean {
  return state.finance.cash + 1e-9 >= amount;
}

/**
 * Spend from wallet cash. Voluntary purchases should be checked with canAfford
 * first. For obligations (bills, fines) pass allowDebt: any shortfall becomes an
 * overdue debt instead of negative cash. Returns the amount actually paid from cash.
 */
export function spend(state: GameState, amount: number, label: string, allowDebt = false): number {
  if (amount <= 0) return 0;
  const value = round2(amount);
  const fromCash = Math.min(state.finance.cash, value);
  const shortfall = round2(value - fromCash);
  if (shortfall > 0 && !allowDebt) throw new Error(`Cannot afford ${label}`);
  state.finance.cash = round2(state.finance.cash - fromCash);
  if (shortfall > 0) {
    addDebt(state, 'overdue', `Overdue: ${label}`, shortfall, Math.max(50, round2(shortfall / 6)), 0.18);
    log(state, 'warning', `Not enough cash for ${label}. RM${shortfall.toFixed(2)} became overdue debt.`);
  }
  state.finance.monthSpent = round2(state.finance.monthSpent + value);
  state.today.spent = round2(state.today.spent + value);
  state.counters.totalSpent = round2(state.counters.totalSpent + value);
  return fromCash;
}

export function addDebt(state: GameState, kind: DebtKind, label: string, amount: number, monthlyPayment: number, annualRate: number): void {
  const existing = kind === 'overdue' || kind === 'ptptn' ? state.finance.debts.find((d) => d.kind === kind) : undefined;
  if (existing) {
    existing.balance = round2(existing.balance + amount);
    existing.principal = round2(existing.principal + amount);
    existing.monthlyPayment = Math.max(existing.monthlyPayment, round2(monthlyPayment));
    return;
  }
  state.finance.debts.push({ id: nextId(state, 'debt'), kind, label, principal: round2(amount), balance: round2(amount), monthlyPayment: round2(monthlyPayment), annualRate });
}

export function totalDebt(state: GameState): number {
  return round2(state.finance.debts.reduce((sum, d) => sum + d.balance, 0));
}

export function netWorth(state: GameState): number {
  const f = state.finance;
  return round2(f.cash + f.savings + f.emergencyFund + f.epfBalance + assetValue(state) - totalDebt(state));
}

/** Rough resale value of owned assets (vehicle, property) - game estimate. */
export function assetValue(state: GameState): number {
  let value = 0;
  const v = state.flags.vehicleValue;
  if (typeof v === 'number') value += v;
  const p = state.flags.propertyValue;
  if (typeof p === 'number') value += p;
  return value;
}

export function applyStats(state: GameState, delta: Partial<Stats>): void {
  for (const key of STAT_KEYS) {
    const d = delta[key];
    if (d) state.stats[key] = round2(clamp(state.stats[key] + d));
  }
}

/** Share of a skill gain past 100 that is kept as mastery (practice beyond the ceiling counts for less). */
export const MASTERY_RATE = 0.5;

export function addSkills(state: GameState, delta: Partial<Record<SkillKey, number>>, multiplier = 1): void {
  for (const key of SKILL_KEYS) {
    const d = delta[key];
    if (!d) continue;
    // Diminishing returns as a skill approaches 100.
    const current = state.skills[key];
    const gain = d > 0 ? d * multiplier * (1 - current / 130) : d;
    const raw = current + gain;
    state.skills[key] = round2(clamp(raw));
    // Whatever would push a skill past 100 accrues as mastery instead (never lost on a later dip).
    if (raw > 100) state.mastery[key] = round2((state.mastery[key] ?? 0) + (raw - 100) * MASTERY_RATE);
  }
}

export function adjustFamily(state: GameState, delta: number): void {
  state.relationships.family = round2(clamp(state.relationships.family + delta));
}

export function adjustFriends(state: GameState, delta: number): void {
  state.relationships.friends = round2(clamp(state.relationships.friends + delta));
}

export function adjustPartner(state: GameState, trust = 0, satisfaction = 0): void {
  const p = state.relationships.partner;
  if (!p) return;
  p.trust = round2(clamp(p.trust + trust));
  p.satisfaction = round2(clamp(p.satisfaction + satisfaction));
}

export function addMemory(state: GameState, text: string): void {
  if (!state.memories.includes(text)) state.memories.unshift(text);
  if (state.memories.length > 30) state.memories.length = 30;
}

export function addPost(state: GameState, post: Omit<Post, 'id' | 'day' | 'minute' | 'liked'> & { liked?: boolean }): void {
  state.feed.unshift({ ...post, liked: post.liked ?? false, id: nextId(state, 'post'), day: state.clock.day, minute: state.clock.minute });
  if (state.feed.length > 60) state.feed.length = 60;
}

export function playerPost(state: GameState, text: string): void {
  addPost(state, { author: state.character.name, handle: `@${handleOf(state.character.name)}`, text, kind: 'player', likes: 0 });
}

export function handleOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'player';
}

/** Apply a declarative Effect (used by events and simple actions). Bills paid via effects may go into debt. */
export function applyEffect(state: GameState, effect: Effect | undefined): void {
  if (!effect) return;
  if (effect.cash) {
    if (effect.cash > 0) earn(state, effect.cash);
    else spend(state, -effect.cash, 'event expense', true);
  }
  if (effect.savings) {
    state.finance.savings = round2(Math.max(0, state.finance.savings + effect.savings));
  }
  if (effect.stats) applyStats(state, effect.stats);
  if (effect.skills) addSkills(state, effect.skills);
  if (effect.family) adjustFamily(state, effect.family);
  if (effect.friends) adjustFriends(state, effect.friends);
  if (effect.partnerTrust || effect.partnerSatisfaction) adjustPartner(state, effect.partnerTrust ?? 0, effect.partnerSatisfaction ?? 0);
  if (effect.performance && state.career.job) {
    state.career.job.performance = round2(clamp(state.career.job.performance + effect.performance));
  }
  if (effect.community) state.communityReputation = round2(clamp(state.communityReputation + effect.community));
  if (effect.flags) Object.assign(state.flags, effect.flags);
  if (effect.addDebt) {
    const d = effect.addDebt;
    addDebt(state, d.kind, d.label, d.amount, d.monthlyPayment, d.annualRate);
  }
  if (effect.memory) addMemory(state, effect.memory);
  if (effect.post) playerPost(state, effect.post);
}

export function formatRM(value: number, decimals = 0): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}RM${abs.toLocaleString('en-MY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
