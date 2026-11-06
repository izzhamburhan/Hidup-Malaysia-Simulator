// Public site configuration. Nothing here is secret: an analytics website ID and
// a form link are visible to anyone who opens the page anyway.

/**
 * Umami Cloud website ID (cookie-free analytics). Leave empty to disable analytics
 * completely: no script loads and no events are sent.
 * Get it from https://cloud.umami.is → Settings → Websites → your site → Website ID.
 */
export const UMAMI_WEBSITE_ID = 'a1f80fe7-f382-44a5-af47-c2af2becdd59';

/**
 * Cloudflare Web Analytics beacon token (free, cookie-free, page views and speed only, no custom events).
 * Leave empty to skip it. Get it from Cloudflare dashboard → Analytics & Logs → Web Analytics → Add a site
 * (choose "manual", copy the token from the snippet). It runs beside Umami under the same privacy gate.
 */
export const CLOUDFLARE_BEACON_TOKEN = 'b5644da727144c43a9b83cba187fa627';

/** Public address of the game, added to shared result cards. */
export const GAME_URL = 'https://hidupmalaysia.com/';

/** Umami script location (cloud by default; change if you self-host). */
export const UMAMI_SCRIPT_URL = 'https://cloud.umami.is/script.js';

/** Only these hostnames send analytics (keeps local testing out of the stats). */
export const ANALYTICS_DOMAINS = ['hidupmalaysia.com', 'www.hidupmalaysia.com', 'izzhamburhan.github.io'];

/**
 * Send one event per gameplay action. Off by default: one "session" summary (action counts, top actions) is sent
 * when the tab is hidden instead, which keeps the free plan's event quota for the milestone snapshots.
 */
export const TRACK_ACTIONS = false;

/** Optional long-form feedback form (e.g. a Google Form). Leave empty to hide the link. */
export const FEEDBACK_FORM_URL = '';

/**
 * Firebase web config for the optional Google sign-in and cloud save. These values are public by
 * design: they only identify the project. Access is protected by firestore.rules (a signed-in
 * player can touch only their own document). Leave apiKey empty to hide cloud save completely.
 * Firebase Analytics is never loaded; analytics stays the opt-out Umami setup above.
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDLbwfmVMcSBkQ1w2dtiuvS6yLRtdUGXE0',
  authDomain: 'hidup-malaysia-ef766.firebaseapp.com',
  projectId: 'hidup-malaysia-ef766',
  appId: '1:114921940079:web:12773839160e72d018199a',
};

/** Cloud save is offered only when the Firebase config above is filled in. */
export const CLOUD_SAVE_ENABLED = FIREBASE_CONFIG.apiKey !== '';