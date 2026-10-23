// React bridge to the engine: holds GameState, routes every gameplay change
// through the engine API, autosaves, queues feedback for the UI, and sends
// privacy-safe analytics events from one place.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  continueAfterEnding, endChapter, interact as engineInteract, newGame as engineNewGame, performAction, resolveEvent, runAutopilot, runRoutineStep,
  type ActionView,
} from '../engine/simulationEngine';
import { actionById } from '../engine/actions';
import { clearSave, deserialize, loadGame, saveGame, SETTINGS_KEY, type LoadResult } from '../engine/save';
import type { ActionFeedback, DayReport, GameState, NewGameOptions } from '../engine/types';
import { TRACK_ACTIONS } from '../config';
import { initAnalytics, track } from '../lib/analytics';

export interface Settings {
  reducedMotion: boolean;
  /** Player chose not to share anonymous usage stats. */
  analyticsOptOut: boolean;
  /** The first-game "how to play" overlay has been shown. */
  tutorialSeen: boolean;
  /** Main tabs (act/money/life/feed) the player has opened at least once; drives the Home
   * "new here? try these" checklist. UI-only, like the rest of Settings — not part of the save. */
  visitedTabs: Record<string, true>;
}

const defaultSettings: Settings = { reducedMotion: false, analyticsOptOut: false, tutorialSeen: false, visitedTabs: {} };

/** In-game days that count as retention milestones in analytics. */
const DAY_MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];

