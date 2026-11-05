// Money tab: the Hari Gaji card. Shows a waiting payday, or the open pay cycle (wants used, saved,
// emergency fund) with the last grades. Display only; changes go through the engine actions.

import { CalendarCheck, Flame, Repeat, Wallet } from 'lucide-react';
import { BUDGET_GRADES } from '../data/budget';
import { budgetView } from '../engine/budget';
import { formatDate } from '../engine/calendar';
import { formatRM } from '../engine/core';
import { useLoadedGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import { openPaydaySheet } from './PaydaySheet';
import { Button, Card, Pill, cx } from './ui';

const GRADE_TONE = { A: 'bg-leaf text-white', B: 'bg-gold text-ink', C: 'bg-hibiscus-soft text-[#9a3412]' } as const;

export function BudgetCard() {
  const { state, act } = useLoadedGame();
  const t = useT();
  const b = state.finance.budget;
  const view = budgetView(state);

  if (view.pending) {
    return (
      <Card tier="hero">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal text-white">
            <Wallet size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">{t('budget.waiting', { amount: formatRM(view.pending.income) })}</p>
            <p className="text-xs text-ink-soft">{t('budget.waiting.hint')}</p>
          </div>
        </div>
        <Button className="mt-3 w-full" onClick={openPaydaySheet}>
          {t('budget.planNow')}
        </Button>
      </Card>
    );
  }

  const c = view.cycle;
  if (!c) {
    if (!b.history.length) {
      return (
        <Card>
          <div className="flex items-start gap-3">
            <CalendarCheck size={20} className="mt-0.5 shrink-0 text-teal" aria-hidden="true" />
            <p className="text-sm text-ink-soft">{t('budget.empty')}</p>
          </div>
        </Card>
      );
    }
    return <Card>{b.history.length > 0 && <History />}</Card>;
  }

  const wantsPct = Math.min(1, view.wantsUsed);
  const over = view.wantsUsed > 1;
  const left = c.wantsBudget - c.wantsSpent;
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">{t('budget.cycle', { date: formatDate(state, c.startDay).replace(/^[A-Za-z]+,\s*/, '') })}</p>
        <span className="text-xs tabular-nums text-ink-soft">
          {c.split.needs}/{c.split.wants}/{c.split.save}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold text-ink">{t('budget.wants')}</span>
          <span className={cx('tabular-nums', over ? 'font-bold text-[#9a3412]' : 'text-ink-soft')}>
            {formatRM(c.wantsSpent)} / {formatRM(c.wantsBudget)}
          </span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-paper-2" role="img" aria-label={t('budget.wants.aria', { pct: Math.round(view.wantsUsed * 100) })}>
          <div className={cx('h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none', over ? 'bg-hibiscus' : view.wantsUsed >= 0.8 ? 'bg-gold' : 'bg-teal')} style={{ width: `${wantsPct * 100}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-ink-soft">{over ? t('budget.over', { amount: formatRM(-left) }) : t('budget.left', { amount: formatRM(left) })}</p>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label={t('budget.saved')} value={formatRM(c.saved)} tone="text-leaf" />
        <Stat label={t('budget.spent')} value={formatRM(view.spentInCycle)} />
        <Stat label={t('budget.ef')} value={t('budget.months', { n: view.emergencyMonths.toFixed(1) })} />
      </dl>
      {c.dipped > 0 && <p className="mt-2 text-[11px] text-[#9a3412]">{t('budget.dipped', { amount: formatRM(c.dipped) })}</p>}

      {b.history.length > 0 && <History />}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink/5 pt-3">
        <span className="flex items-center gap-1.5 text-xs text-ink-soft">
          <Repeat size={14} aria-hidden="true" /> {b.autoPlan ? t('budget.autoOn') : t('budget.autoOff')}
        </span>
        {(b.autoPlan || view.autoAllowed) && (
          <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => act('budget-auto', b.autoPlan ? 'off' : 'on')}>
            {b.autoPlan ? t('budget.turnOff') : t('budget.turnOn')}
          </Button>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-paper px-1 py-2">
      <dt className="text-[10px] font-semibold text-ink-soft">{label}</dt>
      <dd className={cx('text-sm font-bold tabular-nums', tone ?? 'text-ink')}>{value}</dd>
    </div>
  );
}

function History() {
  const { state, settings } = useLoadedGame();
  const t = useT();
  const b = state.finance.budget;
  const last = b.history[0];
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-ink">{t('budget.history')}</span>
        {b.streak > 0 && (
          <Pill tone="gold" className="gap-1">
            <Flame size={12} aria-hidden="true" /> {t('budget.streak', { n: b.streak })}
          </Pill>
        )}
      </div>
      <ol className="mt-2 flex gap-1.5">
        {[...b.history].reverse().map((r) => (
          <li key={r.month} className="flex flex-col items-center gap-0.5">
            <span className={cx('grid h-8 w-8 place-items-center rounded-lg text-sm font-black', GRADE_TONE[r.grade])} title={BUDGET_GRADES[r.grade].title}>
              {r.grade}
            </span>
            <span className="text-[10px] tabular-nums text-ink-soft">{monthLabel(r.month, settings.language)}</span>
          </li>
        ))}
      </ol>
      {last && <p className="mt-1.5 text-[11px] text-ink-soft">{BUDGET_GRADES[last.grade].line}</p>}
    </div>
  );
}
/** "2027-03" as a short month name (display only; the date comes from the save, not the wall clock). */
function monthLabel(month: string, lang: string): string {
  const d = new Date(`${month}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? month.slice(5) : d.toLocaleString(lang === 'ms' ? 'ms-MY' : 'en-GB', { month: 'short', timeZone: 'UTC' });
}
