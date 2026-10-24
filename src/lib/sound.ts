// Tiny synthesised sound effects and vibration. UI layer only: the engine never imports this.
// Every sound is a few Web Audio oscillator notes, so there are no audio files to license or load.

import type { Activity } from '../components/room/activity';

export interface Note {
  freq: number;
  /** Start, seconds from the beginning of the sound. */
  at: number;
  dur: number;
  wave?: 'sine' | 'square' | 'triangle' | 'sawtooth';
  /** Glide to this frequency over the note. */
  slide?: number;
  gain?: number;
}

const seq = (freqs: number[], step: number, dur: number, wave: Note['wave'] = 'triangle', gain = 0.16): Note[] =>
  freqs.map((freq, i) => ({ freq, at: i * step, dur, wave, gain }));

export const SOUNDS: Record<Activity, Note[]> = {
  idle: [],
  sleep: [
    { freq: 520, at: 0, dur: 0.5, wave: 'sine', slide: 260, gain: 0.14 },
    { freq: 390, at: 0.35, dur: 0.5, wave: 'sine', slide: 196, gain: 0.1 },
  ],
  chill: seq([440, 554], 0.15, 0.2, 'sine', 0.14),
  drink: [
    { freq: 300, at: 0, dur: 0.12, wave: 'sine', slide: 700, gain: 0.18 },
    { freq: 320, at: 0.16, dur: 0.12, wave: 'sine', slide: 760, gain: 0.16 },
  ],
  eat: seq([220, 196, 220], 0.13, 0.07, 'square', 0.1),
  run: seq([620, 560, 620, 560], 0.12, 0.04, 'triangle', 0.18),
  workout: [
    { freq: 160, at: 0, dur: 0.12, wave: 'square', gain: 0.08 },
    { freq: 320, at: 0.02, dur: 0.1, wave: 'triangle', gain: 0.12 },
    { freq: 170, at: 0.32, dur: 0.12, wave: 'square', gain: 0.08 },
  ],
  stretch: [{ freq: 330, at: 0, dur: 0.35, wave: 'sine', slide: 494, gain: 0.14 }],
  sport: [
    { freq: 140, at: 0, dur: 0.06, wave: 'square', gain: 0.12 },
    { freq: 880, at: 0.12, dur: 0.25, wave: 'sine', slide: 1320, gain: 0.12 },
  ],
  work: seq([1800, 1500, 1800, 1650, 1500, 1800], 0.065, 0.02, 'triangle', 0.08),
  study: seq([660, 880], 0.12, 0.16, 'sine', 0.15),
  read: seq([520, 660], 0.1, 0.1, 'sine', 0.13),
  admin: [
    { freq: 900, at: 0, dur: 0.03, wave: 'triangle', gain: 0.14 },
    { freq: 1200, at: 0.08, dur: 0.06, wave: 'triangle', gain: 0.14 },
  ],
  phone: seq([1000, 1250, 1000, 1250], 0.07, 0.06, 'sine', 0.1),
  social: seq([523, 659, 784], 0.09, 0.12, 'triangle', 0.15),
  love: seq([659, 784, 988, 1319], 0.1, 0.14, 'sine', 0.14),
  sad: [
    { freq: 392, at: 0, dur: 0.35, wave: 'sine', slide: 330, gain: 0.13 },
    { freq: 294, at: 0.38, dur: 0.35, wave: 'sine', gain: 0.11 },
  ],
  family: seq([523, 659, 784, 659], 0.1, 0.14, 'triangle', 0.14),
  play: seq([523, 784, 1047], 0.07, 0.08, 'square', 0.08),
  outing: seq([587, 740, 880], 0.1, 0.14, 'triangle', 0.14),
  travel: [
    { freq: 440, at: 0, dur: 0.12, wave: 'square', gain: 0.07 },
    { freq: 440, at: 0.18, dur: 0.22, wave: 'square', gain: 0.07 },
  ],
  money: [
    { freq: 988, at: 0, dur: 0.07, wave: 'square', gain: 0.08 },
    { freq: 1319, at: 0.07, dur: 0.28, wave: 'square', gain: 0.08 },
  ],
  clean: [
    { freq: 1200, at: 0, dur: 0.14, wave: 'sine', slide: 600, gain: 0.1 },
    { freq: 1200, at: 0.18, dur: 0.14, wave: 'sine', slide: 600, gain: 0.1 },
  ],
  move: seq([300, 250, 200], 0.12, 0.12, 'triangle', 0.18),
  civic: seq([523, 659, 784, 1047], 0.09, 0.14, 'triangle', 0.14),
  build: seq([330, 330, 392], 0.15, 0.05, 'square', 0.09),
  petfeed: [
    ...seq([300, 280, 300], 0.09, 0.04, 'square', 0.07),
    { freq: 700, at: 0.32, dur: 0.18, wave: 'sine', slide: 950, gain: 0.12 },
    { freq: 950, at: 0.5, dur: 0.22, wave: 'sine', slide: 600, gain: 0.1 },
  ],
  decorate: [...seq([330, 392], 0.12, 0.05, 'square', 0.08), ...seq([784, 988, 1175], 0.08, 0.12, 'sine', 0.12).map((n) => ({ ...n, at: n.at + 0.3 }))],
  petplay: [
    { freq: 650, at: 0, dur: 0.16, wave: 'sine', slide: 1000, gain: 0.13 },
    { freq: 1000, at: 0.16, dur: 0.24, wave: 'sine', slide: 560, gain: 0.11 },
  ],
};

export const ERROR_SOUND: Note[] = [
  { freq: 196, at: 0, dur: 0.12, wave: 'square', gain: 0.07 },
  { freq: 147, at: 0.11, dur: 0.18, wave: 'square', gain: 0.07 },
];

/** A cheerful fanfare for big moments (achievements, promotions, graduating). */
export const FANFARE: Note[] = [...seq([523, 659, 784], 0.1, 0.12, 'square', 0.08), { freq: 1047, at: 0.3, dur: 0.45, wave: 'square', gain: 0.09 }];

type AudioCtor = typeof AudioContext;
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC: AudioCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function playNotes(notes: Note[]): void {
  const ac = context();
  if (!ac || !notes.length) return;
  const t0 = ac.currentTime + 0.01;
  for (const n of notes) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const start = t0 + n.at;
    const end = start + n.dur;
    osc.type = n.wave ?? 'triangle';
    osc.frequency.setValueAtTime(n.freq, start);
    if (n.slide) osc.frequency.exponentialRampToValueAtTime(n.slide, end);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(n.gain ?? 0.16, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(g).connect(ac.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

export function buzz(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
}

/** Mobile browsers only allow audio after a user gesture: create and resume on the first touch. */
export function unlockAudio(): () => void {
  if (typeof window === 'undefined') return () => {};
  const unlock = () => void context();
  window.addEventListener('pointerdown', unlock, { passive: true });
  return () => window.removeEventListener('pointerdown', unlock);
}