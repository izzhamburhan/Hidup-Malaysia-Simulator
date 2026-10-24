import { QUEST_REWARD, type QuestTab } from '../data/quests';
import { questStatus } from '../engine/quests';
import { viewAction } from '../engine/simulationEngine';
import { useLoadedGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import { cx } from './ui';

/** The new-life quest list on Home. Gone once every quest is claimed. */
export function StarterQuests({ go }: { go: (tab: QuestTab) => void }) {
  const { state, request } = useLoadedGame();
  const t = useT();
  const list = questStatus(state);
  if (!list || list.every((q) => q.claimed)) return null;
  const claimed = list.filter((q) => q.claimed).length;

  return (
    <section id="starter-quests" className="scroll-mt-24 rounded-2xl border border-teal/25 bg-white p-3 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="font-display text-base font-black">🎯 {t('quests.title')}</h2>
        <span className="rounded-full bg-teal-soft px-2 py-0.5 text-[11px] font-bold text-teal">
          {claimed}/{list.length}
        </span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full bg-teal-2 transition-all duration-500" style={{ width: `${(claimed / list.length) * 100}%` }} />
      </div>
      <ul className="space-y-1.5">
        {list.map(({ quest, done, claimed: got }) => (
          <li key={quest.id} className={cx('flex items-center gap-2 rounded-xl px-2 py-1.5', done && !got ? 'bg-gold-soft' : got ? 'opacity-55' : '')}>
            <span className="text-xl" aria-hidden>
              {got ? '✅' : quest.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cx('block text-[13px] font-bold leading-tight', got && 'line-through')}>{quest.title}</span>
              {!got && <span className="block text-[11px] leading-tight text-ink-soft">{quest.hint}</span>}
            </span>
            {done && !got && (
              <button
                type="button"
                onClick={() => {
                  const v = viewAction(state, 'claim-quest', quest.id);
                  if (v) request(v, 'tile');
                }}
                className="shrink-0 rounded-full bg-teal px-3 py-1 text-xs font-bold text-white shadow-sm active:scale-95"
              >
                {t('quests.claim', { n: QUEST_REWARD.cash })}
              </button>
            )}
            {!done && quest.tab !== 'home' && (
              <button type="button" onClick={() => go(quest.tab)} className="shrink-0 rounded-full border border-teal/30 px-3 py-1 text-xs font-bold text-teal active:scale-95">
                {t('quests.go')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}