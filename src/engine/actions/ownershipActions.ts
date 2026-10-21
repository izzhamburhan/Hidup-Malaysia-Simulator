// Money management, housing, transport, shopping, side hustles and civic life.

import { housingById, propertyById } from '../../data/housing';
import { gymById, hustleDefById, shopItemById } from '../../data/lifestyle';
import { transportModeInfo, vehicleById } from '../../data/vehicles';
import { addDebt, addSkills, applyStats, canAfford, clamp, formatRM, highlight, log, playerPost, round2, spend } from '../core';
import { isWeekend } from '../calendar';
import { REGISTRATION_FEE, hustleRequirements, startHustle, workHustle, EMPLOYEE_COST_NOTE } from '../business';
import { debtServiceRatio, expectedMonthlyNet, monthlyCommitmentTotal } from '../economy';
import { currentHome, mortgagePayment, vehicleLoanPayment } from '../living';
import { chance } from '../rng';
import type { GameState, TransportMode } from '../types';
import { hoursLabel, needEnergy, withinHours, type ActionDef } from './types';

/** Game rule for loans: total debt repayments must stay within 60% of net income. */
export const MAX_DSR = 0.6;
export const MOVING_COST = 300;
export const LICENCE_COST = 1700;
export const LICENCE_RENEWAL = 60;
export const BNPL_MARKUP = 0.1;

const liquid = (s: GameState) => s.finance.cash + s.finance.savings;

/** Pay from cash first, then savings (for big purchases the player confirmed). */
function payFromCashThenSavings(s: GameState, amount: number, label: string): void {
  const fromCash = Math.min(s.finance.cash, amount);
  if (fromCash > 0) spend(s, fromCash, label);
  const rest = round2(amount - fromCash);
  if (rest > 0) {
    s.finance.savings = round2(s.finance.savings - rest);
    s.finance.monthSpent = round2(s.finance.monthSpent + rest);
    s.today.spent = round2(s.today.spent + rest);
    s.counters.totalSpent = round2(s.counters.totalSpent + rest);
  }
}

