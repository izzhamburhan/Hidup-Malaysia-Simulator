// The play screen: everything needed for a normal day is one tap away.

import { useEffect, useRef, useState, type RefObject, type ReactNode } from 'react';
import { ChevronDown, FastForward, Moon, SkipForward } from 'lucide-react';
import { companyById } from '../data/companies';
import { vehicleById, transportModeInfo } from '../data/vehicles';
import { formatDate, formatDuration, formatTime } from '../engine/calendar';
import { formatRM, netWorth, totalDebt } from '../engine/core';
import { currentObjective, primaryStep, quickActions, upcoming } from '../engine/insights';
import { currentHome } from '../engine/living';
import { viewAction, type ActionView } from '../engine/simulationEngine';
import { relationshipStatus } from '../engine/social';
import { useLoadedGame } from '../hooks/useGame';
import { Room } from '../components/room/Room';
import { VehicleSprite } from '../components/VehicleSprite';
import { useT } from '../hooks/useT';
import { StarterQuests } from '../components/StarterQuests';
import { InstallBanner } from '../components/InstallBanner';
import { questStatus } from '../engine/quests';
import { DailyBanner } from '../components/DailyBanner';
import { dailyStatus } from '../engine/dailyChallenge';
import { unreadChats } from '../engine/chat';

import { Card, SectionTitle, StatBar, cx } from '../components/ui';
import type { Tab } from './GameShell';



function greetingFor(minute: number): string {
  const h = minute / 60;
  if (h >= 5 && h < 11) return 'Selamat pagi';
  if (h >= 11 && h < 16) return 'Selamat tengah hari';
  if (h >= 16 && h < 19.5) return 'Selamat petang';
  return 'Selamat malam';
}

