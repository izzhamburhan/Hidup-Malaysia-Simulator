import { Heart } from 'lucide-react';
import { formatTime } from '../engine/calendar';
import { viewAction } from '../engine/simulationEngine';
import { useLoadedGame } from '../hooks/useGame';
import { NpcAvatar, PixelAvatar } from '../components/PixelAvatar';
import { ActionCard } from '../components/ActionCard';
import { Card, Disclaimer, EmptyState, Pill, cx } from '../components/ui';

const AVATAR_COLORS = ['bg-teal', 'bg-hibiscus', 'bg-gold', 'bg-leaf', 'bg-sky', 'bg-teal-2'];

export function FeedScreen() {
  const { state, interact } = useLoadedGame();
  const scroll = viewAction(state, 'scroll-feed');
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-black">Kecoh 📣</h2>
        <Pill tone="gold">Fictional feed</Pill>
      </div>
      <p className="text-xs text-ink-soft">Posts from fictional friends and the fictional town of Seri Harapan. No real accounts are connected.</p>
      {scroll && (
        <div className="mt-3">
          <ActionCard view={scroll} compact />
        </div>
      )}
      <div className="mt-3 space-y-2">
        {state.feed.length === 0 && <EmptyState icon="📭" title="Quiet timeline">Come back tomorrow.</EmptyState>}
        {state.feed.map((p) => (
          <Card key={p.id} className={cx('p-3', p.kind === 'player' && 'border-teal/40 bg-teal-soft/40')}>
            <div className="flex items-start gap-3">
              {p.kind === 'player' ? (
                <span className="inline-flex h-10 w-10 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-teal-soft">
                  <PixelAvatar appearance={state.character.appearance} mood="happy" size={36} />
                </span>
              ) : p.kind === 'world' ? (
                <div className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white', AVATAR_COLORS[p.author.length % AVATAR_COLORS.length])}>{p.author[0]}</div>
              ) : (
                <NpcAvatar name={p.author} size={40} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                  <span className="font-bold">{p.author}</span>
                  <span className="text-xs text-ink-soft">{p.handle}</span>
                  <span className="text-xs text-ink-soft">· {p.day === state.clock.day ? formatTime(p.minute) : `day ${p.day + 1}`}</span>
                </div>
                <p className="mt-0.5 text-sm leading-snug">{p.text}</p>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => interact('like', p.id)}
                    className={cx('inline-flex items-center gap-1 text-xs font-semibold', p.liked ? 'text-hibiscus' : 'text-ink-soft')}
                    aria-pressed={p.liked}
                  >
                    <Heart size={14} fill={p.liked ? 'currentColor' : 'none'} /> {p.likes}
                  </button>
                  {p.invite && (
                    <button
                      type="button"
                      disabled={p.invite.used || state.events.pending.length > 0}
                      onClick={() => interact('invite', p.id)}
                      className={cx(
                        'rounded-full px-3 py-1 text-xs font-semibold',
                        p.invite.used ? 'bg-paper-2 text-ink-soft' : 'bg-teal text-white hover:bg-teal-2 disabled:bg-teal/40',
                      )}
                    >
                      {p.invite.used ? 'Replied' : p.invite.label}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Disclaimer>Comparison anxiety is a toggleable mechanic in Settings. Everyone's feed is a highlight reel.</Disclaimer>
    </div>
  );
}
