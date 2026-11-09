// The Friends card in Settings: status, name, code, chat switch, a way to open the phone and turn Friends off.

import { Smartphone } from 'lucide-react';
import { useSocial } from '../../hooks/useSocial';
import { useT } from '../../hooks/useT';
import { formatCode } from '../../lib/social';
import { Button, Card, Disclaimer, KeyValue, SectionTitle } from '../ui';
import { ChatSwitch, TurnOffFriends } from './FriendsControls';
import type { Route } from './phoneUi';

export function FriendsSettingsCard({ onOpenPhone }: { onOpenPhone: (start?: Route) => void }) {
  const social = useSocial();
  const t = useT();
  if (!social.cloudEnabled) return null;

  return (
    <>
      <SectionTitle>
        <span className="inline-flex items-center gap-1.5">
          <Smartphone size={16} aria-hidden /> {t('phone.set.title')}
        </span>
      </SectionTitle>
      <Card>
        {!social.signedIn ? (
          <p className="text-sm">{t('phone.set.signin')}</p>
        ) : social.status === 'loading' ? (
          <p className="text-sm font-semibold text-ink-soft" role="status">
            {t('phone.loading')}
          </p>
        ) : social.status === 'error' ? (
          <>
            <p className="text-sm font-semibold">{t('phone.error.load')}</p>
            {social.error && <p className="mt-1 break-words text-xs text-ink-soft">{social.error}</p>}
            <Button className="mt-3" onClick={social.retry}>
              {t('phone.retry')}
            </Button>
          </>
        ) : social.on && social.profile ? (
          <>
            <KeyValue label={t('phone.set.status')} value={t('phone.set.on')} />
            <KeyValue label={t('phone.me.name')} value={social.profile.displayName} />
            <KeyValue label={t('phone.set.code')} value={formatCode(social.profile.code)} />
            <div className="mt-3">
              <ChatSwitch />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => onOpenPhone()}>
                {t('phone.set.open')}
              </Button>
              <TurnOffFriends />
            </div>
          </>
        ) : (
          <>
            <KeyValue label={t('phone.set.status')} value={t('phone.set.off')} />
            <p className="mt-2 text-sm">{t('phone.set.hint')}</p>
            <Button className="mt-3 w-full" onClick={() => onOpenPhone({ k: 'me' })}>
              {t('phone.set.setup')}
            </Button>
          </>
        )}
        <Disclaimer>{t('phone.set.privacy')}</Disclaimer>
      </Card>
    </>
  );
}
