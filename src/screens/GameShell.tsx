import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BookOpen, Home, Menu, MessageCircle, Settings as SettingsIcon, Sparkles, Trophy, Wallet, Zap, LogOut, Compass, HelpCircle, MessageSquareHeart } from 'lucide-react';
import { formatDate, formatTime, ageOf } from '../engine/calendar';
import { formatRM } from '../engine/core';
import { useLoadedGame } from '../hooks/useGame';
import { useGameSounds } from '../hooks/useGameSounds';
import { useT } from '../hooks/useT';
import type { StringKey } from '../i18n';
import { Celebrate } from '../components/celebrate/Celebrate';
import { PixelAvatar } from '../components/PixelAvatar';
import { StateFlag } from '../components/StateFlag';
import { moodOf } from '../engine/appearance';
import { ConfirmModal, DayReportModal, EventModal, FeedbackToast } from '../components/Overlays';
import { Modal, cx } from '../components/ui';
import { daylight } from '../components/room/activity';
import { ActionGame } from '../components/minigames/ActionGame';
import { Tutorial } from '../components/Tutorial';
import { FeedbackSheet, feedbackAvailable } from '../components/FeedbackSheet';
import { track } from '../lib/analytics';
import { Dashboard } from './Dashboard';
import { ActScreen } from './ActScreen';
import { MoneyScreen } from './MoneyScreen';
import { LifeScreen } from './LifeScreen';
import { FeedScreen } from './FeedScreen';
import { GoalsScreen } from './GoalsScreen';
import { ReportScreen } from './ReportScreen';
import { SettingsScreen } from './SettingsScreen';

export type Tab = 'home' | 'act' | 'money' | 'life' | 'feed' | 'goals' | 'report' | 'settings';

const NAV: { id: Tab; label: StringKey; icon: typeof Home }[] = [
  { id: 'home', label: 'nav.home', icon: Home },
  { id: 'act', label: 'nav.act', icon: Zap },
  { id: 'money', label: 'nav.money', icon: Wallet },
  { id: 'life', label: 'nav.life', icon: Compass },
  { id: 'feed', label: 'nav.feed', icon: MessageCircle },
];

/** "3 Feb 2027": the date without the weekday, so the header fits one line at 360px. */
const shortDate = (state: Parameters<typeof formatDate>[0]) => formatDate(state).replace(/^[A-Za-z]+,\s*/, '');

export function GameShell({ onExit }: { onExit: () => void }) {
  const { state, settings, setSettings } = useLoadedGame();
  const navRef = useRef<HTMLElement>(null);
  const [navH, setNavH] = useState(64);
  // The bottom nav's real height (icons, labels and the safe-area inset), so screens can park
  // a sticky bar just above it with `bottom: var(--nav-h)`.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const read = () => setNavH(Math.ceil(el.getBoundingClientRect().height));
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [tab, setTab] = useState<Tab>('home');
  const [menu, setMenu] = useState(false);
  const [tutorial, setTutorial] = useState(!settings.tutorialSeen);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  useGameSounds();
  const t = useT();
  const go = (t: Tab) => {
    if (t !== tab) track('tab_view', { tab: t });
    setTab(t);
    setMenu(false);
    window.scrollTo({ top: 0 });
  };
  const unseenInvites = state.feed.filter((p) => p.invite && !p.invite.used).length;

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24" style={{ '--nav-h': `${navH}px` } as CSSProperties}>
      <header className={cx('header-tint sticky top-0 z-30 border-b border-ink/10 px-4 pb-2 pt-3 backdrop-blur', `header-tint-${daylight(state.clock.minute)}`)} data-daylight={daylight(state.clock.minute)}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => go('home')} className="flex min-h-[44px] min-w-[44px] shrink-0 items-end justify-center rounded-xl bg-paper-2 px-0.5 pt-0.5" aria-label="Home">
            <PixelAvatar appearance={state.character.appearance} mood={moodOf(state)} size={30} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="whitespace-nowrap text-[11px] font-semibold text-ink-soft">
              <StateFlag state={state.character.homeState} width={18} className="mr-1 align-[-2px]" />
              Day {state.clock.day + 1} · {shortDate(state)}
            </div>
            <div className="font-display whitespace-nowrap text-2xl font-black leading-tight tabular-nums">
              {formatTime(state.clock.minute)}
              {state.mode === 'chaotic' && (
                <span className="ml-1 text-base text-hibiscus" role="img" aria-label="Chaotic mode">
                  🌀
                </span>
              )}
            </div>
          </div>
          <WalletFigure cash={state.finance.cash} label={t('hud.wallet')} animate={!settings.reducedMotion} />
          <button type="button" onClick={() => setMenu(true)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink/10 bg-white" aria-label="Open menu">
            <Menu size={20} />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          <MiniMeter icon="⚡" name={t('hud.energy')} value={state.stats.energy} />
          <MiniMeter icon="😣" name={t('hud.stress')} value={state.stats.stress} invert />
          <MiniMeter icon="🙂" name={t('hud.mood')} value={state.stats.happiness} />
          <MiniMeter icon="🍽️" name={t('hud.full')} value={state.stats.satiety} />
        </div>
      </header>

      <main className="px-4 pt-4">
        {tab === 'home' && <Dashboard go={go} />}
        {tab === 'act' && <ActScreen />}
        {tab === 'money' && <MoneyScreen />}
        {tab === 'life' && <LifeScreen />}
        {tab === 'feed' && <FeedScreen />}
        {tab === 'goals' && <GoalsScreen />}
        {tab === 'report' && <ReportScreen />}
        {tab === 'settings' && <SettingsScreen onExit={onExit} />}
      </main>

      <nav ref={navRef} className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 backdrop-blur safe-bottom" aria-label="Main">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={cx('relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', tab === id ? 'text-teal' : 'text-ink-soft')}
            >
              <Icon size={22} strokeWidth={tab === id ? 2.5 : 2} />
              {t(label)}
              {id === 'feed' && unseenInvites > 0 && <span className="absolute right-[30%] top-1.5 h-2 w-2 rounded-full bg-hibiscus" />}
              {tab === id && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-teal" />}
            </button>
          ))}
        </div>
      </nav>

      <Modal open={menu} onClose={() => setMenu(false)} title={t('menu.title')}>
        <p className="mb-3 text-sm font-semibold text-ink-soft">
          {state.character.name} · Age {ageOf(state)} · {formatDate(state)}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MenuItem icon={<Trophy size={20} />} label={t('menu.goals')} onClick={() => go('goals')} />
          <MenuItem icon={<BookOpen size={20} />} label={t('menu.report')} onClick={() => go('report')} highlight={!!state.flags.chapterOffered && !state.ending} />
          <MenuItem icon={<SettingsIcon size={20} />} label={t('menu.settings')} onClick={() => go('settings')} />
          <MenuItem
            icon={<HelpCircle size={20} />}
            label={t('menu.howto')}
            onClick={() => {
              setMenu(false);
              setTutorial(true);
            }}
          />
          {feedbackAvailable() && (
            <MenuItem
              icon={<MessageSquareHeart size={20} />}
              label={t('menu.feedback')}
              onClick={() => {
                setMenu(false);
                setFeedbackOpen(true);
              }}
            />
          )}
          <MenuItem icon={<LogOut size={20} />} label={t('menu.main')} onClick={onExit} />
        </div>
        <p className="mt-4 flex items-center gap-1 text-xs text-ink-soft">
          <Sparkles size={12} /> {t('menu.autosave')}
        </p>
      </Modal>

      <Tutorial
        open={tutorial && !state.events.pending.length}
        appearance={state.character.appearance}
        onClose={() => {
          setTutorial(false);
          if (!settings.tutorialSeen) setSettings({ tutorialSeen: true });
        }}
      />
      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} optedOut={settings.analyticsOptOut} />
      <Celebrate />
      <EventModal />
      <ConfirmModal />
      <ActionGame />
      <DayReportModal />
      <FeedbackToast />
    </div>
  );
}

