// React bridge to the engine: holds GameState, routes every gameplay change
// through the engine API, autosaves, queues feedback for the UI, and sends
// privacy-safe analytics events from one place.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  chooseRoutineStep, continueAfterEnding, endChapter, interact as engineInteract, newGame as engineNewGame, performAction, resolveEvent, runAutopilot, runRoutineStep,
  type ActionView,
} from '../engine/simulationEngine';
import { actionById } from '../engine/actions';
import { actionGameFor } from '../engine/actionGames';
import { dailyForDate, newDailyGame } from '../engine/dailyChallenge';
import { randomAppearance } from '../engine/appearance';
import { COLLECTION_KEY, DAILY_KEY, SAVE_KEY, clearSave, deserialize, emptyCollection, loadCollection, loadGame, recordEnding, saveCollection, saveGame, serialize, SETTINGS_KEY, type EndingCollection, type LoadResult } from '../engine/save';
import { MAX_LIVES, SHELF_KEY, deleteLife as removeLife, listLives, liveCount, loadLibrary, saveLibrary, startNewLife, switchToLife, type Library, type LifeEntry } from '../lib/lives';
import type { ActionFeedback, DayReport, GameState, NewGameOptions } from '../engine/types';
import { TRACK_ACTIONS } from '../config';
import { initAnalytics, track, type EventData } from '../lib/analytics';
import { lifeSnapshot } from '../lib/analyticsSnapshot';
import { loadCloudState } from '../lib/cloud';
import { isStandalone } from '../lib/install';
import { createSessionStats } from '../lib/sessionStats';
import type { Lang } from '../i18n';

export interface Settings {
  reducedMotion: boolean;
  /** Player chose not to share anonymous usage stats. */
  analyticsOptOut: boolean;
  /** The first-game "how to play" overlay has been shown. */
  tutorialSeen: boolean;
  /** Synthesised sound effects after each action. */
  sound: boolean;
  /** A light phone buzz after each action, where the browser supports it. */
  vibration: boolean;
  /** UI language. Bahasa Malaysia is a beta covering menus and buttons. */
  language: Lang;
  /** The player tapped "Not now" on the Add to Home Screen card. */
  installDismissed: boolean;
  /** Offer a quick mini-game before everyday actions (always skippable). */
  actionGames: boolean;
  /** The player chose "Continue as guest" on the cloud save card, so the big sign-in card stays hidden. */
  cloudPromptDismissed: boolean;
  /** Background lofi music (synthesised, starts on the first tap). */
  music: boolean;
  /** Which lofi station plays (see STATIONS in src/lib/music.ts). */
  musicStation: string;
  /** Music volume, 0 to 1. */
  musicVolume: number;
}

const defaultSettings: Settings = { reducedMotion: false, analyticsOptOut: false, tutorialSeen: false, sound: true, vibration: true, language: 'en', installDismissed: false, actionGames: true, cloudPromptDismissed: false, music: true, musicStation: 'warung-hujan', musicVolume: 0.5 };

/** In-game days that count as retention milestones in analytics. */
const DAY_MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];

export type ActionSource = 'primary' | 'tile' | 'list';

/** Today's date as YYYY-MM-DD in the player's own time zone: the daily challenge key. */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type Slot = 'main' | 'daily';

