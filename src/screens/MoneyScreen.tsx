import { useState } from 'react';
import { UNIT_TRUST } from '../data/lifestyle';
import { formatRM, netWorth, totalDebt } from '../engine/core';
import { expectedMonthlyNet, monthlyCommitments } from '../engine/economy';
import { computePayslip } from '../engine/payroll';
import { listActions, viewAction } from '../engine/simulationEngine';
import type { Payslip } from '../engine/types';
import { useLoadedGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import { OrgBadge } from '../components/OrgBadge';
import { ActionCard, VariantRow, variantTitle } from '../components/ActionCard';
import { Card, Disclaimer, EmptyState, KeyValue, Pill, SectionTitle, Tabs, cx } from '../components/ui';

type View = 'overview' | 'payslip' | 'debts';

export function MoneyScreen() {
  const { state } = useLoadedGame();
  const t = useT();
  const [view, setView] = useState<View>('overview');
  return (
    <div>
      <Tabs
        tabs={[
          { id: 'overview', label: t('money.tab.overview') },
          { id: 'payslip', label: t('money.tab.payslip') },
          { id: 'debts', label: t('money.tab.debts', { n: state.finance.debts.length }) },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'overview' && <Overview />}
      {view === 'payslip' && <PayslipView />}
      {view === 'debts' && <Debts />}
    </div>
  );
}

function Overview() {
  const { state } = useLoadedGame();
  const t = useT();
  const f = state.finance;
  const commitments = monthlyCommitments(state);
  const total = commitments.reduce((a, c) => a + c.amount, 0);
  const net = expectedMonthlyNet(state);
  const moneyViews = listActions(state).filter((v) => v.category === 'money');
  const groups = new Map<string, typeof moneyViews>();
  for (const v of moneyViews) groups.set(v.id, [...(groups.get(v.id) ?? []), v]);

  return (
    <div>
      <SectionTitle>{t('money.balances')}</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Balance label={t('money.wallet')} value={f.cash} tone="text-teal" />
        <Balance label={t('money.savings')} value={f.savings} />
        <Balance label={t('money.emergency')} value={f.emergencyFund} />
        <Balance label={t('money.debt')} value={-totalDebt(state)} tone="text-hibiscus" />
      </div>
      <Card className="mt-2">
        <KeyValue label={t('money.epf')} value={formatRM(f.epfBalance, 2)} strong />
        <KeyValue label={t('money.epfEmployer')} value={formatRM(f.epfEmployerTotal, 2)} />
        <KeyValue label={UNIT_TRUST.name} value={formatRM(f.unitTrust, 2)} />
        <KeyValue label={t('money.netWorth')} value={formatRM(netWorth(state))} strong />
        <Disclaimer>{t('money.epf.note')}</Disclaimer>
      </Card>

      <SectionTitle>{t('money.thisMonth')}</SectionTitle>
      <Card>
        <KeyValue label={t('day.earned')} value={<span className="text-leaf">{formatRM(f.monthEarned, 2)}</span>} />
        <KeyValue label={t('day.spent')} value={<span className="text-hibiscus">{formatRM(f.monthSpent, 2)}</span>} />
        {net > 0 && <KeyValue label={t('money.expectedNet')} value={formatRM(net, 2)} />}
      </Card>

      <SectionTitle action={<Pill tone={net > 0 && total > net ? 'red' : 'neutral'}>{t('money.perMonth', { amount: formatRM(total) })}</Pill>}>{t('money.monthly')}</SectionTitle>
      <Card className="divide-y divide-ink/5 py-1">
        {commitments.map((c) => (
          <KeyValue key={c.id} label={c.label} value={formatRM(c.amount)} />
        ))}
        {net > 0 && (
          <div className="pt-2">
            <KeyValue label={t('money.leftAfter')} value={<span className={net - total < 0 ? 'text-hibiscus' : 'text-leaf'}>{formatRM(net - total)}</span>} strong />
          </div>
        )}
      </Card>
      <Disclaimer>{t('money.rent.note')}</Disclaimer>

      <SectionTitle>{t('money.manage')}</SectionTitle>
      <div className="grid gap-2">
        {[...groups.entries()].map(([id, views]) =>
          views.length > 1 ? (
            <VariantRow key={id} views={views} icon={views[0].icon} title={variantTitle(views[0])} description={views[0].description} />
          ) : (
            <ActionCard key={id} view={views[0]} />
          ),
        )}
      </div>

      <SectionTitle>{t('money.taxYear', { year: f.taxYear.year })}</SectionTitle>
      <Card>
        <KeyValue label={t('money.gross')} value={formatRM(f.taxYear.grossIncome)} />
        <KeyValue label={t('money.pcb')} value={formatRM(f.taxYear.pcbPaid, 2)} />
        {f.pendingTaxSettlement !== null && (
          <KeyValue label={t('money.settlement')} value={f.pendingTaxSettlement >= 0 ? t('money.pay', { amount: formatRM(f.pendingTaxSettlement, 2) }) : t('money.refund', { amount: formatRM(-f.pendingTaxSettlement, 2) })} strong />
        )}
        <Disclaimer>{t('money.statutory')} {t('money.efiling')}</Disclaimer>
      </Card>
    </div>
  );
}

function Balance({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-3">
      <div className="text-[11px] font-semibold text-ink-soft">{label}</div>
      <div className={cx('font-display text-lg font-black tabular-nums', tone)}>{formatRM(value, 2)}</div>
    </div>
  );
}

function PayslipView() {
  const { state } = useLoadedGame();
  const t = useT();
  const [idx, setIdx] = useState(0);
  const job = state.career.job;
  const slips = state.finance.payslips;
  const preview: Payslip | null =
    job && job.schedule !== 'parttime' ? computePayslip({ month: 'Projected', employer: String(state.flags.employerName ?? ''), schedule: job.schedule, basic: job.monthlySalary }) : null;
  const slip = slips[idx] ?? preview;
  if (!slip) {
    return (
      <div className="mt-4">
        <EmptyState icon="🧾" title={t('money.noPayslip')}>
          {job?.schedule === 'parttime' ? t('money.noPayslip.part') : t('money.noPayslip.full')}
        </EmptyState>
      </div>
    );
  }
  return (
    <div>
      {slips.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {slips.map((s, i) => (
            <button key={s.month + i} type="button" onClick={() => setIdx(i)} className={cx('shrink-0 rounded-full border px-3 py-1 text-xs font-semibold', idx === i ? 'border-teal bg-teal text-white' : 'border-ink/10 bg-white')}>
              {s.month}
            </button>
          ))}
        </div>
      )}
      <Card className="mt-3 font-mono text-[13px]">
        <div className="mb-2 flex items-start justify-between font-sans">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink-soft">{slips[idx] ? t('money.slip') : t('money.slip.projected')}</div>
            <div className="font-display text-lg font-bold">{slip.month}</div>
            <div className="text-xs text-ink-soft">{slip.employer}</div>
          </div>
          <Pill tone="gold">{t('money.simplified')}</Pill>
        </div>
        <div className="mb-2 flex gap-1.5 font-sans">
          <OrgBadge text="EPF" kind="gov" size={34} title={t('money.badge.epf')} />
          <OrgBadge text="SOCSO" kind="gov" size={34} title={t('money.badge.socso')} />
          <OrgBadge text="EIS" kind="gov" size={34} title={t('money.badge.eis')} />
          <OrgBadge text="PCB" kind="gov" size={34} title={t('money.badge.pcb')} />
        </div>
        <Line label={t('money.line.basic')} value={slip.basic} />
        {slip.overtime > 0 && <Line label={t('money.line.overtime')} value={slip.overtime} />}
        {slip.bonus > 0 && <Line label={t('money.line.bonus')} value={slip.bonus} />}
        {slip.unpaidLeave > 0 && <Line label={t('money.line.unpaid')} value={-slip.unpaidLeave} />}
        <Line label={t('money.line.gross')} value={slip.gross} strong />
        <div className="my-2 border-t border-dashed border-ink/20" />
        <Line label={t('money.line.epfEe')} value={-slip.epfEmployee} />
        <Line label={t('money.line.socso')} value={-slip.socsoEmployee} />
        <Line label={t('money.line.eis')} value={-slip.eisEmployee} />
        <Line label={t('money.line.pcb')} value={-slip.pcb} />
        <div className="my-2 border-t border-dashed border-ink/20" />
        <Line label={t('money.line.net')} value={slip.net} strong />
        <div className="mt-3 rounded-xl bg-paper-2 p-2">
          <div className="mb-1 font-sans text-[11px] font-bold uppercase tracking-wider text-ink-soft">{t('money.employer')}</div>
          <Line label={t('money.line.epfEr')} value={slip.epfEmployer} />
          <Line label={t('money.line.socsoEr')} value={slip.socsoEmployer} />
          <Line label={t('money.line.eisEr')} value={slip.eisEmployer} />
        </div>
      </Card>
      <Disclaimer>
        {t('money.statutory')} {t('money.statutory.more')}
      </Disclaimer>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cx('flex justify-between py-0.5', strong && 'font-bold')}>
      <span className="font-sans">{label}</span>
      <span className={cx('tabular-nums', value < 0 && 'text-hibiscus')}>{value < 0 ? `(${formatRM(-value, 2)})` : formatRM(value, 2)}</span>
    </div>
  );
}