/** Wallet figure in the pixel face. Flashes green or red briefly when cash changes (UI-only, read from state). */
function WalletFigure({ cash, label, animate }: { cash: number; label: string; animate: boolean }) {
  const prev = useRef(cash);
  const [flash, setFlash] = useState<{ dir: 'up' | 'down'; key: number } | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = cash;
    if (before === cash || !animate) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    setFlash((f) => ({ dir: cash > before ? 'up' : 'down', key: (f?.key ?? 0) + 1 }));
    const timer = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(timer);
  }, [cash, animate]);
  const low = cash < 100;
  return (
    <div className="shrink-0 text-right">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{label}</div>
      <div
        key={flash?.key ?? 0}
        className={cx('font-display -mr-1 whitespace-nowrap rounded-md pl-1 pr-1 text-base font-black leading-tight tabular-nums', low ? 'text-hibiscus' : 'text-teal', flash && `wallet-flash-${flash.dir}`)}
      >
        {low && <span aria-label="Low cash">! </span>}
        {formatRM(cash, cash < 10000 ? 2 : 0)}
      </div>
    </div>
  );
}

/** A header meter. In danger it shows a "!" beside the number, so colour is never the only signal. */
function MiniMeter({ icon, name, value, invert = false }: { icon: string; name: string; value: number; invert?: boolean }) {
  const v = Math.round(value);
  const bad = invert ? v >= 75 : v <= 20;
  return (
    <div>
      <div className="flex justify-between text-[11px] font-semibold text-ink-soft">
        <span className="truncate">
          <span aria-hidden>{icon} </span>
          {name}
        </span>
        <span className={cx('tabular-nums', bad && 'font-bold text-[#9a3412]')}>
          {bad && <span aria-hidden>! </span>}
          {v}
        </span>
      </div>
      <div
        role="meter"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-valuetext={`${v} out of 100${bad ? ', in danger' : ''}`}
        className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-paper-2"
      >
        <div className={cx('h-full rounded-full transition-all duration-500', bad ? 'bg-hibiscus' : invert ? 'bg-gold' : 'bg-teal-2')} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, highlight }: { icon: React.ReactNode; label: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cx('flex flex-col items-start gap-2 rounded-2xl border bg-white p-3 text-left text-sm font-semibold', highlight ? 'border-gold ring-2 ring-gold/40' : 'border-ink/10')}>
      <span className="text-teal">{icon}</span>
      {label}
    </button>
  );
}
