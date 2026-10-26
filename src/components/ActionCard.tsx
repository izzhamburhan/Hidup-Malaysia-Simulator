import type { ReactNode } from 'react';
import { Clock, Lock, Zap } from 'lucide-react';
import { formatDuration } from '../engine/calendar';
import { formatRM } from '../engine/core';
import type { ActionView } from '../engine/simulationEngine';
import { useGame } from '../hooks/useGame';
import { cx } from './ui';

export function ActionCard({ view, compact = false, label, art }: { view: ActionView; compact?: boolean; label?: string; art?: ReactNode }) {
  const { request } = useGame();
  return (
    <button
      type="button"
      onClick={() => request(view)}
      aria-disabled={!view.available}
      title={view.reason ?? view.description}
      className={cx(
        'group flex w-full items-start gap-3 rounded-2xl border bg-white p-3 text-left transition',
        view.available ? 'border-ink/10 hover:border-teal/50 hover:shadow-sm active:scale-[0.99]' : 'border-ink/5 bg-white/60',
      )}
    >
      <span className={cx('flex h-10 shrink-0 items-center justify-center rounded-xl text-xl', art ? 'w-14' : 'w-10', view.available ? 'bg-paper-2' : cx('bg-paper-2/60', art ? 'opacity-80' : 'grayscale'))}>{art ?? view.icon}</span>
      <span className="min-w-0 flex-1">
        <span className={cx('block text-sm font-semibold leading-tight', !view.available && 'text-ink-soft')}>{label ?? view.title}</span>
        {!compact && view.description && <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{view.description}</span>}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-ink-soft">
          {view.minutes > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {formatDuration(view.minutes)}
            </span>
          )}
          {view.cost > 0 && <span className="text-hibiscus">-{formatRM(view.cost, view.cost % 1 ? 2 : 0)}</span>}
          {view.energy !== 0 && (
            <span className={cx('inline-flex items-center gap-0.5', view.energy > 0 ? 'text-leaf' : 'text-[#9a6b00]')}>
              <Zap size={12} /> {view.energy > 0 ? '+' : ''}
              {view.energy}
            </span>
          )}
          {view.confirm && <span className="text-sky">Major decision</span>}
        </span>
        {!view.available && view.reason && (
          <span className="mt-1 flex items-start gap-1 text-[11px] font-medium text-hibiscus">
            <Lock size={11} className="mt-0.5 shrink-0" /> {view.reason}
          </span>
        )}
      </span>
    </button>
  );
}

/** Compact pill buttons for action variants (e.g. Sleep 5h / 7h / 8h). */
export function VariantRow({ views, icon, title, description }: { views: ActionView[]; icon: string; title: string; description: string }) {
  const { request } = useGame();
  const anyAvailable = views.some((v) => v.available);
  const reason = !anyAvailable ? views[0]?.reason : null;
  return (
    <div className={cx('rounded-2xl border bg-white p-3', anyAvailable ? 'border-ink/10' : 'border-ink/5 bg-white/60')}>
      <div className="flex items-start gap-3">
        <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-2 text-xl', !anyAvailable && 'grayscale')}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className={cx('text-sm font-semibold leading-tight', !anyAvailable && 'text-ink-soft')}>{title}</div>
          <div className="mt-0.5 text-xs leading-snug text-ink-soft">{description}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {views.map((v) => (
              <button
                key={v.param ?? v.id}
                type="button"
                onClick={() => request(v)}
                aria-disabled={!v.available}
                title={v.reason ?? v.title}
                className={cx(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition',
                  v.available ? 'border-teal/30 bg-teal-soft text-teal hover:bg-teal hover:text-white' : 'border-ink/10 bg-paper-2 text-ink-soft/70',
                )}
              >
                {variantLabel(v)}
              </button>
            ))}
          </div>
          {reason && (
            <div className="mt-1 flex items-start gap-1 text-[11px] font-medium text-hibiscus">
              <Lock size={11} className="mt-0.5 shrink-0" /> {reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function variantLabel(v: ActionView): string {
  const p = v.param ?? '';
  if (/^\d+$/.test(p)) {
    if (['save', 'withdraw', 'emergency-deposit', 'give-parents'].includes(v.id)) return formatRM(Number(p));
    if (v.id === 'parent-allowance') return Number(p) ? `${formatRM(Number(p))}/mo` : 'Stop';
    return `${p}h`;
  }
  return shortTitle(v);
}

function shortTitle(v: ActionView): string {
  if (v.id === 'date') return v.title.split(' with ')[0];
  if (v.id === 'wedding') return `${v.title} ${formatRM(v.cost || 0)}`;
  if (v.id === 'shopping') return v.param === 'spree' ? 'Spree (RM350)' : 'Window';
  if (v.id === 'work-hustle') return v.title.replace('Work on ', '');
  return v.title.replace(/^.*?:\s*/, '');
}
