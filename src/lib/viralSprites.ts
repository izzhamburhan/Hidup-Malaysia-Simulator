// Pixel illustrations for Viral Hari Ini cards, drawn from simple shapes on the 96 x 54 grid.
// Pure and repeatable: no randomness, so a card always looks the same. UI layer only.

export type ViralSpriteId = 'cat' | 'tabung' | 'umbrella' | 'teh' | 'bed' | 'water' | 'traffic';

export interface Painter {
  px: (x: number, y: number, c: string) => void;
  rect: (x: number, y: number, w: number, h: number, c: string) => void;
  disc: (cx: number, cy: number, r: number, c: string) => void;
}

const OUT = '#2a2320';

// Oyen, 14 x 12 pixels. w white, o orange, k dark, p pink, . empty.
const CAT = [
  '..o........o..',
  '.oow......woo.',
  '.owwwwwwwwwwo.',
  '.owkwwwwwwkwo.',
  '.owwwwppwwwwo.',
  '..owwwwwwwwo..',
  '..owwwwwwwwo..',
  '.owwwwwwwwwwo.',
  '.owwowwwwowwo.',
  '.owwwwwwwwwwo.',
  '.oowwwwwwwwoo.',
  '..oooooooooo..',
];
const CAT_COLOURS: Record<string, string> = { w: '#f6efe3', o: '#e8913a', k: '#2a2320', p: '#e88a96' };

function cat(p: Painter, ox = 41, oy = 36) {
  CAT.forEach((row, dy) => [...row].forEach((ch, dx) => CAT_COLOURS[ch] && p.px(ox + dx, oy + dy, CAT_COLOURS[ch])));
}

/** A tabung (savings tin) with coins and a note: pay yourself first. */
function tabung(p: Painter) {
  p.rect(33, 25, 22, 17, OUT);
  p.rect(34, 26, 20, 15, '#c8433a');
  p.rect(34, 26, 4, 15, '#e0645a');
  p.rect(34, 31, 20, 3, '#f1c24b');
  p.rect(40, 24, 8, 2, OUT);
  p.rect(41, 24, 6, 1, '#5a1d18');
  // Coins falling in and stacked beside the tin.
  p.disc(44, 17, 3, OUT);
  p.disc(44, 17, 2, '#f1c24b');
  p.rect(43, 16, 2, 3, '#fff0a8');
  for (let i = 0; i < 4; i++) {
    p.rect(60, 38 - i * 3, 9, 3, OUT);
    p.rect(61, 38 - i * 3 + 1, 7, 1, i % 2 ? '#f1c24b' : '#ffd96b');
  }
  // A banknote.
  p.rect(14, 30, 15, 9, OUT);
  p.rect(15, 31, 13, 7, '#59b36b');
  p.disc(21, 34, 2, '#bfe8c6');
}

/** An umbrella: the emergency fund keeps the wallet dry. */
function umbrella(p: Painter) {
  const cx = 48;
  const cy = 28;
  for (let y = -15; y <= 0; y++) {
    for (let x = -17; x <= 17; x++) {
      if (x * x + y * y * 1.3 <= 17 * 17) p.px(cx + x, cy + y, Math.floor((x + 18) / 6) % 2 ? '#f6efe3' : '#e0534a');
    }
  }
  for (let x = -17; x <= 17; x += 6) p.disc(cx + x, cy + 1, 1, '#e0534a');
  p.rect(47, 14, 2, 3, OUT);
  p.rect(47, 28, 2, 12, OUT);
  p.rect(43, 39, 6, 2, OUT);
  p.rect(43, 38, 2, 2, OUT);
  // A cloud.
  p.disc(14, 10, 5, '#dfe6ee');
  p.disc(22, 8, 6, '#eef2f7');
  p.disc(30, 10, 5, '#dfe6ee');
  p.rect(14, 10, 17, 5, '#dfe6ee');
}

