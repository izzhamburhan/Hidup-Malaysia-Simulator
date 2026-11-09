import { Lock } from 'lucide-react';
import { MAX_CIRCLE, friendTier, type FriendTier } from '../engine/friends';
import { viewAction, type ActionView } from '../engine/simulationEngine';
import type { Friend } from '../engine/types';
import { useGame, useLoadedGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import type { StringKey } from '../i18n';
import { NpcAvatar } from './PixelAvatar';
import { Card, EmptyState, Pill, StatBar, cx } from './ui';

const TIER: Record<FriendTier, { label: StringKey; hint: StringKey; tone: 'neutral' | 'blue' | 'green'; bar: 'sky' | 'teal' | 'leaf' }> = {
  kenalan: { label: 'friend.tier.kenalan', hint: 'friend.tier.kenalan.hint', tone: 'neutral', bar: 'sky' },
  kawan: { label: 'friend.tier.kawan', hint: 'friend.tier.kawan.hint', tone: 'blue', bar: 'teal' },
  'kawan-baik': { label: 'friend.tier.baik', hint: 'friend.tier.baik.hint', tone: 'green', bar: 'leaf' },
};

const BUTTONS: { id: 'friend-chat' | 'friend-hangout' | 'friend-gift'; icon: string; label: StringKey }[] = [
  { id: 'friend-chat', icon: '💬', label: 'friend.btn.chat' },
  { id: 'friend-hangout', icon: '🍵', label: 'friend.btn.hangout' },
  { id: 'friend-gift', icon: '🎁', label: 'friend.btn.gift' },
];

/** One compact button per friend action. A greyed one still answers a tap with its reason. */
function FriendButton({ view, icon, label }: { view: ActionView; icon: string; label: string }) {
  const { request } = useGame();
  return (
    <button
      type="button"
      onClick={() => request(view)}
      aria-disabled={!view.available}
      aria-label={view.title}
      title={view.reason ?? view.description}
      className={cx(
        'hit-44 h-9 min-w-0 flex-1 truncate rounded-full border px-2 text-sm font-semibold transition',
        view.available ? 'border-teal/30 bg-teal-soft text-teal hover:bg-teal hover:text-white' : 'border-ink/10 bg-paper-2 text-ink-soft',
      )}
    >
      <span aria-hidden="true">{icon}</span> {label}
    </button>
  );
}

function FriendRow({ friend }: { friend: Friend }) {
  const { state } = useLoadedGame();
  const t = useT();
  const tier = TIER[friendTier(friend.closeness)];
  const views = BUTTONS.map((b) => ({ ...b, view: viewAction(state, b.id, friend.id) })).filter((b): b is typeof b & { view: ActionView } => !!b.view);
  // Each greyed button answers a tap with its own reason; a line shows only when nothing can be done today.
  const reason = views.length > 0 && views.every((b) => !b.view.available) ? (views[0].view.reason ?? null) : null;
  return (
    <Card>
      <div className="flex items-center gap-3">
        <NpcAvatar name={friend.name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-bold">{friend.name}</span>
            <Pill tone={tier.tone}>
              <span title={t(tier.hint)}>{t(tier.label)}</span>
            </Pill>
          </div>
          <div className="truncate text-xs text-ink-soft">{t('life.people.into', { trait: friend.trait, interest: friend.interest })}</div>
        </div>
      </div>
      <div className="mt-2">
        <StatBar label={t('friend.closeness')} value={friend.closeness} tone={tier.bar} compact calm />
      </div>
      <div className="mt-3 flex gap-2">
        {views.map((b) => (
          <FriendButton key={b.id} view={b.view} icon={b.icon} label={t(b.label)} />
        ))}
      </div>
      {reason && (
        <div className="mt-2 flex items-start gap-1 text-[11px] font-medium text-hibiscus">
          <Lock size={11} className="mt-0.5 shrink-0" aria-hidden="true" /> {reason}
        </div>
      )}
    </Card>
  );
}

/** Life > People: the named friends you have met, with a message, a lepak and a gift for each. */
export function FriendsCircle() {
  const { state } = useLoadedGame();
  const t = useT();
  const circle = state.relationships.circle;
  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-ink-soft">{t('life.people.circle.count', { n: circle.length, max: MAX_CIRCLE })}</div>
      {circle.length === 0 ? (
        <EmptyState icon="👋" title={t('life.people.circle.empty')} />
      ) : (
        <div className="grid gap-2">
          {circle.map((f) => (
            <FriendRow key={f.id} friend={f} />
          ))}
        </div>
      )}
    </div>
  );
}
