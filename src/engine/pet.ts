// Pet care rules. Pure engine code: no randomness, everything bounded.

import { PET } from '../data/pets';
import { applyStats, clamp, log } from './core';
import type { GameState } from './types';

export function adoptPet(state: GameState): void {
  const day = state.clock.day;
  state.pet = { name: PET.name, species: 'cat', adoptedDay: day, fullness: 70, mood: 70, lastFedDay: day, lastPlayedDay: day, timesFed: 0 };
  log(state, 'milestone', `🐈 ${PET.name} moved in. He has already claimed your favourite chair.`);
}

export function feedPet(state: GameState): void {
  const pet = state.pet;
  if (!pet) return;
  pet.fullness = clamp(pet.fullness + PET.mealFullness);
  pet.mood = clamp(pet.mood + 5);
  pet.lastFedDay = state.clock.day;
  pet.timesFed += 1;
}

export function playWithPet(state: GameState): void {
  const pet = state.pet;
  if (!pet) return;
  pet.mood = clamp(pet.mood + PET.playMood);
  pet.lastPlayedDay = state.clock.day;
  applyStats(state, { stress: -6, happiness: 4 });
}

/** Called once per day from processDayEnd. The cat never dies or leaves: neglect only makes him sulk. */
export function petDayEnd(state: GameState): void {
  const pet = state.pet;
  if (!pet) return;
  const starving = pet.fullness <= 0;
  pet.fullness = clamp(pet.fullness - PET.dailyHunger);
  pet.mood = clamp(pet.mood - (pet.fullness < 20 ? PET.hungryMoodLoss : PET.dailyMoodLoss));
  if (pet.mood >= 70) applyStats(state, { stress: -2, happiness: 1 });
  if (starving) {
    applyStats(state, { happiness: -2 });
    log(state, 'warning', `${pet.name} is hungry and staring at you. Judging you, really.`);
  }
}
