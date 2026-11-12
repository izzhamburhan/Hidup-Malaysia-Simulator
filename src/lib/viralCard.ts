// Viral Hari Ini pictures: a small pixel scene (pure, testable) and the Save image (browser only).

import { GAME_URL } from '../config';
import type { ViralItem, ViralScene } from '../data/viral';
import { drawSprite, type ViralSpriteId } from './viralSprites';

export const PIC_W = 96;
export const PIC_H = 54;
export const CARD_W = 1080;
export const CARD_H = 1350;

const HORIZON = 40;
const RAIN = '#b8c8e0';
const STAR = '#ffffff';

/** A repeatable pseudo-random number from two coordinates (no Math.random: the same picture every time). */
const noise = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

/** One hex colour per pixel, row by row, PIC_W x PIC_H. */
export function sceneGrid(scene: ViralScene, sprite: ViralSpriteId = 'cat'): string[] {
  const grid: string[] = new Array(PIC_W * PIC_H);
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && x < PIC_W && y >= 0 && y < PIC_H) grid[y * PIC_W + x] = c;
  };

  for (let y = 0; y < PIC_H; y++) {
    for (let x = 0; x < PIC_W; x++) {
      if (y < HORIZON) set(x, y, scene.sky[y < 14 ? 0 : y < 28 ? 1 : 2]);
      else set(x, y, noise(x, y) % 5 === 0 ? scene.ground2 : scene.ground);
    }
  }

  if (scene.stars) {
    for (let i = 0; i < 24; i++) set(noise(i, 1) % PIC_W, noise(i, 2) % 24, STAR);
  }

  if (scene.sun) {
    const cx = scene.sun === 'sun' ? 84 : 12;
    const cy = 10;
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 22) set(cx + x, cy + y, scene.sunColor);
  }

  if (scene.rain) {
    for (let i = 0; i < 60; i++) {
      const x = noise(i, 7) % PIC_W;
      const y = noise(i, 9) % (PIC_H - 4);
      set(x, y, RAIN);
      set(x - 1, y + 1, RAIN);
      set(x - 2, y + 2, RAIN);
    }
  }

  drawSprite(sprite, {
    px: set,
    rect: (x, y, w, h, col) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, col);
    },
    disc: (cx, cy, r, col) => {
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r / 2) set(cx + i, cy + j, col);
    },
  });

  return grid;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Browser only. Paints the card's picture into a canvas, sharp-edged. */
export function paintPicture(canvas: HTMLCanvasElement, item: ViralItem, scene: ViralScene, image: HTMLImageElement | null, smooth = false): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = smooth;
  if (image) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return;
  }
  ctx.imageSmoothingEnabled = false;
  const small = document.createElement('canvas');
  small.width = PIC_W;
  small.height = PIC_H;
  const sctx = small.getContext('2d');
  if (!sctx) return;
  const data = sctx.createImageData(PIC_W, PIC_H);
  sceneGrid(scene, item.sprite).forEach((hex, i) => {
    const [r, g, b] = hexToRgb(hex);
    data.data.set([r, g, b, 255], i * 4);
  });
  sctx.putImageData(data, 0, 0);
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
}

/** Browser only. Loads the ready-made pixel picture of a card, or null when it has none or it fails. */
export function loadViralImage(item: ViralItem, original = false): Promise<HTMLImageElement | null> {
  const file = original ? (item.original ?? item.image) : item.image;
  if (!file) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `./viral/${file}`;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Browser only. The Save image: a 1080x1350 PNG with the pixel picture, the line and the game address. */
export async function renderViralCard(item: ViralItem, scene: ViralScene, lang: 'en' | 'ms'): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const font = (weight: number, size: number) => `${weight} ${size}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;

  ctx.fillStyle = '#0f3d3e';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const pic = document.createElement('canvas');
  pic.width = CARD_W - 120;
  pic.height = Math.round(((CARD_W - 120) * PIC_H) / PIC_W);
  const full = await loadViralImage(item, true);
  paintPicture(pic, item, scene, full ?? (await loadViralImage(item)), !!full);
  const py = 150;
  ctx.fillStyle = '#e7b432';
  ctx.fillRect(54, py - 6, pic.width + 12, pic.height + 12);
  ctx.drawImage(pic, 60, py);

  ctx.fillStyle = '#e7b432';
  ctx.font = font(800, 34);
  ctx.fillText(lang === 'ms' ? 'VIRAL HARI INI' : 'VIRAL TODAY', 60, 100);

  const below = py + pic.height + 90;
  ctx.fillStyle = 'rgba(251, 247, 239, 0.7)';
  ctx.font = font(700, 36);
  ctx.fillText(item.topic[lang].toUpperCase(), 60, below);

  ctx.fillStyle = '#fbf7ef';
  ctx.font = font(900, 54);
  let y = below + 80;
  for (const line of wrap(ctx, item.line[lang], CARD_W - 120).slice(0, 5)) {
    ctx.fillText(line, 60, y);
    y += 70;
  }

  ctx.fillStyle = '#e7b432';
  ctx.beginPath();
  ctx.roundRect(60, CARD_H - 150, CARD_W - 120, 84, 42);
  ctx.fill();
  ctx.fillStyle = '#0f3d3e';
  ctx.font = font(900, 34);
  ctx.textAlign = 'center';
  ctx.fillText(`Play free at ${GAME_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')}`, CARD_W / 2, CARD_H - 96);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(251, 247, 239, 0.5)';
  ctx.font = font(500, 22);
  ctx.fillText('Just for fun. A made-up joke from a game.', 60, CARD_H - 30);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No image'))), 'image/png'));
}