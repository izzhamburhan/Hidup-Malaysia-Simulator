// The play screen: everything needed for a normal day is one tap away.

import { useState } from 'react';
import { ChevronDown, FastForward, Moon, SkipForward } from 'lucide-react';
import { companyById } from '../data/companies';
import { vehicleById, transportModeInfo } from '../data/vehicles';
import { formatDate, formatDuration, formatTime } from '../engine/calendar';
import { formatRM, netWorth, totalDebt } from '../engine/core';
import { currentObjective, primaryAction, quickActions, upcoming } from '../engine/insights';
import { currentHome } from '../engine/living';
import type { ActionView } from '../engine/simulationEngine';
import { relationshipStatus } from '../engine/social';
import { useLoadedGame } from '../hooks/useGame';
import { PixelAvatar } from '../components/PixelAvatar';
import { moodOf } from '../engine/appearance';
import type { Mood } from '../engine/types';

import { Card, SectionTitle, StatBar, cx } from '../components/ui';
import type { Tab } from './GameShell';

const MOOD_BUBBLE: Record<Mood, string> = { happy: '😄', neutral: '', tired: '💤', stressed: '😰', unwell: '🤒' };

type Scene = { greeting: string; bg: string; dark: boolean; sky: string };

function sceneFor(minute: number): Scene {
  const h = minute / 60;
  if (h >= 5 && h < 11) return { greeting: 'Selamat pagi', bg: 'from-[#f6c768] to-[#e98b3a]', dark: false, sky: '☀️' };
  if (h >= 11 && h < 16) return { greeting: 'Selamat tengah hari', bg: 'from-teal-2 to-teal', dark: true, sky: '🌤️' };
  if (h >= 16 && h < 19.5) return { greeting: 'Selamat petang', bg: 'from-[#d9653b] to-[#8a2f4f]', dark: true, sky: '🌇' };
  return { greeting: 'Selamat malam', bg: 'from-[#1e2a4a] to-[#0b1220]', dark: true, sky: '🌙' };
}

