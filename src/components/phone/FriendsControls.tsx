// Controls shared by the Profil app and the Settings Friends card: the chat switch and "Turn off Friends"
// (with its confirmation). They only call the friends client through useSocial.

import { useState } from 'react';
import { useSocial } from '../../hooks/useSocial';
import { useT } from '../../hooks/useT';
import { Button, Modal } from '../ui';
import { Notice } from './phoneUi';

export function ChatSwitch() {
  const social = useSocial();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <label className="flex min-h-[44px] items-center justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold">{t('phone.me.chat')}</span>
          <span className="block text-xs text-ink-soft">{t('phone.me.chatHint')}</span>
        </span>
        <input
          type="checkbox"
          checked={social.chatOn}
          onChange={(e) => {
            setError(null);
            void social.setChat(e.target.checked).then((res) => {
              if (!res.ok) setError(res.error);
            });
          }}
          className="h-5 w-5 shrink-0 accent-teal"
        />
      </label>
      {error && (
        <div className="mt-2">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </div>
  );
}

export function TurnOffFriends({ onDone, className }: { onDone?: () => void; className?: string }) {
  const social = useSocial();
  const t = useT();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    const res = await social.disable();
    setBusy(false);
    if (res.ok) {
      setConfirm(false);
      onDone?.();
    } else setError(res.error);
  };

  return (
    <>
      <Button variant="danger" className={className} onClick={() => setConfirm(true)}>
        {t('phone.me.off')}
      </Button>
      <Modal
        open={confirm}
        onClose={() => {
          if (!busy) {
            setConfirm(false);
            setError(null);
          }
        }}
        title={t('phone.off.confirmTitle')}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setConfirm(false);
                setError(null);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void go()}>
              {busy ? t('phone.working') : t('phone.off.confirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">{t('phone.off.confirmBody')}</p>
        {error && (
          <div className="mt-3">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
      </Modal>
    </>
  );
}
