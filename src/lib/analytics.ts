// Privacy-first analytics (UI layer only; the engine never imports this).
// Umami is cookie-free and stores no personal data. We additionally send only
// allow-listed event names and fields: never the character name, free text or money.

import { ANALYTICS_DOMAINS, UMAMI_SCRIPT_URL, UMAMI_WEBSITE_ID } from '../config';

export type EventName =
  | 'install'
  | 'game_start'
  | 'action'
  | 'event_choice'
  | 'routine'
  | 'tab_view'
  | 'day_reached'
  | 'chapter_end'
  | 'share'
  | 'tutorial'
  | 'feedback'
  | 'save_import'
  | 'reset';

type Value = string | number | boolean;
export type EventData = Partial<Record<FieldName, Value>>;

const EVENTS = new Set<EventName>([
  'game_start', 'action', 'event_choice', 'routine', 'tab_view', 'day_reached', 'chapter_end', 'share', 'tutorial', 'feedback', 'save_import', 'reset', 'install',
]);

const FIELDS = ['mode', 'stage', 'background', 'id', 'category', 'source', 'days', 'tab', 'day', 'ending', 'rating', 'topic', 'step', 'ok'] as const;
type FieldName = (typeof FIELDS)[number];
const FIELD_SET = new Set<string>(FIELDS);

const MAX_STRING = 40;

export interface TrackGate {
  configured: boolean;
  optedOut: boolean;
  doNotTrack: boolean;
  hostname: string;
}

export function shouldTrack(g: TrackGate): boolean {
  if (!g.configured || g.optedOut || g.doNotTrack) return false;
  return g.hostname !== 'localhost' && g.hostname !== '127.0.0.1' && g.hostname !== '[::1]' && g.hostname !== '';
}

/** Keep only allow-listed events and fields, with short, plain values. */
export function sanitizeEvent(name: string, data: Record<string, unknown> = {}): { name: EventName; data: EventData } | null {
  if (!EVENTS.has(name as EventName)) return null;
  const clean: EventData = {};
  for (const [key, value] of Object.entries(data)) {
    if (!FIELD_SET.has(key)) continue;
    if (typeof value === 'number' && Number.isFinite(value)) clean[key as FieldName] = value;
    else if (typeof value === 'boolean') clean[key as FieldName] = value;
    else if (typeof value === 'string') clean[key as FieldName] = value.replace(/[^\w\-:. ]/g, '').slice(0, MAX_STRING);
  }
  return { name: name as EventName, data: clean };
}

// ---------------- Browser side ----------------

declare global {
  interface Window {
    umami?: { track: (name: string, data?: Record<string, Value>) => void };
  }
}

let enabled = false;

function browserGate(optedOut: boolean): TrackGate {
  const dnt = typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || (window as unknown as { doNotTrack?: string }).doNotTrack === '1');
  return { configured: UMAMI_WEBSITE_ID.length > 0, optedOut, doNotTrack: dnt, hostname: typeof location !== 'undefined' ? location.hostname : '' };
}

export const analyticsConfigured = () => UMAMI_WEBSITE_ID.length > 0;

/** Load the Umami script once, if allowed. Safe to call on every settings change. */
export function initAnalytics(optedOut: boolean): void {
  if (typeof window === 'undefined') return;
  enabled = shouldTrack(browserGate(optedOut));
  if (!enabled || document.querySelector('script[data-website-id]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = UMAMI_SCRIPT_URL;
  s.dataset.websiteId = UMAMI_WEBSITE_ID;
  s.dataset.domains = ANALYTICS_DOMAINS.join(',');
  s.dataset.doNotTrack = 'true';
  document.head.appendChild(s);
}

export function track(name: EventName, data?: EventData): void {
  if (!enabled || typeof window === 'undefined') return;
  const event = sanitizeEvent(name, data);
  if (!event) return;
  try {
    window.umami?.track(event.name, event.data as Record<string, Value>);
  } catch {
    /* analytics must never break the game */
  }
}
