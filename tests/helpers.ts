import { newGame } from '../src/engine/simulationEngine';
import type { GameState, NewGameOptions } from '../src/engine/types';

export function makeGame(overrides: Partial<NewGameOptions> = {}): GameState {
  return newGame({
    name: 'Tester',
    startAge: 23,
    homeState: 'Selangor',
    backgroundId: 'middle',
    lifeStage: 'fresh_grad',
    mode: 'realistic',
    courseId: 'cs',
    seed: 1234,
    ...overrides,
  });
}

/** Set the clock without running day processing (test setup only). */
export function at(state: GameState, day: number, hour: number, minute = 0): GameState {
  state.clock = { day, minute: hour * 60 + minute };
  return state;
}

export function inMemoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}
