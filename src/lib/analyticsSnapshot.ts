// What a milestone analytics event says about a life. Money is only ever sent as a coarse BAND
// ("rm2k-10k"), never an exact amount, and nothing here can carry the character's name. A pure
// function of the game state; it reads and never changes it. UI layer only (the engine never imports it).

import { netWorth, totalDebt } from '../engine/core';
import type { GameState } from '../engine/types';
import type { EventData } from './analytics';

const fmt = (n: number): string => (n >= 1000 ? `${n / 1000}k` : String(n));

/**
 * The band a value falls in, given ascending edges: "rm100-500", "rm10k-plus", "neg" for a negative value and
 * "na" for anything that is not a number. Labels are short, lowercase and safe to send.
 */
export function bandOf(value: number, edges: readonly number[]): string {
  if (!Number.isFinite(value)) return 'na';
  if (value < 0) return 'neg';
  const i = edges.findIndex((e) => value < e);
  if (i === -1) return `rm${fmt(edges[edges.length - 1])}-plus`;
  if (i === 0) return `rm0-${fmt(edges[0])}`;
  return `rm${fmt(edges[i - 1])}-${fmt(edges[i])}`;
}

/** A 0 to 100 meter as "low", "mid" or "high". */
export function statBand(value: number): string {
  return value < 34 ? 'low' : value < 67 ? 'mid' : 'high';
}

const CASH = [0, 100, 500, 1000, 3000, 10000];
const SAVINGS = [0, 500, 2000, 10000, 50000, 150000];
const EPF = [0, 1000, 5000, 20000, 50000, 150000];
const DEBT = [0, 1000, 10000, 30000, 100000];
const NET_WORTH = [0, 1000, 5000, 20000, 50000, 150000];

export interface SnapshotContext {
  /** UI language, "en" or "ms". */
  lang: string;
  /** Running as an installed home-screen app. */
  installed: boolean;
  signedIn: boolean;
  /** How many lives the player holds on this device. */
  lives: number;
}

export function lifeSnapshot(state: GameState, ctx: SnapshotContext): EventData {
  const f = state.finance;
  const debt = totalDebt(state);
  return {
    mode: state.mode,
    stage: state.character.lifeStage,
    background: state.character.backgroundId,
    home_state: state.character.homeState,
    residence: state.location.state,
    cash_band: bandOf(f.cash, CASH),
    savings_band: bandOf(f.savings + f.emergencyFund, SAVINGS),
    epf_band: bandOf(f.epfBalance, EPF),
    debt_band: debt <= 0 ? 'none' : bandOf(debt, DEBT),
    networth_band: bandOf(netWorth(state), NET_WORTH),
    employed: state.career.job !== null,
    job: state.career.job?.jobId ?? 'none',
    edu: state.education.status,
    housing: state.housing.optionId,
    vehicle: state.transport.vehicleId !== null,
    partner: state.relationships.partner?.stage ?? 'none',
    pet: state.pet !== null,
    health_band: statBand(state.stats.health),
    happiness_band: statBand(state.stats.happiness),
    stress_band: statBand(state.stats.stress),
    lang: ctx.lang,
    installed: ctx.installed,
    signed_in: ctx.signedIn,
    lives: ctx.lives,
  };
}