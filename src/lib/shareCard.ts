// The share image: a 1080x1350 PNG of the player's life result, drawn on the device.

import { avatarCells } from '../components/PixelAvatar';
import { GAME_URL } from '../config';
import { formatRM } from '../engine/core';
import type { LifeReport } from '../engine/endings';
import type { Appearance, Mood } from '../engine/types';

const fit = (text: string, max = 34) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export interface ShareCardModel {
  mode: string;
  endingIcon: string;
  endingTitle: string;
  blurb: string;
  who: string;
  rows: { label: string; value: string }[];
  url: string;
}

export function shareCardModel(r: LifeReport): ShareCardModel {
  return {
    mode: r.mode,
    endingIcon: r.ending.icon,
    endingTitle: r.ending.title,
    blurb: r.ending.blurb,
    who: fit(`${r.name}, ${r.age} · day ${r.days + 1}`),
    rows: [
      { label: 'Career', value: fit(r.career) },
      { label: 'Net worth', value: fit(formatRM(r.netWorth)) },
      { label: 'Love', value: fit(r.relationship) },
      { label: 'Home', value: fit(r.housing) },
      { label: 'Achievements', value: `${r.achievements}/${r.achievementTotal}` },
    ],
    url: GAME_URL.replace(/^https?:\/\//, '').replace(/\/$/, ''),
  };
}

const TEAL = '#0f3d3e';
const TEAL_2 = '#155e5f';
const GOLD = '#e7b432';
const PAPER = '#fbf7ef';

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Browser only. Resolves to a PNG blob of the card. */
export async function renderShareCard(report: LifeReport, appearance: Appearance, mood: Mood): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const m = shareCardModel(report);
  const font = (weight: number, size: number) => `${weight} ${size}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, TEAL_2);
  bg.addColorStop(1, TEAL);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(231, 180, 50, 0.10)';
  for (let y = 0; y < H; y += 54) for (let x = (y / 54) % 2 ? 27 : 0; x < W; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x + 14, y);
    ctx.lineTo(x, y + 14);
    ctx.lineTo(x - 14, y);
    ctx.fill();
  }

  ctx.fillStyle = GOLD;
  ctx.font = font(800, 34);
  ctx.fillText(`HIDUP MALAYSIA · ${m.mode.toUpperCase()}`, 80, 120);

  // Ending.
  ctx.font = font(400, 150);
  ctx.fillText(m.endingIcon, 74, 300);
  ctx.fillStyle = PAPER;
  ctx.font = font(900, 92);
  let y = 420;
  for (const line of wrap(ctx, m.endingTitle, 560)) {
    ctx.fillText(line, 80, y);
    y += 96;
  }
  ctx.fillStyle = 'rgba(251, 247, 239, 0.82)';
  ctx.font = font(500, 36);
  for (const line of wrap(ctx, m.blurb, 560).slice(0, 3)) {
    ctx.fillText(line, 80, y);
    y += 48;
  }

  // Character, on a soft panel on the right.
  const sprite = avatarCells(appearance, mood);
  const px = 18;
  const sx = W - 80 - sprite.width * px;
  const sy = 170;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.beginPath();
  ctx.roundRect(sx - 30, sy - 30, sprite.width * px + 60, sprite.height * px + 60, 40);
  ctx.fill();
  for (const c of sprite.cells) {
    ctx.fillStyle = c.fill;
    ctx.fillRect(sx + c.x * px, sy + c.y * px, c.w * px, px);
  }

  // Facts.
  y = Math.max(y + 30, 740);
  ctx.fillStyle = GOLD;
  ctx.font = font(800, 40);
  ctx.fillText(m.who, 80, y);
  y += 30;
  for (const r of m.rows) {
    y += 64;
    ctx.fillStyle = 'rgba(251, 247, 239, 0.65)';
    ctx.font = font(600, 32);
    ctx.fillText(r.label, 80, y);
    ctx.fillStyle = PAPER;
    ctx.font = font(800, 38);
    ctx.textAlign = 'right';
    ctx.fillText(r.value, W - 80, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(251, 247, 239, 0.15)';
    ctx.fillRect(80, y + 22, W - 160, 2);
  }

  // Footer.
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.roundRect(80, H - 150, W - 160, 84, 42);
  ctx.fill();
  ctx.fillStyle = TEAL;
  ctx.font = font(900, 34);
  ctx.textAlign = 'center';
  ctx.fillText(`What's your life? Play free at ${m.url}`, W / 2, H - 96);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(251, 247, 239, 0.5)';
  ctx.font = font(500, 22);
  ctx.fillText('A game. All numbers are fictional estimates.', 80, H - 30);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No image'))), 'image/png'));
}