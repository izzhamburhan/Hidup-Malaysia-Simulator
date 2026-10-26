// Changing your look mid-game. Purely cosmetic: appearance never feeds the simulation.

import { achievements } from '../../data/achievements';
import { festiveOutfits, headwears, suitsGender, lockedHeadwears, lockedOutfits, outfitColors, outfits } from '../../data/appearance';
import { festiveOutfitKey } from '../festive';
import type { GameState, Headwear, Outfit } from '../types';
import type { ActionDef } from './types';

function parse(p: string | undefined): [string, string] {
  const [kind = '', value = ''] = (p ?? '').split(':');
  return [kind, value];
}

const achievementTitle = (id: string) => achievements.find((a) => a.id === id)?.title ?? id;

const NOT_FOR_YOU = 'Not available for your character.';

function lockReason(s: GameState, kind: string, value: string): string | null {
  const gender = s.character.gender;
  if ((kind === 'outfit' || kind === 'headwear') && !suitsGender(gender, kind, value)) return NOT_FOR_YOU;
  if (kind === 'outfit') {
    if (outfits.some((o) => o.id === value)) return null;
    const festive = festiveOutfits.find((o) => o.id === value);
    if (festive) return s.flags[festiveOutfitKey(festive.season)] !== undefined ? null : `Send wishes during ${festive.seasonName} to unlock it.`;
    const locked = lockedOutfits.find((o) => o.id === value);
    if (!locked) return 'That outfit is not in your wardrobe.';
    return s.achievements[locked.achievement] !== undefined ? null : `Unlock with the achievement "${achievementTitle(locked.achievement)}".`;
  }
  if (kind === 'headwear') {
    if (headwears.some((h) => h.id === value)) return null;
    const locked = lockedHeadwears.find((h) => h.id === value);
    if (!locked) return 'That is not in your wardrobe.';
    return s.achievements[locked.achievement] !== undefined ? null : `Unlock with the achievement "${achievementTitle(locked.achievement)}".`;
  }
  if (kind === 'color') {
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 && n < outfitColors.length ? null : 'Pick one of the colours.';
  }
  if (kind === 'glasses') return value === 'on' || value === 'off' ? null : 'Glasses on or off?';
  return 'Pick something from the wardrobe.';
}

export const wardrobeActions: ActionDef[] = [
  {
    id: 'change-outfit',
    category: 'daily',
    icon: '👕',
    dedicated: true,
    title: 'Change your look',
    description: 'Open the wardrobe.',
    minutes: 2,
    available: (s, p) => {
      const [kind, value] = parse(p);
      return lockReason(s, kind, value);
    },
    run: (s, p) => {
      const [kind, value] = parse(p);
      const a = s.character.appearance;
      if (kind === 'outfit') a.outfit = value as Outfit;
      else if (kind === 'headwear') a.headwear = value as Headwear;
      else if (kind === 'color') a.outfitColor = Number(value);
      else if (kind === 'glasses') a.glasses = value === 'on';
    },
  },
];