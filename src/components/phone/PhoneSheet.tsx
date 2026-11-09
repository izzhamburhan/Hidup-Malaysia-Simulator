// The in-game phone: a full-screen overlay at phone widths, a phone frame from `sm` up. A home screen with five
// apps (Sembang, Kawan, Hadiah, Ranking, Profil), a back button in every app and a home bar. It only displays state
// and calls the friends client; the game state is changed solely through the engine (opening a gift).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Gift, MessageCircle, Trophy, UserRound, Users } from 'lucide-react';
import { unreadChats as npcUnreadChats } from '../../engine/chat';
import { useLoadedGame } from '../../hooks/useGame';
import { useSocial } from '../../hooks/useSocial';
import { useT } from '../../hooks/useT';
import type { StringKey } from '../../i18n';
import { cx } from '../ui';
import { ChatApp } from './ChatApp';
import { ChatThread } from './ChatThread';
import { FriendsApp } from './FriendsApp';
import { GiftsApp } from './GiftsApp';
import { MeApp } from './MeApp';
import { ProfileCard } from './ProfileCard';
import { RankApp } from './RankApp';
import { StatusBar, clock, useNow, type PhoneNav, type Route } from './phoneUi';

interface AppIcon {
  route: Route;
  label: StringKey;
  icon: typeof Gift;
  tint: string;
}

const APPS: AppIcon[] = [
  { route: { k: 'chat' }, label: 'phone.app.chat', icon: MessageCircle, tint: 'from-[#46b573] to-[#2f7d4f] text-white' },
  { route: { k: 'friends' }, label: 'phone.app.friends', icon: Users, tint: 'from-[#5b9ce0] to-[#2563a8] text-white' },
  { route: { k: 'gifts' }, label: 'phone.app.gifts', icon: Gift, tint: 'from-[#f2824a] to-[#c2410c] text-white' },
  { route: { k: 'rank' }, label: 'phone.app.rank', icon: Trophy, tint: 'from-[#f5d062] to-[#d9a21b] text-ink' },
  { route: { k: 'me' }, label: 'phone.app.me', icon: UserRound, tint: 'from-[#fbf7ef] to-[#d9cdb5] text-teal' },
];

export function PhoneSheet({ open, onClose, start }: { open: boolean; onClose: () => void; start?: Route }) {
  if (!open) return null;
  return <PhoneInner onClose={onClose} start={start} />;
}

function PhoneInner({ onClose, start }: { onClose: () => void; start?: Route }) {
  const t = useT();
  const social = useSocial();
  const [stack, setStack] = useState<Route[]>(() => (start && start.k !== 'home' ? [{ k: 'home' }, start] : [{ k: 'home' }]));
  const route = stack[stack.length - 1];
  const rootRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const nav: PhoneNav = useMemo(
    () => ({
      push: (r) => setStack((s) => [...s, r]),
      pop: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      home: () => setStack([{ k: 'home' }]),
      reset: (r) => setStack([{ k: 'home' }, r]),
    }),
    [],
  );

  // Opening the phone looks at friends again and publishes a fresh snapshot (once per game day).
  const { refresh, pushSnapshot } = social;
  useEffect(() => {
    void refresh(true);
    void pushSnapshot();
  }, [refresh, pushSnapshot]);
  useEffect(() => {
    if (route.k === 'chat' || route.k === 'friends' || route.k === 'rank' || route.k === 'gifts') void refresh();
  }, [route.k, refresh]);

  // Focus moves in, Escape puts the phone away (unless a sheet from inside the phone is open), Tab stays inside.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    rootRef.current?.focus({ preventScroll: true });
    const sheetOpen = () => document.querySelectorAll('[role="dialog"]').length > 1;
    const onKey = (e: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root || sheetOpen()) return;
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (items.length === 0) return;
      const active = document.activeElement;
      if (e.shiftKey && (active === items[0] || active === root || !root.contains(active))) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && (active === items[items.length - 1] || !root.contains(active))) {
        e.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  const atHome = route.k === 'home';

  return (
    <div ref={rootRef} role="dialog" aria-modal="true" aria-label={t('phone.title')} tabIndex={-1} onClick={onClose} className="anim-phone fixed inset-0 z-50 flex items-stretch justify-center bg-ink/60 outline-none sm:items-center sm:p-6">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full flex-col overflow-hidden bg-paper sm:h-[min(780px,100%)] sm:w-[380px] sm:rounded-[46px] sm:border-[10px] sm:border-ink sm:shadow-2xl"
      >
        <div aria-hidden className="absolute left-1/2 top-0 z-20 hidden h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-ink sm:block" />
        {atHome ? (
          <HomeScreen nav={nav} onClose={onClose} />
        ) : (
          <>
            <div className="shrink-0 bg-paper">
              <StatusBar />
            </div>
            <AppView route={route} nav={nav} />
            <HomeBar label={t('phone.home')} onClick={nav.home} />
          </>
        )}
      </div>
    </div>
  );
}

