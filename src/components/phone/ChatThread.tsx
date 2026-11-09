// One chat with a real friend: live bubbles, a sticker row, a text box with a counter, and a menu with
// Visit profile, Block and Report. Every text is masked again before it is drawn.

import { useEffect, useRef, useState } from 'react';
import { MoreVertical, Send } from 'lucide-react';
import { STICKERS, stickerById } from '../../data/stickers';
import { useLoadedGame } from '../../hooks/useGame';
import { useSocial } from '../../hooks/useSocial';
import { useT } from '../../hooks/useT';
import type { StringKey } from '../../i18n';
import { MESSAGE_MAX, REPORT_REASONS, chatIdOf, type ChatMessage, type ReportReason } from '../../lib/social';
import { maskText } from '../../lib/wordFilter';
import { Button, Modal, cx } from '../ui';
import { chatBlock, charCount, composeState, limitChars, timeLabel } from './phoneLogic';
import { AppScreen, FriendAvatar, Notice, type PhoneNav } from './phoneUi';

const REASON_KEY: Record<ReportReason, StringKey> = {
  rude: 'phone.report.rude',
  bullying: 'phone.report.bullying',
  'personal-info': 'phone.report.personal-info',
  other: 'phone.report.other',
};

const BLOCK_KEY: Record<'not-friends' | 'mine-off' | 'theirs-closed', StringKey> = {
  'not-friends': 'phone.thread.notFriends',
  'mine-off': 'phone.thread.mineOff',
  'theirs-closed': 'phone.thread.theirsClosed',
};

