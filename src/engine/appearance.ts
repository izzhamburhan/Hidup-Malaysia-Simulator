// Pixel character appearance helpers. Appearance is cosmetic and uses its own
// seeded generator, so it never consumes state.rng or changes simulation results.

import { festiveOutfits, genderLooks, hairColors, hairStyles, headwears, lockedHeadwears, lockedOutfits, outfitColors, outfits, skinTones } from '../data/appearance';
import { seedFromString } from './rng';
import type { Appearance, GameState, Gender, Mood } from './types';

function generator(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Without a gender the result is the long-standing one (NPC faces depend on it). */
export function randomAppearance(seed: number, gender?: Gender | null): Appearance {
  const r = generator(seed ^ 0x9e3779b9);
  const idx = (n: number) => Math.floor(r() * n);
  if (gender === 'male' || gender === 'female') {
    const pool = genderLooks[gender];
    const total = pool.headwear.reduce((s, h) => s + h.weight, 0);
    let roll = r() * total;
    return {
      skin: idx(skinTones.length),
      hair: pool.hair[idx(pool.hair.length)],
      hairColor: idx(hairColors.length),
      outfit: pool.outfits[idx(pool.outfits.length)],
      outfitColor: idx(outfitColors.length),
      headwear: pool.headwear.find((h) => (roll -= h.weight) < 0)?.id ?? 'none',
      glasses: r() < 0.25,
    };
  }
  const total = headwears.reduce((s, h) => s + h.weight, 0);
  let roll = r() * total;
  const headwear = headwears.find((h) => (roll -= h.weight) < 0)?.id ?? 'none';
  return {
    skin: idx(skinTones.length),
    hair: hairStyles[idx(hairStyles.length)].id,
    hairColor: idx(hairColors.length),
    outfit: outfits[idx(outfits.length)].id,
    outfitColor: idx(outfitColors.length),
    headwear,
    glasses: r() < 0.25,
  };
}

/** Deterministic look for an NPC from their name (same name, same face). */
export function appearanceFromName(name: string): Appearance {
  return randomAppearance(seedFromString(name));
}

export function isValidAppearance(a: unknown): a is Appearance {
  if (!a || typeof a !== 'object') return false;
  const x = a as Partial<Appearance>;
  const inRange = (v: unknown, n: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;
  return (
    inRange(x.skin, skinTones.length) &&
    inRange(x.hairColor, hairColors.length) &&
    inRange(x.outfitColor, outfitColors.length) &&
    hairStyles.some((h) => h.id === x.hair) &&
    [...outfits, ...lockedOutfits, ...festiveOutfits].some((o) => o.id === x.outfit) &&
    [...headwears, ...lockedHeadwears].some((h) => h.id === x.headwear) &&
    typeof x.glasses === 'boolean'
  );
}

/** Facial expression from current stats (cosmetic). */
export function moodOf(state: GameState): Mood {
  const s = state.stats;
  if (s.health < 30) return 'unwell';
  if (s.energy < 20) return 'tired';
  if (s.stress >= 75) return 'stressed';
  if (s.happiness >= 65) return 'happy';
  return 'neutral';
}