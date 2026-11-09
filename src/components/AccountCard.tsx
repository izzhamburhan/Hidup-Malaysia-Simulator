// Optional Google sign-in and cloud save, as the player sees it: the welcome dock on the landing
// page, the profile-picture chip in the corner, the account sheet, the Settings card, and the sheet that
// asks which save to keep when this device and the cloud both changed. Guest play is the default and
// needs none of this. Display only: all sync logic lives in src/hooks/useCloud.tsx.

import { useEffect, useRef, useState } from 'react';
import { Check, Cloud, LogOut, RefreshCw, Trash2 } from 'lucide-react';
import { useCloud } from '../hooks/useCloud';
import { useSocial } from '../hooks/useSocial';
import { useT } from '../hooks/useT';
import { firstNameOf, type SaveMeta } from '../lib/cloudSync';
import { GoogleButton, GoogleG } from './GoogleButton';
import { Button, Card, Disclaimer, KeyValue, Modal, SectionTitle, cx } from './ui';
import { UserAvatar } from './UserAvatar';

function when(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

/** The last problem, in plain words, with the technical reason underneath for anyone who needs it. */
function Problem() {
  const cloud = useCloud();
  const t = useT();
  if (!cloud.messageKey) return null;
  return (
    <div className="mt-3 rounded-xl bg-gold-soft p-2.5 text-xs text-[#7a5a00]" role="alert">
      <p>{t(cloud.messageKey)}</p>
      {cloud.detail && <p className="mt-1 break-words font-mono text-[11px] opacity-80">{cloud.detail}</p>}
    </div>
  );
}

function ProfileRow() {
  const cloud = useCloud();
  const t = useT();
  if (!cloud.user) return null;
  return (
    <div className="flex items-center gap-3">
      <UserAvatar user={cloud.user} size={52} />
      <div className="min-w-0">
        <p className="break-words text-sm font-bold leading-snug">{cloud.user.name || t('cloud.signedIn')}</p>
        <p className="text-xs text-ink-soft">{t('cloud.signedIn')}</p>
      </div>
    </div>
  );
}

function SyncLine() {
  const cloud = useCloud();
  const t = useT();
  return (
    <>
      <SyncStatus />
      {cloud.skippedCount > 0 && <p className="mt-2 rounded-xl bg-paper-2 p-2.5 text-xs text-ink-soft">{t('cloud.note.full')}</p>}
    </>
  );
}

function SyncStatus() {
  const cloud = useCloud();
  const t = useT();
  return (
    <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft" role="status">
      {cloud.status === 'syncing' ? (
        <>
          <RefreshCw size={14} className="animate-spin" aria-hidden /> {t('cloud.syncing')}
        </>
      ) : cloud.status === 'synced' ? (
        <>
          <Check size={14} className="text-leaf" aria-hidden /> {t('cloud.synced')}
        </>
      ) : null}
    </div>
  );
}

function SyncButtons() {
  const cloud = useCloud();
  const t = useT();
  const busy = cloud.status === 'signing-in' || cloud.status === 'syncing';
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <Button variant="secondary" disabled={busy || cloud.conflict !== null} onClick={() => void cloud.syncNow()}>
        <RefreshCw size={16} /> {t('cloud.syncNow')}
      </Button>
      <Button variant="secondary" disabled={busy} onClick={() => void cloud.signOut()}>
        <LogOut size={16} /> {t('cloud.signout')}
      </Button>
    </div>
  );
}

/** The top-left control of the landing hero: a pill with your Google picture and first name when signed in, a small "G Sign in" pill for guests who chose to skip the dock. */
export function AccountChip({ promptVisible }: { promptVisible: boolean }) {
  const cloud = useCloud();
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!cloud.enabled) return null;

  if (cloud.user) {
    const firstName = firstNameOf(cloud.user.name);
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('cloud.account.aria', { name: cloud.user.name || t('cloud.account') })}
          className="hit-44 flex h-9 max-w-[10.5rem] items-center gap-2 rounded-full bg-white/15 py-0 pl-1 pr-3 text-xs font-bold text-white outline-none transition focus-visible:ring-2 focus-visible:ring-gold active:scale-95"
        >
          <span className="shrink-0 overflow-hidden rounded-full ring-1 ring-white/40">
            <UserAvatar user={cloud.user} size={28} />
          </span>
          {firstName && <span className="truncate">{firstName}</span>}
        </button>
        <AccountSheet open={open} onClose={() => setOpen(false)} />
      </>
    );
  }
  if (promptVisible) return null;
  return (
    <button
      type="button"
      onClick={() => void cloud.signIn()}
      disabled={cloud.status === 'signing-in'}
      aria-label={t('cloud.signin')}
      className="hit-44 flex h-9 items-center gap-1.5 rounded-full bg-white pl-2.5 pr-3.5 text-xs font-semibold text-[#1f1f1f] shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-gold active:scale-95 disabled:opacity-60"
    >
      <GoogleG size={16} />
      <span>{t('cloud.signin.short')}</span>
    </button>
  );
}

export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cloud = useCloud();
  const t = useT();
  return (
    <Modal open={open && cloud.user !== null} onClose={onClose} title={t('cloud.account')} footer={<Button onClick={onClose}>OK</Button>}>
      {/* The chip lives inside the white-text landing banner, so the sheet sets its own text colour. */}
      <div className="text-ink">
        <ProfileRow />
        <SyncLine />
        <KeyValue label={t('cloud.last')} value={when(cloud.lastSyncedAt)} />
        <Problem />
        <SyncButtons />
        <Disclaimer>{t('cloud.privacy')}</Disclaimer>
      </div>
    </Modal>
  );
}