export function Dashboard({ go }: { go: (t: Tab) => void }) {
  const { state, request, step, autopilot } = useLoadedGame();
  const [more, setMore] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const barH = useElementHeight(barRef);
  const t = useT();
  const greeting = greetingFor(state.clock.minute);
  const daily = dailyStatus(state);
  const quests = questStatus(state);
  const readyQuest = quests?.find((q) => q.done && !q.claimed);
  const nextQuest = quests?.find((q) => !q.done && !q.claimed);
  // While starter quests are open they are the goal: the most visible spot on screen.
  const objective = readyQuest
    ? { icon: '🎁', title: t('quests.ready'), detail: `${readyQuest.quest.icon} ${readyQuest.quest.title}` }
    : nextQuest
      ? { icon: nextQuest.quest.icon, title: `${t('quests.title')}: ${nextQuest.quest.title}`, detail: nextQuest.quest.hint }
      : currentObjective(state);
  // Tapping the goal: a finished quest is claimed right there (through the engine); an open one opens the list.
  const toQuests = () => {
    setQuestsOpen(true);
    window.setTimeout(() => document.getElementById('starter-quests')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };
  const onGoal = () => {
    if (readyQuest) {
      const v = viewAction(state, 'claim-quest', readyQuest.quest.id);
      if (v) request(v, 'tile');
    } else toQuests();
  };
  const next = primaryStep(state);
  const primary = next?.kind === 'action' ? next.view : null;
  const tiles = quickActions(state).filter((t) => !primary || t.id !== primary.id || t.param !== primary.param);
  const blocked = state.events.pending.length > 0 || !!state.ending;
  const recent = state.log.filter((l) => l.kind !== 'system').slice(0, 4);
  const offers = state.career.applications.filter((a) => a.status === 'offer').length;
  const interviews = state.career.applications.filter((a) => a.status === 'interview').length;
  const invites = state.feed.filter((p) => p.invite && !p.invite.used).length;
  const chats = unreadChats(state);

  return (
    // The bottom padding keeps the last card clear of the sticky action bar.
    <div className="space-y-3" style={{ paddingBottom: barH }}>
      {daily && <DailyBanner status={daily} />}

      {/* Pou-style room: the character in the middle, animating after each action */}
      <Room greeting={`${greeting}, ${state.character.name}`} title={`${objective.icon} ${objective.title}`} detail={objective.detail} onGoal={quests && (readyQuest || nextQuest) ? onGoal : undefined} />

      {/* Big round one-tap buttons, one swipeable row */}
      <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pt-1">
        {tiles.slice(0, 6).map((t) => (
          <RoundButton key={t.id + (t.param ?? '')} view={t} onClick={() => request(t, 'tile')} />
        ))}
      </div>

      {/* New life? A short guided path */}
      <StarterQuests go={go} open={questsOpen} onToggle={() => setQuestsOpen((o) => !o)} />
      <InstallBanner day={state.clock.day} />

      {/* Inbox chips */}
      {(offers > 0 || interviews > 0 || invites > 0 || chats > 0) && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {offers > 0 && <Chip onClick={() => go('life')}>📨 {t('home.offers', { n: offers })}</Chip>}
          {interviews > 0 && <Chip onClick={() => go('life')}>🎤 {t('home.interviews', { n: interviews })}</Chip>}
          {chats > 0 && <Chip onClick={() => go('feed')}>💬 {t('home.chats', { n: chats })}</Chip>}
          {invites > 0 && <Chip onClick={() => go('feed')}>💌 {t('home.invites', { n: invites })}</Chip>}
        </div>
      )}

      {/* Ticker */}
      {recent.length > 0 && (
        <Card className="space-y-1.5 p-3">
          {recent.map((l) => (
            <div key={l.id} className="flex gap-2 text-[13px] leading-snug">
              <span className="w-14 shrink-0 text-[11px] font-semibold text-ink-soft">{l.day === state.clock.day ? formatTime(l.minute) : `Day ${l.day + 1}`}</span>
              <span className={cx(l.kind === 'warning' && 'text-hibiscus', l.kind === 'milestone' && 'font-semibold text-teal')}>{l.text}</span>
            </div>
          ))}
        </Card>
      )}

      {/* More: stats, snapshot, upcoming */}
      <button
        type="button"
        onClick={() => setMore((m) => !m)}
        className="flex w-full items-center justify-center gap-1 rounded-xl py-2 text-sm font-semibold text-teal hover:bg-teal-soft"
        aria-expanded={more}
      >
        {t(more ? 'home.details.hide' : 'home.details.show')} <ChevronDown size={16} className={cx('transition', more && 'rotate-180')} />
      </button>
      {more && <Details go={go} />}

      {/* Sticky action bar: the next step and the time controls sit just above the bottom nav. */}
      <div
        ref={barRef}
        className="fixed inset-x-0 z-20 border-t border-ink/10 bg-paper/95 backdrop-blur"
        style={{ bottom: 'var(--nav-h, 64px)' }}
        role="region"
        aria-label={t('home.bar')}
      >
        <div className="mx-auto max-w-lg space-y-2 px-4 py-2">
          {state.flags.chapterOffered && !state.ending ? (
            <BigButton onClick={() => go('report')} icon="📖" title={t('home.report')} sub={t('home.report.sub')} />
          ) : next?.kind === 'navigate' ? (
            <BigButton onClick={() => go(next.tab)} icon={next.icon} title={next.title} sub={next.sub} />
          ) : primary ? (
            <BigButton onClick={() => request(primary, 'primary')} icon={primary.icon} title={primary.title} sub={meta(primary)} />
          ) : (
            <BigButton disabled={blocked} onClick={step} icon="⏭️" title={t('home.carryon')} sub={t('home.carryon.sub')} />
          )}
          <div className="grid grid-cols-3 gap-2">
            <TimeButton disabled={blocked} onClick={step} icon={<SkipForward size={18} />} label={t('home.next')} sub={t('home.next.sub')} />
            <TimeButton disabled={blocked} onClick={() => autopilot(1)} icon={<Moon size={18} />} label={t('home.endday')} sub={t('home.endday.sub')} />
            <TimeButton disabled={blocked} onClick={() => autopilot(7)} icon={<FastForward size={18} />} label={t('home.week')} sub={t('home.week.sub')} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Height in px of an element, kept current as it resizes (0 until measured). */
function useElementHeight(ref: RefObject<HTMLElement | null>): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setH(Math.ceil(el.getBoundingClientRect().height));
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return h;
}

function meta(v: ActionView): string {
  return [v.minutes ? formatDuration(v.minutes) : '', v.cost ? `-${formatRM(v.cost, v.cost % 1 ? 2 : 0)}` : '', v.energy ? `⚡${v.energy > 0 ? '+' : ''}${v.energy}` : '']
    .filter(Boolean)
    .join(' · ');
}

function BigButton({ onClick, icon, title, sub, disabled }: { onClick: () => void; icon: string; title: string; sub: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="anim-pop flex min-h-[56px] w-full items-center gap-3 rounded-2xl bg-ink px-3 py-2 text-left text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-base font-bold leading-tight">{title}</span>
        {sub && <span className="block truncate text-[11px] text-white/70">{sub}</span>}
      </span>
      <span className="text-xl font-black" aria-hidden>
        ▶
      </span>
    </button>
  );
}

function RoundButton({ view, onClick }: { view: ActionView; onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={!view.available}
      title={view.reason ?? view.description}
      className="group flex w-[78px] shrink-0 flex-col items-center text-center"
    >
      <span
        className={cx(
          'flex h-16 w-16 items-center justify-center rounded-full border-b-4 text-[30px] shadow-md transition group-active:translate-y-0.5 group-active:border-b-2',
          view.available ? 'border-teal bg-white group-hover:ring-2 group-hover:ring-teal/30' : 'border-ink/15 bg-paper-2',
        )}
      >
        <span className={cx(!view.available && 'opacity-50 grayscale')}>{view.icon}</span>
      </span>
      <span className={cx('mt-1.5 line-clamp-2 text-[11px] font-bold leading-tight', !view.available && 'text-ink-soft')}>{view.title}</span>
      <span className={cx('line-clamp-2 text-[11px] font-semibold leading-tight', view.available ? 'text-ink-soft' : 'text-hibiscus')}>
        {view.available ? meta(view) || t('home.instant') : (view.reason ?? t('home.locked'))}
      </span>
    </button>
  );
}

function TimeButton({ onClick, icon, label, sub, disabled }: { onClick: () => void; icon: React.ReactNode; label: string; sub: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-teal/25 bg-teal-soft px-1.5 py-1 text-teal transition active:scale-[0.97] disabled:opacity-50"
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 text-left">
        <span className="block truncate text-sm font-bold leading-tight">{label}</span>
        <span className="block truncate text-[11px] font-medium leading-tight text-teal">{sub}</span>
      </span>
    </button>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 rounded-full border border-gold bg-gold-soft px-3 py-1.5 text-xs font-bold text-[#7a5a00]">
      {children}
    </button>
  );
}

function Details({ go }: { go: (t: Tab) => void }) {
  const { state } = useLoadedGame();
  const t = useT();
  const job = state.career.job;
  const edu = state.education;
  const home = currentHome(state);
  const vehicle = vehicleById(state.transport.vehicleId);
  const next = upcoming(state);
  return (
    <div className="space-y-1">
      <SectionTitle>{t('home.stats')}</SectionTitle>
      <Card className="grid grid-cols-2 gap-x-4 gap-y-3">
        <StatBar label={t('life.fit.health')} value={state.stats.health} tone="leaf" />
        <StatBar label={t('life.fit.fitness')} value={state.stats.fitness} tone="sky" />
        <StatBar label={t('stat.happiness')} value={state.stats.happiness} tone="gold" />
        <StatBar label={t('hud.stress')} value={state.stats.stress} tone="hibiscus" invert />
        <StatBar label={t('life.hustle.rep')} value={state.stats.reputation} />
        <StatBar label={t('hud.energy')} value={state.stats.energy} tone="teal" />
      </Card>
      <SectionTitle>{t('home.snapshot')}</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Snap icon="💰" label={t('home.netWorth')} value={formatRM(netWorth(state))} sub={t('home.debtSub', { amount: formatRM(totalDebt(state)) })} onClick={() => go('money')} />
        <Snap
          icon={job ? '💼' : edu.status === 'studying' ? '🎒' : '🔎'}
          label={job ? job.title : edu.status === 'studying' ? t('life.study.semester', { n: edu.semester, total: edu.totalSemesters }) : t('home.jobStatus')}
          value={job ? (job.schedule === 'parttime' ? t('life.perShift', { amount: formatRM(job.shiftPay) }) : t('money.perMonth', { amount: formatRM(job.monthlySalary) })) : edu.status === 'studying' ? `CGPA ${edu.gpaHistory.length ? edu.cgpa.toFixed(2) : '—'}` : t('home.unemployed')}
          sub={job ? companyById(job.companyId)?.name : t('home.lifeCareer')}
          onClick={() => go('life')}
        />
        <Snap icon={home.icon} label={t('nav.home')} value={home.name} sub={home.rent ? t('money.perMonth', { amount: formatRM(home.rent) }) : home.owned ? t('home.owned') : t('home.rentFree')} onClick={() => go('life')} />
        <Snap
          icon={vehicle ? <VehicleSprite shape={vehicle.shape} color={vehicle.color} size={22} /> : transportModeInfo(state.transport.mode).icon}
          label={t('home.commuteLove')}
          value={vehicle?.name ?? transportModeInfo(state.transport.mode).label}
          sub={relationshipStatus(state)}
          onClick={() => go('life')}
        />
      </div>
      <SectionTitle>{t('home.coming')}</SectionTitle>
      <Card className="divide-y divide-ink/5 py-1">
        {next.length === 0 ? (
          <p className="py-2 text-sm text-ink-soft">{t('home.nothing')}</p>
        ) : (
          next.map((u, i) => (
            <div key={i} className="flex items-center gap-3 py-2 text-sm">
              <span className="text-lg">{u.icon}</span>
              <span className="flex-1">{u.label}</span>
              <span className="text-xs font-semibold text-ink-soft">
                {u.day === state.clock.day ? t('home.today') : u.day === state.clock.day + 1 ? t('home.tomorrow') : formatDate(state, u.day).split(',')[1]}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function Snap({ icon, label, value, sub, onClick }: { icon: ReactNode; label: string; value: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-ink/10 bg-white p-3 text-left transition hover:border-teal/40">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
        <span>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 truncate text-sm font-bold">{value}</div>
      {sub && <div className="truncate text-[11px] text-ink-soft">{sub}</div>}
    </button>
  );
}
