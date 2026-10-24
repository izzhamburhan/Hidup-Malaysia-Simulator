import { describe, expect, it } from 'vitest';
import { DAILY_CHALLENGES } from '../src/data/dailyChallenges';
import { dailyForDate, dailyStatus, newDailyGame } from '../src/engine/dailyChallenge';
import { DAILY_KEY, SAVE_KEY, loadGame, saveGame } from '../src/engine/save';
import { inMemoryStorage, makeGame } from './helpers';

const look = makeGame().character.appearance;

describe('daily challenge', () => {
  it('gives everyone the same scenario and seed on the same date', () => {
    expect(dailyForDate('2027-01-04')).toEqual(dailyForDate('2027-01-04'));
    const ids = new Set(Array.from({ length: 30 }, (_, i) => dailyForDate(`2027-02-${String(i + 1).padStart(2, '0')}`).def.id));
    expect(ids.size).toBeGreaterThanOrEqual(3);
  });

  it('builds the same 7-day life for the same date', () => {
    const a = newDailyGame('2027-01-04', 'Aina', look);
    const b = newDailyGame('2027-01-04', 'Aina', look);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.chapterDays).toBe(7);
    expect(a.flags['daily-date']).toBe('2027-01-04');
    expect(a.flags['daily-id']).toBe(dailyForDate('2027-01-04').def.id);
  });

  it('starts every scenario in bounds and not already won', () => {
    for (const def of DAILY_CHALLENGES) {
      const s = newDailyGame('2027-01-04', 'Tester', look, def.id);
      expect(s.flags['daily-id'], def.id).toBe(def.id);
      expect(s.finance.cash, def.id).toBeGreaterThanOrEqual(0);
      for (const v of Object.values(s.stats)) {
        expect(v, def.id).toBeGreaterThanOrEqual(0);
        expect(v, def.id).toBeLessThanOrEqual(100);
      }
      expect(dailyStatus(s)!.won, def.id).toBe(false);
    }
  });

  it('reports nothing for a normal life and finished at day 7', () => {
    expect(dailyStatus(makeGame())).toBeNull();
    const s = newDailyGame('2027-01-04', 'Tester', look);
    expect(dailyStatus(s)!.finished).toBe(false);
    s.clock.day = 7;
    expect(dailyStatus(s)!.finished).toBe(true);
    expect(dailyStatus(s)!.day).toBe(7);
  });

  it('keeps the daily run in its own slot', () => {
    const store = inMemoryStorage();
    const main = makeGame();
    saveGame(store, main, 'x');
    const mainText = store.getItem(SAVE_KEY);
    saveGame(store, newDailyGame('2027-01-04', 'D', look), 'y', DAILY_KEY);
    expect(store.getItem(SAVE_KEY)).toBe(mainText);
    const loaded = loadGame(store, DAILY_KEY);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') expect(loaded.state.flags['daily-id']).toBeTruthy();
  });

  it('a corrupt daily save never deletes the main life', () => {
    const store = inMemoryStorage();
    saveGame(store, makeGame(), 'x');
    const mainText = store.getItem(SAVE_KEY);
    store.setItem(DAILY_KEY, '{broken');
    expect(loadGame(store, DAILY_KEY).status).toBe('corrupt');
    expect(store.getItem(SAVE_KEY)).toBe(mainText);
    expect(store.getItem(DAILY_KEY)).toBeNull();
  });
});
