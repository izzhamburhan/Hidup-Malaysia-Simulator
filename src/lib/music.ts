// Background lofi, synthesised with Web Audio. UI layer only: the engine never imports this.
// No audio files, so nothing to license or download. A station is a short chord loop; `barEvents`
// turns one bar of it into plain events (pure and deterministic), and the player below schedules
// those on an AudioContext a little ahead of time, through a warm low-pass filter.

import { context } from './sound';

export interface Station {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  bpm: number;
  /** 0 to 0.25: how late the off-beats land. */
  swing: number;
  /** One voicing (MIDI notes) per bar, looped. */
  chords: number[][];
  /** Bass root (MIDI) per chord. */
  bass: number[];
  drums: 'beat' | 'soft' | 'none';
  rain: boolean;
  /** Keys sound. */
  wave: 'sine' | 'triangle';
}

export const STATIONS: Station[] = [
  {
    id: 'warung-hujan',
    name: 'Warung Hujan',
    icon: '🌧️',
    blurb: 'Rainy evening at the warung. Slow and cosy.',
    bpm: 72,
    swing: 0.16,
    chords: [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [55, 59, 62, 65, 69], [52, 55, 59, 62, 64]],
    bass: [33, 38, 43, 36],
    drums: 'beat',
    rain: true,
    wave: 'triangle',
  },
  {
    id: 'kopitiam-pagi',
    name: 'Kopitiam Pagi',
    icon: '☕',
    blurb: 'Morning kopi and toast. Light and bright.',
    bpm: 82,
    swing: 0.12,
    chords: [[53, 57, 60, 64, 67], [52, 55, 59, 62, 66], [50, 53, 57, 60, 64], [52, 55, 59, 62, 67]],
    bass: [41, 40, 38, 36],
    drums: 'beat',
    rain: false,
    wave: 'triangle',
  },
  {
    id: 'mamak-lewat',
    name: 'Mamak Lewat Malam',
    icon: '🌙',
    blurb: 'Midnight at the mamak. Mellow and jazzy.',
    bpm: 66,
    swing: 0.2,
    chords: [[53, 57, 60, 64, 67], [53, 59, 62, 65, 67], [52, 55, 59, 62, 64], [55, 58, 61, 64, 67]],
    bass: [38, 43, 36, 45],
    drums: 'soft',
    rain: false,
    wave: 'sine',
  },
  {
    id: 'teduh-kampung',
    name: 'Teduh Kampung',
    icon: '🌾',
    blurb: 'Quiet verandah, no drums. Just keys and calm.',
    bpm: 58,
    swing: 0.1,
    chords: [[52, 55, 59, 62, 64], [57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [55, 59, 62, 64, 69]],
    bass: [36, 33, 41, 43],
    drums: 'none',
    rain: false,
    wave: 'sine',
  },
  {
    id: 'bas-malam',
    name: 'Bas Malam KL',
    icon: '🚌',
    blurb: 'Night bus past the city lights. Steady and dreamy.',
    bpm: 76,
    swing: 0.14,
    chords: [[52, 55, 59, 62, 66], [55, 59, 62, 65, 69], [50, 54, 57, 61, 64], [47, 50, 54, 57, 62]],
    bass: [40, 45, 38, 35],
    drums: 'beat',
    rain: false,
    wave: 'triangle',
  },
];

export function stationById(id: string | undefined): Station {
  return STATIONS.find((s) => s.id === id) ?? STATIONS[0];
}

export type BarEvent =
  | { kind: 'tone'; at: number; dur: number; freq: number; gain: number; wave: 'sine' | 'triangle'; attack: number }
  | { kind: 'kick' | 'snare' | 'hat'; at: number; dur: number; gain: number; freq?: undefined };

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Tiny seeded generator so a bar always sounds the same. */
function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

/** Seconds in one 4/4 bar. */
export const barSeconds = (s: Station) => (60 / s.bpm) * 4;

/** Everything that plays in one bar, as events measured in seconds from the start of the bar. */
export function barEvents(s: Station, bar: number): BarEvent[] {
  const beat = 60 / s.bpm;
  const len = beat * 4;
  const i = ((bar % s.chords.length) + s.chords.length) % s.chords.length;
  const chord = s.chords[i];
  const r = rng(hash(s.id) + bar * 7919);
  const swung = (eighth: number) => eighth * beat * 0.5 + (eighth % 2 === 1 ? s.swing * beat * 0.5 : 0);
  const out: BarEvent[] = [];

  // Keys: a soft held pad, then a light re-strum on the "and" of 2.
  for (const n of chord) out.push({ kind: 'tone', at: 0, dur: len * 0.96, freq: midi(n), gain: 0.035, wave: s.wave, attack: 0.12 });
  for (const n of chord.slice(1)) out.push({ kind: 'tone', at: swung(5), dur: beat * 1.4, freq: midi(n), gain: 0.03, wave: s.wave, attack: 0.02 });

  // Bass: root on 1, fifth on the "and" of 2.
  const root = s.bass[i];
  out.push({ kind: 'tone', at: 0, dur: beat * 1.6, freq: midi(root), gain: 0.16, wave: 'sine', attack: 0.02 });
  out.push({ kind: 'tone', at: swung(5), dur: beat * 1.2, freq: midi(root + 7), gain: 0.12, wave: 'sine', attack: 0.02 });

  // A wandering melody on the chord tones, with rests.
  let last = r();
  for (let e = 0; e < 8; e++) {
    if (r() < 0.55) continue;
    last = (last + r()) % 1;
    const note = chord[Math.floor(last * chord.length)] + 12;
    out.push({ kind: 'tone', at: swung(e), dur: beat * (0.5 + r() * 0.8), freq: midi(note), gain: 0.05, wave: 'sine', attack: 0.015 });
  }

  if (s.drums !== 'none') {
    const soft = s.drums === 'soft';
    out.push({ kind: 'kick', at: 0, dur: 0.18, gain: soft ? 0.14 : 0.22 });
    out.push({ kind: 'kick', at: swung(5), dur: 0.18, gain: soft ? 0.1 : 0.17 });
    out.push({ kind: 'snare', at: beat, dur: 0.14, gain: soft ? 0.05 : 0.09 });
    out.push({ kind: 'snare', at: beat * 3, dur: 0.14, gain: soft ? 0.05 : 0.09 });
    for (let e = 0; e < 8; e++) if (r() < 0.8) out.push({ kind: 'hat', at: swung(e), dur: 0.05, gain: (e % 2 ? 0.025 : 0.04) * (soft ? 0.7 : 1) });
  }
  return out;
}

// ---- Playback (browser only) ------------------------------------------------------------

interface Running {
  ac: AudioContext;
  station: Station;
  master: GainNode;
  filter: BiquadFilterNode;
  loops: AudioBufferSourceNode[];
  noise: AudioBuffer;
  timer: ReturnType<typeof setInterval>;
  nextBar: number;
  bar: number;
}

let running: Running | null = null;
let visibilityHooked = false;

const level = (volume: number) => Math.max(0, Math.min(1, volume)) * 0.9;

function noiseBuffer(ac: AudioContext): AudioBuffer {
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function loopNoise(r: Running, type: BiquadFilterType, freq: number, gain: number): void {
  const src = r.ac.createBufferSource();
  src.buffer = r.noise;
  src.loop = true;
  const f = r.ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = r.ac.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(r.master);
  src.start();
  r.loops.push(src);
}

function play(r: Running, e: BarEvent, t0: number): void {
  const { ac } = r;
  const start = t0 + e.at;
  const end = start + e.dur;
  const g = ac.createGain();
  g.connect(r.filter);
  if (e.kind === 'tone') {
    const osc = ac.createOscillator();
    osc.type = e.wave;
    osc.frequency.value = e.freq;
    osc.detune.value = (Math.random() - 0.5) * 8;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(e.gain, start + e.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(g);
    osc.start(start);
    osc.stop(end + 0.05);
  } else if (e.kind === 'kick') {
    const osc = ac.createOscillator();
    osc.frequency.setValueAtTime(130, start);
    osc.frequency.exponentialRampToValueAtTime(42, end);
    g.gain.setValueAtTime(e.gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(g);
    osc.start(start);
    osc.stop(end + 0.02);
  } else {
    const src = ac.createBufferSource();
    src.buffer = r.noise;
    const f = ac.createBiquadFilter();
    f.type = e.kind === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = e.kind === 'hat' ? 7000 : 1800;
    g.gain.setValueAtTime(e.gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    src.connect(f).connect(g);
    src.start(start, Math.random() * 0.5);
    src.stop(end + 0.02);
  }
}

function tick(): void {
  const r = running;
  if (!r) return;
  // Schedule whole bars a little ahead of the clock so a busy main thread never causes a gap.
  while (r.nextBar < r.ac.currentTime + 1.5) {
    for (const e of barEvents(r.station, r.bar)) play(r, e, r.nextBar);
    r.nextBar += barSeconds(r.station);
    r.bar += 1;
  }
}

/** Start (or switch to) a station. Browsers only allow sound after a tap, so call it from one. */
export function startMusic(stationId: string, volume: number): void {
  const ac = context();
  if (!ac) return;
  if (running?.station.id === stationId && running.ac === ac) {
    setMusicVolume(volume);
    return;
  }
  stopMusic();
  const station = stationById(stationId);
  const master = ac.createGain();
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.linearRampToValueAtTime(level(volume), ac.currentTime + 1.5);
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2800;
  filter.connect(master);
  master.connect(ac.destination);
  const r: Running = { ac, station, master, filter, loops: [], noise: noiseBuffer(ac), timer: setInterval(tick, 300), nextBar: ac.currentTime + 0.15, bar: 0 };
  running = r;
  loopNoise(r, 'highpass', 3500, 0.006); // vinyl hiss
  if (station.rain) loopNoise(r, 'bandpass', 1400, 0.05);
  if (!visibilityHooked && typeof document !== 'undefined') {
    visibilityHooked = true;
    document.addEventListener('visibilitychange', () => {
      if (!running) return;
      if (document.hidden) void running.ac.suspend();
      else void running.ac.resume();
    });
  }
  tick();
}

export function setMusicVolume(volume: number): void {
  if (running) running.master.gain.setTargetAtTime(level(volume), running.ac.currentTime, 0.1);
}

export function stopMusic(): void {
  const r = running;
  if (!r) return;
  running = null;
  clearInterval(r.timer);
  r.master.gain.cancelScheduledValues(r.ac.currentTime);
  r.master.gain.setTargetAtTime(0.0001, r.ac.currentTime, 0.12);
  setTimeout(() => {
    for (const l of r.loops) {
      try {
        l.stop();
      } catch {
        /* already stopped */
      }
    }
    r.master.disconnect();
  }, 700);
}

export function musicPlaying(): string | null {
  return running?.station.id ?? null;
}
