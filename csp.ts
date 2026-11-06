// Content Security Policy for the production build. GitHub Pages cannot send headers, so vite.config.ts
// injects this as a <meta http-equiv> tag at build time only (dev keeps no CSP so Vite's HMR works).
// Every host below is one the game really talks to; add a host here before adding a new integration.
// (frame-ancestors and report-uri are ignored in a meta tag, so they are not listed.)

const directives: Record<string, string[]> = {
  'default-src': ["'self'"],
  // Our own bundle, the optional analytics scripts, and Google's script the Firebase sign-in popup loads.
  'script-src': ["'self'", 'https://cloud.umami.is', 'https://static.cloudflareinsights.com', 'https://apis.google.com'],
  // React sets inline style attributes, so style-src needs 'unsafe-inline'; scripts never do.
  'style-src': ["'self'", "'unsafe-inline'"],
  // data: for the CSS pattern backgrounds, blob: for the share card, Google for the profile photo.
  'img-src': ["'self'", 'data:', 'blob:', 'https://*.googleusercontent.com'],
  'font-src': ["'self'", 'data:'],
  'media-src': ["'self'", 'blob:', 'data:'],
  // Firestore and Firebase Auth (googleapis.com), Umami and Cloudflare analytics.
  'connect-src': [
    "'self'",
    'https://*.googleapis.com',
    'https://cloud.umami.is',
    'https://api-gateway.umami.dev',
    'https://cloudflareinsights.com',
  ],
  // The Google sign-in popup helper frame.
  'frame-src': ['https://*.firebaseapp.com', 'https://accounts.google.com', 'https://apis.google.com'],
  'worker-src': ["'self'"],
  'manifest-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

export const CONTENT_SECURITY_POLICY = Object.entries(directives)
  .map(([name, sources]) => `${name} ${sources.join(' ')}`)
  .join('; ');
