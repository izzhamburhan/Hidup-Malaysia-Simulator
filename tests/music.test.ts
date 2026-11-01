import { describe, expect, it } from 'vitest';
import { STATIONS, barEvents, barSeconds, stationById } from '../src/lib/music';

describe('lofi stations', () => {
  it('has several stations with unique ids and a name each', () => {
    expect(STATIONS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(STATIONS.map((s) => s.id)).size).toBe(STATIONS.length);
    for (const s of STATIONS) {
      expect(s.name.length, s.id).toBeGreaterThan(0);
      expect(s.bass.length, s.id).toBe(s.chords.length);
    }
  });

  it('falls back to the first station for an unknown id', () => {
    expect(stationById('nope')).toBe(STATIONS[0]);
    expect(stationById(undefined)).toBe(STATIONS[0]);
  });

  it('every bar of every station is audible, in range and inside the bar', () => {
    for (const s of STATIONS) {
      for (let bar = 0; bar < s.chords.length * 2; bar++) {
        const events = barEvents(s, bar);
        expect(events.length, `${s.id} bar ${bar}`).toBeGreaterThan(0);
        for (const e of events) {
          expect(e.at, s.id).toBeGreaterThanOrEqual(0);
          expect(e.at, s.id).toBeLessThan(barSeconds(s));
          expect(e.gain, s.id).toBeLessThanOrEqual(0.3);
          if (e.kind === 'tone') {
            expect(Number.isFinite(e.freq), s.id).toBe(true);
            expect(e.freq, s.id).toBeGreaterThanOrEqual(30);
            expect(e.freq, s.id).toBeLessThanOrEqual(2000);
          }
        }
      }
    }
  });

  it('is deterministic: the same bar gives the same events', () => {
    for (const s of STATIONS) expect(barEvents(s, 5)).toEqual(barEvents(s, 5));
  });

  it('the chords change from bar to bar, and a no-drums station has none', () => {
    expect(JSON.stringify(barEvents(STATIONS[0], 0))).not.toBe(JSON.stringify(barEvents(STATIONS[0], 1)));
    const quiet = STATIONS.find((s) => s.drums === 'none')!;
    expect(barEvents(quiet, 0).some((e) => e.kind !== 'tone')).toBe(false);
  });
});