export type ActionSource = 'primary' | 'tile' | 'list';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function loadSettings(): Settings {
  try {
    const raw = storage()?.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...(JSON.parse(raw) as Partial<Settings>) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

interface GameApi {
  state: GameState | null;
  boot: LoadResult | null;
  feedback: ActionFeedback | null;
  dayReport: DayReport | null;
  confirmFor: ActionView | null;
  lastSavedAt: string | null;
  saveError: boolean;
  settings: Settings;
  start: (options: NewGameOptions) => void;
  act: (actionId: string, param?: string, source?: ActionSource) => ActionFeedback;
  request: (view: ActionView, source?: ActionSource) => void;
  confirmPending: () => void;
  cancelPending: () => void;
  choose: (choiceId: string) => void;
  autopilot: (days: number) => void;
  step: () => void;
  interact: (kind: 'like' | 'invite' | 'challenge' | 'setting', id: string, value?: boolean) => ActionFeedback;
  finishChapter: () => void;
  keepLiving: () => void;
  dismissFeedback: () => void;
  dismissDayReport: () => void;
  quit: () => void;
  resetAll: () => void;
  importSave: (text: string) => string | null;
  exportSave: () => string | null;
  setSettings: (s: Partial<Settings>) => void;
}

const GameContext = createContext<GameApi | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [boot] = useState<LoadResult>(() => {
    const store = storage();
    return store ? loadGame(store) : { status: 'empty' };
  });
  const [state, setState] = useState<GameState | null>(boot.status === 'ok' ? boot.state : null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [dayReport, setDayReport] = useState<DayReport | null>(null);
  const [confirmFor, setConfirmFor] = useState<{ view: ActionView; source: ActionSource } | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(boot.status === 'ok' ? boot.savedAt : null);
  const [saveError, setSaveError] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Analytics loads only when configured, allowed by the player, and not on localhost.
  useEffect(() => {
    initAnalytics(settings.analyticsOptOut);
  }, [settings.analyticsOptOut]);

  // Autosave after every meaningful change.
  useEffect(() => {
    if (!state) return;
    const store = storage();
    if (!store) {
      setSaveError(true);
      return;
    }
    const now = new Date().toISOString();
    const ok = saveGame(store, state, now);
    setSaveError(!ok);
    if (ok) setLastSavedAt(now);
  }, [state]);

  const commit = useCallback((next: GameState, fb: ActionFeedback) => {
    const prev = stateRef.current;
    stateRef.current = next;
    setState(next);
    setFeedback(fb);
    if (prev && next.clock.day > prev.clock.day) {
      if (next.dayReports[0]) setDayReport(next.dayReports[0]);
      for (const m of DAY_MILESTONES) if (prev.clock.day < m && next.clock.day >= m) track('day_reached', { day: m, mode: next.mode });
    }
  }, []);

  const act = useCallback(
    (actionId: string, param?: string, source: ActionSource = 'list') => {
      const current = stateRef.current;
      if (!current) return { ok: false, title: '', lines: [], deltas: [], error: 'No game loaded.' };
      const result = performAction(current, actionId, param);
      if (result.feedback.ok) {
        commit(result.state, result.feedback);
        if (TRACK_ACTIONS) track('action', { id: actionId, category: actionById(actionId)?.category, source });
      } else setFeedback(result.feedback);
      return result.feedback;
    },
    [commit],
  );

  const request = useCallback(
    (view: ActionView, source: ActionSource = 'list') => {
      if (!view.available) {
        setFeedback({ ok: false, title: view.title, lines: [], deltas: [], error: view.reason ?? 'Not available.' });
        return;
      }
      if (view.confirm) setConfirmFor({ view, source });
      else act(view.id, view.param, source);
    },
    [act],
  );

  const api: GameApi = useMemo(
    () => ({
      state,
      boot,
      feedback,
      dayReport,
      confirmFor: confirmFor?.view ?? null,
      lastSavedAt,
      saveError,
      settings,
      start: (options) => {
        const seed = options.seed ?? (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
        const s = engineNewGame({ ...options, seed });
        s.createdAt = new Date().toISOString();
        stateRef.current = s;
        setState(s);
        setFeedback(null);
        setDayReport(null);
        track('game_start', { mode: s.mode, stage: s.character.lifeStage, background: s.character.backgroundId });
      },
      act,
      request,
      confirmPending: () => {
        if (confirmFor) act(confirmFor.view.id, confirmFor.view.param, confirmFor.source);
        setConfirmFor(null);
      },
      cancelPending: () => setConfirmFor(null),
      choose: (choiceId) => {
        const current = stateRef.current;
        if (!current) return;
        const eventId = current.events.pending[0]?.eventId;
        const result = resolveEvent(current, choiceId);
        if (result.feedback.ok) {
          commit(result.state, result.feedback);
          track('event_choice', { id: eventId, source: choiceId });
        } else setFeedback(result.feedback);
      },
      autopilot: (days) => {
        const current = stateRef.current;
        if (!current) return;
        const result = runAutopilot(current, days);
        if (result.feedback.ok) {
          commit(result.state, result.feedback);
          track('routine', { source: days === 1 ? 'end_day' : 'week', days: result.daysSimulated });
        } else setFeedback(result.feedback);
      },
      step: () => {
        const current = stateRef.current;
        if (!current) return;
        const result = runRoutineStep(current);
        if (result.feedback.ok) {
          commit(result.state, result.feedback);
          track('routine', { source: 'next' });
        } else setFeedback(result.feedback);
      },
      interact: (kind, id, value) => {
        const current = stateRef.current;
        if (!current) return { ok: false, title: '', lines: [], deltas: [], error: 'No game.' };
        const result = engineInteract(current, kind, id, value);
        if (result.feedback.ok) {
          stateRef.current = result.state;
          setState(result.state);
        } else setFeedback(result.feedback);
        return result.feedback;
      },
      finishChapter: () => {
        const current = stateRef.current;
        if (!current) return;
        const next = endChapter(current);
        setState(next);
        track('chapter_end', { ending: next.ending?.id, day: next.clock.day });
      },
      keepLiving: () => {
        const current = stateRef.current;
        if (current) setState(continueAfterEnding(current));
      },
      dismissFeedback: () => setFeedback(null),
      dismissDayReport: () => setDayReport(null),
      quit: () => {
        stateRef.current = null;
        setState(null);
        setFeedback(null);
      },
      resetAll: () => {
        track('reset');
        const store = storage();
        if (store) {
          clearSave(store);
          try {
            store.removeItem(SETTINGS_KEY);
          } catch {
            /* ignore */
          }
        }
        stateRef.current = null;
        setState(null);
        setFeedback(null);
        setDayReport(null);
        setSettingsState(defaultSettings);
      },
      importSave: (text) => {
        const res = deserialize(text.trim());
        track('save_import', { ok: res.status === 'ok' });
        if (res.status !== 'ok') return res.status === 'corrupt' ? `Import failed: ${res.error}` : 'Nothing to import.';
        stateRef.current = res.state;
        setState(res.state);
        setFeedback(null);
        return null;
      },
      exportSave: () => {
        const current = stateRef.current;
        return current ? JSON.stringify({ version: current.version, savedAt: new Date().toISOString(), state: current }) : null;
      },
      setSettings: (patch) => {
        setSettingsState((prev) => {
          const next = { ...prev, ...patch };
          try {
            storage()?.setItem(SETTINGS_KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
      },
    }),
    [state, boot, feedback, dayReport, confirmFor, lastSavedAt, saveError, settings, act, request, commit],
  );

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

/** Narrow helper for screens that only render with a loaded game. */
export function useLoadedGame(): GameApi & { state: GameState } {
  const api = useGame();
  if (!api.state) throw new Error('No game loaded');
  return api as GameApi & { state: GameState };
}
