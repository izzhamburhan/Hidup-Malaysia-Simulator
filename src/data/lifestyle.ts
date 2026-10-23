// Gyms, shop items, hobbies and side hustles. All prices are FICTIONAL GAME ESTIMATES.
import type { SkillKey } from '../engine/types';

export interface Gym {
  id: string;
  name: string;
  monthlyFee: number;
  joiningFee: number;
  dayPass: number;
  vibe: string;
}

export const gyms: Gym[] = [
  { id: 'budget-gym', name: 'Gym Rakyat 24/7', monthlyFee: 60, joiningFee: 30, dayPass: 12, vibe: 'Basic, busy after 6 PM, smells like determination.' },
  { id: 'premium-gym', name: 'Atlas Premium Fitness (fictional)', monthlyFee: 220, joiningFee: 150, dayPass: 45, vibe: 'Sauna, classes, towels that are actually fluffy.' },
];

export const gymById = (id: string | null | undefined) => gyms.find((g) => g.id === id);

export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  description: string;
  happiness: number;
  /** Unlocks: actions or hustles that require this item. */
  unlocks?: string[];
  category: 'gadget' | 'home' | 'hobby' | 'fashion';
}

export const shopItems: ShopItem[] = [
  { id: 'laptop', name: 'Work laptop', icon: '💻', price: 3200, description: 'Needed for freelance dev and serious side projects.', happiness: 6, unlocks: ['freelance-dev', 'content'], category: 'gadget' },
  { id: 'gaming-pc', name: 'Gaming PC', icon: '🖥️', price: 5500, description: 'RGB everything. Gaming becomes more fun (and later at night).', happiness: 12, unlocks: ['pc-gaming'], category: 'gadget' },
  { id: 'phone', name: 'Flagship phone', icon: '📱', price: 4500, description: 'Great camera, great status, great instalment plan.', happiness: 10, unlocks: ['content'], category: 'gadget' },
  { id: 'camera', name: 'Mirrorless camera', icon: '📷', price: 3800, description: 'Unlocks photography as a hobby and later a paid service.', happiness: 8, unlocks: ['photography', 'photo-service'], category: 'hobby' },
  { id: 'racket', name: 'Badminton racket', icon: '🏸', price: 280, description: 'Required for badminton nights. Feathers not included.', happiness: 3, unlocks: ['badminton'], category: 'hobby' },
  { id: 'boots', name: 'Futsal shoes', icon: '👟', price: 220, description: 'For futsal and football. Smells after one week.', happiness: 3, unlocks: ['futsal'], category: 'hobby' },
  { id: 'cookware', name: 'Cookware set', icon: '🍳', price: 350, description: 'Better home cooking; unlocks a small food business.', happiness: 3, unlocks: ['kuih-business'], category: 'home' },
  { id: 'furniture', name: 'Proper furniture', icon: '🛋️', price: 2500, description: 'Your place finally looks like an adult lives there.', happiness: 8, category: 'home' },
  { id: 'baju-raya', name: 'New festive outfit', icon: '👘', price: 250, description: 'Matching colour scheme with the family this year.', happiness: 5, category: 'fashion' },
];

export const shopItemById = (id: string | null | undefined) => shopItems.find((i) => i.id === id);

export interface HustleDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  startupCost: number;
  requiresItem?: string;
  requiresSkill?: Partial<Record<SkillKey, number>>;
  minutes: number;
  energy: number;
  /** Base revenue per session at level 1 (game estimate). */
  baseRevenue: number;
  /** Variable cost per session as a fraction of revenue. */
  costRate: number;
  /** Revenue volatility (0..1). */
  volatility: number;
  skill: SkillKey;
}

export const hustleDefs: HustleDef[] = [
  { id: 'freelance-dev', name: 'Freelance web developer', icon: '🧑‍💻', description: 'Build websites for small businesses. Clients pay... eventually.', startupCost: 0, requiresItem: 'laptop', requiresSkill: { tech: 30 }, minutes: 180, energy: 14, baseRevenue: 140, costRate: 0.05, volatility: 0.6, skill: 'tech' },
  { id: 'tutoring', name: 'Home tuition', icon: '📚', description: 'Teach SPM Maths and English to anxious students (and parents).', startupCost: 0, requiresSkill: { communication: 20 }, minutes: 120, energy: 10, baseRevenue: 80, costRate: 0.08, volatility: 0.2, skill: 'communication' },
  { id: 'online-shop', name: 'Online shop', icon: '📦', description: 'Sell phone cases and tudung pins online. Margins are thin, chats are many.', startupCost: 600, minutes: 120, energy: 8, baseRevenue: 110, costRate: 0.55, volatility: 0.5, skill: 'business' },
  { id: 'kuih-business', name: 'Kuih & lunch box business', icon: '🍱', description: 'Cook at dawn, sell by noon. Repeat customers are everything.', startupCost: 400, requiresItem: 'cookware', requiresSkill: { cooking: 15 }, minutes: 180, energy: 16, baseRevenue: 150, costRate: 0.45, volatility: 0.35, skill: 'cooking' },
  { id: 'content', name: 'Content creation', icon: '🎬', description: 'Post relatable videos. Most get 37 views. One day, one might not.', startupCost: 0, requiresItem: 'phone', minutes: 150, energy: 10, baseRevenue: 30, costRate: 0.1, volatility: 0.95, skill: 'creative' },
  { id: 'photo-service', name: 'Photography services', icon: '📸', description: 'Weddings, convos and product shoots. Weekends become work days.', startupCost: 300, requiresItem: 'camera', requiresSkill: { creative: 25 }, minutes: 240, energy: 16, baseRevenue: 260, costRate: 0.15, volatility: 0.45, skill: 'creative' },
  { id: 'kopi-kiosk', name: 'Specialty kopi kiosk', icon: '☕', description: "Everyone's opening a trendy kopi kiosk these days. Yours serves kopi O ais with oat milk and an Instagram-worthy cup.", startupCost: 3000, requiresSkill: { cooking: 15, business: 10 }, minutes: 180, energy: 16, baseRevenue: 220, costRate: 0.5, volatility: 0.3, skill: 'cooking' },
];

export const hustleDefById = (id: string | null | undefined) => hustleDefs.find((h) => h.id === id);

/** Malaysian states and federal territories for character creation. */
export const homeStates = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang',
  'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur', 'Putrajaya', 'Labuan',
];

/** Fictional NPC names used for friends, prospects and social feed authors. */
export const npcNames = [
  'Aiman', 'Nurul', 'Wei Ling', 'Arjun', 'Farah', 'Hafiz', 'Mei Xin', 'Kavitha', 'Danial', 'Siti', 'Jason', 'Priya',
  'Amir', 'Aisyah', 'Ken', 'Deepa', 'Syafiq', 'Hui Min', 'Ravi', 'Balqis', 'Jun Hao', 'Liyana', 'Adam', 'Shalini',
  'Iqbal', 'Sofea', 'Marcus', 'Anis', 'Vinod', 'Qistina',
];

export const traits = ['funny', 'ambitious', 'chill', 'caring', 'adventurous', 'introverted', 'foodie', 'sporty', 'artsy', 'nerdy'];
export const interests = ['hiking', 'K-dramas', 'football', 'cooking', 'photography', 'gaming', 'cafe hopping', 'reading', 'badminton', 'music festivals'];
