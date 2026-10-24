// Pixel-art character drawn as an SVG grid (no image assets). Layers are
// painted into a small grid, then a dark outline is added for a sprite look.

import { memo } from 'react';
import { hairColors, outfitColors, skinTones } from '../data/appearance';
import { appearanceFromName } from '../engine/appearance';
import type { Appearance, Mood } from '../engine/types';
import { cx } from './ui';

const W = 18;
const H = 20;
const OUTLINE = '#1d1b16';
const DARK = '#1d1b16';
const WHITE = '#fbf7ef';

type Grid = (string | null)[][];

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * (amount > 0 ? 255 - v : v))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function paint(a: Appearance, mood: Mood): Grid {
  const g: Grid = Array.from({ length: H }, () => Array<string | null>(W).fill(null));
  // Everything is drawn with a 1-pixel margin so the outline fits.
  const set = (row: number, col: number, color: string) => {
    const r = row + 1;
    const c = col + 1;
    if (r >= 0 && r < H && c >= 0 && c < W) g[r][c] = color;
  };
  const rect = (r0: number, c0: number, r1: number, c1: number, color: string) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set(r, c, color);
  };

  const skin = mood === 'unwell' ? shade(skinTones[a.skin], 0.25) : skinTones[a.skin];
  const skinShade = shade(skin, -0.12);
  const hair = hairColors[a.hairColor];
  const cloth = outfitColors[a.outfitColor];
  const clothDark = shade(cloth, -0.25);
  const clothLight = shade(cloth, 0.35);

  // Body and arms (outfit), hands.
  rect(12, 3, 17, 12, cloth);
  rect(12, 2, 15, 2, cloth);
  rect(12, 13, 15, 13, cloth);
  set(16, 2, skin);
  set(16, 13, skin);
  rect(17, 4, 17, 11, clothDark);
  switch (a.outfit) {
    case 'tshirt':
      rect(14, 2, 15, 2, skin);
      rect(14, 13, 15, 13, skin);
      set(12, 7, skin);
      set(12, 8, skin);
      break;
    case 'kemeja':
      set(12, 6, WHITE);
      set(12, 9, WHITE);
      rect(13, 7, 16, 8, clothLight);
      set(14, 10, clothDark);
      break;
    case 'hoodie':
      rect(11, 5, 12, 10, clothDark);
      set(13, 6, WHITE);
      set(14, 6, WHITE);
      set(13, 9, WHITE);
      set(14, 9, WHITE);
      rect(15, 5, 16, 10, clothDark);
      break;
    case 'blazer': {
      const jacket = '#1f2937';
      rect(12, 3, 17, 12, jacket);
      rect(12, 2, 15, 2, jacket);
      rect(12, 13, 15, 13, jacket);
      rect(12, 7, 17, 8, WHITE);
      rect(13, 7, 16, 8, cloth);
      break;
    }
    case 'baju-kurung':
      set(12, 7, skin);
      set(12, 8, skin);
      for (let r = 13; r <= 16; r += 2) for (let c = 4; c <= 11; c += 3) set(r, c, clothLight);
      rect(17, 3, 17, 12, clothDark);
      break;
    case 'baju-melayu':
      rect(12, 7, 12, 8, clothDark);
      set(13, 7, '#e7b432');
      set(14, 7, '#e7b432');
      rect(16, 3, 17, 12, '#e7b432');
      for (let c = 3; c <= 12; c += 2) set(16, c, shade('#e7b432', -0.35));
      for (let c = 4; c <= 12; c += 2) set(17, c, shade('#e7b432', -0.35));
      break;
    case 'jersey':
      rect(14, 2, 15, 2, skin);
      rect(14, 13, 15, 13, skin);
      rect(12, 5, 16, 5, WHITE);
      rect(12, 10, 16, 10, WHITE);
      rect(12, 7, 12, 8, WHITE);
      rect(14, 7, 14, 8, WHITE);
      set(15, 8, WHITE);
      set(16, 7, WHITE);
      break;
    case 'batik':
      rect(12, 7, 12, 8, clothDark);
      for (let r = 12; r <= 16; r++) for (let c = 3; c <= 12; c++) {
        if ((r + c) % 4 === 0) set(r, c, clothLight);
        else if ((r * 3 + c) % 7 === 0) set(r, c, '#e7b432');
      }
      break;
    case 'grad-gown': {
      const gown = '#26304a';
      rect(12, 2, 17, 13, gown);
      rect(12, 5, 17, 5, '#e7b432');
      rect(12, 10, 17, 10, '#e7b432');
      rect(12, 7, 12, 8, WHITE);
      set(16, 2, skin);
      set(16, 13, skin);
      break;
    }
    case 'chef':
      rect(13, 4, 17, 11, WHITE);
      set(12, 5, WHITE);
      set(12, 10, WHITE);
      rect(15, 6, 15, 9, '#d6d3cc');
      break;
    case 'suit': {
      const jacket = '#2a2f3a';
      rect(12, 3, 17, 12, jacket);
      rect(12, 2, 15, 2, jacket);
      rect(12, 13, 15, 13, jacket);
      rect(12, 6, 17, 9, WHITE);
      rect(13, 7, 16, 8, '#b91c1c');
      set(12, 7, '#b91c1c');
      set(12, 8, '#b91c1c');
      break;
    }
  }

  // Neck and head.
  rect(11, 7, 11, 8, skinShade);
  rect(3, 4, 10, 11, skin);
  // Round the chin corners (grid coordinates include the 1-pixel margin).
  g[11][5] = null;
  g[11][12] = null;
  rect(7, 3, 8, 3, skin); // ears
  rect(7, 12, 8, 12, skin);

  // Hair (hidden by tudung).
  if (a.headwear !== 'tudung') {
    switch (a.hair) {
      case 'short':
        rect(2, 4, 3, 11, hair);
        set(4, 4, hair);
        set(4, 11, hair);
        break;
      case 'side':
        rect(2, 4, 3, 11, hair);
        rect(4, 4, 4, 8, hair);
        set(5, 4, hair);
        set(4, 11, hair);
        break;
      case 'spiky':
        rect(2, 4, 3, 11, hair);
        for (const c of [4, 6, 8, 10]) set(1, c, hair);
        set(4, 4, hair);
        set(4, 11, hair);
        break;
      case 'curly':
        rect(1, 4, 3, 11, hair);
        for (const c of [3, 12]) rect(2, c, 6, c, hair);
        for (const c of [5, 8, 11]) set(1, c, shade(hair, 0.2));
        set(4, 5, hair);
        set(4, 9, hair);
        break;
      case 'long':
        rect(2, 4, 3, 11, hair);
        rect(4, 3, 12, 3, hair);
        rect(4, 12, 12, 12, hair);
        set(4, 4, hair);
        set(4, 11, hair);
        break;
      case 'bun':
        rect(2, 4, 3, 11, hair);
        rect(0, 6, 1, 9, hair);
        set(4, 4, hair);
        set(4, 11, hair);
        break;
      case 'bald':
        set(3, 9, shade(skin, 0.35));
        break;
    }
  }

  // Headwear.
  if (a.headwear === 'tudung') {
    const cloth2 = outfitColors[(a.outfitColor + 3) % outfitColors.length];
    rect(1, 3, 12, 12, cloth2);
    rect(12, 3, 13, 12, cloth2);
    rect(4, 5, 10, 10, skin);
    set(4, 5, cloth2);
    set(4, 10, cloth2);
    rect(2, 4, 2, 11, shade(cloth2, 0.2));
  } else if (a.headwear === 'songkok') {
    rect(0, 4, 2, 11, '#151515');
    rect(1, 4, 1, 11, '#2b2b2b');
    set(3, 4, hair);
    set(3, 11, hair);
  } else if (a.headwear === 'cap') {
    const capColor = outfitColors[(a.outfitColor + 2) % outfitColors.length];
    rect(1, 4, 3, 11, capColor);
    rect(3, 9, 3, 14, shade(capColor, -0.2));
    set(1, 7, shade(capColor, 0.3));
  } else if (a.headwear === 'grad-cap') {
    rect(0, 2, 1, 13, '#1f2937');
    rect(2, 4, 2, 11, '#111827');
    set(1, 12, '#e7b432');
    set(2, 13, '#e7b432');
    set(3, 13, '#e7b432');
  } else if (a.headwear === 'helmet') {
    const shell = outfitColors[(a.outfitColor + 4) % outfitColors.length];
    rect(0, 3, 4, 12, shell);
    rect(4, 4, 4, 11, '#9fd6f2');
    set(1, 6, shade(shell, 0.4));
    set(1, 7, shade(shell, 0.4));
  } else if (a.headwear === 'crown') {
    rect(1, 4, 2, 11, '#e7b432');
    for (const c of [4, 6, 9, 11]) set(0, c, '#e7b432');
    set(2, 7, '#c2410c');
    set(2, 8, '#2563a8');
    set(1, 5, shade('#e7b432', 0.4));
  }

  // Face: eyes, mouth, mood details. Darker skin tones get a lighter mouth for contrast.
  const eyeL = 6;
  const eyeR = 9;
  const mouth = a.skin >= 4 ? '#e9a99a' : DARK;
  if (a.glasses) {
    for (const c of [5, 6, 9, 10]) {
      set(5, c, DARK);
      set(6, c, '#cfe6f5');
    }
    set(6, 7, DARK);
    set(6, 8, DARK);
  }
  if (mood === 'tired') {
    set(6, eyeL - 1, DARK);
    set(6, eyeL, DARK);
    set(6, eyeR, DARK);
    set(6, eyeR + 1, DARK);
    rect(9, 7, 9, 8, mouth);
    set(0, 13, '#2563a8');
    set(1, 14, '#2563a8');
  } else {
    if (!a.glasses) {
      set(6, eyeL - 1, WHITE);
      set(6, eyeR + 1, WHITE);
    }
    set(6, eyeL, DARK);
    set(6, eyeR, DARK);
    if (mood === 'happy') {
      set(8, 6, mouth);
      rect(9, 7, 9, 8, mouth);
      set(8, 9, mouth);
      set(8, 5, '#f08a8a');
      set(8, 10, '#f08a8a');
    } else if (mood === 'stressed') {
      set(9, 6, mouth);
      set(8, 7, mouth);
      set(9, 8, mouth);
      set(8, 9, mouth);
      set(4, 12, '#7cc4f2');
      set(5, 12, '#7cc4f2');
    } else if (mood === 'unwell') {
      rect(9, 6, 9, 9, mouth);
      set(7, 5, '#9ccf8f');
      set(7, 10, '#9ccf8f');
    } else {
      rect(9, 7, 9, 8, mouth);
    }
  }

  // Outline pass.
  const out: Grid = g.map((row) => [...row]);
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (g[r][c]) continue;
      const near = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ].some(([y, x]) => y >= 0 && y < H && x >= 0 && x < W && g[y][x] && g[y][x] !== '#7cc4f2' && g[y][x] !== '#2563a8');
      if (near) out[r][c] = OUTLINE;
    }
  }
  return out;
}

function rects(grid: Grid) {
  const out: { x: number; y: number; w: number; fill: string }[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < W) {
      const fill = row[x];
      if (!fill) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < W && row[x + w] === fill) w++;
      out.push({ x, y, w, fill });
      x += w;
    }
  });
  return out;
}

export interface PixelAvatarProps {
  appearance: Appearance;
  mood?: Mood;
  size?: number;
  bob?: boolean;
  className?: string;
  title?: string;
}

export const PixelAvatar = memo(function PixelAvatar({ appearance, mood = 'neutral', size = 64, bob = false, className, title }: PixelAvatarProps) {
  const cells = rects(paint(appearance, mood));
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={(size * H) / W}
      shapeRendering="crispEdges"
      className={cx(bob && 'avatar-bob', className)}
      role="img"
      aria-label={title ?? 'Pixel character'}
    >
      {cells.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
});

/** A small framed avatar for NPCs, generated from their name. */
export function NpcAvatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  return (
    <span className={cx('inline-flex shrink-0 items-end justify-center overflow-hidden rounded-xl bg-paper-2', className)} style={{ width: size, height: size }}>
      <PixelAvatar appearance={appearanceFromName(name)} size={size * 0.9} title={name} />
    </span>
  );
}