function amountParam(p: string | undefined, fallback: number): number {
  const n = Number(p);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export interface PurchasePlan {
  upfront: number;
  monthly: number;
  dsrAfter: number;
  affordable: boolean;
  reason: string | null;
}

export function vehiclePlan(s: GameState, vehicleId: string): PurchasePlan {
  const v = vehicleById(vehicleId)!;
  const loan = vehicleLoanPayment(v.price, v.downPaymentRate, v.loanYears, v.loanRate);
  const dsrAfter = debtServiceRatio(s, loan.monthly);
  let reason: string | null = null;
  if (!s.transport.hasLicence) reason = 'Get a driving licence first.';
  else if (s.transport.vehicleId) reason = 'Sell your current vehicle first.';
  else if (loan.monthly > 0 && !s.career.job) reason = 'Banks want proof of income: get a job first.';
  else if (loan.monthly > 0 && dsrAfter > MAX_DSR) reason = `Loan rejected: repayments would be ${Math.round(dsrAfter * 100)}% of net income (game limit ${MAX_DSR * 100}%).`;
  else if (!canAfford(s, loan.down)) reason = `Need ${formatRM(loan.down)} cash for the down payment.`;
  return { upfront: loan.down, monthly: loan.monthly, dsrAfter, affordable: !reason, reason };
}

export function propertyPlan(s: GameState, propertyId: string): PurchasePlan {
  const p = propertyById(propertyId)!;
  const down = Math.round(p.price * p.downPaymentRate);
  const fees = Math.round(p.price * p.feesRate);
  const monthly = mortgagePayment(p.price - down, p.loanRate, p.loanYears);
  const dsrAfter = debtServiceRatio(s, monthly);
  const job = s.career.job;
  let reason: string | null = null;
  if (s.housing.ownedPropertyId) reason = 'You already own a home in this version.';
  else if (!job || job.schedule !== 'fulltime') reason = 'Mortgage needs a full-time job.';
  else if (s.clock.day - job.startDay < 90) reason = 'Banks want at least 3 months in your current job (game rule).';
  else if (dsrAfter > MAX_DSR) reason = `Loan rejected: repayments would be ${Math.round(dsrAfter * 100)}% of net income (game limit ${MAX_DSR * 100}%).`;
  else if (liquid(s) < down + fees) reason = `Need ${formatRM(down + fees)} (down payment + fees) in cash and savings.`;
  return { upfront: down + fees, monthly, dsrAfter, affordable: !reason, reason };
}

export const ownershipActions: ActionDef[] = [
  // --- Money ---
  {
    id: 'save',
    category: 'money',
    icon: '🏦',
    title: (_s, p) => `Move ${formatRM(amountParam(p, 500))} to savings`,
    description: 'Savings earn a little interest (fictional rate) and are harder to impulse-spend.',
    minutes: 5,
    variants: () => [
      { param: '100', label: 'RM100' },
      { param: '500', label: 'RM500' },
      { param: '1000', label: 'RM1,000' },
    ],
    available: (s, p) => (canAfford(s, amountParam(p, 500)) ? null : 'Not enough cash.'),
    run: (s, p) => {
      const a = amountParam(p, 500);
      s.finance.cash = round2(s.finance.cash - a);
      s.finance.savings = round2(s.finance.savings + a);
      applyStats(s, { stress: -1 });
    },
  },
  {
    id: 'withdraw',
    category: 'money',
    icon: '💸',
    title: (_s, p) => `Withdraw ${formatRM(amountParam(p, 500))} from savings`,
    description: 'Move savings back to your wallet.',
    minutes: 5,
    variants: () => [
      { param: '100', label: 'RM100' },
      { param: '500', label: 'RM500' },
    ],
    available: (s, p) => (s.finance.savings >= amountParam(p, 500) ? null : 'Not enough in savings.'),
    run: (s, p) => {
      const a = amountParam(p, 500);
      s.finance.savings = round2(s.finance.savings - a);
      s.finance.cash = round2(s.finance.cash + a);
    },
  },
  {
    id: 'emergency-deposit',
    category: 'money',
    icon: '🛟',
    title: (_s, p) => `Add ${formatRM(amountParam(p, 300))} to emergency fund`,
    description: 'Goal: 3–6 months of expenses. For real emergencies, not 11.11 sales.',
    minutes: 5,
    variants: () => [
      { param: '300', label: 'RM300' },
      { param: '1000', label: 'RM1,000' },
    ],
    available: (s, p) => (canAfford(s, amountParam(p, 300)) ? null : 'Not enough cash.'),
    run: (s, p) => {
      const a = amountParam(p, 300);
      s.finance.cash = round2(s.finance.cash - a);
      s.finance.emergencyFund = round2(s.finance.emergencyFund + a);
      applyStats(s, { stress: -2 });
      const months = s.finance.emergencyFund / Math.max(1, monthlyCommitmentTotal(s));
      return [`Emergency fund covers about ${months.toFixed(1)} months of commitments.`];
    },
  },
  {
    id: 'emergency-withdraw',
    category: 'money',
    icon: '🧯',
    title: 'Use emergency fund (RM500)',
    description: 'Break glass in case of emergency.',
    minutes: 5,
    visible: (s) => s.finance.emergencyFund > 0,
    available: (s) => (s.finance.emergencyFund >= 1 ? null : 'Emergency fund is empty.'),
    run: (s) => {
      const a = Math.min(500, s.finance.emergencyFund);
      s.finance.emergencyFund = round2(s.finance.emergencyFund - a);
      s.finance.cash = round2(s.finance.cash + a);
    },
  },
  {
    id: 'pay-debt',
    category: 'money',
    icon: '📉',
    dedicated: true,
    title: (s, p) => {
      const [id, amt] = (p ?? '').split('|');
      const d = s.finance.debts.find((x) => x.id === id);
      return `Pay ${formatRM(Math.min(Number(amt), d?.balance ?? 0))} extra: ${d?.label ?? 'debt'}`;
    },
    description: 'Early repayment reduces future interest.',
    minutes: 10,
    available: (s, p) => {
      const [id, amt] = (p ?? '').split('|');
      const d = s.finance.debts.find((x) => x.id === id);
      if (!d) return 'Debt not found.';
      return canAfford(s, Math.min(Number(amt), d.balance)) ? null : 'Not enough cash.';
    },
    run: (s, p) => {
      const [id, amt] = (p ?? '').split('|');
      const d = s.finance.debts.find((x) => x.id === id)!;
      const pay = round2(Math.min(Number(amt), d.balance));
      spend(s, pay, `extra repayment: ${d.label}`);
      d.balance = round2(d.balance - pay);
      if (d.balance <= 0.5) {
        s.finance.debts = s.finance.debts.filter((x) => x.id !== id);
        s.counters.debtsCleared += 1;
        if (d.kind === 'car' || d.kind === 'motorcycle') s.flags.vehicleOwnedOutright = true;
        applyStats(s, { happiness: 10, stress: -8 });
        log(s, 'milestone', `Paid off ${d.label}! 🎉`);
        highlight(s, `Cleared ${d.label}`);
        playerPost(s, `Officially debt-free from ${d.label}! 🎉`);
        return [`${d.label} fully paid off!`];
      }
      applyStats(s, { stress: -2 });
      return [`Remaining balance: ${formatRM(d.balance)}.`];
    },
  },
  {
    id: 'toggle-insurance',
    category: 'money',
    icon: '🩹',
    title: (s) => (s.finance.insurance ? 'Cancel medical insurance' : 'Buy medical insurance / takaful'),
    description: 'RM150/month (fictional estimate). Covers big hospital bills in health events.',
    minutes: 30,
    run: (s) => {
      s.finance.insurance = !s.finance.insurance;
      return [s.finance.insurance ? 'Covered. Peace of mind +1.' : 'Policy cancelled. Hope you stay healthy.'];
    },
  },
  {
    id: 'toggle-streaming',
    category: 'money',
    icon: '📺',
    title: (s) => (s.flags.streaming ? 'Cancel streaming subscriptions' : 'Subscribe to streaming'),
    description: 'RM45/month for shows to fall asleep to.',
    minutes: 5,
    run: (s) => {
      s.flags.streaming = !s.flags.streaming;
      if (s.flags.streaming) applyStats(s, { happiness: 3 });
    },
  },
  // --- Shopping ---
  {
    id: 'buy-item',
    category: 'money',
    icon: '🛒',
    dedicated: true,
    title: (_s, p) => {
      const [id, mode] = (p ?? '').split('|');
      const item = shopItemById(id);
      return item ? `Buy ${item.name}${mode === 'bnpl' ? ' (12-month instalment)' : ''}` : 'Buy';
    },
    description: (_s, p) => shopItemById((p ?? '').split('|')[0])?.description ?? '',
    minutes: 45,
    contexts: ['shopping'],
    cost: (_s, p) => {
      const [id, mode] = (p ?? '').split('|');
      return mode === 'bnpl' ? 0 : (shopItemById(id)?.price ?? 0);
    },
    confirm: (s, p) => {
      const [id, mode] = (p ?? '').split('|');
      const item = shopItemById(id);
      if (!item) return null;
      if (mode === 'bnpl') {
        const total = Math.round(item.price * (1 + BNPL_MARKUP));
        return `Pay ${formatRM(Math.round(total / 12))}/month for 12 months (${formatRM(total)} total, includes fictional fees). Adds to your monthly commitments.`;
      }
      if (item.price < 1000) return null;
      return `${formatRM(item.price)} from your wallet. Cash after purchase: ${formatRM(s.finance.cash - item.price)}.`;
    },
    available: (s, p) => {
      const [id, mode] = (p ?? '').split('|');
      const item = shopItemById(id);
      if (!item) return 'Unknown item';
      if (s.inventory.items.includes(id)) return 'Already owned.';
      if (mode === 'bnpl') return item.price < 500 ? 'Instalments only for items over RM500.' : null;
      return canAfford(s, item.price) ? null : 'Not enough cash.';
    },
    run: (s, p) => {
      const [id, mode] = (p ?? '').split('|');
      const item = shopItemById(id)!;
      if (mode === 'bnpl') {
        const total = Math.round(item.price * (1 + BNPL_MARKUP));
        addDebt(s, 'personal', `Instalment: ${item.name}`, total, Math.round(total / 12), 0);
      } else {
        spend(s, item.price, item.name);
      }
      s.inventory.items.push(id);
      if (item.price >= 1000) s.counters.bigPurchases += 1;
      applyStats(s, { happiness: item.happiness });
      if (item.price >= 3000) playerPost(s, `New toy: ${item.name} ${item.icon}`);
      return item.unlocks?.length ? [`Unlocked: ${item.unlocks.join(', ').replace(/-/g, ' ')}.`] : [];
    },
  },
  // --- Housing ---
  {
    id: 'move-home',
    category: 'home',
    icon: '📦',
    dedicated: true,
    title: (_s, p) => `Move: ${housingById(p)?.name ?? ''}`,
    description: (_s, p) => housingById(p)?.description ?? '',
    minutes: 300,
    energy: -20,
    contexts: ['home'],
    cost: (_s, p) => {
      const h = housingById(p);
      return h ? h.rent * h.depositMonths + (h.familyHome ? 0 : MOVING_COST) : 0;
    },
    confirm: (s, p) => {
      const h = housingById(p);
      if (!h) return null;
      const deposit = h.rent * h.depositMonths;
      const monthly = h.rent + h.utilities + h.internet;
      const refund = Math.round(s.housing.depositHeld * 0.9);
      return `Deposit ${formatRM(deposit)} + moving ${formatRM(h.familyHome ? 0 : MOVING_COST)} now. New monthly housing cost ${formatRM(monthly)} (rent + utilities + internet, fictional estimates).${refund ? ` Your old deposit refund: ${formatRM(refund)}.` : ''}`;
    },
    available: (s, p) => {
      const h = housingById(p);
      if (!h) return 'Unknown home';
      if (s.housing.optionId === p) return 'You already live here.';
      if (h.studentOnly && s.education.status !== 'studying') return 'Hostel places are for current students.';
      if (s.housing.ownedPropertyId) return 'Sell your property first.';
      const need = h.rent * h.depositMonths + (h.familyHome ? 0 : MOVING_COST);
      return canAfford(s, need) ? null : `Need ${formatRM(need)} cash for deposit and moving.`;
    },
    run: (s, p) => {
      const h = housingById(p)!;
      const refund = round2(s.housing.depositHeld * 0.9);
      if (refund > 0) s.finance.cash = round2(s.finance.cash + refund);
      const deposit = h.rent * h.depositMonths;
      spend(s, deposit + (h.familyHome ? 0 : MOVING_COST), 'deposit and moving');
      s.housing = { optionId: h.id, sinceDay: s.clock.day, depositHeld: deposit, ownedPropertyId: null };
      if (s.inventory.items.includes('furniture') && h.familyHome) {
        s.inventory.items = s.inventory.items.filter((i) => i !== 'furniture');
      }
      applyStats(s, { stress: 6, happiness: h.comfort - 2 });
      if (!h.familyHome) s.flags.movedOut = true;
      log(s, 'milestone', `Moved to: ${h.name}.`);
      if (!h.familyHome) playerPost(s, `New place, who dis? ${h.icon}`);
      return refund ? [`Old deposit refunded: ${formatRM(refund)} (10% kept for "wear and tear").`] : [];
    },
  },
  {
    id: 'buy-property',
    category: 'home',
    icon: '🔑',
    dedicated: true,
    title: (_s, p) => `Buy ${propertyById(p)?.name ?? 'property'}`,
    description: (_s, p) => propertyById(p)?.description ?? '',
    minutes: 360,
    energy: -15,
    confirm: (s, p) => {
      const prop = propertyById(p);
      if (!prop) return null;
      const plan = propertyPlan(s, p!);
      return `Price ${formatRM(prop.price)} (fictional). Pay ${formatRM(plan.upfront)} now (down payment + fees, from cash then savings). Mortgage ${formatRM(plan.monthly)}/month for ${prop.loanYears} years. Debt repayments will be ${Math.round(plan.dsrAfter * 100)}% of your net income.`;
    },
    available: (s, p) => (propertyById(p) ? propertyPlan(s, p!).reason : 'Unknown property'),
    run: (s, p) => {
      const prop = propertyById(p)!;
      const plan = propertyPlan(s, p!);
      payFromCashThenSavings(s, plan.upfront, `${prop.name} down payment and fees`);
      addDebt(s, 'mortgage', `Mortgage: ${prop.name}`, prop.price - Math.round(prop.price * prop.downPaymentRate), plan.monthly, prop.loanRate);
      const refund = round2(s.housing.depositHeld * 0.9);
      if (refund > 0) s.finance.cash = round2(s.finance.cash + refund);
      s.housing = { optionId: 'owned', sinceDay: s.clock.day, depositHeld: 0, ownedPropertyId: prop.id };
      s.flags.propertyValue = prop.price;
      s.counters.bigPurchases += 1;
      applyStats(s, { happiness: 15, stress: 8 });
      log(s, 'milestone', `🔑 Bought a home: ${prop.name}!`);
      highlight(s, 'Bought a home');
      playerPost(s, `Keys collected! First home 🔑🏠`);
      return ['Welcome home, homeowner. The mortgage says hi every month.'];
    },
  },
  {
    id: 'sell-property',
    category: 'home',
    icon: '🏷️',
    title: 'Sell your property',
    description: 'Sell at about market value (game estimate) minus agent fees; the mortgage is settled.',
    minutes: 240,
    visible: (s) => !!s.housing.ownedPropertyId,
    confirm: (s) => {
      const value = Number(s.flags.propertyValue ?? 0) * 0.95;
      const loan = s.finance.debts.find((d) => d.kind === 'mortgage')?.balance ?? 0;
      return `Sale proceeds about ${formatRM(value)} minus mortgage ${formatRM(loan)} = ${formatRM(value - loan)}. You will move back in with family.`;
    },
    run: (s) => {
      const value = round2(Number(s.flags.propertyValue ?? 0) * 0.95);
      const loan = s.finance.debts.find((d) => d.kind === 'mortgage');
      const net = round2(value - (loan?.balance ?? 0));
      s.finance.debts = s.finance.debts.filter((d) => d.kind !== 'mortgage');
      if (net >= 0) s.finance.cash = round2(s.finance.cash + net);
      else spend(s, -net, 'mortgage shortfall', true);
      delete s.flags.propertyValue;
      s.housing = { optionId: 'family', sinceDay: s.clock.day, depositHeld: 0, ownedPropertyId: null };
      return [`Property sold. Net ${formatRM(net)}.`];
    },
  },
  {
    id: 'clean-house',
    category: 'home',
    icon: '🧹',
    title: 'Clean your place',
    description: 'Vacuum, laundry, finally throw out that takeaway container.',
    minutes: 60,
    energy: -6,
    contexts: ['home'],
    run: (s) => {
      applyStats(s, { happiness: 3, stress: -3, energy: -6 });
      if (currentHome(s).familyHome) s.relationships.family = clamp(s.relationships.family + 1.5);
    },
  },
  // --- Transport ---
  {
    id: 'set-transport',
    category: 'transport',
    icon: '🚦',
    dedicated: true,
    title: (_s, p) => `Commute by ${transportModeInfo((p ?? 'public') as TransportMode).label.toLowerCase()}`,
    description: (_s, p) => transportModeInfo((p ?? 'public') as TransportMode).description,
    minutes: 5,
    available: (s, p) => {
      const mode = p as TransportMode;
      if (s.transport.mode === mode) return 'Already your commute.';
      const v = vehicleById(s.transport.vehicleId);
      if (mode === 'car' && v?.kind !== 'car') return 'You need a car.';
      if (mode === 'motorcycle' && v?.kind !== 'motorcycle') return 'You need a motorcycle.';
      if (mode === 'walk' && currentHome(s).commute > 35) return 'Too far to walk from this home.';
      return null;
    },
    run: (s, p) => {
      s.transport.mode = p as TransportMode;
    },
  },
  {
    id: 'get-licence',
    category: 'transport',
    icon: '🪪',
    title: 'Get a driving licence',
    description: `Driving school package, tests and the dreaded bukit (${formatRM(LICENCE_COST)}, fictional estimate).`,
    minutes: 480,
    cost: LICENCE_COST,
    energy: -15,
    visible: (s) => !s.transport.hasLicence,
    available: (s) => (canAfford(s, LICENCE_COST) ? null : 'Not enough cash.'),
    run: (s) => {
      spend(s, LICENCE_COST, 'driving licence');
      if (chance(s, 0.25)) {
        applyStats(s, { stress: 8, happiness: -4 });
        s.flags.licenceRetry = true;
        return ['You failed the bukit on the first try. The examiner\'s sigh will haunt you. Retest included - try again.'];
      }
      s.transport.hasLicence = true;
      s.transport.licenceExpiryDay = s.clock.day + 365;
      applyStats(s, { happiness: 8 });
      log(s, 'milestone', '🪪 Passed the driving test!');
      return ['Licence secured. Now you just need a car. And money.'];
    },
  },
  {
    id: 'renew-licence',
    category: 'civic',
    icon: '🪪',
    title: 'Renew driving licence',
    description: `Queue at the counter or renew online (${formatRM(LICENCE_RENEWAL)}/year, fictional estimate).`,
    minutes: 60,
    cost: LICENCE_RENEWAL,
    visible: (s) => s.transport.hasLicence,
    available: (s) => {
      const exp = s.transport.licenceExpiryDay ?? 0;
      if (exp - s.clock.day > 30) return `Valid for ${exp - s.clock.day} more days.`;
      return canAfford(s, LICENCE_RENEWAL) ? null : 'Not enough cash.';
    },
    run: (s) => {
      spend(s, LICENCE_RENEWAL, 'licence renewal');
      s.transport.licenceExpiryDay = Math.max(s.clock.day, s.transport.licenceExpiryDay ?? 0) + 365;
      return ['Licence renewed for another year.'];
    },
  },
  {
    id: 'buy-vehicle',
    category: 'transport',
    icon: '🚗',
    dedicated: true,
    title: (_s, p) => `Buy ${vehicleById(p)?.name ?? 'vehicle'}`,
    description: (_s, p) => {
      const v = vehicleById(p);
      return v ? `${v.condition === 'new' ? 'Brand new' : 'Pre-owned'}. Fuel ~${formatRM(v.fuelPerMonth)}/month, maintenance ~${formatRM(v.maintenancePerMonth)}/month.` : '';
    },
    minutes: 240,
    cost: (s, p) => (vehicleById(p) ? vehiclePlan(s, p!).upfront : 0),
    confirm: (s, p) => {
      const v = vehicleById(p);
      if (!v) return null;
      const plan = vehiclePlan(s, p!);
      const running = v.fuelPerMonth + v.maintenancePerMonth + Math.round((v.insurancePerYear + v.roadTaxPerYear) / 12);
      return `Price ${formatRM(v.price)} (fictional). Down payment ${formatRM(plan.upfront)}${plan.monthly ? `, loan ${formatRM(plan.monthly)}/month for ${v.loanYears} years` : ''}. Running costs ~${formatRM(running)}/month plus tolls and parking. Net income after this: about ${formatRM(expectedMonthlyNet(s) - monthlyCommitmentTotal(s) - plan.monthly - running)}/month left.`;
    },
    available: (s, p) => (vehicleById(p) ? vehiclePlan(s, p!).reason : 'Unknown vehicle'),
    run: (s, p) => {
      const v = vehicleById(p)!;
      const plan = vehiclePlan(s, p!);
      spend(s, plan.upfront, `${v.name} down payment`);
      if (plan.monthly > 0) {
        const loan = vehicleLoanPayment(v.price, v.downPaymentRate, v.loanYears, v.loanRate);
        addDebt(s, v.kind === 'car' ? 'car' : 'motorcycle', `Hire purchase: ${v.name}`, loan.monthly * v.loanYears * 12, loan.monthly, 0);
      }
      s.transport.vehicleId = v.id;
      s.transport.vehicleCondition = v.condition === 'new' ? 100 : 70;
      s.transport.mode = v.kind;
      s.flags.vehicleValue = Math.round(v.price * (v.condition === 'new' ? 0.85 : 0.95));
      s.counters.bigPurchases += 1;
      applyStats(s, { happiness: 10 + v.comfort, stress: 3 });
      log(s, 'milestone', `${v.icon} Bought a ${v.name}.`);
      highlight(s, `New ride: ${v.name}`);
      playerPost(s, `First ${v.kind} secured ${v.icon} Loan approved, sanity pending.`);
      return [];
    },
  },
  {
    id: 'sell-vehicle',
    category: 'transport',
    icon: '🏷️',
    title: 'Sell your vehicle',
    description: 'Sell to a dealer. Any remaining loan is settled from the proceeds.',
    minutes: 120,
    visible: (s) => !!s.transport.vehicleId,
    confirm: (s) => {
      const value = Number(s.flags.vehicleValue ?? 0) * 0.85;
      const loan = s.finance.debts.filter((d) => d.kind === 'car' || d.kind === 'motorcycle').reduce((a, d) => a + d.balance, 0);
      return `Dealer offers ~${formatRM(value)}. Remaining loan ${formatRM(loan)}. Net ${formatRM(value - loan)}. Your commute switches to public transport.`;
    },
    available: (s) => {
      const value = Number(s.flags.vehicleValue ?? 0) * 0.85;
      const loan = s.finance.debts.filter((d) => d.kind === 'car' || d.kind === 'motorcycle').reduce((a, d) => a + d.balance, 0);
      return value - loan < 0 && !canAfford(s, loan - value) ? 'You owe more than it is worth and cannot cover the gap.' : null;
    },
    run: (s) => {
      const value = round2(Number(s.flags.vehicleValue ?? 0) * 0.85);
      const loan = s.finance.debts.filter((d) => d.kind === 'car' || d.kind === 'motorcycle').reduce((a, d) => a + d.balance, 0);
      s.finance.debts = s.finance.debts.filter((d) => d.kind !== 'car' && d.kind !== 'motorcycle');
      const net = round2(value - loan);
      if (net >= 0) s.finance.cash = round2(s.finance.cash + net);
      else spend(s, -net, 'loan settlement');
      s.transport.vehicleId = null;
      s.transport.mode = 'public';
      delete s.flags.vehicleValue;
      return [`Sold. Net ${formatRM(net)}.`];
    },
  },
  {
    id: 'service-vehicle',
    category: 'transport',
    icon: '🔧',
    title: 'Service your vehicle',
    description: 'Oil change, brake check, and the mechanic\'s "boss, tayar ni dah botak".',
    minutes: 120,
    cost: (s) => (vehicleById(s.transport.vehicleId)?.kind === 'motorcycle' ? 80 : 280),
    visible: (s) => !!s.transport.vehicleId,
    available: (s) => {
      if (s.transport.vehicleCondition > 90) return 'Recently serviced.';
      const cost = vehicleById(s.transport.vehicleId)?.kind === 'motorcycle' ? 80 : 280;
      return canAfford(s, cost) ? null : 'Not enough cash.';
    },
    run: (s) => {
      spend(s, vehicleById(s.transport.vehicleId)?.kind === 'motorcycle' ? 80 : 280, 'vehicle service');
      s.transport.vehicleCondition = 100;
      return ['Runs like new. Breakdown risk down.'];
    },
  },
  // --- Fitness memberships ---
  {
    id: 'join-gym',
    category: 'fitness',
    icon: '🎫',
    dedicated: true,
    title: (_s, p) => `Join ${gymById(p)?.name ?? 'gym'}`,
    description: (_s, p) => gymById(p)?.vibe ?? '',
    minutes: 30,
    cost: (_s, p) => gymById(p)?.joiningFee ?? 0,
    confirm: (_s, p) => {
      const g = gymById(p);
      return g ? `Joining fee ${formatRM(g.joiningFee)} now, then ${formatRM(g.monthlyFee)}/month on bills day (fictional estimates).` : null;
    },
    available: (s, p) => {
      const g = gymById(p);
      if (!g) return 'Unknown gym';
      if (s.fitness.gymMember && s.fitness.gymId === p) return 'Already a member.';
      return canAfford(s, g.joiningFee) ? null : 'Not enough cash.';
    },
    run: (s, p) => {
      spend(s, gymById(p)!.joiningFee, 'gym joining fee');
      s.fitness.gymMember = true;
      s.fitness.gymId = p!;
      applyStats(s, { happiness: 2 });
      return ['Membership card acquired. Now the hard part: going.'];
    },
  },
  {
    id: 'cancel-gym',
    category: 'fitness',
    icon: '✂️',
    title: 'Cancel gym membership',
    description: 'Stop the monthly fee.',
    minutes: 15,
    visible: (s) => s.fitness.gymMember,
    run: (s) => {
      s.fitness.gymMember = false;
      s.fitness.gymId = null;
    },
  },
  // --- Side hustles ---
  {
    id: 'start-hustle',
    category: 'hustle',
    icon: '🚀',
    dedicated: true,
    title: (_s, p) => `Start: ${hustleDefById(p)?.name ?? ''}`,
    description: (_s, p) => hustleDefById(p)?.description ?? '',
    minutes: 60,
    cost: (_s, p) => hustleDefById(p)?.startupCost ?? 0,
    confirm: (_s, p) => {
      const h = hustleDefById(p);
      return h && h.startupCost > 0 ? `Startup cost ${formatRM(h.startupCost)}. Revenue is not guaranteed; growth takes many sessions.` : null;
    },
    available: (s, p) => hustleRequirements(s, p ?? '') ?? (canAfford(s, hustleDefById(p)?.startupCost ?? 0) ? null : 'Not enough cash for startup costs.'),
    run: (s, p) => [startHustle(s, p!)],
  },
  {
    id: 'work-hustle',
    category: 'hustle',
    icon: '🛠️',
    title: (_s, p) => `Work on ${hustleDefById(p)?.name ?? 'side hustle'}`,
    description: 'Serve customers, make stuff, chase payments.',
    minutes: (_s, p) => hustleDefById(p)?.minutes ?? 120,
    energy: (_s, p) => -(hustleDefById(p)?.energy ?? 10),
    contexts: ['work'],
    visible: (s) => s.hustles.length > 0,
    variants: (s) => s.hustles.map((h) => ({ param: h.id, label: hustleDefById(h.id)?.name ?? h.id })),
    available: (s, p) => {
      if (!s.hustles.some((h) => h.id === p)) return 'Not running this hustle.';
      return needEnergy(s, (hustleDefById(p)?.energy ?? 10) + 5) ?? (withinHours(s, 7, 23) ? null : 'Customers are asleep.');
    },
    run: (s, p) => workHustle(s, p!),
  },
  {
    id: 'hire-staff',
    category: 'hustle',
    icon: '🧑‍🤝‍🧑',
    dedicated: true,
    title: (_s, p) => `Hire a helper for ${hustleDefById(p)?.name ?? ''}`,
    description: EMPLOYEE_COST_NOTE,
    minutes: 120,
    confirm: () => EMPLOYEE_COST_NOTE,
    available: (s, p) => {
      const h = s.hustles.find((x) => x.id === p);
      if (!h) return 'Not running this hustle.';
      if (h.level < 3) return 'Reach level 3 before hiring.';
      if (h.employees >= h.level - 2) return `Grow to level ${h.level + 1} to hire more.`;
      return null;
    },
    run: (s, p) => {
      const h = s.hustles.find((x) => x.id === p)!;
      h.employees += 1;
      applyStats(s, { stress: 3, reputation: 2 });
      log(s, 'milestone', `Hired staff #${h.employees} for ${hustleDefById(p)?.name}.`);
      return ['Your first employee! Payroll is now your problem too.'];
    },
  },
  {
    id: 'register-company',
    category: 'hustle',
    icon: '🏢',
    dedicated: true,
    title: (_s, p) => `Register ${hustleDefById(p)?.name ?? ''} as a company`,
    description: `Make it official (${formatRM(REGISTRATION_FEE)} incl. fictional registration and secretarial fees). Boosts reputation.`,
    minutes: 180,
    cost: REGISTRATION_FEE,
    available: (s, p) => {
      const h = s.hustles.find((x) => x.id === p);
      if (!h) return 'Not running this hustle.';
      if (h.registered) return 'Already registered.';
      if (h.level < 4) return 'Reach level 4 first.';
      return canAfford(s, REGISTRATION_FEE) ? null : 'Not enough cash.';
    },
    run: (s, p) => {
      const h = s.hustles.find((x) => x.id === p)!;
      spend(s, REGISTRATION_FEE, 'company registration');
      h.registered = true;
      h.reputation = clamp(h.reputation + 10);
      s.character.lifeStage = 'entrepreneur';
      log(s, 'milestone', `🏢 Registered ${hustleDefById(p)?.name} as a company.`);
      playerPost(s, `It's official: ${hustleDefById(p)?.name} Sdn Bhd 🏢 (fictional)`);
      return ['Founder era unlocked.'];
    },
  },
  {
    id: 'close-hustle',
    category: 'hustle',
    icon: '🔒',
    dedicated: true,
    title: (_s, p) => `Close ${hustleDefById(p)?.name ?? 'hustle'}`,
    description: 'Wind it down. Staff are let go.',
    minutes: 60,
    confirm: () => 'You will stop all revenue from this hustle. Skills you built stay with you.',
    available: (s, p) => (s.hustles.some((h) => h.id === p) ? null : 'Not running.'),
    run: (s, p) => {
      s.hustles = s.hustles.filter((h) => h.id !== p);
      applyStats(s, { stress: -6 });
    },
  },
  // --- Civic (fictional Seri Harapan) ---
  {
    id: 'gotong-royong',
    category: 'civic',
    icon: '🧤',
    title: 'Join gotong-royong',
    description: 'Clean the drains and the surau compound with neighbours. Kuih provided.',
    minutes: 180,
    energy: -14,
    contexts: ['social'],
    available: (s) => (!isWeekend(s) ? 'Gotong-royong happens on weekends.' : withinHours(s, 7, 11) ? null : 'Starts 7–11 AM.'),
    run: (s) => {
      s.communityReputation = clamp(s.communityReputation + 5);
      s.counters.communityActs += 1;
      s.relationships.friends = clamp(s.relationships.friends + 1);
      applyStats(s, { happiness: 4, energy: -14, fitness: 0.6, reputation: 1 });
      return ['The longkang is clean and the makcik network now knows your name.'];
    },
  },
  {
    id: 'town-hall',
    category: 'civic',
    icon: '🏛️',
    title: 'Attend a town hall (fictional council)',
    description: 'Majlis Bandaraya Seri Harapan asks residents about bus routes and flood drains.',
    minutes: 120,
    contexts: ['social'],
    available: (s) => (withinHours(s, 19, 22) ? null : `Town halls run ${hoursLabel(19, 22)}.`),
    run: (s) => {
      s.communityReputation = clamp(s.communityReputation + 3);
      s.counters.communityActs += 1;
      addSkills(s, { communication: 0.5 });
      applyStats(s, { energy: -5, reputation: 1 });
      return [chance(s, 0.5) ? 'Your suggestion about a covered walkway got noted. Progress!' : 'Two hours of microphone feedback and one useful idea. Democracy!'];
    },
  },
  {
    id: 'volunteer',
    category: 'civic',
    icon: '🤲',
    title: 'Volunteer at the food bank',
    description: 'Pack groceries for families in need.',
    minutes: 180,
    energy: -10,
    contexts: ['social'],
    available: (s) => needEnergy(s, 15) ?? (withinHours(s, 8, 18) ? null : `Open ${hoursLabel(8, 18)}.`),
    run: (s) => {
      s.communityReputation = clamp(s.communityReputation + 4);
      s.counters.communityActs += 1;
      applyStats(s, { happiness: 6, stress: -4, energy: -10 });
    },
  },
  {
    id: 'report-issue',
    category: 'civic',
    icon: '🕳️',
    title: 'Report a pothole to the council app',
    description: 'Snap a photo, pin the location, hope for the best.',
    minutes: 15,
    run: (s) => {
      s.communityReputation = clamp(s.communityReputation + 1);
      return [chance(s, 0.3) ? 'Fixed within a week! Faith in local government restored (temporarily).' : 'Status: "Dalam tindakan". It will be in tindakan for a while.'];
    },
  },
  {
    id: 'pay-fines',
    category: 'civic',
    icon: '🧾',
    title: (s) => `Pay summons (${formatRM(s.transport.pendingFines)})`,
    description: 'Settle traffic summons online before they escalate.',
    minutes: 20,
    cost: (s) => s.transport.pendingFines,
    visible: (s) => s.transport.pendingFines > 0,
    available: (s) => (canAfford(s, s.transport.pendingFines) ? null : 'Not enough cash.'),
    run: (s) => {
      spend(s, s.transport.pendingFines, 'traffic summons');
      s.transport.pendingFines = 0;
      applyStats(s, { stress: -3 });
    },
  },
];
