// Hadiah: gifts friends sent me (opened through the engine action `open-gift`, three a game day) and a shortcut to
// send one back. A gift is only removed from the cloud after the engine accepted it.

import { useState } from 'react';
import { giftById } from '../../data/gifts';
import { viewAction } from '../../engine/simulationEngine';
import { useLoadedGame } from '../../hooks/useGame';
import { useSocial } from '../../hooks/useSocial';
import { useT } from '../../hooks/useT';
import type { Gift } from '../../lib/social';
import { Button, Card } from '../ui';
import { GiftPicker } from './ProfileCard';
import { AppScreen, FriendAvatar, FriendsGate, Notice, Section, type PhoneNav } from './phoneUi';

export function GiftsApp({ nav }: { nav: PhoneNav }) {
  const t = useT();
  return (
    <AppScreen title={t('phone.gifts.title')} onBack={nav.pop}>
      <FriendsGate nav={nav}>
        <Body />
      </FriendsGate>
    </AppScreen>
  );
}

function Body() {
  const { state, act, dismissFeedback, settings } = useLoadedGame();
  const social = useSocial();
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pick, setPick] = useState<{ uid: string; name: string } | null>(null);
  const ms = settings.language === 'ms';

  const open = async (gift: Gift) => {
    setBusy(gift.id);
    setNote(null);
    const def = giftById(gift.kind);
    const fb = act('open-gift', gift.kind); // the engine applies the effect and may refuse (three a day)
    if (!fb.ok) {
      setBusy(null);
      setNote({ tone: 'error', text: fb.error ?? '' });
      return;
    }
    dismissFeedback(); // the toast would sit behind the phone; the result is shown here
    const res = await social.claimGift(gift.id);
    setBusy(null);
    setNote(res.ok ? { tone: 'ok', text: t('phone.gifts.opened', { gift: def ? (ms ? def.nameMs : def.name) : '', name: gift.fromName }) } : { tone: 'error', text: t('phone.gifts.claimFail') });
  };

  const discard = async (gift: Gift) => {
    setBusy(gift.id);
    const res = await social.claimGift(gift.id);
    setBusy(null);
    if (!res.ok) setNote({ tone: 'error', text: res.error });
  };

  return (
    <>
      <Section title={t('phone.gifts.waiting')}>
        {social.gifts.length === 0 ? (
          <Card className="text-center text-sm text-ink-soft">{t('phone.gifts.none')}</Card>
        ) : (
          <Card className="divide-y divide-ink/5 p-0">
            {social.gifts.map((g) => {
              const def = giftById(g.kind);
              const view = def ? viewAction(state, 'open-gift', g.kind) : null;
              const reason = view && !view.available ? (view.reason ?? null) : null;
              return (
                <div key={g.id} className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-soft text-3xl" aria-hidden>
                      {def?.icon ?? '🎁'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold leading-tight">{def ? (ms ? def.nameMs : def.name) : t('phone.gifts.unknown')}</p>
                      <p className="truncate text-xs text-ink-soft">{t('phone.gifts.from', { name: g.fromName })}</p>
                    </div>
                    {def ? (
                      <Button disabled={busy !== null || reason !== null} onClick={() => void open(g)}>
                        {t('phone.gifts.open')}
                      </Button>
                    ) : (
                      <Button variant="secondary" disabled={busy !== null} onClick={() => void discard(g)}>
                        {t('phone.gifts.discard')}
                      </Button>
                    )}
                  </div>
                  {reason && <p className="mt-1.5 text-xs font-semibold text-[#9a3412]">{reason}</p>}
                </div>
              );
            })}
          </Card>
        )}
        {note && (
          <div className="mt-2">
            <Notice tone={note.tone}>{note.text}</Notice>
          </div>
        )}
      </Section>

      <Section title={t('phone.gifts.send')}>
        {social.friends.length === 0 ? (
          <Card className="text-center text-sm text-ink-soft">{t('phone.gifts.sendNone')}</Card>
        ) : (
          <Card className="divide-y divide-ink/5 p-0">
            {social.friends.map((f) => {
              const sentToday = social.giftSentTo(f.uid);
              return (
                <div key={f.uid} className="flex items-center gap-3 px-3 py-2.5">
                  <FriendAvatar profile={f.profile} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold leading-tight">{f.profile.displayName}</p>
                    {sentToday && <p className="text-xs text-ink-soft">{t('phone.gift.already', { name: f.profile.displayName })}</p>}
                  </div>
                  <Button variant="gold" className="!px-3 !py-2" disabled={sentToday} onClick={() => setPick({ uid: f.uid, name: f.profile.displayName })}>
                    {t('phone.gifts.sendBtn')}
                  </Button>
                </div>
              );
            })}
          </Card>
        )}
      </Section>

      {pick && <GiftPicker uid={pick.uid} name={pick.name} open onClose={() => setPick(null)} />}
    </>
  );
}
