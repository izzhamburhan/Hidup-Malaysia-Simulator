import { describe, expect, it } from 'vitest';
import { avatarCells } from '../src/components/PixelAvatar';
import { hairColors, outfitColors } from '../src/data/appearance';
import { npcGender, npcNames } from '../src/data/lifestyle';
import { meetSomeone } from '../src/engine/social';
import { isValidAppearance, randomAppearance } from '../src/engine/appearance';
import { makeGame } from './helpers';

function metNames(gender: 'male' | 'female' | undefined): string[] {
  const names: string[] = [];
  for (let seed = 1; seed <= 40; seed++) {
    const s = makeGame({ seed, gender });
    meetSomeone(s, 'a dating app');
    names.push(...s.relationships.prospects.map((p) => p.name));
  }
  return names;
}

describe('gendered dating', () => {
  it('every catalogue name has a gender', () => {
    for (const n of npcNames) expect(['male', 'female'], n).toContain(npcGender(n));
  });

  it('a male life meets women, a female life meets men', () => {
    expect(metNames('male').every((n) => npcGender(n) === 'female')).toBe(true);
    expect(metNames('female').every((n) => npcGender(n) === 'male')).toBe(true);
  });

  it('a life with no gender can meet either', () => {
    const genders = new Set(metNames(undefined).map(npcGender));
    expect(genders.size).toBe(2);
  });
});

describe('gendered avatar and palette', () => {
  it('the same look is drawn differently for a woman', () => {
    const look = { ...randomAppearance(7), hair: 'short' as const, headwear: 'none' as const };
    expect(JSON.stringify(avatarCells(look, 'happy', 'female'))).not.toBe(JSON.stringify(avatarCells(look, 'happy', 'male')));
    expect(JSON.stringify(avatarCells(look, 'happy'))).toBe(JSON.stringify(avatarCells(look, 'happy', 'male')));
  });

  it('palettes stay unique, valid hex, and old indices keep their colours', () => {
    for (const p of [hairColors, outfitColors]) {
      expect(new Set(p).size).toBe(p.length);
      for (const c of p) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(outfitColors.slice(0, 8)[0]).toBe('#0f3d3e');
    expect(hairColors.slice(0, 5)[4]).toBe('#5b5b5b');
    expect(isValidAppearance({ ...randomAppearance(3), outfitColor: outfitColors.length - 1, hairColor: hairColors.length - 1 })).toBe(true);
  });
});