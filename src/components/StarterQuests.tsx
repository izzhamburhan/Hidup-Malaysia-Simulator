import { ChevronDown } from 'lucide-react';
import { QUEST_REWARD, type QuestTab } from '../data/quests';
import { questStatus } from '../engine/quests';
import { viewAction } from '../engine/simulationEngine';
import { useLoadedGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import { cx } from './ui';

/**
 * The new-life quest list on Home. Gone once every quest is claimed. Collapsed it is one summary
 * line (progress and the next quest); the parent owns `open` so the room's goal card can expand it.
 */
export function StarterQuests({ go, open, onToggle }: { go: (tab: QuestTab) => void; open: boolean; onToggle: () => void }) {
  const { state, request } = useLoadedGame();
  const t = useT();
  const list = questStatus(state);
  if (!list || list.every((q) => q.claimed)) return null;
  const claimed = list.filter((q) => q.claimed).length;
  const ready = list.find((q) => q.done && !q.claimed);
  const upNext = ready ?? list.find((q) => !q.done && !q.claimed);

  const claim = (id: string) => {
    const v = viewAction(state, 'claim-quest', id);
    if (v) request(v, 'tile');
  };

  return (
    <section id="starter-quests" className="songket-edge scroll-mt-24 rounded-2xl border border-gold/50 bg-gold-soft shadow-[0_2px_8px_rgba(29,27,22,0.12)]">
      <div className="flex items-center gap-2 pr-2">
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls="starter-quests-list" className="flex min-h-[48px] min-w-0 flex-1 items-center gap-2 rounded-2xl px-3 text-left">
          <span aria-hidden>🎯</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-black leading-tight">
              {t('quests.title')} <span className="font-bold text-teal">{claimed}/{list.length}</span>
            </span>
            {upNext && <span className="block truncate text-[11px] leading-tight text-ink-soft">{upNext.quest.icon} {upNext.quest.title}</span>}
          </span>
          <ChevronDown size={18} className={cx('shrink-0 text-teal transition', open && 'rotate-180')} aria-hidden />
        </button>
        {ready && (
          <button
            type="button"
            onClick={() => claim(ready.quest.id)}
            className="min-h-[44px] shrink-0 rounded-full bg-teal px-3 text-[13px] font-bold text-white shadow-sm active:scale-95"
          >
            {t('quests.claim', { n: QUEST_REWARD.cash })}
          </button>
        )}
      </div>
      {open && (
        <div id="starter-quests-list" className="px-3 pb-3">
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-paper-2">
            <div className="h-full rounded-full bg-teal-2 transition-all duration-500" style={{ width: `${(claimed / list.length) * 100}%` }} />
          </div>
          <ul className="space-y-1.5">
            {list.map(({ quest, done, claimed: got }) => (
              <li key={quest.id} className={cx('flex items-center gap-2 rounded-xl px-2 py-1.5', done && !got ? 'bg-white' : got ? 'opacity-55' : '')}>
                <span className="text-xl" aria-hidden>
                  {got ? '✅' : quest.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx('block text-[13px] font-bold leading-tight', got && 'line-through')}>{quest.title}</span>
                  {!got && <span className="block text-[11px] leading-tight text-ink-soft">{quest.hint}</span>}
                </span>
                {done && !got && (
                  <button type="button" onClick={() => claim(quest.id)} className="min-h-[44px] shrink-0 rounded-full bg-teal px-4 text-sm font-bold text-white shadow-sm active:scale-95">
                    {t('quests.claim', { n: QUEST_REWARD.cash })}
                  </button>
                )}
                {!done && quest.tab !== 'home' && (
                  <button type="button" onClick={() => go(quest.tab)} className="min-h-[44px] shrink-0 rounded-full border border-teal/30 px-4 text-sm font-bold text-teal active:scale-95">
                    {t('quests.go')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
