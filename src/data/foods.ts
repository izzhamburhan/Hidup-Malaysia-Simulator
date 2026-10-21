// Malaysian food catalogue. Calories are ROUGH ESTIMATES per typical serving for
// gameplay only; prices are fictional game estimates. Not nutrition advice.

export type FoodCategory = 'breakfast' | 'rice' | 'noodles' | 'mamak' | 'snack' | 'drink' | 'home' | 'healthy';

export interface Food {
  id: string;
  name: string;
  icon: string;
  category: FoodCategory;
  calories: number;
  price: number;
  satiety: number;
  energy: number;
  /** Small health nudge per serving (positive = wholesome). */
  health: number;
  happiness: number;
  minutes: number;
  /** Drinks and snacks don't count as a meal. */
  meal: boolean;
  /** Only available when the player's housing has a kitchen. */
  needsKitchen?: boolean;
}

export const foods: Food[] = [
  { id: 'nasi-lemak', name: 'Nasi lemak', icon: '🍛', category: 'breakfast', calories: 650, price: 6, satiety: 45, energy: 8, health: -0.4, happiness: 4, minutes: 20, meal: true },
  { id: 'roti-canai', name: 'Roti canai', icon: '🫓', category: 'mamak', calories: 300, price: 2.5, satiety: 25, energy: 5, health: -0.3, happiness: 3, minutes: 15, meal: true },
  { id: 'roti-telur', name: 'Roti telur', icon: '🍳', category: 'mamak', calories: 420, price: 3.5, satiety: 32, energy: 6, health: -0.3, happiness: 3, minutes: 15, meal: true },
  { id: 'nasi-kandar', name: 'Nasi kandar', icon: '🍛', category: 'rice', calories: 850, price: 13, satiety: 60, energy: 8, health: -0.8, happiness: 6, minutes: 25, meal: true },
  { id: 'ckt', name: 'Char kuey teow', icon: '🍜', category: 'noodles', calories: 740, price: 9, satiety: 50, energy: 7, health: -0.7, happiness: 5, minutes: 20, meal: true },
  { id: 'laksa', name: 'Laksa', icon: '🍲', category: 'noodles', calories: 550, price: 9, satiety: 45, energy: 7, health: -0.2, happiness: 5, minutes: 25, meal: true },
  { id: 'chicken-rice', name: 'Chicken rice', icon: '🍗', category: 'rice', calories: 600, price: 9, satiety: 50, energy: 8, health: 0, happiness: 4, minutes: 20, meal: true },
  { id: 'satay', name: 'Satay (10 sticks)', icon: '🍢', category: 'snack', calories: 450, price: 12, satiety: 35, energy: 5, health: -0.3, happiness: 6, minutes: 30, meal: true },
  { id: 'banana-leaf', name: 'Banana leaf rice', icon: '🍃', category: 'rice', calories: 800, price: 14, satiety: 65, energy: 8, health: -0.2, happiness: 6, minutes: 30, meal: true },
  { id: 'mee-goreng', name: 'Mee goreng mamak', icon: '🍝', category: 'mamak', calories: 660, price: 8, satiety: 48, energy: 7, health: -0.5, happiness: 4, minutes: 20, meal: true },
  { id: 'nasi-campur', name: 'Nasi campur (economy rice)', icon: '🍱', category: 'rice', calories: 650, price: 8, satiety: 55, energy: 8, health: 0.1, happiness: 3, minutes: 20, meal: true },
  { id: 'home-cooked', name: 'Home-cooked meal', icon: '🥘', category: 'home', calories: 550, price: 5, satiety: 55, energy: 8, health: 0.6, happiness: 3, minutes: 50, meal: true, needsKitchen: true },
  { id: 'mak-cooking', name: "Mak's cooking", icon: '🏡', category: 'home', calories: 600, price: 0, satiety: 60, energy: 9, health: 0.6, happiness: 6, minutes: 30, meal: true },
  { id: 'salad', name: 'Salad bowl', icon: '🥗', category: 'healthy', calories: 380, price: 16, satiety: 35, energy: 6, health: 0.9, happiness: 1, minutes: 20, meal: true },
  { id: 'maggi', name: 'Instant noodles', icon: '🍥', category: 'home', calories: 400, price: 1.5, satiety: 30, energy: 4, health: -0.6, happiness: 3, minutes: 10, meal: true },
  { id: 'kuih', name: 'Kuih-muih (3 pcs)', icon: '🍡', category: 'snack', calories: 300, price: 3, satiety: 15, energy: 4, health: -0.2, happiness: 4, minutes: 10, meal: false },
  { id: 'mamak-snacks', name: 'Mamak snacks (goreng pisang)', icon: '🍌', category: 'snack', calories: 280, price: 4, satiety: 15, energy: 3, health: -0.4, happiness: 3, minutes: 15, meal: false },
  { id: 'teh-tarik', name: 'Teh tarik', icon: '🧋', category: 'drink', calories: 180, price: 2.5, satiety: 5, energy: 6, health: -0.2, happiness: 4, minutes: 10, meal: false },
  { id: 'kopi-ais', name: 'Kopi ais', icon: '🥤', category: 'drink', calories: 160, price: 3, satiety: 4, energy: 8, health: -0.2, happiness: 3, minutes: 10, meal: false },
  { id: 'milo-ais', name: 'Milo ais', icon: '🍫', category: 'drink', calories: 220, price: 3.5, satiety: 6, energy: 5, health: -0.2, happiness: 4, minutes: 10, meal: false },
  { id: 'bubble-tea', name: 'Bubble tea', icon: '🧋', category: 'drink', calories: 350, price: 13, satiety: 8, energy: 3, health: -0.5, happiness: 6, minutes: 15, meal: false },
];

export const foodById = (id: string | null | undefined) => foods.find((f) => f.id === id);

/** Portion multipliers offered by the food diary. */
export const portions = [
  { id: 'small', label: 'Small', factor: 0.7 },
  { id: 'regular', label: 'Regular', factor: 1 },
  { id: 'large', label: 'Tambah (large)', factor: 1.4 },
];
