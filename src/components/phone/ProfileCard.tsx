// A friend's profile card (the published snapshot, read only) with Chat, Send a gift, reaction stickers and
// Remove friend. Also exports the card hero and the gift picker, which Profil and Hadiah reuse.

import { useState } from 'react';
import { GIFTS } from '../../data/gifts';
import { STICKERS } from '../../data/stickers';
import { useLoadedGame } from '../../hooks/useGame';
import { useSocial } from '../../hooks/useSocial';
import { useT } from '../../hooks/useT';
import type { Profile } from '../../lib/social';
import { StateFlag } from '../StateFlag';
import { Button, Card, Modal } from '../ui';
import { chatBlock, netWorthLabel } from './phoneLogic';
import { AppScreen, FriendAvatar, Notice, Section, type PhoneNav } from './phoneUi';

export function netWorthText(t: ReturnType<typeof useT>, band: string): string {
  const l = netWorthLabel(band);
  switch (l.key) {
    case 'under':
      return t('phone.nw.under', { to: l.to });
    case 'range':
      return t('phone.nw.range', { from: l.from, to: l.to });
    case 'plus':
      return t('phone.nw.plus', { from: l.from });
    case 'neg':
      return t('phone.nw.neg');
    default:
      return t('phone.nw.na');
  }
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-paper-2 p-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-0.5 text-sm font-bold leading-snug">{children}</div>
    </div>
  );
}

/** Avatar, name, life stage and the stat tiles of a profile. */
export function ProfileHero({ profile }: { profile: Profile }) {
  const t = useT();
  const s = profile.snapshot;
  return (
    <Card tier="hero">
      <div className="flex flex-col items-center text-center">
        <span className="rounded-3xl bg-white p-2 shadow-sm">
          <FriendAvatar profile={profile} size={96} className="!bg-transparent" />
        </span>
        <h2 className="font-display mt-2 break-words text-2xl font-black leading-tight">{profile.displayName}</h2>
        <p className="text-sm font-semibold text-ink-soft">{t(`phone.stage.${s.lifeStage}`)}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Tile label={t('phone.card.job')}>{s.jobTitle ?? t('phone.card.noJob')}</Tile>
        <Tile label={t('phone.card.state')}>
          {s.state ? (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <StateFlag state={s.state} width={20} />
              {s.state}
            </span>
          ) : (
            '—'
          )}
        </Tile>
        <Tile label={t('phone.card.day', { n: s.day + 1 })}>{t('phone.card.age', { n: s.age })}</Tile>
        <Tile label={t('phone.card.networth')}>{netWorthText(t, s.netWorthBand)}</Tile>
        <Tile label={t('phone.card.achievements')}>{s.achievements}</Tile>
        <Tile label={t('phone.card.stamps')}>{s.stamps}</Tile>
      </div>
    </Card>
  );
}

/** One free gift a day per friend. The reason it cannot be sent comes straight from the client. */
export function GiftPicker({ uid, name, open, onClose }: { uid: string; name: string; open: boolean; onClose: () => void }) {
  const social = useSocial();
  const { settings } = useLoadedGame();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const already = social.giftSentTo(uid);

  const send = async (kind: string) => {
    setBusy(true);
    const res = await social.sendGift(uid, kind);
    setBusy(false);
    setResult(res.ok ? { tone: 'ok', text: t('phone.gift.sent', { name }) } : { tone: 'error', text: res.error });
  };

  return (
    <Modal open={open} onClose={onClose} title={t('phone.gift.title', { name })}>
      <p className="text-sm text-ink-soft">{t('phone.gift.body')}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {GIFTS.map((g) => (
          <button
            key={g.id}
            type="button"
            disabled={busy || already}
            onClick={() => void send(g.id)}
            className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border border-ink/10 bg-white p-2 text-center text-sm font-semibold shadow-sm active:scale-95 disabled:opacity-50"
          >
            <span className="text-3xl" aria-hidden>
              {g.icon}
            </span>
            {settings.language === 'ms' ? g.nameMs : g.name}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {already && !result ? <Notice>{t('phone.gift.already', { name })}</Notice> : result ? <Notice tone={result.tone}>{result.text}</Notice> : null}
      </div>
    </Modal>
  );
}

export function ProfileCard({ uid, nav }: { uid: string; nav: PhoneNav }) {
  const social = useSocial();
  const { settings } = useLoadedGame();
  const t = useT();
  const entry = social.friendsByUid.get(uid);
  const [giftOpen, setGiftOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  if (!entry) {
    return (
      <AppScreen title={t('phone.card.title')} onBack={nav.pop}>
        <Notice>{t('phone.thread.missing')}</Notice>
      </AppScreen>
    );
  }
  const profile = entry.profile;
  const name = profile.displayName;
  const block = chatBlock({ myChatOn: social.chatOn, theirChatOpen: profile.chatOpen, mutual: true });

  const react = async (id: string, label: string) => {
    setBusy(true);
    const res = await social.sendSticker(uid, id);
    setBusy(false);
    setNote(res.ok ? { tone: 'ok', text: t('phone.card.sent', { what: label, name }) } : { tone: 'error', text: res.error });
  };

  const remove = async () => {
    setBusy(true);
    const res = await social.unfriend(uid);
    setBusy(false);
    if (res.ok) {
      setConfirm(false);
      nav.reset({ k: 'friends' });
    } else setNote({ tone: 'error', text: res.error });
  };

  return (
    <AppScreen title={t('phone.card.title')} onBack={nav.pop}>
      <ProfileHero profile={profile} />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={() => nav.push({ k: 'thread', uid })}>{t('phone.card.chat')}</Button>
        <Button variant="gold" onClick={() => setGiftOpen(true)}>
          {t('phone.card.gift')}
        </Button>
      </div>

      <Section title={t('phone.card.react')}>
        {block ? (
          <Notice>{t(block === 'mine-off' ? 'phone.thread.mineOff' : block === 'theirs-closed' ? 'phone.thread.theirsClosed' : 'phone.thread.notFriends', { name })}</Notice>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {STICKERS.map((s) => {
              const label = settings.language === 'ms' ? s.ms : s.en;
              return (
                <button key={s.id} type="button" disabled={busy} onClick={() => void react(s.id, label)} aria-label={label} className="flex h-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm active:scale-90 disabled:opacity-50">
                  {s.emoji}
                </button>
              );
            })}
          </div>
        )}
        {note && (
          <div className="mt-2">
            <Notice tone={note.tone}>{note.text}</Notice>
          </div>
        )}
      </Section>

      <div className="mt-6">
        <Button variant="secondary" className="w-full !text-[#9a3412]" disabled={busy} onClick={() => setConfirm(true)}>
          {t('phone.card.remove')}
        </Button>
      </div>

      <GiftPicker uid={uid} name={name} open={giftOpen} onClose={() => setGiftOpen(false)} />
      <Modal
        open={confirm}
        onClose={() => !busy && setConfirm(false)}
        title={t('phone.remove.title', { name })}
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void remove()}>
              {t('phone.card.remove')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">{t('phone.remove.body')}</p>
      </Modal>
    </AppScreen>
  );
}
