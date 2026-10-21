// Vehicles and transport modes. ALL prices and running costs are FICTIONAL GAME
// ESTIMATES for balance, not dealer prices or official road-tax/insurance quotes.
import type { TransportMode } from '../engine/types';

export interface Vehicle {
  id: string;
  name: string;
  icon: string;
  kind: 'motorcycle' | 'car';
  condition: 'new' | 'used';
  price: number;
  /** Fraction of the price paid up front. */
  downPaymentRate: number;
  loanYears: number;
  /** Flat annual hire-purchase rate (game rule). */
  loanRate: number;
  fuelPerMonth: number;
  insurancePerYear: number;
  roadTaxPerYear: number;
  maintenancePerMonth: number;
  /** Chance per commute day of a breakdown / repair event. */
  breakdownRisk: number;
  comfort: number;
}

export const vehicles: Vehicle[] = [
  { id: 'kapcai', name: 'Used kapcai (110cc)', icon: '🛵', kind: 'motorcycle', condition: 'used', price: 2500, downPaymentRate: 1, loanYears: 0, loanRate: 0, fuelPerMonth: 60, insurancePerYear: 90, roadTaxPerYear: 2, maintenancePerMonth: 25, breakdownRisk: 0.03, comfort: 1 },
  { id: 'moto-new', name: 'New 150cc motorcycle', icon: '🏍️', kind: 'motorcycle', condition: 'new', price: 9000, downPaymentRate: 0.1, loanYears: 4, loanRate: 0.05, fuelPerMonth: 70, insurancePerYear: 150, roadTaxPerYear: 30, maintenancePerMonth: 20, breakdownRisk: 0.01, comfort: 2 },
  { id: 'axia-used', name: 'Used Perodua Axia', icon: '🚗', kind: 'car', condition: 'used', price: 18000, downPaymentRate: 0.15, loanYears: 5, loanRate: 0.045, fuelPerMonth: 220, insurancePerYear: 650, roadTaxPerYear: 70, maintenancePerMonth: 80, breakdownRisk: 0.03, comfort: 3 },
  { id: 'saga-used', name: 'Used Proton Saga', icon: '🚙', kind: 'car', condition: 'used', price: 22000, downPaymentRate: 0.15, loanYears: 5, loanRate: 0.045, fuelPerMonth: 240, insurancePerYear: 700, roadTaxPerYear: 90, maintenancePerMonth: 85, breakdownRisk: 0.03, comfort: 3 },
  { id: 'axia', name: 'New Perodua Axia', icon: '🚗', kind: 'car', condition: 'new', price: 38000, downPaymentRate: 0.1, loanYears: 9, loanRate: 0.035, fuelPerMonth: 200, insurancePerYear: 1000, roadTaxPerYear: 70, maintenancePerMonth: 40, breakdownRisk: 0.005, comfort: 4 },
  { id: 'myvi', name: 'New Perodua Myvi', icon: '🚘', kind: 'car', condition: 'new', price: 52000, downPaymentRate: 0.1, loanYears: 9, loanRate: 0.035, fuelPerMonth: 230, insurancePerYear: 1300, roadTaxPerYear: 90, maintenancePerMonth: 45, breakdownRisk: 0.005, comfort: 5 },
  { id: 'saga', name: 'New Proton Saga', icon: '🚙', kind: 'car', condition: 'new', price: 40000, downPaymentRate: 0.1, loanYears: 9, loanRate: 0.035, fuelPerMonth: 230, insurancePerYear: 1050, roadTaxPerYear: 90, maintenancePerMonth: 45, breakdownRisk: 0.005, comfort: 4 },
  { id: 's70', name: 'New Proton S70', icon: '🚘', kind: 'car', condition: 'new', price: 80000, downPaymentRate: 0.1, loanYears: 9, loanRate: 0.033, fuelPerMonth: 280, insurancePerYear: 2000, roadTaxPerYear: 150, maintenancePerMonth: 60, breakdownRisk: 0.004, comfort: 7 },
];

export const vehicleById = (id: string | null | undefined) => vehicles.find((v) => v.id === id);

export interface TransportModeInfo {
  mode: TransportMode;
  label: string;
  icon: string;
  /** Multiplier on the housing's base commute minutes. */
  timeFactor: number;
  /** Cost per one-way trip, RM (game estimate). Car/motorcycle trips cost toll + parking instead. */
  tripCost: number;
  /** Energy cost per commute leg. */
  energy: number;
  stress: number;
  monthlyPass?: number;
  description: string;
}

export const transportModes: TransportModeInfo[] = [
  { mode: 'walk', label: 'Walk / cycle', icon: '🚶', timeFactor: 2.2, tripCost: 0, energy: 6, stress: 1, description: 'Free and healthy, but only sensible when home is close.' },
  { mode: 'public', label: 'Public transport', icon: '🚆', timeFactor: 1.4, tripCost: 0, energy: 4, stress: 2, monthlyPass: 50, description: 'Monthly pass (game estimate). Read, nap or doomscroll on the way. Occasional delays.' },
  { mode: 'motorcycle', label: 'Motorcycle', icon: '🏍️', timeFactor: 0.8, tripCost: 1, energy: 4, stress: 3, description: 'Fast through jams. Rain is your enemy.' },
  { mode: 'car', label: 'Own car', icon: '🚗', timeFactor: 1.0, tripCost: 6, energy: 3, stress: 3, description: 'Comfortable, but tolls, parking, fuel and jams add up.' },
  { mode: 'ehailing', label: 'E-hailing', icon: '📱', timeFactor: 1.0, tripCost: 18, energy: 2, stress: 1, description: 'Door to door, no parking stress. Expensive daily.' },
];

export const transportModeInfo = (mode: TransportMode) => transportModes.find((t) => t.mode === mode)!;
