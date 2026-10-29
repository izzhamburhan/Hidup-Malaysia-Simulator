import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { listActions, type ActionView } from '../engine/simulationEngine';
import type { ActionCategory } from '../engine/actions';
import { useLoadedGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import type { StringKey } from '../i18n';
import { ActionCard, VariantRow, variantTitle } from '../components/ActionCard';
import { cx, EmptyState, SectionTitle, Tabs } from '../components/ui';
import { quickActions } from '../engine/insights';

const GROUPS: { id: 'all' | ActionCategory; icon: string; key: StringKey }[] = [
  { id: 'all', icon: '', key: 'act.cat.all' },
  { id: 'daily', icon: '😴 ', key: 'act.cat.daily' },
  { id: 'work', icon: '💼 ', key: 'act.cat.work' },
  { id: 'study', icon: '🎒 ', key: 'act.cat.study' },
  { id: 'career', icon: '📈 ', key: 'act.cat.career' },
  { id: 'fitness', icon: '🏋️ ', key: 'act.cat.fitness' },
  { id: 'leisure', icon: '🎮 ', key: 'act.cat.leisure' },
  { id: 'social', icon: '🫖 ', key: 'act.cat.social' },
  { id: 'love', icon: '💞 ', key: 'act.cat.love' },
  { id: 'family', icon: '🏡 ', key: 'act.cat.family' },
  { id: 'money', icon: '💰 ', key: 'act.cat.money' },
  { id: 'hustle', icon: '🛠️ ', key: 'act.cat.hustle' },
  { id: 'home', icon: '🏠 ', key: 'act.cat.home' },
  { id: 'transport', icon: '🚗 ', key: 'act.cat.transport' },
  { id: 'civic', icon: '🏛️ ', key: 'act.cat.civic' },
];

export function ActScreen() {
  const { state } = useLoadedGame();
  const [group, setGroup] = useState<'all' | ActionCategory>('all');
  // Defaults on so a new player sees what they can actually do right now, not a wall of
  // greyed-out locked actions. Still a toggle: nothing is removed, just hidden to start.
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  // Categories start collapsed under "All"; picking a category tab shows it open.
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const views = useMemo(() => listActions(state), [state]);
  const suggested = useMemo(() => quickActions(state).filter((v) => v.available).slice(0, 4), [state]);
  const t = useT();
  const present = new Set(views.map((v) => v.category));
  const tabs = GROUPS.filter((g) => g.id === 'all' || present.has(g.id as ActionCategory)).map((g) => ({ id: g.id, label: `${g.icon}${t(g.key)}` }));
  const LABELS = Object.fromEntries(tabs.map((g) => [g.id, g.label]));

  const filtered = views.filter((v) => (group === 'all' || v.category === group) && (!onlyAvailable || v.available));
  // Group variants of the same action into one row.
  const rows: { key: string; category: ActionCategory; views: ActionView[] }[] = [];
  for (const v of filtered) {
    const last = rows[rows.length - 1];
    if (last && last.views[0].id === v.id && v.param !== undefined) last.views.push(v);
    else rows.push({ key: v.id + (v.param ?? ''), category: v.category, views: [v] });
  }
  const categories = [...new Set(rows.map((r) => r.category))];

  return (
    <div>
      <Tabs tabs={tabs} value={group} onChange={setGroup} />
      <label className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-ink-soft">
        <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} className="h-5 w-5 shrink-0 accent-teal" />
        {t('act.onlyAvailable')}
      </label>
      {group === 'all' && suggested.length > 0 && (
        <section className="mt-2">
          <SectionTitle>{t('act.suggested')}</SectionTitle>
          <div className="grid gap-2">
            {suggested.map((v) => (
              <ActionCard key={`${v.id}:${v.param ?? ''}`} view={v} compact />
            ))}
          </div>
        </section>
      )}
      {rows.length === 0 && <div className="mt-4"><EmptyState icon="⏳" title={t('act.nothing')}>{t('act.nothing.hint')}</EmptyState></div>}
      {categories.map((cat) => {
        const catRows = rows.filter((r) => r.category === cat);
        const expanded = group !== 'all' || open.has(cat);
        const toggle = () =>
          setOpen((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
          });
        return (
          <section key={cat} className="mt-2">
            {group === 'all' ? (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={expanded}
                className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-1 text-left"
              >
                <span className="font-display text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">
                  {LABELS[cat] ?? cat} <span className="font-semibold normal-case tracking-normal">({catRows.length})</span>
                </span>
                <ChevronDown size={18} className={cx('shrink-0 text-ink-soft transition-transform', expanded && 'rotate-180')} aria-hidden />
              </button>
            ) : (
              <SectionTitle>{LABELS[cat] ?? cat}</SectionTitle>
            )}
            {expanded && (
              <div className="mt-1 grid gap-2">
                {catRows.map((r) =>
                  r.views.length > 1 ? (
                    <VariantRow key={r.key} views={r.views} icon={r.views[0].icon} title={variantTitle(r.views[0])} description={r.views[0].description} />
                  ) : (
                    <ActionCard key={r.key} view={r.views[0]} />
                  ),
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
