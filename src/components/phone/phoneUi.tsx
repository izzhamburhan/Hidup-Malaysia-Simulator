// Shared pieces of the phone: status bar, app screen frame, friend avatar, notices and the cards shown when
// Friends is not available (guest, no cloud, still loading, off). Display only.

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, Wifi } from 'lucide-react';
import { useCloud } from '../../hooks/useCloud';
import { useSocial } from '../../hooks/useSocial';
import { useT } from '../../hooks/useT';
import type { Profile } from '../../lib/social';
import { GoogleButton } from '../GoogleButton';
import { PixelAvatar } from '../PixelAvatar';
import { Button, Card, cx } from '../ui';

export type Route =
  | { k: 'home' }
  | { k: 'chat' }
  | { k: 'thread'; uid: string }
  | { k: 'friends' }
  | { k: 'card'; uid: string }
  | { k: 'gifts' }
  | { k: 'rank' }
  | { k: 'me' };

export interface PhoneNav {
  push: (r: Route) => void;
  pop: () => void;
  home: () => void;
  /** Start again from the home screen with one app open (after a friend is removed or blocked). */
  reset: (r: Route) => void;
}

/** The device clock, refreshed every few seconds, for the status bar. */
export function useNow(everyMs = 20000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}

export const clock = (d: Date): string => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function Battery() {
  return (
    <svg width="22" height="11" viewBox="0 0 22 11" fill="none" aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="18" height="10" rx="3" stroke="currentColor" opacity="0.5" />
      <rect x="2" y="2" width="13" height="7" rx="1.8" fill="currentColor" />
      <rect x="19.5" y="3.5" width="2" height="4" rx="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function Signal() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="0" y="7" width="3" height="4" rx="0.8" />
      <rect x="4.3" y="5" width="3" height="6" rx="0.8" />
      <rect x="8.6" y="2.5" width="3" height="8.5" rx="0.8" />
      <rect x="12.9" y="0" width="3" height="11" rx="0.8" />
    </svg>
  );
}

/** Device time, signal, wifi and battery. Decorative, so hidden from screen readers. */
export function StatusBar({ light }: { light?: boolean }) {
  const now = useNow();
  return (
    <div
      className={cx('flex shrink-0 items-center justify-between px-7 pb-1 pt-[max(env(safe-area-inset-top),0.5rem)] text-[12px] font-bold tabular-nums sm:pt-3.5', light ? 'text-white' : 'text-ink')}
      aria-hidden="true"
    >
      <span>{clock(now)}</span>
      <span className="flex items-center gap-1.5">
        <Signal />
        <Wifi size={13} strokeWidth={2.5} />
        <Battery />
      </span>
    </div>
  );
}

/** One app screen: a bar with back, a title and a right slot, then a scrolling body. */
export function AppScreen({ title, onBack, right, children, footer }: { title: ReactNode; onBack?: () => void; right?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const t = useT();
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-paper">
      <div className="flex shrink-0 items-center gap-1 border-b border-ink/5 px-1.5 pb-1">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label={t('phone.back')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-teal active:bg-paper-2">
            <ChevronLeft size={26} aria-hidden />
          </button>
        ) : (
          <span className="h-11 w-11 shrink-0" />
        )}
        <h1 className="font-display min-w-0 flex-1 truncate text-center text-base font-black text-ink">{title}</h1>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center">{right}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">{children}</div>
      {footer}
    </div>
  );
}

/** A friend's pixel character in a small frame (their published look, checked before drawing). */
export function FriendAvatar({ profile, size = 44, className }: { profile: Profile; size?: number; className?: string }) {
  return (
    <span className={cx('inline-flex shrink-0 items-end justify-center overflow-hidden rounded-xl bg-paper-2', className)} style={{ width: size, height: size }}>
      <PixelAvatar appearance={profile.snapshot.appearance} gender={profile.snapshot.gender} size={size * 0.9} title={profile.displayName} />
    </span>
  );
}

/** A round initial, for a player whose look we do not have (a request or a blocked player). */
export function Initial({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-xl bg-teal-soft font-bold text-teal" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {[...(name || '?')][0]?.toUpperCase()}
    </span>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'ok'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx('rounded-xl px-3 py-2 text-xs font-semibold', tone === 'error' ? 'bg-hibiscus-soft text-[#9a3412]' : tone === 'ok' ? 'bg-leaf-soft text-[#256b43]' : 'bg-paper-2 text-ink-soft')}
    >
      {children}
    </div>
  );
}

export function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h2 className="font-display mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">{title}</h2>
      {children}
    </section>
  );
}

/** Shown in place of an app when the player is a guest or the cloud is not set up. */
export function SignInCard() {
  const cloud = useCloud();
  const t = useT();
  if (!cloud.enabled) {
    return (
      <Card className="text-center">
        <div className="text-3xl" aria-hidden>
          🔌
        </div>
        <p className="mt-2 text-sm font-semibold">{t('phone.signin.na')}</p>
      </Card>
    );
  }
  return (
    <Card className="text-center">
      <div className="text-3xl" aria-hidden>
        👋
      </div>
      <h2 className="font-display mt-1 text-lg font-black leading-tight">{t('phone.signin.title')}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t('phone.signin.body')}</p>
      <GoogleButton className="mt-3" label={cloud.status === 'signing-in' ? t('cloud.signingIn') : t('cloud.signin')} disabled={cloud.status === 'signing-in'} onClick={() => void cloud.signIn()} />
    </Card>
  );
}

/**
 * Wraps an app that needs real friends. Explains itself when the player is a guest, the cloud is missing, Friends is
 * still loading, could not load, or is off (unless `needOn` is false, as for Profil).
 */
export function FriendsGate({ nav, needOn = true, children }: { nav: PhoneNav; needOn?: boolean; children: ReactNode }) {
  const s = useSocial();
  const t = useT();
  if (!s.cloudEnabled || !s.signedIn) return <SignInCard />;
  if (s.status === 'loading') {
    return (
      <p className="py-10 text-center text-sm font-semibold text-ink-soft" role="status">
        {t('phone.loading')}
      </p>
    );
  }
  if (s.status === 'error') {
    return (
      <Card className="text-center">
        <p className="text-sm font-semibold">{t('phone.error.load')}</p>
        {s.error && <p className="mt-1 break-words text-xs text-ink-soft">{s.error}</p>}
        <Button className="mt-3" onClick={s.retry}>
          {t('phone.retry')}
        </Button>
      </Card>
    );
  }
  if (needOn && !s.on) {
    return (
      <Card className="text-center">
        <div className="text-3xl" aria-hidden>
          📴
        </div>
        <h2 className="font-display mt-1 text-lg font-black">{t('phone.off.title')}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t('phone.off.body')}</p>
        <Button className="mt-3" onClick={() => nav.push({ k: 'me' })}>
          {t('phone.off.go')}
        </Button>
      </Card>
    );
  }
  return <>{children}</>;
}

/** Copy text to the clipboard; false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
