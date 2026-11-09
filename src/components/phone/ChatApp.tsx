// Sembang: the NPC chat threads of the game (the same sheet as the Feed tab) and the chats with real friends.

import { useState } from 'react';
import { chatScriptFor, chatText, chatThreads } from '../../engine/chat';
import type { ChatThreadId } from '../../data/chats';
import { useLoadedGame } from '../../hooks/useGame';
import { useSocial } from '../../hooks/useSocial';
import { useT } from '../../hooks/useT';
import { ChatSheet } from '../ChatSheet';
import { NpcAvatar } from '../PixelAvatar';
import { Button, Card, cx } from '../ui';
import { conversations, previewOf, timeLabel } from './phoneLogic';
import { AppScreen, FriendAvatar, Section, SignInCard, type PhoneNav } from './phoneUi';

export function ChatApp({ nav }: { nav: PhoneNav }) {
  const { state, settings } = useLoadedGame();
  const social = useSocial();
  const t = useT();
  const [npc, setNpc] = useState<ChatThreadId | null>(null);
  const locale = settings.language === 'ms' ? 'ms-MY' : 'en-GB';
  const now = new Date();
  const rows = social.me && social.on ? conversations(social.friends, social.chats, social.me) : [];
  const unread = new Set(social.unreadIds);

  return (
    <AppScreen title={t('phone.chat.title')} onBack={nav.pop}>
      <Section title={t('phone.chat.npc')}>
        <Card className="divide-y divide-ink/5 p-0">
          {chatThreads(state).map((th) => {
            const preview = chatScriptFor(state, th.id)?.opener.at(-1);
            return (
              <button key={th.id} type="button" onClick={() => setNpc(th.id)} className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left active:bg-paper-2">
                {th.partnerName ? <NpcAvatar name={th.partnerName} size={44} /> : <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-paper-2 text-2xl">{th.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold leading-tight">{th.title}</span>
                  <span className="block truncate text-xs text-ink-soft">{preview ? chatText(state, preview).replace(th.id === 'partner' ? /^[^:]{1,24}: / : /^$/, '') : ''}</span>
                </span>
                {th.repliedToday ? <span className="text-[10px] font-semibold text-ink-soft">✓ {t('chat.replied')}</span> : <span className="rounded-full bg-hibiscus px-2 py-0.5 text-[10px] font-bold text-white">{t('chat.new')}</span>}
              </button>
            );
          })}
        </Card>
      </Section>
      <ChatSheet thread={npc} onClose={() => setNpc(null)} />

      <Section title={t('phone.chat.real')}>
        {!social.cloudEnabled || !social.signedIn ? (
          <SignInCard />
        ) : social.status === 'loading' ? (
          <p className="py-6 text-center text-sm font-semibold text-ink-soft" role="status">
            {t('phone.loading')}
          </p>
        ) : social.status === 'error' ? (
          <Card className="text-center">
            <p className="text-sm font-semibold">{t('phone.error.load')}</p>
            {social.error && <p className="mt-1 break-words text-xs text-ink-soft">{social.error}</p>}
            <Button className="mt-3" onClick={social.retry}>
              {t('phone.retry')}
            </Button>
          </Card>
        ) : !social.on ? (
          <Card className="text-center">
            <p className="text-sm font-semibold">{t('phone.off.title')}</p>
            <p className="mt-1 text-sm text-ink-soft">{t('phone.off.body')}</p>
            <Button className="mt-3" onClick={() => nav.push({ k: 'me' })}>
              {t('phone.off.go')}
            </Button>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="text-center">
            <p className="text-sm text-ink-soft">{t('phone.chat.none')}</p>
            <Button className="mt-3" onClick={() => nav.push({ k: 'friends' })}>
              {t('phone.app.friends')}
            </Button>
          </Card>
        ) : (
          <Card className="divide-y divide-ink/5 p-0">
            {rows.map(({ entry, meta }) => {
              const isUnread = meta !== null && unread.has(meta.id);
              const preview = meta ? previewOf(meta.lastText) : null;
              const when = meta ? timeLabel(meta.lastAt, now, locale) : null;
              return (
                <button key={entry.uid} type="button" onClick={() => nav.push({ k: 'thread', uid: entry.uid })} className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left active:bg-paper-2">
                  <FriendAvatar profile={entry.profile} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className={cx('block truncate leading-tight', isUnread ? 'font-black' : 'font-bold')}>{entry.profile.displayName}</span>
                    <span className={cx('block truncate text-xs', isUnread ? 'font-semibold text-ink' : 'text-ink-soft')}>
                      {meta === null ? t('phone.chat.sayHi') : preview?.sticker ? `${meta.lastFrom === social.me ? t('phone.chat.you') : ''}${t('phone.chat.sticker')}` : `${meta.lastFrom === social.me ? t('phone.chat.you') : ''}${preview?.text ?? ''}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[11px] text-ink-soft">{when?.kind === 'yesterday' ? t('phone.chat.yesterday') : (when?.text ?? '')}</span>
                    {isUnread && (
                      <>
                        <span className="h-2.5 w-2.5 rounded-full bg-hibiscus" aria-hidden />
                        <span className="sr-only">{t('phone.chat.new')}</span>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </Card>
        )}
      </Section>
    </AppScreen>
  );
}
