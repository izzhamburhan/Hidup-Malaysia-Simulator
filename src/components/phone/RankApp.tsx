// Ranking: me and my friends, ordered by achievements, days lived, travel stamps or net worth band.
// For fun only: the note says so, and nothing here changes the game.

import { useMemo, useState } from 'react';
import { useLoadedGame } from '../../hooks/useGame';
import { useSocial } from '../../hooks/useSocial';
import { useT } from '../../hooks/useT';
import type { StringKey } from '../../i18n';
import { profileSnapshot, rankFriends, type RankBy, type RankEntry } from '../../lib/social';
import { Card, Pill, cx } from '../ui';
import { PixelAvatar } from '../PixelAvatar';
import { netWorthText } from './ProfileCard';
import { AppScreen, FriendAvatar, FriendsGate, type PhoneNav } from './phoneUi';

const TABS: { id: RankBy; label: StringKey }[] = [
  { id: 'achievements', label: 'phone.rank.by.achievements' },
  { id: 'days', label: 'phone.rank.by.days' },
  { id: 'stamps', label: 'phone.rank.by.stamps' },
  { id: 'networth', label: 'phone.rank.by.networth' },
];

const MEDAL = ['🥇', '🥈', '🥉'];

export function RankApp({ nav }: { nav: PhoneNav }) {
  const t = useT();
  return (
    <AppScreen title={t('phone.rank.title')} onBack={nav.pop}>
      <FriendsGate nav={nav}>
        <Body nav={nav} />
      </FriendsGate>
    </AppScreen>
  );
}

function Body({ nav }: { nav: PhoneNav }) {
  const { state } = useLoadedGame();
  const social = useSocial();
  const t = useT();
  const [by, setBy] = useState<RankBy>('achievements');

  const rows = useMemo(() => {
    const me: RankEntry = { uid: social.me ?? 'me', displayName: social.profile?.displayName ?? '', snapshot: profileSnapshot(state), me: true };
    const others: RankEntry[] = social.friends.map((f) => ({ uid: f.uid, displayName: f.profile.displayName, snapshot: f.profile.snapshot }));
    return rankFriends([me, ...others], by);
  }, [social.me, social.profile, social.friends, state, by]);

  const valueText = (r: (typeof rows)[number]): string => {
    switch (by) {
      case 'days':
        return t('phone.card.day', { n: r.snapshot.day + 1 });
      case 'networth':
        return netWorthText(t, r.snapshot.netWorthBand);
      default:
        return String(r.value);
    }
  };

  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1" role="tablist" aria-label={t('phone.rank.tabs')}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={by === tab.id}
            onClick={() => setBy(tab.id)}
            className={cx('flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold', by === tab.id ? 'border-teal bg-teal text-white' : 'border-ink/10 bg-white text-ink-soft')}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      <Card className="mt-3 divide-y divide-ink/5 p-0">
        {rows.map((r) => {
          const friend = r.me ? undefined : social.friendsByUid.get(r.uid);
          const inner = (
            <>
              <span className="w-8 shrink-0 text-center text-lg font-black tabular-nums text-ink-soft">{r.place <= 3 ? <span aria-label={String(r.place)}>{MEDAL[r.place - 1]}</span> : r.place}</span>
              {friend ? (
                <FriendAvatar profile={friend.profile} size={40} />
              ) : (
                <span className="inline-flex h-10 w-10 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-teal-soft">
                  <PixelAvatar appearance={r.snapshot.appearance} gender={r.snapshot.gender} size={36} title={r.displayName} />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate font-bold">
                {r.displayName || t('phone.rank.you')} {r.me && <Pill tone="gold">{t('phone.rank.you')}</Pill>}
              </span>
              <span className="shrink-0 text-right text-sm font-bold tabular-nums">{valueText(r)}</span>
            </>
          );
          return r.me ? (
            <div key={r.uid} className="flex min-h-[56px] items-center gap-2 bg-gold-soft px-3 py-2">
              {inner}
            </div>
          ) : (
            <button key={r.uid} type="button" onClick={() => nav.push({ k: 'card', uid: r.uid })} className="flex min-h-[56px] w-full items-center gap-2 px-3 py-2 text-left active:bg-paper-2">
              {inner}
            </button>
          );
        })}
      </Card>
      {rows.length === 1 && <p className="mt-3 text-center text-sm text-ink-soft">{t('phone.rank.alone')}</p>}
      <p className="mt-4 text-center text-xs text-ink-soft">{t('phone.rank.note')}</p>
    </>
  );
}
