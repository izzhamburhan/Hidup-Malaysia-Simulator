// Housing and transport helpers shared by actions, the economy and the UI.

import { housingById, propertyById } from '../data/housing';
import { mapStateByName } from '../data/malaysia';
import { transportModeInfo, vehicleById } from '../data/vehicles';
import { applyStats, spend } from './core';
import type { GameState } from './types';

/** Fictional living-cost factor of the residence state (Selangor = 1; unknown state = 1). */
export function costFactor(state: GameState): number {
  return mapStateByName(state.location.state)?.costFactor ?? 1;
}

/** Fictional factor on new job offers of the residence state (Selangor = 1; unknown state = 1). */
export function payFactor(state: GameState): number {
  return mapStateByName(state.location.state)?.payFactor ?? 1;
}

/** A catalogue price scaled by the residence state's cost factor, whole RM. */
export function scaledCost(state: GameState, amount: number): number {
  return Math.round(amount * costFactor(state));
}

/** Game rule for what moving house costs; moving to another state costs more by distance. */
export const MOVING_STATE_COST = { sameRegion: 300, otherRegion: 700, acrossSea: 1800 } as const;

/**
 * Leaving the family home for another state means renting a room there: its deposit, at the
 * target state's prices. Zero when not living with family or when moving to the home state.
 */
export function familyMoveDeposit(state: GameState, target: string | undefined): number {
  const to = mapStateByName(target);
  if (!to || state.housing.optionId !== 'family' || to.name === state.character.homeState) return 0;
  const room = housingById('room')!;
  return Math.round(room.rent * to.costFactor) * room.depositMonths;
}

/** Moving cost to another state: same region cheapest, across the South China Sea dearest (fictional), plus any room deposit. */
export function movingStateCost(state: GameState, target: string | undefined): number {
  const from = mapStateByName(state.location.state);
  const to = mapStateByName(target);
  if (!from || !to) return 0;
  const move = from.region === to.region ? MOVING_STATE_COST.sameRegion : from.region === 'borneo' || to.region === 'borneo' ? MOVING_STATE_COST.acrossSea : MOVING_STATE_COST.otherRegion;
  return move + familyMoveDeposit(state, target);
}

export interface HomeInfo {
  name: string;
  icon: string;
  rent: number;
  utilities: number;
  internet: number;
  maintenance: number;
  commute: number;
  comfort: number;
  privacy: number;
  kitchen: boolean;
  familyHome: boolean;
  owned: boolean;
}

export function currentHome(state: GameState): HomeInfo {
  const owned = propertyById(state.housing.ownedPropertyId);
  if (owned && state.housing.optionId === 'owned') {
    return {
      name: owned.name,
      icon: owned.icon,
      rent: 0,
      utilities: owned.utilities,
      internet: owned.internet,
      maintenance: owned.maintenance,
      commute: owned.commute,
      comfort: owned.comfort + (state.inventory.items.includes('furniture') ? 1 : 0),
      privacy: owned.privacy,
      kitchen: true,
      familyHome: false,
      owned: true,
    };
  }
  const h = housingById(state.housing.optionId) ?? housingById('family')!;
  return {
    name: h.name,
    icon: h.icon,
    rent: scaledCost(state, h.rent),
    utilities: scaledCost(state, h.utilities),
    internet: scaledCost(state, h.internet),
    maintenance: 0,
    commute: h.commute,
    comfort: h.comfort + (state.inventory.items.includes('furniture') && !h.familyHome ? 1 : 0),
    privacy: h.privacy,
    kitchen: h.kitchen || state.inventory.items.includes('cookware'),
    familyHome: !!h.familyHome,
    owned: false,
  };
}

/** One-way commute minutes for the player's current home and transport. */
export function commuteMinutes(state: GameState): number {
  const base = currentHome(state).commute;
  const info = transportModeInfo(state.transport.mode);
  return Math.round(base * info.timeFactor);
}

/** Cost of one commute leg (tolls/parking for vehicles, fare for e-hailing). */
export function commuteCost(state: GameState): number {
  const info = transportModeInfo(state.transport.mode);
  if (state.transport.mode === 'ehailing') {
    const base = currentHome(state).commute;
    return Math.round(info.tripCost * Math.max(0.6, base / 30));
  }
  return info.tripCost;
}

/** Apply the energy/stress/money of a commute leg. Returns minutes. */
export function commuteLeg(state: GameState, legs = 1): number {
  const info = transportModeInfo(state.transport.mode);
  const cost = commuteCost(state) * legs;
  if (cost > 0) spend(state, cost, `${info.label} fares/tolls`, true);
  const minutes = commuteMinutes(state) * legs;
  const longCommute = minutes / legs > 50 ? 2 : 0;
  applyStats(state, { energy: -(info.energy + longCommute) * legs, stress: (info.stress + longCommute) * legs * 0.6 });
  if (state.transport.mode === 'walk') applyStats(state, { fitness: 0.3 * legs });
  if (state.transport.vehicleId) state.transport.vehicleCondition = Math.max(0, state.transport.vehicleCondition - 0.15 * legs);
  return minutes;
}

export function vehicleMonthlyCosts(state: GameState): { label: string; amount: number }[] {
  const v = vehicleById(state.transport.vehicleId);
  if (!v) return [];
  return [
    { label: `${v.name}: fuel`, amount: v.fuelPerMonth },
    { label: `${v.name}: insurance (monthly share)`, amount: Math.round(v.insurancePerYear / 12) },
    { label: `${v.name}: road tax (monthly share)`, amount: Math.round(v.roadTaxPerYear / 12) },
    { label: `${v.name}: maintenance`, amount: v.maintenancePerMonth },
  ];
}

export function vehicleLoanPayment(price: number, downPaymentRate: number, years: number, rate: number): { down: number; loan: number; monthly: number } {
  const down = Math.round(price * downPaymentRate);
  const loan = price - down;
  if (years <= 0 || loan <= 0) return { down: price, loan: 0, monthly: 0 };
  // Malaysian hire purchase uses flat-rate interest (game simplification).
  const totalInterest = loan * rate * years;
  return { down, loan, monthly: Math.round((loan + totalInterest) / (years * 12)) };
}

/** Standard amortised mortgage payment (game rule). */
export function mortgagePayment(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return Math.round(principal / n);
  return Math.round((principal * r) / (1 - Math.pow(1 + r, -n)));
}
