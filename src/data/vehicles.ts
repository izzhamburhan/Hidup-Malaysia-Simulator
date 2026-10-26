// Vehicles and transport modes. ALL prices and running costs are FICTIONAL GAME
// ESTIMATES for balance, not dealer prices or official road-tax/insurance quotes.
import type { TransportMode } from '../engine/types';

/** Generic body shapes for the pixel sprite (VehicleSprite). Never a logo, grille or photo. */
export const VEHICLE_SHAPES = ['scooter', 'motorbike', 'hatchback', 'sedan', 'mpv', 'suv'] as const;
export type VehicleShape = (typeof VEHICLE_SHAPES)[number];

export interface Vehicle {
  id: string;
  name: string;
  icon: string;
  kind: 'motorcycle' | 'car';
  shape: VehicleShape;
  /** Paint colour of the sprite (game palette). */
  color: string;
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
  { id: 'kapcai', name: 'Used kapcai (110cc)', icon: '🛵', kind: 'motorcycle', shape: 'scooter', color: '#2563a8', condition: 'used', price: 2500, downPaymentRate: 1, loanYears: 0, loanRate: 0, fuelPerMonth: 60, insurancePerYear: 90, roadTaxPerYear: 2, maintenancePerMonth: 25, breakdownRisk: 0.03, comfort: 1 },
  { id: 'moto-new', name: 'New 150cc motorcycle', icon: '🏍️', kind: 'motorcycle', shape: 'motorbike', color: '#c2410c', condition: 'new', price: 9000, downPaymentRate: 0.1, loanYears: 4, loanRate: 0.05, fuelPerMonth: 70, insurancePerYear: 150, roadTaxPerYear: 30, maintenancePerMonth: 20, breakdownRisk: 0.01, comfort: 2 },
  { id: 'axia-used', name: 'Used Perodua Axia', icon: '🚗', kind: 'car', shape: 'hatchback', color: '#9ca3af', condition: 'used', price: 18000, downPaymentRate: 0.15, loanYears: 5, loanRate: 0.045, fuelPerMonth: 220, insurancePerYear: 650, roadTaxPerYear: 70, maintenancePerMonth: 80, breakdownRisk: 0.03, comfort: 3 },
  { id: 'saga-used', name: 'Used Proton Saga', icon: '🚙', kind: 'car', shape: 'sedan', color: '#e5e7eb', condition: 'used', price: 22000, downPaymentRate: 0.15, loanYears: 5, loanRate: 0.045, fuelPerMonth: 240, insurancePerYear: 700, roadTaxPerYear: 90, maintenancePerMonth: 85, breakdownRisk: 0.03, comfort: 3 },
  { id: 'axia', name: 'New Perodua Axia', icon: '🚗', kind: 'car', shape: 'hatchback', color: '#e7b432', condition: 'new', price: 38000, downPaymentRate: 0.1, loanYears: 9, loanRate: 0.035, fuelPerMonth: 200, insurancePerYear: 1000, roadTaxPerYear: 70, maintenancePerMonth: 40, breakdownRisk: 0.005, comfort: 4 },
  { id: 'myvi', name: 'New Perodua Myvi', icon: '🚘', kind: 'car', shape: 'hatchback', color: '#be185d', condition: 'new', price: 52000, downPaymentRate: 0.1, loanYears: 9, loanRate: 0.035, fuelPerMonth: 230, insurancePerYear: 1300, roadTaxPerYear: 90, maintenancePerMonth: 45, breakdownRisk: 0.005, comfort: 5 },
  { id: 'saga', name: 'New Proton Saga', icon: '🚙', kind: 'car', shape: 'sedan', color: '#2f7d4f', condition: 'new', price: 40000, downPaymentRate: 0.1, loanYears: 9, loanRate: 0.035, fuelPerMonth: 230, insurancePerYear: 1050, roadTaxPerYear: 90, maintenancePerMonth: 45, breakdownRisk: 0.005, comfort: 4 },
  { id: 's70', name: 'New Proton S70', icon: '🚘', kind: 'car', shape: 'sedan', color: '#1f2937', condition: 'new', price: 80000, downPaymentRate: 0.1, loanYears: 9, loanRate: 0.033, fuelPerMonth: 280, insurancePerYear: 2000, roadTaxPerYear: 150, maintenancePerMonth: 60, breakdownRisk: 0.004, comfort: 7 },
  { id: 'perodua-bezza-used', name: 'Used Perodua Bezza', icon: '🚗', kind: 'car', shape: 'sedan', color: '#7c8a99', condition: 'used', price: 20000, downPaymentRate: 0.15, loanYears: 5, loanRate: 0.045, fuelPerMonth: 210, insurancePerYear: 680, roadTaxPerYear: 70, maintenancePerMonth: 80, breakdownRisk: 0.03, comfort: 3 },
  { id: 'perodua-alza', name: 'New Perodua Alza', icon: '🚐', kind: 'car', shape: 'mpv', color: '#f3f4f6', condition: 'new', price: 68000, downPaymentRate: 0.1, loanYears: 9, loanRate: 0.034, fuelPerMonth: 250, insurancePerYear: 1400, roadTaxPerYear: 100, maintenancePerMonth: 55, breakdownRisk: 0.004, comfort: 6 },
  { id: 'proton-x50', name: 'New Proton X50', icon: '🚙', kind: 'car', shape: 'suv', color: '#b91c1c', condition: 'new', price: 98000, downPaymentRate: 0.1, loanYears: 9, loanRate: 0.033, fuelPerMonth: 260, insurancePerYear: 1900, roadTaxPerYear: 120, maintenancePerMonth: 65, breakdownRisk: 0.004, comfort: 7 },
  { id: 'proton-x70', name: 'New Proton X70', icon: '🚙', kind: 'car', shape: 'suv', color: '#0f3d3e', condition: 'new', price: 125000, downPaymentRate: 0.1, loanYears: 9, loanRate: 0.032, fuelPerMonth: 290, insurancePerYear: 2300, roadTaxPerYear: 160, maintenancePerMonth: 75, breakdownRisk: 0.004, comfort: 8 },
  { id: 'honda-city', name: 'New Honda City', icon: '🚘', kind: 'car', shape: 'sedan', color: '#475569', condition: 'new', price: 112000, downPaymentRate: 0.1, loanYears: 9, loanRate: 0.032, fuelPerMonth: 240, insurancePerYear: 2100, roadTaxPerYear: 130, maintenancePerMonth: 70, breakdownRisk: 0.003, comfort: 7 },
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