function AppView({ route, nav }: { route: Route; nav: PhoneNav }) {
  switch (route.k) {
    case 'chat':
      return <ChatApp nav={nav} />;
    case 'thread':
      return <ChatThread uid={route.uid} nav={nav} />;
    case 'friends':
      return <FriendsApp nav={nav} />;
    case 'card':
      return <ProfileCard uid={route.uid} nav={nav} />;
    case 'gifts':
      return <GiftsApp nav={nav} />;
    case 'rank':
      return <RankApp nav={nav} />;
    case 'me':
      return <MeApp nav={nav} />;
    default:
      return null;
  }
}

/** The bar at the bottom: home from an app, put the phone away from the home screen. */
function HomeBar({ label, onClick, light }: { label: string; onClick: () => void; light?: boolean }) {
  return (
    <div className={cx('relative shrink-0 pb-[max(env(safe-area-inset-bottom),0.25rem)]', light ? '' : 'border-t border-ink/5 bg-paper')}>
      <button type="button" onClick={onClick} aria-label={label} className="mx-auto flex h-11 w-44 items-center justify-center">
        <span className={cx('h-1.5 w-32 rounded-full', light ? 'bg-white/80' : 'bg-ink/70')} />
      </button>
    </div>
  );
}

function HomeScreen({ nav, onClose }: { nav: PhoneNav; onClose: () => void }) {
  const t = useT();
  const { state, settings } = useLoadedGame();
  const social = useSocial();
  const now = useNow();
  const npcUnread = npcUnreadChats(state);
  const counts: Record<string, number> = { chat: npcUnread + social.unreadIds.length, friends: social.requests.length, gifts: social.gifts.length };
  const date = now.toLocaleDateString(settings.language === 'ms' ? 'ms-MY' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-teal via-[#115052] to-[#0a2526] text-white">
      <div aria-hidden className="songket pointer-events-none absolute inset-0 opacity-[0.07]" />
      <StatusBar light />
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="px-6 pt-5 text-center">
          <p className="text-sm font-semibold text-teal-soft">{t('phone.hello', { name: state.character.name })}</p>
          <p className="font-display mt-1 text-6xl font-black leading-none tabular-nums">{clock(now)}</p>
          <p className="mt-2 text-xs font-semibold text-teal-soft">{date}</p>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-x-3 gap-y-6 px-6">
          {APPS.map((app) => {
            const n = counts[app.route.k] ?? 0;
            const name = t(app.label);
            const Icon = app.icon;
            return (
              <button
                key={app.route.k}
                type="button"
                onClick={() => nav.push(app.route)}
                aria-label={n > 0 ? t('phone.app.badge', { app: name, n }) : name}
                className="flex min-h-[44px] flex-col items-center gap-1.5 text-[12px] font-semibold text-white active:scale-95"
              >
                <span className={cx('relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br shadow-lg ring-1 ring-white/25', app.tint)}>
                  <Icon size={30} aria-hidden />
                  {n > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-hibiscus px-1 text-[11px] font-bold text-white ring-2 ring-[#115052]" aria-hidden>
                      {n > 9 ? '9+' : n}
                    </span>
                  )}
                </span>
                {name}
              </button>
            );
          })}
        </div>
        <div className="mt-6 px-6 pb-3 text-center">
          <button type="button" onClick={onClose} className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white/15 px-5 text-sm font-semibold text-white active:bg-white/25">
            {t('phone.close')}
          </button>
        </div>
      </div>
      <HomeBar light label={t('phone.close')} onClick={onClose} />
    </div>
  );
}