function Debts() {
  const { state } = useLoadedGame();
  const t = useT();
  const debts = state.finance.debts;
  if (!debts.length) {
    return (
      <div className="mt-4">
        <EmptyState icon="🕊️" title={t('money.debtFree')}>{t('money.debtFree.hint')}</EmptyState>
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-3">
      {debts.map((d) => {
        const paid = d.principal > 0 ? 1 - d.balance / d.principal : 0;
        const pays = [100, 500].filter((a) => a < d.balance).map((a) => viewAction(state, 'pay-debt', `${d.id}|${a}`)!);
        const full = viewAction(state, 'pay-debt', `${d.id}|${d.balance}`)!;
        return (
          <Card key={d.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-bold">{d.label}</div>
                <div className="text-xs text-ink-soft">
                  {t('money.perMonthLong', { amount: formatRM(d.monthlyPayment) })}{d.kind === 'ptptn' && state.education.status === 'studying' ? ` ${t('money.deferred')}` : ''} · {t('money.perYear', { rate: (d.annualRate * 100).toFixed(1) })}
                </div>
              </div>
              <div className="text-right font-display text-lg font-black text-hibiscus tabular-nums">{formatRM(d.balance, 2)}</div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2">
              <div className="h-full rounded-full bg-leaf" style={{ width: `${Math.max(0, Math.min(100, paid * 100))}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...pays, full].map((v, i) => (
                <PayButton key={i} label={i === pays.length ? t('money.payOff') : t('money.payAmount', { amount: formatRM(Number(v.param?.split('|')[1])) })} view={v} />
              ))}
            </div>
          </Card>
        );
      })}
      <Disclaimer>{t('money.debt.note')}</Disclaimer>
    </div>
  );
}

function PayButton({ label, view }: { label: string; view: NonNullable<ReturnType<typeof viewAction>> }) {
  const { request } = useLoadedGame();
  return (
    <button
      type="button"
      onClick={() => request(view)}
      aria-disabled={!view.available}
      title={view.reason ?? ''}
      className={cx('rounded-full border px-3 py-1 text-xs font-semibold', view.available ? 'border-teal/30 bg-teal-soft text-teal' : 'border-ink/10 bg-paper-2 text-ink-soft/70')}
    >
      {label}
    </button>
  );
}