export function ChatThread({ uid, nav }: { uid: string; nav: PhoneNav }) {
  const social = useSocial();
  const socialRef = useRef(social);
  socialRef.current = social;
  const { settings } = useLoadedGame();
  const t = useT();
  const entry = social.friendsByUid.get(uid);
  const name = entry?.profile.displayName ?? '';
  const chatId = social.me ? chatIdOf(social.me, uid) : '';
  const locale = settings.language === 'ms' ? 'ms-MY' : 'en-GB';

  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | 'menu' | 'block' | 'report'>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Live messages while the thread is open.
  useEffect(() => {
    setMessages(null);
    setLiveError(null);
    return socialRef.current.watchThread(
      uid,
      (list) => {
        setMessages(list);
        setLiveError(null);
      },
      (message) => {
        setLiveError(message);
        setMessages((m) => m ?? []);
      },
    );
  }, [uid, social.me]);

  // New messages: show the latest one and mark the chat read.
  const count = messages?.length ?? 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
    if (chatId) socialRef.current.markRead(chatId);
  }, [count, chatId]);

  const block = chatBlock({ myChatOn: social.chatOn, theirChatOpen: entry?.profile.chatOpen ?? false, mutual: entry !== undefined });
  const compose = composeState(text);
  const now = new Date();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (compose !== 'ok' || sending) return;
    setSending(true);
    const res = await social.sendText(uid, text);
    setSending(false);
    if (res.ok) {
      setText('');
      setSendError(null);
    } else setSendError(res.error);
  };

  const sticker = async (id: string) => {
    if (sending) return;
    setSending(true);
    const res = await social.sendSticker(uid, id);
    setSending(false);
    setSendError(res.ok ? null : res.error);
  };

  const doBlock = async () => {
    setBusy(true);
    const res = await social.block(uid);
    setBusy(false);
    if (res.ok) {
      setDialog(null);
      nav.reset({ k: 'chat' });
    } else setActionError(res.error);
  };

  const doReport = async () => {
    if (!reason) return;
    setBusy(true);
    const res = await social.report(uid, reason);
    setBusy(false);
    if (res.ok) {
      setDialog(null);
      nav.reset({ k: 'chat' });
    } else setActionError(res.error);
  };

  const closeDialog = () => {
    if (busy) return;
    setDialog(null);
    setActionError(null);
    setReason(null);
  };

  const composer = block ? (
    <div className="shrink-0 border-t border-ink/5 bg-paper px-4 py-3">
      <Notice>{t(BLOCK_KEY[block], { name })}</Notice>
    </div>
  ) : (
    <div className="shrink-0 border-t border-ink/5 bg-paper px-3 pb-2 pt-2">
      <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1" role="group" aria-label={t('phone.thread.stickers')}>
        {STICKERS.map((s) => (
          <button key={s.id} type="button" disabled={sending} onClick={() => void sticker(s.id)} aria-label={settings.language === 'ms' ? s.ms : s.en} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm active:scale-90 disabled:opacity-50">
            {s.emoji}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => void submit(e)} className="mt-2 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(limitChars(e.target.value, MESSAGE_MAX + 40))}
          placeholder={t('phone.thread.placeholder')}
          aria-label={t('phone.thread.placeholder')}
          enterKeyHint="send"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-full border border-ink/15 bg-white px-4 text-base"
        />
        <Button type="submit" disabled={compose !== 'ok' || sending} className="h-11 w-11 shrink-0 !rounded-full !p-0" aria-label={t('phone.thread.send')}>
          <Send size={18} aria-hidden />
        </Button>
      </form>
      <div className="mt-1 flex items-start justify-between gap-2 px-2 text-[11px]">
        <span className={cx(sendError || compose === 'long' ? 'font-semibold text-[#9a3412]' : 'text-ink-soft')} role={sendError ? 'alert' : undefined}>
          {sendError ?? (compose === 'long' ? t('phone.thread.long', { max: MESSAGE_MAX }) : compose === 'empty' ? t('phone.thread.emptyHint') : '')}
        </span>
        <span className={cx('shrink-0 tabular-nums', compose === 'long' ? 'font-semibold text-[#9a3412]' : 'text-ink-soft')}>
          {charCount(text.trim())}/{MESSAGE_MAX}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <AppScreen
        title={
          entry ? (
            <button type="button" onClick={() => nav.push({ k: 'card', uid })} className="inline-flex max-w-full items-center gap-2 align-middle">
              <FriendAvatar profile={entry.profile} size={30} />
              <span className="truncate">{name}</span>
            </button>
          ) : (
            t('phone.chat.title')
          )
        }
        onBack={nav.pop}
        right={
          entry && (
            <button type="button" onClick={() => setDialog('menu')} aria-label={t('phone.thread.menu')} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft active:bg-paper-2">
              <MoreVertical size={22} aria-hidden />
            </button>
          )
        }
        footer={entry ? composer : undefined}
      >
        {!entry ? (
          <Notice>{t('phone.thread.missing')}</Notice>
        ) : (
          <div className="min-h-full space-y-2 rounded-2xl bg-[#e9e2d3] p-3">
            {liveError && <Notice tone="error">{liveError}</Notice>}
            {messages === null && (
              <p className="py-6 text-center text-sm font-semibold text-ink-soft" role="status">
                {t('phone.loading')}
              </p>
            )}
            {messages?.length === 0 && !liveError && <p className="py-6 text-center text-sm text-ink-soft">{t('phone.thread.empty')}</p>}
            {messages?.map((m) => {
              const mine = m.from === social.me;
              const when = timeLabel(m.at, now, locale);
              const def = m.kind === 'sticker' ? stickerById(m.sticker ?? undefined) : undefined;
              return (
                <div key={m.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cx('max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm', mine ? 'rounded-br-md bg-teal text-white' : 'rounded-bl-md bg-white text-ink')}>
                    {m.kind === 'sticker' ? (
                      <div className="text-center">
                        <div className="text-5xl leading-none" aria-hidden>
                          {def?.emoji ?? '💬'}
                        </div>
                        <div className="mt-1 text-xs font-bold">{def ? (settings.language === 'ms' ? def.ms : def.en) : t('phone.sticker.unknown')}</div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{maskText(m.text)}</p>
                    )}
                    <div className={cx('mt-0.5 text-right text-[10px]', mine ? 'text-white/75' : 'text-ink-soft')}>{when.kind === 'yesterday' ? t('phone.chat.yesterday') : when.text}</div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </AppScreen>

      <Modal
        open={dialog === 'menu'}
        onClose={closeDialog}
        title={name}
      >
        <div className="grid gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setDialog(null);
              nav.push({ k: 'card', uid });
            }}
          >
            {t('phone.thread.visit')}
          </Button>
          <Button variant="secondary" onClick={() => setDialog('block')}>
            {t('phone.thread.block')}
          </Button>
          <Button variant="secondary" onClick={() => setDialog('report')}>
            {t('phone.thread.report')}
          </Button>
        </div>
      </Modal>

      <Modal
        open={dialog === 'block'}
        onClose={closeDialog}
        title={t('phone.block.title', { name })}
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={closeDialog}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void doBlock()}>
              {t('phone.block.confirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">{t('phone.block.body')}</p>
        {actionError && <div className="mt-3"><Notice tone="error">{actionError}</Notice></div>}
      </Modal>

      <Modal
        open={dialog === 'report'}
        onClose={closeDialog}
        title={t('phone.report.title', { name })}
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={closeDialog}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" disabled={busy || reason === null} onClick={() => void doReport()}>
              {t('phone.report.confirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">{t('phone.report.body')}</p>
        <div className="mt-3 grid gap-2" role="radiogroup" aria-label={t('phone.thread.report')}>
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className={cx('flex min-h-[44px] items-center gap-3 rounded-xl border-2 px-3 text-left text-sm font-semibold', reason === r ? 'border-teal bg-teal-soft' : 'border-transparent bg-paper-2')}
            >
              <span className={cx('h-4 w-4 shrink-0 rounded-full border-2', reason === r ? 'border-teal bg-teal' : 'border-ink/30')} aria-hidden />
              {t(REASON_KEY[r])}
            </button>
          ))}
        </div>
        {reason === null && <p className="mt-2 text-xs text-ink-soft">{t('phone.report.pick')}</p>}
        {actionError && <div className="mt-3"><Notice tone="error">{actionError}</Notice></div>}
      </Modal>
    </>
  );
}
