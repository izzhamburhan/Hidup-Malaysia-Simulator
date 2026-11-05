// Hari Gaji: the payday planner sheet. Display and input only: the split is applied by the
// engine's plan-budget action (src/engine/budget.ts). Opens on its own when a payday is waiting;
// "Later" hides it until the Money tab's "Plan now" reopens it.

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Home, LifeBuoy, Lightbulb, Minus, Plus, Sparkles, Sprout, TriangleAlert } from 'lucide-react';
import { BUDGET_PRESETS, BUDGET_TIPS } from '../data/budget';
import { budgetView } from '../engine/budget';
import { formatRM } from '../engine/core';
import type { BudgetSplit } from '../engine/types';
import { useLoadedGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import type { StringKey } from '../i18n';
import { Button, Disclaimer, Modal, cx } from './ui';
import { stepSplit, type Bucket } from './paydaySplit';

// ---- open / dismissed state shared with the Money tab (UI only, never saved) ----
let dismissedDay: number | null = null;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const setDismissed = (day: number | null) => {
  dismissedDay = day;
  listeners.forEach((fn) => fn());
};
/** Reopen the planner after "Later" (Money tab button). */
export const openPaydaySheet = () => setDismissed(null);

const BUCKETS: { id: Bucket; icon: typeof Home; bar: string; dot: string; text: string }[] = [
  { id: 'needs', icon: Home, bar: 'bg-teal', dot: 'bg-teal', text: 'text-teal' },
  { id: 'wants', icon: Sparkles, bar: 'bg-gold', dot: 'bg-gold', text: 'text-[#8a6410]' },
  { id: 'save', icon: Sprout, bar: 'bg-leaf', dot: 'bg-leaf', text: 'text-leaf' },
];

const splitParam = (s: BudgetSplit) => `${s.needs}-${s.wants}-${s.save}`;
const sameSplit = (a: BudgetSplit, b: BudgetSplit) => a.needs === b.needs && a.wants === b.wants && a.save === b.save;

/** Counts up to `value` once on mount (skipped for reduced motion). */
function useCountUp(value: number, ms = 900): number {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || value <= 0) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setShown(value * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

export function PaydaySheet({ blocked }: { blocked: boolean }) {
  const { state, act } = useLoadedGame();
  const dismissed = useSyncExternalStore(subscribe, () => dismissedDay);
  const pending = state.finance.budget.pending;
  const open = !!pending && !blocked && dismissed !== pending.day && !state.ending;
  if (!open || !pending) return null;
  return <PaydayBody key={pending.day} onLater={() => setDismissed(pending.day)} onPlan={(param) => act('plan-budget', param)} />;
}

function PaydayBody({ onLater, onPlan }: { onLater: () => void; onPlan: (param: string) => void }) {
  const { state } = useLoadedGame();
  const t = useT();
  const view = budgetView(state);
  const pending = view.pending!;
  const income = pending.income;
  const [split, setSplit] = useState<BudgetSplit>(() => state.finance.budget.lastSplit ?? suggest(income, view.commitments));
  const [auto, setAuto] = useState(false);
  const shownIncome = useCountUp(income);

  const rm = (b: Bucket) => Math.round((income * split[b]) / 100);
  const toSave = Math.min(rm('save'), Math.floor(state.finance.cash));
  const billsDontFit = view.commitments > rm('needs');
  const billsOfNeeds = rm('needs') > 0 ? Math.min(1, view.commitments / rm('needs')) : 1;
  const efAfter = Math.min(view.emergencyTarget, state.finance.emergencyFund + toSave);
  const efNow = view.emergencyTarget > 0 ? Math.min(1, state.finance.emergencyFund / view.emergencyTarget) : 0;
  const efNext = view.emergencyTarget > 0 ? efAfter / view.emergencyTarget : 0;
  const tip = useMemo(() => BUDGET_TIPS[(state.finance.budget.planned + pending.day) % BUDGET_TIPS.length], [state.finance.budget.planned, pending.day]);

  return (
    <Modal
      open
      onClose={onLater}
      title={
        <span className="flex items-baseline justify-between gap-3">
          <span>{t(pending.source === 'salary' ? 'pay.title' : 'pay.titleAllowance')}</span>
        </span>
      }
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Button variant="ghost" onClick={onLater}>
            {t('pay.later')}
          </Button>
          <Button onClick={() => onPlan(splitParam(split) + (auto ? '|auto' : ''))}>{toSave > 0 ? t('pay.confirmSave', { amount: formatRM(toSave) }) : t('pay.confirm')}</Button>
        </div>
      }
    >
      {/* The pay, counting up: the one authored moment. */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">{t(pending.source === 'salary' ? 'pay.landed' : 'pay.landedAllowance')}</p>
          <p className="font-pixel text-[32px] leading-none font-bold tabular-nums text-teal" aria-label={formatRM(income, 2)}>
            {formatRM(shownIncome)}
          </p>
        </div>
        <p className="max-w-[11rem] text-right text-xs leading-snug text-ink-soft">{t('pay.lead')}</p>
      </div>

      {/* The split, as one paycheque cut three ways. Bills are the striped part of needs. */}
      <div className="mt-4" aria-hidden="true">
        <div className="flex h-11 overflow-hidden rounded-xl bg-paper-2">
          {BUCKETS.map((b) => (
            <div
              key={b.id}
              className={cx('relative flex items-center justify-center text-xs font-bold transition-[width] duration-500 ease-out motion-reduce:transition-none', b.bar, b.id === 'wants' ? 'text-ink' : 'text-white')}
              style={{ width: `${split[b.id]}%` }}
            >
              {b.id === 'needs' && view.commitments > 0 && (
                <span
                  className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out motion-reduce:transition-none"
                  style={{ width: `${billsOfNeeds * 100}%`, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.22) 0 4px, transparent 4px 9px)' }}
                />
              )}
              <span className="relative">{split[b.id] >= 12 ? `${split[b.id]}%` : ''}</span>
            </div>
          ))}
        </div>
        {view.commitments > 0 && (
          <p className={cx('mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold', billsDontFit ? 'text-[#9a3412]' : 'text-ink-soft')}>
            <span className="inline-block h-2.5 w-4 rounded-sm bg-teal" style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 5px)' }} />
            {t('pay.bills', { amount: formatRM(view.commitments) })}
          </p>
        )}
      </div>

      {/* Presets */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="radiogroup" aria-label={t('pay.presets')}>
        {BUDGET_PRESETS.map((p) => {
          const on = sameSplit(p.split, split);
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setSplit(p.split)}
              className={cx(
                'min-w-[7.5rem] shrink-0 rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal',
                on ? 'border-teal bg-teal-soft' : 'border-ink/10 bg-white hover:border-teal/40',
              )}
            >
              <span className="block text-sm font-bold text-ink">{p.title}</span>
              <span className="block text-[11px] tabular-nums text-ink-soft">
                {p.split.needs} / {p.split.wants} / {p.split.save}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-ink-soft">{BUDGET_PRESETS.find((p) => sameSplit(p.split, split))?.blurb ?? t('pay.custom')}</p>

      {/* Buckets with steppers */}
      <ul className="mt-3 divide-y divide-ink/5 rounded-2xl bg-white px-3 shadow-[0_1px_3px_rgba(29,27,22,0.08)]">
        {BUCKETS.map((b) => {
          const Icon = b.icon;
          return (
            <li key={b.id} className="py-2.5">
              <div className="flex items-center gap-3">
              <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', b.id === 'needs' ? 'bg-teal-soft' : b.id === 'wants' ? 'bg-gold-soft' : 'bg-leaf-soft')}>
                <Icon size={18} className={b.text} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{t(`pay.${b.id}` as StringKey)}</p>
                <p className={cx('text-base font-bold leading-tight tabular-nums', b.text)}>{formatRM(rm(b.id))}</p>
              </div>
              <div className="flex items-center rounded-xl border border-ink/10">
                <button
                  type="button"
                  className="grid h-10 w-9 place-items-center rounded-l-xl text-ink-soft hover:bg-paper-2 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-teal"
                  onClick={() => setSplit((s) => stepSplit(s, b.id, -1))}
                  disabled={split[b.id] < 5}
                  aria-label={t('pay.less', { bucket: t(`pay.${b.id}` as StringKey) })}
                >
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center text-sm font-bold tabular-nums" aria-live="polite">
                  {split[b.id]}%
                </span>
                <button
                  type="button"
                  className="grid h-10 w-9 place-items-center rounded-r-xl text-ink-soft hover:bg-paper-2 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-teal"
                  onClick={() => setSplit((s) => stepSplit(s, b.id, 1))}
                  disabled={split[b.id] >= 100}
                  aria-label={t('pay.more', { bucket: t(`pay.${b.id}` as StringKey) })}
                >
                  <Plus size={16} />
                </button>
              </div>
              </div>
              <p className="mt-1 pl-12 text-[11px] leading-snug text-ink-soft">{t(`pay.${b.id}.hint` as StringKey)}</p>
            </li>
          );
        })}
      </ul>

      {billsDontFit && (
        <p className="mt-2 flex items-start gap-2 rounded-xl bg-hibiscus-soft px-3 py-2 text-xs text-[#9a3412]">
          <TriangleAlert size={16} className="mt-px shrink-0" aria-hidden="true" />
          {t('pay.billsWarn', { amount: formatRM(view.commitments) })}
        </p>
      )}

      {/* Emergency fund: where the savings go first */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-bold text-ink">
            <LifeBuoy size={15} className="text-leaf" aria-hidden="true" /> {t('pay.ef')}
          </span>
          <span className="tabular-nums text-ink-soft">
            {formatRM(efAfter)} / {formatRM(view.emergencyTarget)}
          </span>
        </div>
        <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-paper-2" role="img" aria-label={t('pay.ef.aria', { now: formatRM(state.finance.emergencyFund), target: formatRM(view.emergencyTarget) })}>
          <div className="absolute inset-y-0 left-0 rounded-full bg-leaf/35 transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${efNext * 100}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-leaf" style={{ width: `${efNow * 100}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-ink-soft">{efNow >= 1 ? t('pay.ef.full') : t('pay.ef.hint')}</p>
      </div>

      {/* One tip */}
      <p className="mt-4 flex items-start gap-2 rounded-xl bg-gold-soft px-3 py-2.5 text-xs leading-relaxed text-ink">
        <Lightbulb size={16} className="mt-px shrink-0 text-[#8a6410]" aria-hidden="true" />
        <span>{tip.text}</span>
      </p>

      {view.autoAllowed && (
        <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl px-1 py-1 text-sm text-ink">
          <input type="checkbox" className="h-5 w-5 accent-teal" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          {t('pay.auto')}
        </label>
      )}
      <Disclaimer>{t('pay.disclaimer')}</Disclaimer>
    </Modal>
  );
}

/** A starting split: the classic, or a tighter one when bills already take most of the pay. */
function suggest(income: number, commitments: number): BudgetSplit {
  const share = income > 0 ? commitments / income : 0;
  return (share > 0.5 ? BUDGET_PRESETS.find((p) => p.id === 'tight') : BUDGET_PRESETS[0])!.split;
}