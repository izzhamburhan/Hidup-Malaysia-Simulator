// Kawan: my friend code, add a friend by code (with a preview first), incoming requests, my friends,
// requests I sent, and the players I blocked.

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { GAME_URL } from '../../config';
import { useSocial } from '../../hooks/useSocial';
import { useT } from '../../hooks/useT';
import { formatCode, parseCode, type Profile } from '../../lib/social';
import { Button, Card, cx } from '../ui';
import { cleanProfile } from './phoneLogic';
import { AppScreen, FriendAvatar, FriendsGate, Initial, Notice, Section, copyText, type PhoneNav } from './phoneUi';

type Preview = { s: 'idle' } | { s: 'loading' } | { s: 'ok'; profile: Profile } | { s: 'error'; error: string };

export function FriendsApp({ nav }: { nav: PhoneNav }) {
  const t = useT();
  return (
    <AppScreen title={t('phone.friends.title')} onBack={nav.pop}>
      <FriendsGate nav={nav}>
        <Body nav={nav} />
      </FriendsGate>
    </AppScreen>
  );
}

function Body({ nav }: { nav: PhoneNav }) {
  const social = useSocial();
  const socialRef = useRef(social);
  socialRef.current = social;
  const t = useT();
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<Preview>({ s: 'idle' });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const code = social.profile ? formatCode(social.profile.code) : '';
  const parsed = parseCode(input);

  // A complete code is looked up on its own, so there is no "find" button to press.
  useEffect(() => {
    if (!parsed) {
      setPreview({ s: 'idle' });
      return;
    }
    let cancelled = false;
    setPreview({ s: 'loading' });
    void socialRef.current.preview(parsed).then((res) => {
      if (!cancelled) setPreview(res.ok ? { s: 'ok', profile: cleanProfile(res.profile) } : { s: 'error', error: res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [parsed]);

  const copy = async () => {
    setCopied((await copyText(code)) ? 'yes' : 'no');
  };
  const share = async () => {
    try {
      await navigator.share({ text: t('phone.code.shareText', { code, url: GAME_URL }) });
    } catch {
      /* closed by the player */
    }
  };

  const send = async () => {
    if (!parsed || sending) return;
    setSending(true);
    const res = await social.requestByCode(parsed);
    setSending(false);
    if (res.ok) {
      setResult({ tone: 'ok', text: t(res.accepted ? 'phone.add.accepted' : 'phone.add.sent', { name: cleanProfile(res.profile).displayName }) });
      setInput('');
    } else setResult({ tone: 'error', text: res.error });
  };

  const row = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setRowBusy(key);
    setRowError(null);
    const res = await fn();
    setRowBusy(null);
    if (!res.ok) setRowError(res.error ?? t('phone.err.unavailable'));
  };

  return (
    <>
      <Section title={t('phone.code.mine')}>
        <Card tier="hero" className="text-center">
          <p className="font-display select-all text-3xl font-black tracking-[0.12em] text-teal">{code}</p>
          <div className="mt-3 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => void copy()}>
              {copied === 'yes' ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copied === 'yes' ? t('phone.code.copied') : t('phone.code.copy')}
            </Button>
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <Button variant="secondary" onClick={() => void share()}>
                <Share2 size={16} aria-hidden /> {t('phone.code.share')}
              </Button>
            )}
          </div>
          {copied === 'no' && <p className="mt-2 text-xs font-semibold text-[#9a3412]">{t('phone.code.copyFail')}</p>}
          <p className="mt-2 text-xs text-ink-soft">{t('phone.code.hint')}</p>
        </Card>
      </Section>

      <Section title={t('phone.add.title')}>
        <Card>
          <label className="block text-xs font-semibold text-ink-soft" htmlFor="friend-code">
            {t('phone.add.label')}
          </label>
          <input
            id="friend-code"
            value={input}
            onChange={(e) => {
              setInput(e.target.value.slice(0, 16));
              setResult(null);
            }}
            placeholder={t('phone.add.placeholder')}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="mt-1 h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-base uppercase tracking-widest"
          />
          {preview.s === 'idle' && !result && <p className="mt-2 text-xs text-ink-soft">{t('phone.add.hint')}</p>}
          {preview.s === 'loading' && (
            <p className="mt-2 text-xs font-semibold text-ink-soft" role="status">
              {t('phone.add.looking')}
            </p>
          )}
          {preview.s === 'error' && (
            <div className="mt-2">
              <Notice tone="error">{preview.error}</Notice>
            </div>
          )}
          {preview.s === 'ok' && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-paper-2 p-3">
              <FriendAvatar profile={preview.profile} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{preview.profile.displayName}</p>
                <p className="truncate text-xs text-ink-soft">{t(`phone.stage.${preview.profile.snapshot.lifeStage}`)}</p>
              </div>
              <Button disabled={sending} onClick={() => void send()}>
                {t('phone.add.send')}
              </Button>
            </div>
          )}
          {result && (
            <div className="mt-2">
              <Notice tone={result.tone}>{result.text}</Notice>
            </div>
          )}
        </Card>
      </Section>

      {rowError && (
        <div className="mt-4">
          <Notice tone="error">{rowError}</Notice>
        </div>
      )}

      {social.requests.length > 0 && (
        <Section title={`${t('phone.requests.title')} (${social.requests.length})`}>
          <Card className="divide-y divide-ink/5 p-0">
            {social.requests.map((r) => (
              <div key={r.from} className="flex items-center gap-3 px-3 py-2.5">
                <Initial name={r.displayName} />
                <p className="min-w-0 flex-1 text-sm font-semibold leading-tight">{t('phone.requests.wants', { name: r.displayName })}</p>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Button className="!px-3 !py-2" disabled={rowBusy !== null} onClick={() => void row(`a${r.from}`, () => social.accept(r.from))}>
                    {t('phone.requests.accept')}
                  </Button>
                  <Button variant="secondary" className="!px-3 !py-2" disabled={rowBusy !== null} onClick={() => void row(`d${r.from}`, () => social.decline(r.from))}>
                    {t('phone.requests.decline')}
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        </Section>
      )}

      <Section title={t('phone.list.title', { n: social.friends.length })}>
        {social.friends.length === 0 ? (
          <Card className="text-center text-sm text-ink-soft">{t('phone.list.empty')}</Card>
        ) : (
          <Card className="divide-y divide-ink/5 p-0">
            {social.friends.map((f) => (
              <button key={f.uid} type="button" onClick={() => nav.push({ k: 'card', uid: f.uid })} className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left active:bg-paper-2">
                <FriendAvatar profile={f.profile} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold leading-tight">{f.profile.displayName}</span>
                  <span className="block truncate text-xs text-ink-soft">
                    {t(`phone.stage.${f.profile.snapshot.lifeStage}`)}
                    {f.profile.snapshot.jobTitle ? ` · ${f.profile.snapshot.jobTitle}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </Card>
        )}
      </Section>

      {social.pending.length > 0 && (
        <Section title={t('phone.pending.title')}>
          <Card className="divide-y divide-ink/5 p-0">
            {social.pending.map((p) => (
              <div key={p.uid} className="flex items-center gap-3 px-3 py-2.5">
                <FriendAvatar profile={p.profile} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold leading-tight">{p.profile.displayName}</p>
                  <p className="text-xs text-ink-soft">{t('phone.pending.waiting')}</p>
                </div>
                <Button variant="secondary" className="!px-3 !py-2" disabled={rowBusy !== null} onClick={() => void row(`p${p.uid}`, () => social.unfriend(p.uid))}>
                  {t('phone.pending.cancel')}
                </Button>
              </div>
            ))}
          </Card>
        </Section>
      )}

      {social.blocked.length > 0 && (
        <Section title={t('phone.blocked.title')}>
          <Card className="divide-y divide-ink/5 p-0">
            {social.blocked.map((b) => (
              <div key={b.uid} className={cx('flex items-center gap-3 px-3 py-2.5')}>
                <Initial name={b.name} />
                <p className="min-w-0 flex-1 truncate font-semibold">{b.name || t('phone.blocked.unknown')}</p>
                <Button variant="secondary" className="!px-3 !py-2" disabled={rowBusy !== null} onClick={() => void row(`u${b.uid}`, () => social.unblock(b.uid))}>
                  {t('phone.blocked.unblock')}
                </Button>
              </div>
            ))}
          </Card>
        </Section>
      )}
    </>
  );
}