/** Teh tarik being pulled from a high glass to a low one. */
function teh(p: Painter) {
  const glass = (x: number, y: number, h: number, fill: number) => {
    p.rect(x, y, 12, h, OUT);
    p.rect(x + 1, y + 1, 10, h - 2, '#fbf3e4');
    p.rect(x + 1, y + h - 1 - fill, 10, fill, '#b8651b');
  };
  glass(43, 6, 11, 7);
  for (let y = 17; y < 32; y++) p.rect(48 + Math.round(Math.sin(y / 3) * 1), y, 2, 1, '#b8651b');
  glass(43, 31, 12, 8);
  p.rect(44, 32, 10, 2, '#fff7e8');
  p.rect(44, 36, 10, 1, '#d8913f');
}

/** Bed, a low battery and Z's: sleep is a free charger. */
function bed(p: Painter) {
  p.rect(26, 34, 44, 7, OUT);
  p.rect(27, 35, 42, 5, '#8a5a2b');
  p.rect(28, 30, 40, 5, '#f6efe3');
  p.rect(29, 27, 9, 4, '#ffffff');
  p.rect(39, 29, 28, 6, '#4a78c2');
  p.rect(39, 29, 28, 2, '#6d96dc');
  p.rect(26, 28, 3, 13, OUT);
  p.rect(67, 31, 3, 10, OUT);
  // Low battery.
  p.rect(12, 20, 16, 9, '#f6efe3');
  p.rect(13, 21, 14, 7, OUT);
  p.rect(28, 23, 2, 3, '#f6efe3');
  p.rect(14, 22, 3, 5, '#e0534a');
  // Z z z.
  const z = (x: number, y: number, s: number) => {
    p.rect(x, y, s, 1, '#fff6c8');
    p.rect(x, y + s - 1, s, 1, '#fff6c8');
    for (let i = 0; i < s; i++) p.px(x + s - 1 - i, y + i, '#fff6c8');
  };
  z(74, 24, 4);
  z(79, 17, 6);
}

/** A tall glass of water with ice: drink water first. */
function water(p: Painter) {
  p.rect(39, 18, 18, 24, OUT);
  p.rect(40, 19, 16, 22, '#e8f6ff');
  p.rect(40, 25, 16, 16, '#5fb8f0');
  p.rect(40, 25, 16, 2, '#9ad6fa');
  p.rect(43, 28, 4, 4, '#f4fbff');
  p.rect(49, 32, 4, 4, '#f4fbff');
  p.rect(42, 19, 2, 20, '#ffffff');
  // Straw.
  p.rect(52, 10, 2, 16, '#e0534a');
  p.rect(48, 10, 6, 2, '#e0534a');
  // Drops.
  for (const [x, y] of [[26, 22], [68, 26], [72, 34]] as const) {
    p.rect(x, y, 2, 3, '#5fb8f0');
    p.px(x, y - 1, '#5fb8f0');
  }
}

/** A line of cars: leave 15 minutes early. */
function traffic(p: Painter) {
  p.rect(0, 40, 96, 10, '#4a4f58');
  for (let x = 2; x < 96; x += 12) p.rect(x, 45, 6, 1, '#f1c24b');
  const car = (x: number, body: string, roof: string) => {
    p.rect(x + 3, 33, 12, 5, OUT);
    p.rect(x + 4, 34, 10, 4, roof);
    p.rect(x + 6, 35, 3, 2, '#bfe3f7');
    p.rect(x + 10, 35, 3, 2, '#bfe3f7');
    p.rect(x, 37, 18, 6, OUT);
    p.rect(x + 1, 38, 16, 4, body);
    p.rect(x + 16, 39, 2, 2, '#ffe58a');
    p.disc(x + 4, 43, 2, OUT);
    p.disc(x + 14, 43, 2, OUT);
    p.px(x + 4, 43, '#b0b5bd');
    p.px(x + 14, 43, '#b0b5bd');
  };
  car(8, '#e0534a', '#f08a82');
  car(34, '#4a78c2', '#7ea2dc');
  car(60, '#f1c24b', '#ffe08a');
  // A clock above them.
  p.disc(48, 14, 8, OUT);
  p.disc(48, 14, 7, '#fbf3e4');
  p.rect(48, 9, 1, 6, OUT);
  p.rect(48, 14, 4, 1, OUT);
}

const SPRITES: Record<ViralSpriteId, (p: Painter) => void> = { cat, tabung, umbrella, teh, bed, water, traffic };

export function drawSprite(id: ViralSpriteId, p: Painter): void {
  SPRITES[id](p);
}