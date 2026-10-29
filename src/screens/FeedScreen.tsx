import { Heart } from 'lucide-react';
import { formatTime } from '../engine/calendar';
import { viewAction } from '../engine/simulationEngine';
import { useState } from 'react';
import { useLoadedGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import { ChatSheet } from '../components/ChatSheet';
import { chatScriptFor, chatText, chatThreads } from '../engine/chat';
import type { ChatThreadId } from '../data/chats';
import { NpcAvatar, PixelAvatar } from '../components/PixelAvatar';
import { ActionCard } from '../components/ActionCard';
import { Card, Disclaimer, EmptyState, Pill, cx } from '../components/ui';

const AVATAR_COLORS = ['bg-teal', 'bg-hibiscus', 'bg-gold', 'bg-leaf', 'bg-sky', 'bg-teal-2'];

export function FeedScreen() {
  const { state, interact } = useLoadedGame();
  const scroll = viewAction(state, 'scroll-feed');
  const t = useT();
  const [open, setOpen] = useState<ChatThreadId | null>(null);
  return (
    <div>
      <h2 className="font-display text-xl font-black">💬 {t('chat.title')}</h2>
      <p className="text-xs text-ink-soft">{t('chat.hint')}</p>
      <Card className="mt-2 mb-4 divide-y divide-ink/5 p-0">
        {chatThreads(state).map((th) => {
          const preview = chatScriptFor(state, th.id)?.opener.at(-1);
          return (
            <button key={th.id} type="button" onClick={() => setOpen(th.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-paper-2">
              {th.partnerName ? <NpcAvatar name={th.partnerName} size={40} /> : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper-2 text-2xl">{th.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block font-bold leading-tight">{th.title}</span>
                <span className="block truncate text-xs text-ink-soft">{preview ? chatText(state, preview).replace(th.id === 'partner' ? /^[^:]{1,24}: / : /^$/, '') : ''}</span>
              </span>
              {th.repliedToday ? <span className="text-[10px] font-semibold text-ink-soft">✓ {t('chat.replied')}</span> : <span className="rounded-full bg-hibiscus px-2 py-0.5 text-[10px] font-bold text-white">{t('chat.new')}</span>}
            </button>
          );
        })}
      </Card>
      <ChatSheet thread={open} onClose={() => setOpen(null)} />
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
                    className={cx('-ml-2 inline-flex min-h-[44px] items-center gap-1 px-2 text-sm font-semibold', p.liked ? 'text-hibiscus' : 'text-ink-soft')}
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
                        'min-h-[44px] rounded-full px-4 text-sm font-semibold',
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