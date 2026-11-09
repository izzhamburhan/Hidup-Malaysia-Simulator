// Profil: what Friends shares and the switch to turn it on (with a display name), then my card, my code,
// rename, the chat switch and turning Friends off.

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useLoadedGame } from '../../hooks/useGame';
import { useSocial } from '../../hooks/useSocial';
import { useT } from '../../hooks/useT';
import { NAME_MAX, formatCode, profileSnapshot, validateDisplayName } from '../../lib/social';
import { Button, Card } from '../ui';
import { ChatSwitch, TurnOffFriends } from './FriendsControls';
import { ProfileHero } from './ProfileCard';
import { cleanSnapshot } from './phoneLogic';
import { AppScreen, FriendsGate, Notice, Section, copyText, type PhoneNav } from './phoneUi';

export function MeApp({ nav }: { nav: PhoneNav }) {
  const t = useT();
  const social = useSocial();
  return (
    <AppScreen title={t('phone.me.title')} onBack={nav.pop}>
      <FriendsGate nav={nav} needOn={false}>
        {social.on ? <On nav={nav} /> : <Intro />}
      </FriendsGate>
    </AppScreen>
  );
}

function NameField({ value, onChange, reason }: { value: string; onChange: (v: string) => void; reason: string | null }) {
  const t = useT();
  return (
    <div>
      <label htmlFor="display-name" className="block text-sm font-semibold">
        {t('phone.me.name')}
      </label>
      <input
        id="display-name"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, NAME_MAX + 8))}
        maxLength={NAME_MAX + 8}
        autoComplete="off"
        spellCheck={false}
        aria-describedby="display-name-hint"
        className="mt-1 h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-base"
      />
      <p id="display-name-hint" className={reason ? 'mt-1 text-xs font-semibold text-[#9a3412]' : 'mt-1 text-xs text-ink-soft'}>
        {reason ?? t('phone.me.nameHint')}
      </p>
    </div>
  );
}

function Intro() {
  const social = useSocial();
  const t = useT();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();
  const reason = trimmed === '' ? null : validateDisplayName(trimmed);
  const disabledReason = busy ? null : trimmed === '' ? t('phone.me.nameFirst') : reason;

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    const res = await social.enable(trimmed);
    setBusy(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <>
      <Card tier="hero">
        <div className="text-3xl" aria-hidden>
          🤝
        </div>
        <h2 className="font-display mt-1 text-xl font-black leading-tight">{t('phone.off.title')}</h2>
        <p className="mt-1 text-sm">{t('phone.me.intro')}</p>
      </Card>
      <Section title={t('phone.me.shared')}>
        <Card>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>{t('phone.me.shared1')}</li>
            <li>{t('phone.me.shared2')}</li>
            <li>{t('phone.me.shared3')}</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-ink-soft">{t('phone.me.notShared')}</p>
          <p className="mt-2 text-xs text-ink-soft">{t('phone.me.chatNote')}</p>
        </Card>
      </Section>
      <Section title={t('phone.me.on')}>
        <Card>
          <NameField value={name} onChange={setName} reason={reason} />
          <Button className="mt-3 w-full" disabled={busy || disabledReason !== null} onClick={() => void turnOn()}>
            {busy ? t('phone.working') : t('phone.me.on')}
          </Button>
          {disabledReason && <p className="mt-2 text-center text-xs text-ink-soft">{disabledReason}</p>}
          {error && (
            <div className="mt-2">
              <Notice tone="error">{error}</Notice>
            </div>
          )}
        </Card>
      </Section>
    </>
  );
}

function On({ nav }: { nav: PhoneNav }) {
  const social = useSocial();
  const { state } = useLoadedGame();
  const t = useT();
  const profile = social.profile!;
  const [name, setName] = useState(profile.displayName);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
  const trimmed = name.trim();
  const reason = validateDisplayName(trimmed);
  const same = trimmed === profile.displayName;
  const code = formatCode(profile.code);
  const disabledReason = busy ? null : reason ?? (same ? t('phone.me.same') : null);

  const save = async () => {
    setBusy(true);
    const res = await social.rename(trimmed);
    setBusy(false);
    setNote(res.ok ? { tone: 'ok', text: t('phone.me.saved') } : { tone: 'error', text: res.error });
  };

  // My own card shows this life as it is now (the published copy updates once a game day).
  const mine = { ...profile, snapshot: cleanSnapshot(profileSnapshot(state), profile.displayName) };

  return (
    <>
      <ProfileHero profile={mine} />
      <Section title={t('phone.code.mine')}>
        <Card className="text-center">
          <p className="font-display select-all text-2xl font-black tracking-[0.12em] text-teal">{code}</p>
          <Button
            variant="secondary"
            className="mt-2"
            onClick={() => {
              void copyText(code).then((ok) => setCopied(ok ? 'yes' : 'no'));
            }}
          >
            {copied === 'yes' ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            {copied === 'yes' ? t('phone.code.copied') : t('phone.code.copy')}
          </Button>
          {copied === 'no' && <p className="mt-2 text-xs font-semibold text-[#9a3412]">{t('phone.code.copyFail')}</p>}
          <div className="mt-2">
            <Button variant="ghost" onClick={() => nav.push({ k: 'friends' })}>
              {t('phone.app.friends')}
            </Button>
          </div>
        </Card>
      </Section>
      <Section title={t('phone.me.name')}>
        <Card>
          <NameField value={name} onChange={setName} reason={trimmed === profile.displayName ? null : reason} />
          <Button className="mt-3 w-full" disabled={busy || disabledReason !== null} onClick={() => void save()}>
            {t('phone.me.rename')}
          </Button>
          {disabledReason && <p className="mt-2 text-center text-xs text-ink-soft">{disabledReason}</p>}
          {note && (
            <div className="mt-2">
              <Notice tone={note.tone}>{note.text}</Notice>
            </div>
          )}
        </Card>
      </Section>
      <Section title={t('phone.me.chat')}>
        <Card>
          <ChatSwitch />
        </Card>
      </Section>
      <div className="mt-6">
        <TurnOffFriends className="w-full" />
      </div>
    </>
  );
}
