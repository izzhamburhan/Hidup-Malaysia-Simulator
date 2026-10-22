// Pixel character options. Purely cosmetic: appearance never affects gameplay.
// Options are inclusive and free to mix; none is tied to background, stats or outcomes.
import type { Headwear, HairStyle, Outfit } from '../engine/types';

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
