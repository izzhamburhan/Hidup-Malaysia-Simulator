import { useState } from 'react';
import { BookOpen, Home, Menu, MessageCircle, Settings as SettingsIcon, Sparkles, Trophy, Wallet, Zap, LogOut, Compass } from 'lucide-react';
import { formatDate, formatTime, ageOf } from '../engine/calendar';
import { formatRM } from '../engine/core';
import { useLoadedGame } from '../hooks/useGame';
import { ConfirmModal, DayReportModal, EventModal, FeedbackToast } from '../components/Overlays';
import { Modal, cx } from '../components/ui';
import { Dashboard } from './Dashboard';
import { ActScreen } from './ActScreen';
import { MoneyScreen } from './MoneyScreen';
import { LifeScreen } from './LifeScreen';
import { FeedScreen } from './FeedScreen';
import { GoalsScreen } from './GoalsScreen';
import { ReportScreen } from './ReportScreen';
import { SettingsScreen } from './SettingsScreen';

export type Tab = 'home' | 'act' | 'money' | 'life' | 'feed' | 'goals' | 'report' | 'settings';

const NAV: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'act', label: 'Act', icon: Zap },
  { id: 'money', label: 'Money', icon: Wallet },
  { id: 'life', label: 'Life', icon: Compass },
  { id: 'feed', label: 'Feed', icon: MessageCircle },
];

export function GameShell({ onExit }: { onExit: () => void }) {
  const { state } = useLoadedGame();
  const [tab, setTab] = useState<Tab>('home');
  const [menu, setMenu] = useState(false);
  const go = (t: Tab) => {
    setTab(t);
    setMenu(false);
    window.scrollTo({ top: 0 });
  };
  const unseenInvites = state.feed.filter((p) => p.invite && !p.invite.used).length;

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-ink-soft">
              {formatDate(state)} · Age {ageOf(state)}
              {state.mode === 'chaotic' && <span className="ml-1 text-hibiscus">· 🌀 Chaotic</span>}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-black tabular-nums">{formatTime(state.clock.minute)}</span>
              <span className="text-xs text-ink-soft">Day {state.clock.day + 1}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Wallet</div>
            <div className={cx('font-display text-lg font-black tabular-nums', state.finance.cash < 100 ? 'text-hibiscus' : 'text-teal')}>{formatRM(state.finance.cash, 2)}</div>
          </div>
          <button type="button" onClick={() => setMenu(true)} className="rounded-xl border border-ink/10 bg-white p-2" aria-label="Open menu">
            <Menu size={20} />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          <MiniMeter label="⚡ Energy" value={state.stats.energy} />
          <MiniMeter label="😣 Stress" value={state.stats.stress} invert />
          <MiniMeter label="🙂 Mood" value={state.stats.happiness} />
          <MiniMeter label="🍽️ Full" value={state.stats.satiety} />
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
              {label}
              {id === 'feed' && unseenInvites > 0 && <span className="absolute right-[30%] top-1.5 h-2 w-2 rounded-full bg-hibiscus" />}
              {tab === id && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-teal" />}
            </button>
          ))}
        </div>
      </nav>

      <Modal open={menu} onClose={() => setMenu(false)} title="Menu">
        <div className="grid grid-cols-2 gap-2">
          <MenuItem icon={<Trophy size={20} />} label="Goals & achievements" onClick={() => go('goals')} />
          <MenuItem icon={<BookOpen size={20} />} label="Life report" onClick={() => go('report')} highlight={!!state.flags.chapterOffered && !state.ending} />
          <MenuItem icon={<SettingsIcon size={20} />} label="Settings & saves" onClick={() => go('settings')} />
          <MenuItem icon={<LogOut size={20} />} label="Main menu" onClick={onExit} />
        </div>
        <p className="mt-4 flex items-center gap-1 text-xs text-ink-soft">
          <Sparkles size={12} /> Autosaves after every action.
        </p>
      </Modal>

      <EventModal />
      <ConfirmModal />
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
