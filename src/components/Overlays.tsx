// Global overlays: event decisions, action confirmations, feedback toasts and
// end-of-day reports.

import { useEffect, useState, type CSSProperties } from 'react';
import { AlertTriangle, Moon } from 'lucide-react';
import { currentEvent } from '../engine/simulationEngine';
import { formatDate, formatDuration } from '../engine/calendar';
import { formatRM } from '../engine/core';
import { useLoadedGame } from '../hooks/useGame';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useT } from '../hooks/useT';
import { countUpValue, paydayFor } from '../lib/moments';
import { Button, Modal, Pill, cx } from './ui';

const CATEGORY_TONE: Record<string, 'teal' | 'gold' | 'red' | 'green' | 'blue' | 'neutral'> = {
  chaos: 'red',
  festive: 'gold',
  money: 'gold',
  love: 'red',
  opportunity: 'green',
  work: 'blue',
  study: 'blue',
  health: 'green',
};

export function EventModal() {
  const { state, choose } = useLoadedGame();
  const t = useT();
  const ev = currentEvent(state);
  if (!ev) return null;
  return (
    <Modal open dismissable={false} title={<span className="flex items-center gap-2"><span className="text-2xl">{ev.icon}</span>{ev.title}</span>}>
      <div className="mb-3 flex gap-2">
        <Pill tone={CATEGORY_TONE[ev.category] ?? 'neutral'}>{ev.category}</Pill>
        {state.events.pending.length > 1 && <Pill>{t('event.more', { n: state.events.pending.length - 1 })}</Pill>}
      </div>
      <p className="text-[15px] leading-relaxed">{ev.text}</p>
      <div className="mt-4 space-y-2">
        {ev.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={!!c.disabledReason}
            onClick={() => choose(c.id)}
            className={cx(
              'w-full rounded-2xl border p-3 text-left transition',
              c.disabledReason ? 'cursor-not-allowed border-ink/5 bg-paper-2/70 text-ink-soft' : 'border-ink/10 bg-white hover:border-teal hover:shadow-sm active:scale-[0.99]',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{c.label}</span>
              {c.cost > 0 && <span className="shrink-0 text-xs font-bold text-hibiscus">-{formatRM(c.cost)}</span>}
            </div>
            {c.hint && <div className="mt-0.5 text-xs text-ink-soft">{c.hint}</div>}
            {c.disabledReason && <div className="mt-0.5 text-xs font-medium text-hibiscus">{c.disabledReason}</div>}
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function ConfirmModal() {
  const { confirmFor, confirmPending, cancelPending } = useLoadedGame();
  const t = useT();
  if (!confirmFor) return null;
  return (
    <Modal
      open
      onClose={cancelPending}
      title={<span className="flex items-center gap-2"><span className="text-2xl">{confirmFor.icon}</span>{confirmFor.title}</span>}
      footer={
        <>
          <Button variant="secondary" onClick={cancelPending}>
            {t('confirm.notNow')}
          </Button>
          <Button onClick={confirmPending}>{t('confirm.ok')}</Button>
        </>
      }
    >
      <div className="flex gap-2 rounded-2xl bg-gold-soft p-3 text-sm">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#7a5a00]" />
        <p>{confirmFor.confirm}</p>
      </div>
      <p className="mt-3 text-xs text-ink-soft">
        {t('confirm.takes', { time: formatDuration(confirmFor.minutes) })}
        {confirmFor.cost > 0 ? ` · ${t('confirm.upfront', { amount: formatRM(confirmFor.cost) })}` : ''}. {t('confirm.fictional')}
      </p>
    </Modal>
  );
}

export function FeedbackToast() {
  const { feedback, dismissFeedback, state } = useLoadedGame();
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(dismissFeedback, feedback.ok ? 3800 : 5000);
    return () => clearTimeout(t);
  }, [feedback, dismissFeedback]);
  if (!feedback || state.events.pending.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 flex justify-center px-3">
      <div
        role="status"
        onClick={dismissFeedback}
        className={cx('anim-rise pointer-events-auto w-full max-w-lg rounded-2xl p-3 shadow-xl', feedback.ok ? 'bg-ink text-white' : 'bg-hibiscus text-white')}
      >
        <div className="text-sm font-bold">{feedback.ok ? feedback.title : feedback.error}</div>
        {feedback.lines.map((l, i) => (
          <div key={i} className="mt-0.5 text-xs text-white/85">
            {l}
          </div>
        ))}
        {feedback.deltas.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {feedback.deltas.map((d) => (
              <span
                key={d.label}
                className={cx(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  d.unit === 'min' ? 'bg-white/15' : goodDelta(d.label, d.value) ? 'bg-leaf/80' : 'bg-hibiscus/80',
                )}
              >
                {formatDelta(d.label, d.value, d.unit)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function goodDelta(label: string, value: number): boolean {
  if (label === 'Stress' || label === 'Debt') return value < 0;
  if (label.startsWith('Calories')) return true;
  return value > 0;
}

function formatDelta(label: string, value: number, unit?: string): string {
  const sign = value > 0 ? '+' : '';
  if (unit === 'RM') return `${label} ${value < 0 ? '-' : '+'}${formatRM(Math.abs(value), Math.abs(value) % 1 ? 2 : 0)}`;
  if (unit === 'min') return `⏱ ${formatDuration(Math.round(value))}`;
  if (unit === 'kcal') return `${sign}${Math.round(value)} kcal`;
  return `${label} ${sign}${Math.abs(value) < 1 ? value.toFixed(1) : Math.round(value)}`;
}

/**
 * A money figure that counts up from RM0 to `value` (about a second, ease-out) and lands
 * exactly on it. Screen readers get the exact figure at once; the moving digits are
 * aria-hidden. Shown instantly under reduced motion.
 */
function CountUpRM({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const v = countUpValue(value, now - start);
      setShown(v);
      if (v < value) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return (
    <>
      <span className="sr-only">{formatRM(value, decimals)}</span>
      <span aria-hidden="true" className="tabular-nums">{formatRM(shown, decimals)}</span>
    </>
  );
}

export function DayReportModal() {
  const { dayReport, dismissDayReport, state } = useLoadedGame();
  const t = useT();
  if (!dayReport || state.events.pending.length) return null;
  const net = dayReport.earned - dayReport.spent;
  // Stagger: payday card first, then income, then body stats, then highlights (all well under a second).
  const slip = paydayFor(state, dayReport.day);
  const off = slip ? 80 : 0;
  return (
    <Modal
      open
      onClose={dismissDayReport}
      title={<span className="flex items-center gap-2"><Moon size={20} className="text-teal" /> {formatDate(state, dayReport.day)}</span>}
      footer={<Button onClick={dismissDayReport}>{t('day.next')}</Button>}
    >
      {slip && (
        <div className="report-in mb-3 flex items-center gap-3 rounded-2xl bg-gold-soft p-3" style={stagger(0)}>
          <span className="coin-pop text-3xl" aria-hidden="true">🪙</span>
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-[#7a5a00]">{t('day.payday')}</div>
            <div className="text-2xl font-extrabold text-leaf">
              <CountUpRM value={slip.net} />
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Mini label={t('day.earned')} value={formatRM(dayReport.earned)} tone="text-leaf" delay={off} />
        <Mini label={t('day.spent')} value={formatRM(dayReport.spent)} tone="text-hibiscus" delay={off + 60} />
        <Mini label={t('day.net')} value={formatRM(net)} tone={net >= 0 ? 'text-leaf' : 'text-hibiscus'} delay={off + 120} />
        <Mini label={t('day.kcalIn')} value={`${dayReport.caloriesIn}`} delay={off + 220} />
        <Mini label={t('day.burned')} value={`${dayReport.caloriesOut}`} delay={off + 260} />
        <Mini label={t('day.sleep')} value={`${dayReport.sleepHours}h`} tone={dayReport.sleepHours < 6 ? 'text-hibiscus' : undefined} delay={off + 300} />
      </div>
      <div className="report-in mt-3" style={stagger(off + 380)}>
        <div className="text-xs font-bold uppercase tracking-wider text-ink-soft">{t('day.highlights')}</div>
        {dayReport.highlights.length ? (
          <ul className="mt-1 space-y-1 text-sm">
            {dayReport.highlights.map((h, i) => (
              <li key={i}>• {h}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">{t('day.quiet')}</p>
        )}
      </div>
      <p className="report-in mt-3 text-[11px] text-ink-soft" style={stagger(off + 380)}>{t('day.kcalNote')}</p>
    </Modal>
  );
}

function stagger(ms: number): CSSProperties {
  return { '--d': `${ms}ms` } as CSSProperties;
}

function Mini({ label, value, tone, delay = 0 }: { label: string; value: string; tone?: string; delay?: number }) {
  return (
    <div className="report-in rounded-xl bg-white p-2" style={stagger(delay)}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className={cx('text-sm font-bold tabular-nums', tone)}>{value}</div>
    </div>
  );
}
