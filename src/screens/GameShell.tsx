import { useState } from 'react';
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

export function GameShell({ onExit }: { onExit: () => void }) {
  const { state, settings, setSettings } = useLoadedGame();
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
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => go('home')} className="shrink-0 rounded-xl bg-paper-2 px-0.5 pt-0.5" aria-label="Home">
            <PixelAvatar appearance={state.character.appearance} mood={moodOf(state)} size={30} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-semibold text-ink-soft">
              <StateFlag state={state.character.homeState} width={18} className="mr-1 align-[-2px]" />
              Day {state.clock.day + 1} · {formatDate(state)} · Age {ageOf(state)}
              {state.mode === 'chaotic' && <span className="ml-1 text-hibiscus">· 🌀</span>}
            </div>
            <div className="font-display whitespace-nowrap text-2xl font-black leading-tight tabular-nums">{formatTime(state.clock.minute)}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{t('hud.wallet')}</div>
            <div className={cx('font-display whitespace-nowrap text-base font-black tabular-nums', state.finance.cash < 100 ? 'text-hibiscus' : 'text-teal')}>{formatRM(state.finance.cash, 2)}</div>
          </div>
          <button type="button" onClick={() => setMenu(true)} className="rounded-xl border border-ink/10 bg-white p-2" aria-label="Open menu">
            <Menu size={20} />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          <MiniMeter label={`⚡ ${t('hud.energy')}`} value={state.stats.energy} />
          <MiniMeter label={`😣 ${t('hud.stress')}`} value={state.stats.stress} invert />
          <MiniMeter label={`🙂 ${t('hud.mood')}`} value={state.stats.happiness} />
          <MiniMeter label={`🍽️ ${t('hud.full')}`} value={state.stats.satiety} />
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

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 backdrop-blur safe-bottom" aria-label="Main">
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

function MiniMeter({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const v = Math.round(value);
  const bad = invert ? v >= 75 : v <= 20;
  return (
    <div>
      <div className="flex justify-between text-[10px] font-semibold text-ink-soft">
        <span className="truncate">{label}</span>
        <span className={cx('tabular-nums', bad && 'text-hibiscus')}>{v}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-paper-2">
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
