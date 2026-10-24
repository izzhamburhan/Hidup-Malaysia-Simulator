import { useMemo, useState } from 'react';
import { listActions, type ActionView } from '../engine/simulationEngine';
import type { ActionCategory } from '../engine/actions';
import { useLoadedGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import { ActionCard, VariantRow } from '../components/ActionCard';
import { EmptyState, SectionTitle, Tabs } from '../components/ui';

const GROUPS: { id: 'all' | ActionCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'daily', label: '😴 Daily' },
  { id: 'work', label: '💼 Work' },
  { id: 'study', label: '🎒 Study' },
  { id: 'career', label: '📈 Grow' },
  { id: 'fitness', label: '🏋️ Fitness' },
  { id: 'leisure', label: '🎮 Leisure' },
  { id: 'social', label: '🫖 Social' },
  { id: 'love', label: '💞 Love' },
  { id: 'family', label: '🏡 Family' },
  { id: 'money', label: '💰 Money' },
  { id: 'hustle', label: '🛠️ Hustle' },
  { id: 'home', label: '🏠 Home' },
  { id: 'transport', label: '🚗 Transport' },
  { id: 'civic', label: '🏛️ Civic' },
];

const LABELS = Object.fromEntries(GROUPS.map((g) => [g.id, g.label]));

export function ActScreen() {
  const { state } = useLoadedGame();
  const [group, setGroup] = useState<'all' | ActionCategory>('all');
  // Defaults on so a new player sees what they can actually do right now, not a wall of
  // greyed-out locked actions. Still a toggle: nothing is removed, just hidden to start.
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const views = useMemo(() => listActions(state), [state]);
  const t = useT();
  const present = new Set(views.map((v) => v.category));
  const tabs = GROUPS.filter((g) => g.id === 'all' || present.has(g.id as ActionCategory));

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
      <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} className="accent-teal" />
        {t('act.onlyAvailable')}
      </label>
      {rows.length === 0 && <div className="mt-4"><EmptyState icon="⏳" title="Nothing available right now">Try waiting an hour, or check a different category.</EmptyState></div>}
      {categories.map((cat) => (
        <section key={cat} className="mt-4">
          <SectionTitle>{LABELS[cat] ?? cat}</SectionTitle>
          <div className="grid gap-2">
            {rows
              .filter((r) => r.category === cat)
              .map((r) =>
                r.views.length > 1 ? (
                  <VariantRow key={r.key} views={r.views} icon={r.views[0].icon} title={variantTitle(r.views[0])} description={r.views[0].description} />
                ) : (
                  <ActionCard key={r.key} view={r.views[0]} />
                ),
              )}
          </div>
        </section>
      ))}
    </div>
  );
}

function variantTitle(v: ActionView): string {
  const titles: Record<string, string> = {
    sleep: 'Sleep',
    wait: 'Wait',
    overtime: 'Overtime',
    study: 'Study',
    'pc-gaming': 'PC gaming',
    shopping: 'Go shopping',
    'online-course': 'Paid online course (RM180)',
    'self-study': 'Free self-study',
    date: 'Go on a date',
    wedding: 'Plan the wedding',
    save: 'Move cash to savings',
    withdraw: 'Withdraw from savings',
    'emergency-deposit': 'Top up emergency fund',
    'give-parents': 'Give parents money',
    'parent-allowance': 'Monthly allowance for parents',
    'work-hustle': 'Work on a side hustle',
  };
  return titles[v.id] ?? v.title;
}