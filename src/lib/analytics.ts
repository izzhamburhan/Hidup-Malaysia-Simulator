// Privacy-first analytics (UI layer only; the engine never imports this).
// Umami is cookie-free and stores no personal data. We additionally send only
// allow-listed event names and fields: never the character name, free text or an exact money amount
// (coarse money bands such as "rm2k-10k" and the character's game choices are allowed).

import { ANALYTICS_DOMAINS, CLOUDFLARE_BEACON_TOKEN, UMAMI_SCRIPT_URL, UMAMI_WEBSITE_ID } from '../config';

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
  | 'reset'
  | 'session'
  | 'account'
  | 'life'
  | 'create'
  | 'problem';

type Value = string | number | boolean;
export type EventData = Partial<Record<FieldName, Value>>;

const EVENTS = new Set<EventName>([
  'game_start', 'action', 'event_choice', 'routine', 'tab_view', 'day_reached', 'chapter_end', 'share', 'tutorial', 'feedback', 'save_import', 'reset', 'install',
  'session', 'account', 'life', 'create', 'problem',
]);

const FIELDS = [
  'mode', 'stage', 'background', 'id', 'category', 'source', 'days', 'tab', 'day', 'ending', 'rating', 'topic', 'step', 'ok',
  // life snapshot at milestone days: choices and coarse bands, never exact money (see analyticsSnapshot.ts)
  'home_state', 'residence', 'cash_band', 'savings_band', 'epf_band', 'debt_band', 'networth_band', 'employed', 'job', 'edu', 'housing',
  'vehicle', 'partner', 'pet', 'health_band', 'happiness_band', 'stress_band', 'lang', 'installed', 'signed_in', 'lives',
  // session summary (see sessionStats.ts)
  'actions', 'minutes', 'events', 'games', 'top1', 'top2', 'top3', 'mix',
] as const;
type FieldName = (typeof FIELDS)[number];
const FIELD_SET = new Set<string>(FIELDS);

const MAX_STRING = 40;

/** A money band is a short lowercase label such as rm2k-10k, never a number or free text. */
const BAND_LABEL = /^[a-z0-9-]{1,16}$/;

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
    if (key.endsWith('_band') && !(typeof value === 'string' && BAND_LABEL.test(value))) continue;
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

function browserGate(optedOut: boolean, configured: boolean): TrackGate {
  const dnt = typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || (window as unknown as { doNotTrack?: string }).doNotTrack === '1');
  return { configured, optedOut, doNotTrack: dnt, hostname: typeof location !== 'undefined' ? location.hostname : '' };
}

/** True when custom events can be sent (Umami). Feedback needs this. */
export const eventsConfigured = () => UMAMI_WEBSITE_ID.length > 0;

/** True when any analytics is set up; the privacy notice and opt-out follow this. */
export const analyticsConfigured = () => UMAMI_WEBSITE_ID.length > 0 || CLOUDFLARE_BEACON_TOKEN.length > 0;

/** Cloudflare Web Analytics script attributes for a token, or null when there is no token. Pure. */
export function cloudflareBeaconAttrs(token: string): { src: string; beacon: string } | null {
  if (!token) return null;
  return { src: 'https://static.cloudflareinsights.com/beacon.min.js', beacon: JSON.stringify({ token }) };
}

/**
 * Load the analytics scripts once, if allowed. Umami carries the custom events; Cloudflare Web Analytics adds
 * page views and speed with no event cap. Each has its own configured flag, both share the privacy gate.
 * Safe to call on every settings change.
 */
export function initAnalytics(optedOut: boolean): void {
  if (typeof window === 'undefined') return;
  enabled = shouldTrack(browserGate(optedOut, UMAMI_WEBSITE_ID.length > 0));
  if (enabled && !document.querySelector('script[data-website-id]')) {
    const s = document.createElement('script');
    s.defer = true;
    s.src = UMAMI_SCRIPT_URL;
    s.dataset.websiteId = UMAMI_WEBSITE_ID;
    s.dataset.domains = ANALYTICS_DOMAINS.join(',');
    s.dataset.doNotTrack = 'true';
    document.head.appendChild(s);
  }
  const cf = cloudflareBeaconAttrs(CLOUDFLARE_BEACON_TOKEN);
  if (cf && shouldTrack(browserGate(optedOut, true)) && !document.querySelector('script[data-cf-beacon]')) {
    const s = document.createElement('script');
    s.type = 'module'; // matches Cloudflare's current snippet
    s.src = cf.src;
    s.dataset.cfBeacon = cf.beacon;
    document.head.appendChild(s);
  }
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