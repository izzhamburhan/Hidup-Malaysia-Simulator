import { FastForward } from 'lucide-react';
import { companyById } from '../data/companies';
import { courseById } from '../data/courses';
import { universityById } from '../data/universities';
import { vehicleById, transportModeInfo } from '../data/vehicles';
import { formatDate, formatTime } from '../engine/calendar';
import { formatRM, netWorth, totalDebt } from '../engine/core';
import { currentObjective, suggestedActions, upcoming } from '../engine/insights';
import { currentHome } from '../engine/living';
import { viewAction } from '../engine/simulationEngine';
import { relationshipStatus } from '../engine/social';
import { useLoadedGame } from '../hooks/useGame';
import { ActionCard } from '../components/ActionCard';
import { Button, Card, EmptyState, SectionTitle, StatBar, cx } from '../components/ui';
import type { Tab } from './GameShell';

export function Dashboard({ go }: { go: (t: Tab) => void }) {
  const { state, autopilot } = useLoadedGame();
  const objective = currentObjective(state);
  const suggestions = suggestedActions(state)
    .map((a) => viewAction(state, a.id, a.param))
    .filter((v): v is NonNullable<typeof v> => !!v);
  const job = state.career.job;
  const edu = state.education;
  const home = currentHome(state);
  const vehicle = vehicleById(state.transport.vehicleId);
  const events = state.log.filter((l) => l.kind !== 'action').slice(0, 6);
  const blocked = state.events.pending.length > 0 || !!state.ending;

  return (
    <div className="space-y-1">
      <div className="relative overflow-hidden rounded-2xl bg-teal p-4 text-white">
        <div className="songket absolute inset-0 opacity-25" aria-hidden />
        <div className="relative flex items-start gap-3">
          <span className="text-3xl">{objective.icon}</span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Current objective</div>
            <div className="font-display text-lg font-bold leading-tight">{objective.title}</div>
            <div className="text-sm text-white/80">{objective.detail}</div>
          </div>
        </div>
        {state.flags.chapterOffered && !state.ending && (
          <Button variant="gold" className="relative mt-3 w-full" onClick={() => go('report')}>
            See my life report
          </Button>
        )}
      </div>

      <SectionTitle>Do next</SectionTitle>
      <div className="grid gap-2">
        {suggestions.map((v) => (
          <ActionCard key={v.id + (v.param ?? '')} view={v} compact />
        ))}
        <button type="button" onClick={() => go('act')} className="rounded-xl py-2 text-sm font-semibold text-teal hover:bg-teal-soft">
          All actions →
        </button>
      </div>

      <SectionTitle>Routine mode</SectionTitle>
      <Card>
        <p className="text-sm text-ink-soft">Let your default routine run: meals, work or classes, gym if you're a member, sleep. Stops when something needs your decision.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={blocked} onClick={() => autopilot(1)}>
            <FastForward size={16} /> 1 day
          </Button>
          <Button variant="secondary" disabled={blocked} onClick={() => autopilot(7)}>
            <FastForward size={16} /> 1 week
          </Button>
        </div>
      </Card>

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
        <Snap icon="💰" label="Net worth" value={formatRM(netWorth(state))} sub={`Savings ${formatRM(state.finance.savings + state.finance.emergencyFund)} · Debt ${formatRM(totalDebt(state))}`} onClick={() => go('money')} />
        <Snap
          icon={job ? '💼' : edu.status === 'studying' ? '🎒' : '🔎'}
          label={job ? job.title : edu.status === 'studying' ? `Semester ${edu.semester}/${edu.totalSemesters}` : 'Job status'}
          value={job ? (job.schedule === 'parttime' ? `${formatRM(job.shiftPay)}/shift` : `${formatRM(job.monthlySalary)}/mo`) : edu.status === 'studying' ? (universityById(edu.universityId)?.short ?? '') : 'Unemployed'}
          sub={job ? companyById(job.companyId)?.name : edu.status === 'studying' ? courseById(edu.courseId)?.name : 'Check the job board'}
          onClick={() => go('life')}
        />
        <Snap icon={home.icon} label="Home" value={home.name} sub={home.rent ? `${formatRM(home.rent)}/mo rent` : home.owned ? 'Owned' : 'Rent-free'} onClick={() => go('life')} />
        <Snap icon={vehicle?.icon ?? transportModeInfo(state.transport.mode).icon} label="Commute" value={vehicle?.name ?? transportModeInfo(state.transport.mode).label} sub={`${relationshipStatus(state)}`} onClick={() => go('life')} />
      </div>

      <SectionTitle>Upcoming</SectionTitle>
      <Card className="divide-y divide-ink/5 py-1">
        {upcoming(state).length === 0 ? (
          <p className="py-2 text-sm text-ink-soft">Nothing scheduled in the next month.</p>
        ) : (
          upcoming(state).map((u, i) => (
            <div key={i} className="flex items-center gap-3 py-2 text-sm">
              <span className="text-lg">{u.icon}</span>
              <span className="flex-1">{u.label}</span>
              <span className="text-xs font-semibold text-ink-soft">{u.day === state.clock.day ? 'Today' : u.day === state.clock.day + 1 ? 'Tomorrow' : formatDate(state, u.day).split(',')[1]}</span>
            </div>
          ))
        )}
      </Card>

      <SectionTitle>Recent</SectionTitle>
      {events.length === 0 ? (
        <EmptyState icon="🌱" title="Your story starts now" />
      ) : (
        <Card className="space-y-2">
          {events.map((l) => (
            <div key={l.id} className="flex gap-2 text-sm">
              <span className="w-16 shrink-0 text-[11px] font-semibold text-ink-soft">
                {l.day === state.clock.day ? formatTime(l.minute) : `Day ${l.day + 1}`}
              </span>
              <span className={cx(l.kind === 'warning' && 'text-hibiscus', l.kind === 'milestone' && 'font-semibold text-teal')}>{l.text}</span>
            </div>
          ))}
        </Card>
      )}
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
