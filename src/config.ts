// Public site configuration. Nothing here is secret: an analytics website ID and
// a form link are visible to anyone who opens the page anyway.

/**
 * Umami Cloud website ID (cookie-free analytics). Leave empty to disable analytics
 * completely: no script loads and no events are sent.
 * Get it from https://cloud.umami.is → Settings → Websites → your site → Website ID.
 */
export const UMAMI_WEBSITE_ID = 'a1f80fe7-f382-44a5-af47-c2af2becdd59';

/** Public address of the game, added to shared result cards. */
export const GAME_URL = 'https://izzhamburhan.github.io/Hidup-Malaysia-Simulator/';

/** Umami script location (cloud by default; change if you self-host). */
export const UMAMI_SCRIPT_URL = 'https://cloud.umami.is/script.js';

/** Only these hostnames send analytics (keeps local testing out of the stats). */
export const ANALYTICS_DOMAINS = ['izzhamburhan.github.io'];

/** Send one event per gameplay action. Turn off if the free plan's event quota gets tight. */
export const TRACK_ACTIONS = true;

/** Optional long-form feedback form (e.g. a Google Form). Leave empty to hide the link. */
export const FEEDBACK_FORM_URL = '';
