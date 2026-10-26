import { describe, expect, it } from 'vitest';
import { achievements } from '../src/data/achievements';
import { hairStyles, headwears, lockedHeadwears, lockedOutfits, outfits, suitsGender } from '../src/data/appearance';
import { isValidAppearance, randomAppearance } from '../src/engine/appearance';
import { migrate } from '../src/engine/save';
import { SAVE_VERSION, performAction } from '../src/engine/simulationEngine';
import { makeGame } from './helpers';

describe('wardrobe', () => {
  it('migrates a version-4 save without changing the look', () => {
    const s = makeGame();
    const old = JSON.parse(JSON.stringify(s));
    old.version = 4;
    const m = migrate(old);
    expect(m.version).toBe(SAVE_VERSION);
    expect(m.character.appearance).toEqual(s.character.appearance);
  });

  it('changes to a base outfit without touching the input', () => {
    const s = makeGame({ seed: 3 });
    s.character.appearance.outfit = 'tshirt';
    const before = JSON.stringify(s);
    const r = performAction(s, 'change-outfit', 'outfit:hoodie');
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    expect(r.state.character.appearance.outfit).toBe('hoodie');
  });

  it('refuses a locked outfit until its achievement is earned', () => {
    const s = makeGame({ seed: 3 });
    const gown = lockedOutfits.find((o) => o.id === 'grad-gown')!;
    const title = achievements.find((a) => a.id === gown.achievement)!.title;
    const locked = performAction(s, 'change-outfit', 'outfit:grad-gown');
    expect(locked.feedback.ok).toBe(false);
    expect(locked.feedback.error).toContain(title);
    s.achievements[gown.achievement] = 1;
    const ok = performAction(s, 'change-outfit', 'outfit:grad-gown');
    expect(ok.feedback.ok, ok.feedback.error).toBe(true);
    expect(ok.state.character.appearance.outfit).toBe('grad-gown');
  });

  it('unlocks headwear the same way, and refuses a bad colour', () => {
    const s = makeGame({ seed: 3 });
    const crown = lockedHeadwears.find((h) => h.id === 'crown')!;
    expect(performAction(s, 'change-outfit', 'headwear:crown').feedback.ok).toBe(false);
    s.achievements[crown.achievement] = 1;
    expect(performAction(s, 'change-outfit', 'headwear:crown').state.character.appearance.headwear).toBe('crown');
    expect(performAction(s, 'change-outfit', 'color:99').feedback.ok).toBe(false);
    expect(performAction(s, 'change-outfit', 'color:2').state.character.appearance.outfitColor).toBe(2);
  });

  it('keeps unlock data honest', () => {
    const ids = new Set(achievements.map((a) => a.id));
    for (const u of [...lockedOutfits, ...lockedHeadwears]) expect(ids.has(u.achievement), u.id).toBe(true);
    const a = randomAppearance(1);
    expect(isValidAppearance({ ...a, outfit: 'grad-gown', headwear: 'grad-cap' })).toBe(true);
    const locked = new Set<string>([...lockedOutfits, ...lockedHeadwears].map((u) => u.id));
    for (let seed = 1; seed <= 300; seed++) {
      const r = randomAppearance(seed);
      expect(locked.has(r.outfit) || locked.has(r.headwear), String(seed)).toBe(false);
    }
  });

  it("hides the other gender's traditional wear, and shows everything when no gender is set", () => {
    const pick = (g: 'male' | 'female' | null) => ({
      hair: hairStyles.filter((h) => suitsGender(g, 'hair', h.id)).map((h) => h.id),
      outfit: outfits.filter((o) => suitsGender(g, 'outfit', o.id)).map((o) => o.id),
      headwear: headwears.filter((h) => suitsGender(g, 'headwear', h.id)).map((h) => h.id),
    });
    expect(pick('male').headwear).not.toContain('tudung');
    expect(pick('male').outfit).not.toContain('baju-kurung');
    expect(pick('male').outfit).toContain('baju-melayu');
    expect(pick('male').headwear).toContain('songkok');
    expect(pick('female').headwear).not.toContain('songkok');
    expect(pick('female').outfit).not.toContain('baju-melayu');
    expect(pick('female').outfit).toContain('baju-kurung');
    expect(pick('female').headwear).toContain('tudung');
    expect(pick(null).outfit).toEqual(outfits.map((o) => o.id));
    expect(pick(null).headwear).toEqual(headwears.map((h) => h.id));
  });

  it("refuses the other gender's items in the wardrobe action, with a reason", () => {
    const m = makeGame({ gender: 'male' });
    const r = performAction(m, 'change-outfit', 'headwear:tudung');
    expect(r.feedback.ok).toBe(false);
    expect(r.feedback.error).toMatch(/not available/i);
    expect(performAction(m, 'change-outfit', 'outfit:baju-kurung').feedback.ok).toBe(false);
    expect(performAction(m, 'change-outfit', 'headwear:songkok').feedback.ok).toBe(true);
    const f = makeGame({ gender: 'female' });
    expect(performAction(f, 'change-outfit', 'headwear:tudung').feedback.ok).toBe(true);
    expect(performAction(f, 'change-outfit', 'headwear:songkok').feedback.ok).toBe(false);
    expect(performAction(makeGame(), 'change-outfit', 'headwear:tudung').feedback.ok).toBe(true);
  });
});