/** The last thing the player did, for the Home room animation. UI-only, never saved. */
export interface LastActivity {
  id: string;
  param?: string;
  seq: number;
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** What a milestone day says about the life: choices and coarse money bands, never the name or exact amounts. */
function milestoneSnapshot(state: GameState, lang: string): EventData {
  const store = storage();
  return lifeSnapshot(state, { lang, installed: isStandalone(), signedIn: loadCloudState(store).signedIn, lives: liveCount(loadLibrary(store)) });
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
  /** An action waiting on its mini-game (play it, or skip to do the action as normal). */
  gameFor: ActionView | null;
  lastSavedAt: string | null;
  saveError: boolean;
  settings: Settings;
  lastActivity: LastActivity | null;
  /** Endings found across every life. */
  collection: EndingCollection;
  /** Which save slot the live game belongs to. */
  slot: Slot;
  /** Today's daily challenge, and today's run if one is saved. */
  daily: () => { key: string; title: string; icon: string; blurb: string; goal: string; saved: GameState | null };
  playDaily: () => void;
  exitDaily: () => void;
  start: (options: NewGameOptions) => void;
  act: (actionId: string, param?: string, source?: ActionSource, gameScore?: number) => ActionFeedback;
  request: (view: ActionView, source?: ActionSource) => void;
  confirmPending: () => void;
  cancelPending: () => void;
  /** Finish the pending action game: with a score for the bonus, or none when skipped. */
  finishGame: (score?: number) => void;
  cancelGame: () => void;
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
  /** Every life held on this device: the current one first, then shelved lives. */
  lives: LifeEntry[];
  /** True when no more lives fit (at most MAX_LIVES): starting a new life needs one deleted first. */
  livesFull: boolean;
  /** Bumps whenever lives are started, switched, deleted or changed by the cloud. */
  libraryVersion: number;
  getLibrary: () => Library;
  /** Write a whole library and, when the current life changed, load it into the game. Used by the cloud sync. */
  applyLibrary: (lib: Library) => boolean;
  /** Make a shelved life the current one. The current life is shelved, never lost. */
  switchLife: (id: string) => void;
  /** Delete a life for good (the screen confirms first). */
  deleteLife: (id: string) => void;
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
  const [gameFor, setGameFor] = useState<{ view: ActionView; source: ActionSource } | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(boot.status === 'ok' ? boot.savedAt : null);
  const [saveError, setSaveError] = useState(false);
  const [libVersion, setLibVersion] = useState(0);
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const sessionRef = useRef(createSessionStats(Date.now()));
  const saveFailTrackedRef = useRef(false);
  const [lastActivity, setLastActivity] = useState<LastActivity | null>(null);
  const [collection, setCollection] = useState<EndingCollection>(() => {
    const store = storage();
    return store ? loadCollection(store) : emptyCollection();
  });
  const played = useCallback((id: string, param?: string) => setLastActivity((p) => ({ id, param, seq: (p?.seq ?? 0) + 1 })), []);
  const [slot, setSlot] = useState<Slot>('main');
  const slotRef = useRef<Slot>('main');
  const stateRef = useRef(state);
  stateRef.current = state;

  // Analytics loads only when configured, allowed by the player, and not on localhost.
  useEffect(() => {
    initAnalytics(settings.analyticsOptOut);
  }, [settings.analyticsOptOut]);

  // A save that could not be read at start-up (best effort: the analytics script may not have loaded yet).
  useEffect(() => {
    if (boot.status === 'corrupt') track('problem', { source: 'save_corrupt' });
  }, [boot.status]);

  // One summary per sitting, sent when the tab is hidden, instead of one event per action.
  useEffect(() => {
    const onChange = () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden') {
        const summary = sessionRef.current.summary(now);
        if (summary) track('session', summary);
        sessionRef.current.reset(now);
      } else {
        sessionRef.current.startClock(now);
      }
    };
    document.addEventListener('visibilitychange', onChange);
    window.addEventListener('pagehide', onChange);
    return () => {
      document.removeEventListener('visibilitychange', onChange);
      window.removeEventListener('pagehide', onChange);
    };
  }, []);

  // Autosave after every meaningful change.
  useEffect(() => {
    if (!state) return;
    const store = storage();
    if (!store) {
      setSaveError(true);
      return;
    }
    const now = new Date().toISOString();
    const ok = saveGame(store, state, now, slotRef.current === 'daily' ? DAILY_KEY : SAVE_KEY);
    setSaveError(!ok);
    if (ok) {
      saveFailTrackedRef.current = false;
      setLastSavedAt(now);
    } else if (!saveFailTrackedRef.current) {
      saveFailTrackedRef.current = true; // once per failure streak, not once per action
      track('problem', { source: 'save_failed' });
    }
  }, [state]);

  const getLibrary = useCallback((): Library => loadLibrary(storage()), []);

  // Every life change goes through here, so the screen and LocalStorage never disagree about the current life.
  const applyLibrary = useCallback((lib: Library): boolean => {
    const store = storage();
    let before: string | null = null;
    try {
      before = store?.getItem(SAVE_KEY) ?? null;
    } catch {
      before = null;
    }
    if (!saveLibrary(store, lib)) {
      setSaveError(true);
      return false;
    }
    if (slotRef.current === 'main' && lib.active !== before) {
      const loaded = lib.active ? deserialize(lib.active) : null;
      stateRef.current = loaded?.status === 'ok' ? loaded.state : null;
      setState(stateRef.current);
      setFeedback(null);
      setDayReport(null);
    }
    setLibVersion((v) => v + 1);
    return true;
  }, []);

  const lives = useMemo(() => {
    const store = storage();
    return store ? listLives(loadLibrary(store)) : [];
  }, [lastSavedAt, libVersion, state?.id]);

  const commit = useCallback((next: GameState, fb: ActionFeedback) => {
    const prev = stateRef.current;
    stateRef.current = next;
    setState(next);
    setFeedback(fb);
    if (prev && next.clock.day > prev.clock.day) {
      if (next.dayReports[0]) setDayReport(next.dayReports[0]);
      sessionRef.current.recordDays(next.clock.day - prev.clock.day);
      for (const m of DAY_MILESTONES) {
        if (prev.clock.day < m && next.clock.day >= m) track('day_reached', { day: m, ...milestoneSnapshot(next, settingsRef.current.language) });
      }
    }
  }, []);

  const act = useCallback(
    (actionId: string, param?: string, source: ActionSource = 'list', gameScore?: number) => {
      const current = stateRef.current;
      if (!current) return { ok: false, title: '', lines: [], deltas: [], error: 'No game loaded.' };
      const result = performAction(current, actionId, param, { gameScore });
      if (result.feedback.ok) {
        commit(result.state, result.feedback);
        played(actionId, param);
        sessionRef.current.recordAction(actionId, actionById(actionId)?.category);
        if (TRACK_ACTIONS) track('action', { id: actionId, category: actionById(actionId)?.category, source });
      } else setFeedback(result.feedback);
      return result.feedback;
    },
    [commit, played],
  );

  const request = useCallback(
    (view: ActionView, source: ActionSource = 'list') => {
      if (!view.available) {
        setFeedback({ ok: false, title: view.title, lines: [], deltas: [], error: view.reason ?? 'Not available.' });
        return;
      }
      if (view.confirm) setConfirmFor({ view, source });
      else if (settings.actionGames && actionGameFor(view.id)) setGameFor({ view, source });
      else act(view.id, view.param, source);
    },
    [act, settings.actionGames],
  );

  const api: GameApi = useMemo(
    () => ({
      state,
      boot,
      feedback,
      dayReport,
      confirmFor: confirmFor?.view ?? null,
      gameFor: gameFor?.view ?? null,
      lastSavedAt,
      saveError,
      settings,
      lastActivity,
      collection,
      slot,
      daily: () => {
        const key = todayKey();
        const { def } = dailyForDate(key);
        const store = storage();
        const res = store ? loadGame(store, DAILY_KEY) : null;
        const saved = res?.status === 'ok' && res.state.flags['daily-date'] === key ? res.state : null;
        return { key, title: def.title, icon: def.icon, blurb: def.blurb, goal: def.goal, saved };
      },
      playDaily: () => {
        const key = todayKey();
        const store = storage();
        const res = store ? loadGame(store, DAILY_KEY) : null;
        let s = res?.status === 'ok' && res.state.flags['daily-date'] === key ? res.state : null;
        if (!s) {
          const main = slotRef.current === 'main' ? stateRef.current : null;
          s = newDailyGame(key, main?.character.name ?? 'Kamu', main?.character.appearance ?? randomAppearance(dailyForDate(key).seed), undefined, main?.character.gender);
          s.createdAt = new Date().toISOString();
          track('game_start', { mode: 'daily', stage: s.character.lifeStage, background: s.character.backgroundId });
        }
        slotRef.current = 'daily';
        setSlot('daily');
        stateRef.current = s;
        setState(s);
        setFeedback(null);
        setDayReport(null);
      },
      exitDaily: () => {
        const store = storage();
        const res = store ? loadGame(store) : null;
        const main = res?.status === 'ok' ? res.state : null;
        slotRef.current = 'main';
        setSlot('main');
        stateRef.current = main;
        setState(main);
        setFeedback(null);
        setDayReport(null);
      },
      start: (options) => {
        const seed = options.seed ?? (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
        const s = engineNewGame({ ...options, seed });
        s.createdAt = new Date().toISOString();
        const store = storage();
        if (store) {
          // The current life is shelved, never replaced. A full library refuses: the landing page asks the player to delete one first.
          const before = loadLibrary(store);
          const next = startNewLife(before, serialize(s, new Date().toISOString()));
          if (!next) return;
          if (before.active) track('life', { source: 'new_extra', lives: liveCount(next) });
          slotRef.current = 'main';
          setSlot('main');
          applyLibrary(next);
        } else {
          slotRef.current = 'main';
          setSlot('main');
          stateRef.current = s;
          setState(s);
          setFeedback(null);
          setDayReport(null);
        }
        track('game_start', { mode: s.mode, stage: s.character.lifeStage, background: s.character.backgroundId });
      },
      act,
      request,
      confirmPending: () => {
        if (confirmFor && settings.actionGames && actionGameFor(confirmFor.view.id)) setGameFor(confirmFor);
        else if (confirmFor) act(confirmFor.view.id, confirmFor.view.param, confirmFor.source);
        setConfirmFor(null);
      },
      cancelPending: () => setConfirmFor(null),
      finishGame: (score) => {
        if (gameFor) act(gameFor.view.id, gameFor.view.param, gameFor.source, score);
        if (gameFor && score !== undefined) sessionRef.current.recordGame();
        setGameFor(null);
      },
      cancelGame: () => setGameFor(null),
      choose: (choiceId) => {
        const current = stateRef.current;
        if (!current) return;
        const eventId = current.events.pending[0]?.eventId;
        const result = resolveEvent(current, choiceId);
        if (result.feedback.ok) {
          commit(result.state, result.feedback);
          sessionRef.current.recordEvent();
          track('event_choice', { id: eventId, source: choiceId });
        } else setFeedback(result.feedback);
      },
      autopilot: (days) => {
        const current = stateRef.current;
        if (!current) return;
        const result = runAutopilot(current, days);
        if (result.feedback.ok) {
          commit(result.state, result.feedback);
          if (!result.interrupted) played('sleep');
          track('routine', { source: days === 1 ? 'end_day' : 'week', days: result.daysSimulated });
        } else setFeedback(result.feedback);
      },
      step: () => {
        const current = stateRef.current;
        if (!current) return;
        const next = chooseRoutineStep(current);
        const result = runRoutineStep(current);
        if (result.feedback.ok) {
          commit(result.state, result.feedback);
          if (next.kind === 'action') played(next.id, next.param);
          else played(next.kind === 'wait' ? 'wait' : 'sleep');
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
        if (next.ending) {
          const updated = recordEnding(collection, next.ending.id, next.character.name);
          setCollection(updated);
          const store = storage();
          if (store) saveCollection(store, updated);
        }
        track('chapter_end', { ending: next.ending?.id, day: next.clock.day });
      },
      keepLiving: () => {
        const current = stateRef.current;
        if (current) setState(continueAfterEnding(current));
      },
      dismissFeedback: () => setFeedback(null),
      dismissDayReport: () => setDayReport(null),
      quit: () => {
        slotRef.current = 'main';
        setSlot('main');
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
            store.removeItem(COLLECTION_KEY);
            store.removeItem(DAILY_KEY);
            store.removeItem(SHELF_KEY);
          } catch {
            /* ignore */
          }
        }
        setLibVersion((v) => v + 1);
        stateRef.current = null;
        setState(null);
        setFeedback(null);
        setDayReport(null);
        setSettingsState(defaultSettings);
        setCollection(emptyCollection());
      },
      importSave: (text) => {
        const res = deserialize(text.trim());
        track('save_import', { ok: res.status === 'ok' });
        if (res.status !== 'ok') return res.status === 'corrupt' ? `Import failed: ${res.error}` : 'Nothing to import.';
        slotRef.current = 'main';
        setSlot('main');
        stateRef.current = res.state;
        setState(res.state);
        setFeedback(null);
        return null;
      },
      lives,
      livesFull: liveCount(loadLibrary(storage())) >= MAX_LIVES,
      libraryVersion: libVersion,
      getLibrary,
      applyLibrary,
      switchLife: (id) => {
        const next = switchToLife(loadLibrary(storage()), id);
        if (next && applyLibrary(next)) track('life', { source: 'switch', lives: liveCount(next) });
      },
      deleteLife: (id) => {
        const next = removeLife(loadLibrary(storage()), id, new Date().toISOString());
        if (applyLibrary(next)) track('life', { source: 'delete', lives: liveCount(next) });
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
    [state, boot, feedback, dayReport, confirmFor, gameFor, lastSavedAt, saveError, settings, lastActivity, collection, slot, lives, libVersion, getLibrary, applyLibrary, act, request, commit, played],
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
