// Starter quest progress and rewards. Claims live in state.flags.

import { QUESTS, QUEST_REWARD, questById, type Quest } from '../data/quests';
import { applyStats, earn, log } from './core';
import type { GameState } from './types';

export const questKey = (id: string) => `quest-${id}`;
const inDaily = (s: GameState) => s.flags['daily-id'] !== undefined;

export interface QuestStatus {
  quest: Quest;
  done: boolean;
  claimed: boolean;
}

/** Null in a daily-challenge life, where starter quests do not apply. */
export function questStatus(s: GameState): QuestStatus[] | null {
  if (inDaily(s)) return null;
  return QUESTS.map((quest) => ({ quest, done: quest.done(s), claimed: s.flags[questKey(quest.id)] !== undefined }));
}

export function claimReason(s: GameState, id: string | undefined): string | null {
  if (inDaily(s)) return 'Starter quests are not part of the daily challenge.';
  const q = questById(id);
  if (!q) return 'Pick a quest.';
  if (s.flags[questKey(q.id)] !== undefined) return 'Already claimed.';
  if (!q.done(s)) return `Not yet: ${q.hint}`;
  return null;
}

export function claimQuest(s: GameState, id: string): string[] {
  const q = questById(id);
  if (!q) return [];
  earn(s, QUEST_REWARD.cash);
  applyStats(s, { happiness: QUEST_REWARD.happiness });
  s.flags[questKey(q.id)] = s.clock.day;
  log(s, 'money', `${q.icon} Quest done: ${q.title}. Mak sent a little something (RM${QUEST_REWARD.cash}).`);
  return [`Mak: "Bagus! Here's RM${QUEST_REWARD.cash}, beli air ya." 😊`];
}