export function Dashboard({ go }: { go: (t: Tab) => void }) {
  const { state, request, step, autopilot } = useLoadedGame();
  const [more, setMore] = useState(false);
  const scene = sceneFor(state.clock.minute);
  const dark = scene.dark;
  const objective = currentObjective(state);
  const mood = moodOf(state);
  const primary = primaryAction(state);
  const tiles = quickActions(state).filter((t) => !primary || t.id !== primary.id || t.param !== primary.param);
  const blocked = state.events.pending.length > 0 || !!state.ending;
  const recent = state.log.filter((l) => l.kind !== 'system').slice(0, 4);
  const offers = state.career.applications.filter((a) => a.status === 'offer').length;
  const interviews = state.career.applications.filter((a) => a.status === 'interview').length;
  const invites = state.feed.filter((p) => p.invite && !p.invite.used).length;

  return (
    <div className="space-y-3">
      {/* Scene + primary action */}
      <section className={cx('relative overflow-hidden rounded-3xl bg-gradient-to-br p-4 shadow-md', scene.bg, dark ? 'text-white' : 'text-ink')}>
        <div className="songket absolute inset-0 opacity-20" aria-hidden />
        <div className="relative">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className={cx('text-xs font-bold uppercase tracking-[0.18em]', dark ? 'text-gold' : 'text-ink/70')}>
                {scene.greeting}, {state.character.name}
              </div>
              <div className="font-display mt-1 text-xl font-black leading-tight">
                {objective.icon} {objective.title}
              </div>
              <div className={cx('text-sm', dark ? 'text-white/80' : 'text-ink/75')}>{objective.detail}</div>
            </div>
            <div className="relative -mb-2 -mr-1 flex shrink-0 flex-col items-center">
              <span className="text-xl leading-none" aria-hidden>
                {scene.sky}
              </span>
              {MOOD_BUBBLE[mood] && (
                <span className="absolute -left-3 top-5 rounded-full bg-white px-1.5 py-0.5 text-sm shadow" aria-hidden>
                  {MOOD_BUBBLE[mood]}
                </span>
              )}
              <PixelAvatar appearance={state.character.appearance} mood={mood} size={76} bob title={`${state.character.name} feels ${mood}`} />
            </div>
          </div>

          {state.flags.chapterOffered && !state.ending ? (
            <BigButton dark={dark} onClick={() => go('report')} icon="📖" title="See my life report" sub="Your chapter is complete" />
          ) : primary ? (
            <BigButton dark={dark} onClick={() => request(primary, 'primary')} icon={primary.icon} title={primary.title} sub={meta(primary)} />
          ) : (
            <BigButton dark={dark} disabled={blocked} onClick={step} icon="⏭️" title="Carry on with my day" sub="Do the next sensible thing" />
          )}
        </div>
      </section>

      {/* Inbox chips */}
      {(offers > 0 || interviews > 0 || invites > 0) && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {offers > 0 && <Chip onClick={() => go('life')}>📨 {offers} job offer{offers > 1 ? 's' : ''}</Chip>}
          {interviews > 0 && <Chip onClick={() => go('life')}>🎤 {interviews} interview{interviews > 1 ? 's' : ''}</Chip>}
          {invites > 0 && <Chip onClick={() => go('feed')}>💌 {invites} invite{invites > 1 ? 's' : ''}</Chip>}
        </div>
      )}

      {/* One-tap tiles */}
      <div className="grid grid-cols-2 gap-2">
        {tiles.slice(0, 6).map((t) => (
          <Tile key={t.id + (t.param ?? '')} view={t} onClick={() => request(t, 'tile')} />
        ))}
      </div>

      {/* Time controls */}
      <div className="grid grid-cols-3 gap-2">
        <TimeButton disabled={blocked} onClick={step} icon={<SkipForward size={18} />} label="Next" sub="1 activity" />
        <TimeButton disabled={blocked} onClick={() => autopilot(1)} icon={<Moon size={18} />} label="End day" sub="to tomorrow" />
        <TimeButton disabled={blocked} onClick={() => autopilot(7)} icon={<FastForward size={18} />} label="Week" sub="on routine" />
      </div>

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
        {more ? 'Hide' : 'Show'} my life details <ChevronDown size={16} className={cx('transition', more && 'rotate-180')} />
      </button>
      {more && <Details go={go} />}
    </div>
  );
}

function meta(v: ActionView): string {
  return [v.minutes ? formatDuration(v.minutes) : '', v.cost ? `-${formatRM(v.cost, v.cost % 1 ? 2 : 0)}` : '', v.energy ? `⚡${v.energy > 0 ? '+' : ''}${v.energy}` : '']
    .filter(Boolean)
    .join(' · ');
}

function BigButton({ dark, onClick, icon, title, sub, disabled }: { dark: boolean; onClick: () => void; icon: string; title: string; sub: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'anim-pop mt-4 flex w-full items-center gap-3 rounded-2xl p-3.5 text-left shadow-lg transition active:scale-[0.98] disabled:opacity-60',
        dark ? 'bg-white text-ink' : 'bg-ink text-white',
      )}
    >
      <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl', dark ? 'bg-paper-2' : 'bg-white/10')}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold">{title}</span>
        {sub && <span className={cx('block text-xs', dark ? 'text-ink-soft' : 'text-white/70')}>{sub}</span>}
      </span>
      <span className="text-xl font-black" aria-hidden>
        ▶
      </span>
    </button>
  );
}

