import { useEffect, useState } from 'react';
import type { ChatScript, ChatThreadId } from '../data/chats';
import { CHAT_THREAD_INFO } from '../data/chats';
import { chatScriptFor, chatText, repliedToday } from '../engine/chat';
import { viewAction } from '../engine/simulationEngine';
import { useLoadedGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import { NpcAvatar } from './PixelAvatar';
import { Modal, cx } from './ui';

type Phase = 'choose' | 'typing' | 'done';

function split(line: string): { who: string | null; text: string } {
  const m = /^([^:]{1,24}): (.*)$/.exec(line);
  return m ? { who: m[1], text: m[2] } : { who: null, text: line };
}

/** One chat thread: their messages, three replies to pick from, and their answer. */
export function ChatSheet({ thread, onClose }: { thread: ChatThreadId | null; onClose: () => void }) {
  const { state, request } = useLoadedGame();
  const t = useT();
  const [script, setScript] = useState<ChatScript | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('choose');
  const [already, setAlready] = useState(false);

  useEffect(() => {
    if (!thread) return;
    // Captured on open, so the conversation stays the same even if the reply crosses midnight.
    setScript(chatScriptFor(state, thread));
    setAlready(repliedToday(state, thread));
    setPicked(null);
    setPhase('choose');
    // Only re-run when a different thread is opened.
  }, [thread]);

  useEffect(() => {
    if (phase !== 'typing') return;
    const id = setTimeout(() => setPhase('done'), 900);
    return () => clearTimeout(id);
  }, [phase]);

  if (!thread || !script) return null;
  const partner = state.relationships.partner;
  const title = thread === 'partner' ? (partner?.name ?? '') : CHAT_THREAD_INFO[thread].title;
  const reply = script.replies.find((r) => r.id === picked);

  const send = (replyId: string) => {
    const v = viewAction(state, 'chat-reply', `${thread}:${replyId}`);
    if (!v) return;
    request(v, 'list');
    if (v.available) {
      setPicked(replyId);
      setPhase('typing');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {thread === 'partner' && partner ? <NpcAvatar name={partner.name} size={30} /> : <span className="text-2xl">{CHAT_THREAD_INFO[thread as 'friends'].icon}</span>}
          {title}
        </span>
      }
    >
      <div className="space-y-2 rounded-2xl bg-[#e9e2d3] p-3">
        {script.opener.map((line, i) => {
          const { who, text } = split(chatText(state, line));
          return <Bubble key={i} who={thread === 'partner' ? null : who} text={text} />;
        })}
        {reply && <Bubble mine text={chatText(state, reply.text)} />}
        {phase === 'typing' && <Bubble typing />}
        {phase === 'done' && reply && (() => {
          const { who, text } = split(chatText(state, reply.reply));
          return <Bubble who={thread === 'partner' ? null : who} text={text} />;
        })()}
      </div>
      {already || phase === 'done' ? (
        <p className="mt-3 text-center text-xs text-ink-soft">{t('chat.tomorrow')}</p>
      ) : (
        phase === 'choose' && (
          <div className="mt-3 grid gap-2">
            {script.replies.map((r) => (
              <button key={r.id} type="button" onClick={() => send(r.id)} className="rounded-2xl border border-teal/30 bg-white px-3 py-2.5 text-left text-sm font-semibold text-ink shadow-sm active:scale-[0.98]">
                {chatText(state, r.text)}
              </button>
            ))}
          </div>
        )
      )}
    </Modal>
  );
}

function Bubble({ who, text, mine, typing }: { who?: string | null; text?: string; mine?: boolean; typing?: boolean }) {
  return (
    <div className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cx('anim-pop max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm', mine ? 'rounded-br-md bg-teal text-white' : 'rounded-bl-md bg-white text-ink')}>
        {who && <div className="text-[11px] font-bold text-hibiscus">{who}</div>}
        {typing ? <span className="tracking-[0.3em] text-ink-soft">•••</span> : text}
      </div>
    </div>
  );
}