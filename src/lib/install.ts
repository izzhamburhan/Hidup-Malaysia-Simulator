// "Add to Home Screen": the service worker, the browser's install prompt, and the iPhone fallback.
// UI layer only.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function isIOSUserAgent(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua));
}

export interface InstallContext {
  standalone: boolean;
  dismissed: boolean;
  day: number;
  canPrompt: boolean;
  ios: boolean;
}

/** Offer it once the player has lived a day, unless already installed or dismissed. */
export function shouldOfferInstall(c: InstallContext): boolean {
  return !c.standalone && !c.dismissed && c.day >= 1 && (c.canPrompt || c.ios);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export const isIOS = () => typeof navigator !== 'undefined' && isIOSUserAgent(navigator.userAgent);
export const canPromptInstall = () => deferred !== null;

export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Shows the browser's install dialog. Resolves true if the player accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  notify();
  await e.prompt();
  return (await e.userChoice).outcome === 'accepted';
}

/** Called once at start-up. */
export function setupInstall(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (import.meta.env.PROD && !local && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => undefined));
  }
}