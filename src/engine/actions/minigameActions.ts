// Mini-game results. The UI runs the game; the engine turns its score into a bounded reward.

import { MINIGAME_REWARDED_PER_DAY, MINIGAME_REWARDS, minigameById } from '../../data/minigames';
import { applyStats } from '../core';
import type { ActionDef } from './types';

function parse(p: string | undefined): { id: string; score: number } {
  const [id = '', raw = ''] = (p ?? '').split(':');
  return { id, score: raw.trim() === '' ? NaN : Number(raw) };
}

export const minigameActions: ActionDef[] = [
  {
    id: 'play-minigame',
    category: 'leisure',
    icon: '🎮',
    dedicated: true,
    title: (_s, p) => `Play ${minigameById(parse(p).id)?.name ?? 'a mini-game'}`,
    description: 'A quick game between errands.',
    minutes: 10,
    available: (_s, p) => {
      const { id, score } = parse(p);
      if (!minigameById(id)) return 'Pick a mini-game.';
      if (!Number.isInteger(score) || score < 0 || score > 100) return 'Finish the game first.';
      return null;
    },
    run: (s, p) => {
      const { id, score } = parse(p);
      const day = s.clock.day;
      if (s.flags['mg-day'] !== day) {
        s.flags['mg-day'] = day;
        s.flags['mg-plays'] = 0;
      }
      const plays = Number(s.flags['mg-plays'] ?? 0) + 1;
      s.flags['mg-plays'] = plays;
      const bestKey = `mg-best-${id}`;
      const best = Number(s.flags[bestKey] ?? 0);
      if (score > best) s.flags[bestKey] = score;
      if (plays > MINIGAME_REWARDED_PER_DAY) {
        applyStats(s, { happiness: 1 });
        return [`Score ${score}. Just for fun now: the full reward is for your first ${MINIGAME_REWARDED_PER_DAY} games a day.`];
      }
      const tier = score >= 90 ? 3 : score >= 60 ? 2 : score >= 30 ? 1 : 0;
      applyStats(s, MINIGAME_REWARDS[tier]);
      return [`Score ${score}${score > best ? ' — new best!' : ''}`];
    },
  },
];
