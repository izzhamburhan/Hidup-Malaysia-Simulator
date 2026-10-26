// Pixel character options. Purely cosmetic: appearance never affects gameplay.
// Options are inclusive and free to mix; none is tied to background, stats or outcomes.
import type { Gender, Headwear, HairStyle, Outfit } from '../engine/types';

export const skinTones = ['#f9d9bf', '#efc09a', '#d9a274', '#b97d52', '#8f5a35', '#64391f'];

export const hairColors = ['#1b1512', '#3b2618', '#6b4226', '#a8763e', '#5b5b5b'];

export const outfitColors = ['#0f3d3e', '#c2410c', '#2563a8', '#2f7d4f', '#e7b432', '#7c3aed', '#be185d', '#475569'];

export const hairStyles: { id: HairStyle; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'side', label: 'Side part' },
  { id: 'spiky', label: 'Spiky' },
  { id: 'curly', label: 'Curly' },
  { id: 'long', label: 'Long' },
  { id: 'bun', label: 'Bun' },
  { id: 'bald', label: 'Botak' },
];

export const outfits: { id: Outfit; label: string }[] = [
  { id: 'tshirt', label: 'T-shirt' },
  { id: 'kemeja', label: 'Kemeja' },
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'blazer', label: 'Blazer' },
  { id: 'baju-kurung', label: 'Baju kurung' },
  { id: 'baju-melayu', label: 'Baju Melayu' },
];

export const headwears: { id: Headwear; label: string; weight: number }[] = [
  { id: 'none', label: 'None', weight: 60 },
  { id: 'tudung', label: 'Tudung', weight: 20 },
  { id: 'songkok', label: 'Songkok', weight: 8 },
  { id: 'cap', label: 'Cap', weight: 12 },
];

/** Wardrobe items earned through achievements. Never offered at creation or by randomAppearance. */
export const lockedOutfits: { id: Outfit; label: string; achievement: string }[] = [
  { id: 'jersey', label: 'Football jersey', achievement: 'fit' },
  { id: 'batik', label: 'Batik shirt', achievement: 'community' },
  { id: 'chef', label: 'Chef apron', achievement: 'hustler' },
  { id: 'suit', label: 'Sharp suit', achievement: 'promoted' },
  { id: 'grad-gown', label: 'Graduation gown', achievement: 'graduate' },
];

export const lockedHeadwears: { id: Headwear; label: string; achievement: string }[] = [
  { id: 'helmet', label: 'Bike helmet', achievement: 'wheels' },
  { id: 'grad-cap', label: 'Mortarboard', achievement: 'graduate' },
  { id: 'crown', label: 'Crown', achievement: 'saver-10k' },
];

/** Festive outfits: unlocked for good by sending wishes during that festival's season. */
export const festiveOutfits: { id: Outfit; label: string; season: string; seasonName: string }[] = [
  { id: 'cheongsam', label: 'Cheongsam', season: 'cny', seasonName: 'Chinese New Year' },
  { id: 'merdeka-tee', label: 'Merdeka tee', season: 'merdeka', seasonName: 'Merdeka' },
  { id: 'kurta', label: 'Kurta', season: 'deepavali', seasonName: 'Deepavali' },
  { id: 'christmas-sweater', label: 'Christmas sweater', season: 'christmas', seasonName: 'Christmas' },
];

/**
 * Starting look for a chosen gender at character creation. Only the first roll uses it: every
 * hair style, outfit and headwear above stays free to pick for anyone in the editor.
 */
export const genderLooks: Record<Gender, { hair: HairStyle[]; outfits: Outfit[]; headwear: { id: Headwear; weight: number }[] }> = {
  male: {
    hair: ['short', 'side', 'spiky', 'curly', 'bald'],
    outfits: ['tshirt', 'kemeja', 'hoodie', 'blazer', 'baju-melayu'],
    headwear: [
      { id: 'none', weight: 70 },
      { id: 'songkok', weight: 12 },
      { id: 'cap', weight: 18 },
    ],
  },
  female: {
    hair: ['long', 'bun', 'short', 'curly', 'side'],
    outfits: ['tshirt', 'kemeja', 'hoodie', 'blazer', 'baju-kurung'],
    headwear: [
      { id: 'none', weight: 62 },
      { id: 'tudung', weight: 28 },
      { id: 'cap', weight: 10 },
    ],
  },
};
