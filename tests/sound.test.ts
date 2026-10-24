import { describe, expect, it } from 'vitest';
import { ACTIVITIES, type Activity } from '../src/components/room/activity';
import { ERROR_SOUND, SOUNDS } from '../src/lib/sound';

describe('sound recipes', () => {
  it('has a short, audible recipe for every activity', () => {
    for (const a of Object.keys(ACTIVITIES) as Activity[]) {
      const notes = SOUNDS[a];
      expect(notes, a).toBeDefined();
      if (a === 'idle') continue;
      expect(notes.length, a).toBeGreaterThan(0);
      const end = Math.max(...notes.map((n) => n.at + n.dur));
      expect(end, a).toBeLessThanOrEqual(1.2);
      for (const n of notes) {
        expect(n.freq, a).toBeGreaterThanOrEqual(60);
        expect(n.freq, a).toBeLessThanOrEqual(4000);
        expect(n.gain ?? 0.2, a).toBeLessThanOrEqual(0.4);
      }
    }
  });

  it('has an error sound', () => {
    expect(ERROR_SOUND.length).toBeGreaterThan(0);
  });
});