function Tile({ view, onClick }: { view: ActionView; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={!view.available}
      title={view.reason ?? view.description}
      className={cx(
        'flex min-h-[92px] flex-col items-start rounded-2xl border p-3 text-left transition active:scale-[0.97]',
        view.available ? 'border-ink/10 bg-white hover:border-teal/50 hover:shadow-sm' : 'border-ink/5 bg-white/50',
      )}
    >
      <span className={cx('text-2xl', !view.available && 'opacity-60 grayscale')}>{view.icon}</span>
      <span className={cx('mt-1 line-clamp-2 text-[13px] font-semibold leading-tight', !view.available && 'text-ink-soft')}>{view.title}</span>
      <span className={cx('mt-auto line-clamp-2 pt-1 text-[11px] font-semibold leading-tight', view.available ? 'text-ink-soft' : 'text-hibiscus')}>
        {view.available ? meta(view) || 'Instant' : (view.reason ?? 'Locked')}
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
      className="flex flex-col items-center gap-0.5 rounded-2xl border border-teal/25 bg-teal-soft py-2.5 text-teal transition active:scale-[0.97] disabled:opacity-50"
    >
      {icon}
      <span className="text-sm font-bold leading-none">{label}</span>
      <span className="text-[10px] font-medium text-teal/70">{sub}</span>
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
  const job = state.career.job;
  const edu = state.education;
  const home = currentHome(state);
  const vehicle = vehicleById(state.transport.vehicleId);
  const next = upcoming(state);
  return (
    <div className="space-y-1">
      <SectionTitle>Life stats</SectionTitle>
      <Card className="grid grid-cols-2 gap-x-4 gap-y-3">
        <StatBar label="Health" value={state.stats.health} tone="leaf" />
        <StatBar label="Fitness" value={state.stats.fitness} tone="sky" />
        <StatBar label="Happiness" value={state.stats.happiness} tone="gold" />
        <StatBar label="Stress" value={state.stats.stress} tone="hibiscus" invert />
        <StatBar label="Reputation" value={state.stats.reputation} />
        <StatBar label="Energy" value={state.stats.energy} tone="teal" />
      </Card>
      <SectionTitle>Snapshot</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Snap icon="💰" label="Net worth" value={formatRM(netWorth(state))} sub={`Debt ${formatRM(totalDebt(state))}`} onClick={() => go('money')} />
        <Snap
          icon={job ? '💼' : edu.status === 'studying' ? '🎒' : '🔎'}
          label={job ? job.title : edu.status === 'studying' ? `Semester ${edu.semester}/${edu.totalSemesters}` : 'Job status'}
          value={job ? (job.schedule === 'parttime' ? `${formatRM(job.shiftPay)}/shift` : `${formatRM(job.monthlySalary)}/mo`) : edu.status === 'studying' ? `CGPA ${edu.gpaHistory.length ? edu.cgpa.toFixed(2) : '—'}` : 'Unemployed'}
          sub={job ? companyById(job.companyId)?.name : 'Life → Career'}
          onClick={() => go('life')}
        />
        <Snap icon={home.icon} label="Home" value={home.name} sub={home.rent ? `${formatRM(home.rent)}/mo` : home.owned ? 'Owned' : 'Rent-free'} onClick={() => go('life')} />
        <Snap
          icon={vehicle?.icon ?? transportModeInfo(state.transport.mode).icon}
          label="Commute · love"
          value={vehicle?.name ?? transportModeInfo(state.transport.mode).label}
          sub={relationshipStatus(state)}
          onClick={() => go('life')}
        />
      </div>
      <SectionTitle>Coming up</SectionTitle>
      <Card className="divide-y divide-ink/5 py-1">
        {next.length === 0 ? (
          <p className="py-2 text-sm text-ink-soft">Nothing scheduled in the next month.</p>
        ) : (
          next.map((u, i) => (
            <div key={i} className="flex items-center gap-3 py-2 text-sm">
              <span className="text-lg">{u.icon}</span>
              <span className="flex-1">{u.label}</span>
              <span className="text-xs font-semibold text-ink-soft">
                {u.day === state.clock.day ? 'Today' : u.day === state.clock.day + 1 ? 'Tomorrow' : formatDate(state, u.day).split(',')[1]}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function Snap({ icon, label, value, sub, onClick }: { icon: string; label: string; value: string; sub?: string; onClick: () => void }) {
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
