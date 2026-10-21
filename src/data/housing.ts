// Housing options and purchasable properties. Rents, deposits and prices are
// FICTIONAL GAME ESTIMATES for balance. Deposits follow a common "2 + 1 months"
// pattern as a game rule, not a legal requirement.

export interface HousingOption {
  id: string;
  name: string;
  icon: string;
  rent: number;
  /** Months of rent held as deposit when moving in. */
  depositMonths: number;
  utilities: number;
  internet: number;
  /** Base one-way commute in minutes for the default city area. */
  commute: number;
  comfort: number;
  privacy: number;
  kitchen: boolean;
  housemates: number;
  description: string;
  familyHome?: boolean;
  /** Only available while studying. */
  studentOnly?: boolean;
  ownable?: false;
}

export const housingOptions: HousingOption[] = [
  { id: 'family', name: 'Stay with family', icon: '🏡', rent: 0, depositMonths: 0, utilities: 0, internet: 0, commute: 55, comfort: 3, privacy: 1, kitchen: true, housemates: 3, familyHome: true, description: 'Free rent, free food, free life advice (unsolicited). Long commute.' },
  { id: 'hostel', name: 'Campus hostel (kolej kediaman)', icon: '🏫', rent: 180, depositMonths: 1, utilities: 0, internet: 0, commute: 10, comfort: 2, privacy: 1, kitchen: false, housemates: 1, studentOnly: true, description: 'Shared room on campus. Cheap, close to class, and someone is always microwaving maggi at 2 AM.' },
  { id: 'room', name: 'Rent a room', icon: '🛏️', rent: 550, depositMonths: 2, utilities: 60, internet: 0, commute: 35, comfort: 2, privacy: 2, kitchen: false, housemates: 4, description: 'A single room in a shared unit. Wi-Fi included, fridge space negotiable.' },
  { id: 'shared-house', name: 'Share a house with friends', icon: '🏘️', rent: 700, depositMonths: 2, utilities: 90, internet: 40, commute: 30, comfort: 3, privacy: 2, kitchen: true, housemates: 3, description: 'Your share of a terrace house. Fun, chaotic, dishes disputes.' },
  { id: 'apartment', name: 'Rent an apartment', icon: '🏢', rent: 1300, depositMonths: 2, utilities: 150, internet: 110, commute: 25, comfort: 4, privacy: 4, kitchen: true, housemates: 0, description: 'Your own place. Peace, quiet, and full utility bills.' },
  { id: 'condo', name: 'Rent a condominium', icon: '🌆', rent: 2200, depositMonths: 2, utilities: 180, internet: 130, commute: 15, comfort: 6, privacy: 5, kitchen: true, housemates: 0, description: 'Pool, gym, guardhouse, near the LRT. Your wallet feels it.' },
];

export const housingById = (id: string | null | undefined) => housingOptions.find((h) => h.id === id);

export interface Property {
  id: string;
  name: string;
  icon: string;
  price: number;
  /** Fraction of price needed as down payment (game rule). */
  downPaymentRate: number;
  /** Legal fees, stamp duty and other move-in costs bundled as a fraction of price (game estimate). */
  feesRate: number;
  loanYears: number;
  loanRate: number;
  maintenance: number;
  utilities: number;
  internet: number;
  commute: number;
  comfort: number;
  privacy: number;
  description: string;
}

export const properties: Property[] = [
  { id: 'flat', name: 'Low-cost flat (suburb)', icon: '🏚️', price: 180000, downPaymentRate: 0.1, feesRate: 0.03, loanYears: 35, loanRate: 0.042, maintenance: 90, utilities: 130, internet: 90, commute: 45, comfort: 3, privacy: 4, description: 'Affordable starter home. Lift sometimes on holiday.' },
  { id: 'apt-own', name: 'Serviced apartment', icon: '🏢', price: 380000, downPaymentRate: 0.1, feesRate: 0.04, loanYears: 35, loanRate: 0.042, maintenance: 280, utilities: 160, internet: 110, commute: 25, comfort: 5, privacy: 5, description: 'Near town, facilities included, maintenance fees too.' },
  { id: 'terrace', name: 'Double-storey terrace', icon: '🏠', price: 650000, downPaymentRate: 0.1, feesRate: 0.04, loanYears: 35, loanRate: 0.042, maintenance: 120, utilities: 220, internet: 130, commute: 35, comfort: 7, privacy: 6, description: 'Room for family, a porch for the car, a garden for ambition.' },
];

export const propertyById = (id: string | null | undefined) => properties.find((p) => p.id === id);