/**
 * The welcome dock: a darker band at the bottom of the landing hero (it bleeds to the card's edges, so the host adds
 * no padding around it). The white Google button stands out on deep teal, "Continue as guest" sits under it in gold,
 * and choosing guest folds the band away before the choice is saved.
 */
export function WelcomeDock({ onGuest }: { onGuest: () => void }) {
  const cloud = useCloud();
  const t = useT();
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!cloud.enabled || cloud.user) return null;
  const busy = cloud.status === 'signing-in';
  const chooseGuest = () => {
    setLeaving(true);
    timer.current = window.setTimeout(onGuest, 280); // let the fold finish, then remember the choice
  };
  return (
    <div className={cx('-mx-5 grid transition-[grid-template-rows,opacity] duration-300 ease-out', leaving ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100')}>
      <div className="overflow-hidden">
        <section aria-label={t('cloud.title')} className="anim-dock bg-black/25 px-5 pb-1.5 pt-3.5">
          <p className="text-[13px] leading-snug text-teal-soft">{t('cloud.dock.body')}</p>
          <Problem />
          <GoogleButton className="mt-2.5 shadow-md" label={busy ? t('cloud.signingIn') : t('cloud.signin')} disabled={busy || leaving} onClick={() => void cloud.signIn()} />
          <button
            type="button"
            onClick={chooseGuest}
            disabled={busy || leaving}
            className="mx-auto flex min-h-[44px] items-center justify-center rounded-full px-4 text-[13px] font-semibold text-gold underline decoration-gold/40 underline-offset-4 outline-none transition hover:decoration-gold focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-60"
          >
            {t('cloud.prompt.guest')}
          </button>
        </section>
      </div>
    </div>
  );
}

/** Settings: the full account card, including deleting the cloud copy. */
export function AccountCard() {
  const cloud = useCloud();
  const t = useT();
  const social = useSocial();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  if (!cloud.enabled) return null;
  const busy = cloud.status === 'signing-in' || cloud.status === 'syncing';

  /** Friends data is removed first, so no friend card or message is left behind when the account is signed out. */
  const deleteAll = async () => {
    setFriendsError(null);
    if (social.on) {
      const res = await social.disable();
      if (!res.ok) {
        setFriendsError(t('phone.delete.friendsFail', { reason: res.error }));
        return;
      }
    }
    await cloud.deleteCloudData();
  };

  return (
    <>
      <SectionTitle>
        <span className="inline-flex items-center gap-1.5">
          <Cloud size={16} aria-hidden /> {t('cloud.title')}
        </span>
      </SectionTitle>
      <Card>
        {cloud.user ? (
          <>
            <ProfileRow />
            <SyncLine />
            <KeyValue label={t('cloud.last')} value={when(cloud.lastSyncedAt)} />
            <Problem />
            {friendsError && (
              <div className="mt-3 rounded-xl bg-hibiscus-soft p-2.5 text-xs text-[#9a3412]" role="alert">
                {friendsError}
              </div>
            )}
            <SyncButtons />
            <Button variant="danger" className="mt-2 w-full" disabled={busy} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> {t('cloud.delete')}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm">{t('cloud.intro')}</p>
            <Problem />
            <GoogleButton className="mt-3" label={cloud.status === 'signing-in' ? t('cloud.signingIn') : t('cloud.signin')} disabled={busy} onClick={() => void cloud.signIn()} />
            <p className="mt-2 text-xs text-ink-soft">{t('cloud.guest')}</p>
          </>
        )}
        <Disclaimer>{t('cloud.privacy')}</Disclaimer>
      </Card>
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('cloud.delete.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              {t('confirm.notNow')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmDelete(false);
                void deleteAll();
              }}
            >
              {t('cloud.delete.confirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">{t('cloud.delete.body')}</p>
        {social.on && <p className="mt-2 text-sm font-semibold text-ink-soft">{t('phone.delete.note')}</p>}
      </Modal>
    </>
  );
}

function SaveLine({ label, meta }: { label: string; meta: SaveMeta }) {
  const t = useT();
  return (
    <div className="rounded-2xl bg-paper-2 p-3 text-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-0.5 font-semibold">{t('cloud.conflict.line', { name: meta.name, day: meta.day + 1 })}</div>
      <div className="text-xs text-ink-soft">{when(meta.savedAt)}</div>
    </div>
  );
}

/** Always mounted (App.tsx): a conflict can appear on any screen right after sign-in. */
export function CloudConflictSheet() {
  const cloud = useCloud();
  const t = useT();
  const c = cloud.conflict;
  return (
    <Modal
      open={c !== null}
      dismissable={false}
      title={t('cloud.conflict.title')}
      footer={
        <div className="grid w-full grid-cols-1 gap-2">
          <Button variant="secondary" onClick={() => void cloud.resolveConflict('local')}>
            {t('cloud.conflict.keepDevice')}
          </Button>
          <Button onClick={() => void cloud.resolveConflict('cloud')}>{t('cloud.conflict.keepCloud')}</Button>
        </div>
      }
    >
      {c && (
        <div className="space-y-3">
          <p className="text-sm">{t(c.reason === 'different-life' ? 'cloud.conflict.body.life' : 'cloud.conflict.body.both')}</p>
          <SaveLine label={t('cloud.conflict.device')} meta={c.local} />
          <SaveLine label={t('cloud.conflict.cloud')} meta={c.cloud} />
          <p className="text-xs text-ink-soft">{t('cloud.conflict.warn')}</p>
          {cloud.conflictCount > 1 && <p className="text-xs font-semibold text-teal">{t('cloud.conflict.more', { n: cloud.conflictCount - 1 })}</p>}
        </div>
      )}
    </Modal>
  );
}
