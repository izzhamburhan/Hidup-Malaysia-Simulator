// Hari Gaji payday planner: presets, what counts as a "want", and money tips.
// The needs / wants / savings split is a common personal-finance RULE OF THUMB, simplified for the
// game. It is NOT financial advice. Thresholds (the basic meal price, the emergency fund target)
// are FICTIONAL GAME RULES chosen for balance and teaching, not recommendations for real life.

import type { BudgetSplit } from '../engine/types';

export interface BudgetPreset {
  id: string;
  icon: string;
  title: string;
  blurb: string;
  split: BudgetSplit;
}

export const BUDGET_PRESETS: BudgetPreset[] = [
  { id: 'balanced', icon: '⚖️', title: '50/30/20', blurb: 'The classic: half for needs, a third for fun, a fifth for future you.', split: { needs: 50, wants: 30, save: 20 } },
  { id: 'saver', icon: '🎯', title: 'Kuat menabung', blurb: 'Same needs, less fun, more saved. Good for a goal like a deposit or a car.', split: { needs: 50, wants: 20, save: 30 } },
  { id: 'tight', icon: '🧮', title: 'Bajet ketat', blurb: 'When rent and loans eat most of the gaji. Still save something, even 10%.', split: { needs: 70, wants: 20, save: 10 } },
  { id: 'enjoy', icon: '🎉', title: 'Enjoy dulu', blurb: 'Lots of fun now, very little saved. See how the month feels.', split: { needs: 50, wants: 45, save: 5 } },
];

/** Action categories whose spending counts as wants. */
export const WANT_CATEGORIES: readonly string[] = ['leisure', 'love', 'social'];

/** Actions outside those categories whose spending counts as wants. */
export const WANT_ACTIONS: readonly string[] = ['buy-item', 'toggle-streaming', 'buy-decor', 'adopt-cat', 'change-outfit'];

/** Actions inside those categories whose spending does not count as wants (big life costs). */
export const NOT_WANT_ACTIONS: readonly string[] = ['wedding'];

/** A meal up to this price is a need; anything above it counts as a want (game rule). */
export const BASIC_MEAL_RM = 12;

/** A snack or drink up to this price is a need; anything above it counts as a want (game rule). */
export const BASIC_SNACK_RM = 4;

/** Savings fill the emergency fund first, up to this many months of commitments (game rule). */
export const EMERGENCY_MONTHS = 3;
/** The emergency fund target is never below this (game rule). */
export const EMERGENCY_MIN = 1500;

/** The plan never leaves the wallet below this: a week of the wants budget, at least RM100 (game rule). */
export const CASH_FLOOR_MIN = 100;
export const CASH_FLOOR_WEEKS = 4;

/** Wants warnings, as percentages of the wants budget. */
export const WANT_WARNINGS = [80, 100] as const;

export interface BudgetTip {
  id: string;
  icon: string;
  text: string;
}

export const BUDGET_TIPS: BudgetTip[] = [
  { id: 'pay-first', icon: '🥇', text: 'Pay yourself first: move savings out the day gaji masuk, before the month has a chance to spend it.' },
  { id: 'emergency', icon: '🛟', text: 'An emergency fund of 3 to 6 months of expenses turns a broken phone or a sudden layoff from a crisis into an annoyance.' },
  { id: 'needs-wants', icon: '🤔', text: 'Need or want? Nasi lemak for lunch is a need. The RM28 brunch with latte art is mostly a want. Both are fine, just know which is which.' },
  { id: 'bnpl', icon: '💳', text: 'Buy now, pay later still means paying. Small instalments add up and quietly eat next month\'s gaji.' },
  { id: 'minimum', icon: '📉', text: 'Paying only the minimum on a credit card keeps the debt alive for years. Clear the full balance whenever you can.' },
  { id: 'dsr', icon: '🏠', text: 'Banks look at your debt service ratio: monthly loan repayments divided by income. Keeping it low makes a future home loan easier.' },
  { id: 'lifestyle', icon: '📈', text: 'Got a raise? Save part of it before upgrading your lifestyle. Lifestyle creep is how a bigger gaji still feels tight.' },
  { id: 'kopi', icon: '☕', text: 'RM8 a day on drinks is about RM240 a month. Not a crime, but worth noticing.' },
  { id: 'epf', icon: '👴', text: 'EPF is for retirement, not this month. Your spendable money is what lands in your wallet after deductions.' },
  { id: 'sales', icon: '🛍️', text: 'A 50% discount on something you did not plan to buy is still 100% spending.' },
  { id: 'track', icon: '📒', text: 'People who track where their money goes tend to save more, simply because they notice it.' },
  { id: 'scam', icon: '🚩', text: 'Guaranteed high returns, pressure to act fast, or a stranger asking for your TAC: that is a scam, every time.' },
];

/** A friendly name for each grade on the cycle report. */
export const BUDGET_GRADES: Record<'A' | 'B' | 'C', { title: string; line: string }> = {
  A: { title: 'Cekap!', line: 'Wants within budget and savings untouched. Future you says terima kasih.' },
  B: { title: 'Not bad', line: 'Half the plan held. Small tweaks next month.' },
  C: { title: 'Bulan yang mencabar', line: 'The plan slipped this month. It happens to everyone; the next gaji is a fresh start.' },
};