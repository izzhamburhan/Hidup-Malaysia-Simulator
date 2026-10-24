import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DAILY_CHALLENGES } from '../src/data/dailyChallenges';
import { homeStates } from '../src/data/lifestyle';
import { STATE_FLAGS, flagFor } from '../src/data/stateFlags';

describe('state flags', () => {
  it('has a flag file and a credit for every home state', () => {
    for (const state of homeStates) {
      const f = flagFor(state);
      expect(f, state).toBeDefined();
      expect(existsSync(`public/flags/${f!.file}`), state).toBe(true);
      expect(f!.source, state).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
    expect(STATE_FLAGS.length).toBe(homeStates.length);
  });

  it('credits the author of every CC BY-SA flag', () => {
    for (const f of STATE_FLAGS.filter((x) => x.license === 'CC BY-SA 3.0')) expect(f.author, f.state).toBeTruthy();
  });

  it('ships flag files without scripts or outside links', () => {
    for (const f of STATE_FLAGS) {
      const svg = readFileSync(`public/flags/${f.file}`, 'utf8').toLowerCase();
      for (const bad of ['<script', 'javascript:', 'onload=', '<foreignobject', 'href="http']) expect(svg.includes(bad), `${f.state}: ${bad}`).toBe(false);
    }
  });

  it('uses only real home-state names in the daily challenges', () => {
    for (const d of DAILY_CHALLENGES) expect(homeStates, d.id).toContain(d.options.homeState);
  });
});