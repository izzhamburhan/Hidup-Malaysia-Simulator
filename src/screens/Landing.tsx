import { useState } from 'react';
import { Info, Play, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import type { StringKey } from '../i18n';
import { Button, Modal } from '../components/ui';
import { formatDate } from '../engine/calendar';
import { formatRM } from '../engine/core';
import { Skyline } from '../components/Skyline';
import { AccountChip, WelcomeDock } from '../components/AccountCard';
import { useCloud } from '../hooks/useCloud';
import { track } from '../lib/analytics';
import { MAX_LIVES, type LifeEntry } from '../lib/lives';

const TEXT_SAFE_MASK = 'linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.25) 14%, rgba(0,0,0,0.25) 62%, #000 82%)';
import { PixelAvatar } from '../components/PixelAvatar';
import { moodOf } from '../engine/appearance';
import { PrivacyNotice } from '../components/PrivacyNotice';

const FEATURES: [string, StringKey][] = [
  ['🎓', 'land.feat.1'],
  ['💼', 'land.feat.2'],
  ['🧾', 'land.feat.3'],
  ['🍛', 'land.feat.4'],
  ['💞', 'land.feat.5'],
  ['🚗', 'land.feat.6'],
];

export function Landing({ onNew, onContinue, onDaily }: { onNew: () => void; onContinue: () => void; onDaily: () => void }) {
  const { state, boot, daily, playDaily, slot, settings, setSettings, lives, livesFull, switchLife, deleteLife } = useGame();
  const t = useT();
  const today = daily();
  const main = slot === 'main' ? state : null;
  // Starting a new life keeps the current one; when every slot is taken the player chooses one to delete.
  const [fullOpen, setFullOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ life: LifeEntry; fromFull: boolean } | null>(null);
  const others = main ? lives.filter((l) => !l.active) : [];
  const [privacy, setPrivacy] = useState(false);
  const [dailyInfo, setDailyInfo] = useState(false);
  const cloud = useCloud();
  // New players see the friendly sign-in card first; anyone who chose "Continue as guest" keeps a small corner button.
  const promptVisible = cloud.enabled && !cloud.user && !settings.cloudPromptDismissed;
  const chooseGuest = () => {
    track('account', { source: 'guest' });
    setSettings({ cloudPromptDismissed: true });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-8 pt-6">
      <div className="relative overflow-hidden rounded-3xl bg-teal px-5 pb-0 pt-3 text-white shadow-lg">
        {/* The motif fades to a quarter behind the title and tagline so the text stays easy to read. */}
        <div
          className="songket absolute inset-0 opacity-40"
          style={{ maskImage: TEXT_SAFE_MASK, WebkitMaskImage: TEXT_SAFE_MASK }}
          aria-hidden
        />
        <div className="songket-band absolute inset-x-0 top-0 opacity-50" aria-hidden />
        <div className="relative z-10 flex items-center justify-between gap-2">
          <AccountChip promptVisible={promptVisible} />
          <div className="ml-auto flex w-fit shrink-0 rounded-full bg-white/15 p-0.5 text-[11px] font-bold" role="group" aria-label="Language / Bahasa">
            {(['en', 'ms'] as const).map((l) => (
              <button key={l} type="button" onClick={() => setSettings({ language: l })} aria-pressed={settings.language === l} className={settings.language === l ? 'hit-44 h-8 min-w-[44px] rounded-full bg-white px-3 text-teal' : 'hit-44 h-8 min-w-[44px] px-3 text-white/80'}>
                {l === 'en' ? 'EN' : 'BM'}
              </button>
            ))}
          </div>
        </div>
        <div className="relative mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">{t('land.eyebrow')}</p>
          <h1 className="font-pixel mt-2 font-bold text-5xl leading-[0.95]">
            HIDUP
            <br />
            MALAYSIA
          </h1>
          <p className="mt-3 max-w-xs text-[15px] font-medium leading-snug text-white">{t('land.tagline')}</p>
        </div>
        <div className="-mx-5">
          <Skyline />
        </div>
        {promptVisible && <WelcomeDock onGuest={chooseGuest} />}
      </div>

      <div className="mt-5 space-y-3">
        {main && (
          <button
            type="button"
            onClick={onContinue}
            className="anim-pop flex w-full items-center gap-3 rounded-2xl border-2 border-teal bg-white p-4 text-left shadow-sm transition hover:bg-teal-soft"
          >
            <span className="relative flex h-14 w-12 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-teal-soft">
              <PixelAvatar appearance={main.character.appearance} gender={main.character.gender} mood={moodOf(main)} size={44} />
              <span className="absolute bottom-0.5 right-0.5 rounded-full bg-teal p-0.5 text-white">
                <Play size={10} />
              </span>
            </span>
            <span className="flex-1">
              <span className="block font-bold">{t('land.continue', { name: main.character.name })}</span>
              <span className="block text-xs text-ink-soft">
                {t('hud.day', { n: main.clock.day + 1 })} · {formatDate(main)} · {formatRM(main.finance.cash)} · {main.mode === 'chaotic' ? t('land.mode.chaotic') : t('land.mode.realistic')}
              </span>
            </span>
          </button>
        )}
        <Button className="w-full py-3.5 text-base" variant={main ? 'secondary' : 'primary'} onClick={() => (livesFull ? setFullOpen(true) : onNew())}>
          <Plus size={18} /> {t('land.new')}
        </Button>
        {main && <p className="-mt-1 text-center text-[11px] text-ink-soft">{t('lives.keepNote')}</p>}
        {others.length > 0 && (
          <section aria-label={t('lives.title')} className="rounded-2xl border border-ink/10 bg-white p-3 shadow-sm">
            <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-ink-soft">{t('lives.title')}</h2>
            <ul className="mt-2 space-y-2">
              {others.map((life) => (
                <li key={life.id} className="flex items-center gap-2.5 rounded-xl bg-paper-2 p-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-soft text-sm font-bold text-teal" aria-hidden>
                    {life.meta.name.slice(0, 1).toUpperCase() || '?'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{life.meta.name}</span>
                    <span className="block truncate text-xs text-ink-soft">{t('lives.line', { n: life.meta.day + 1, when: new Date(life.meta.savedAt).toLocaleDateString() })}</span>
                  </span>
                  <Button
                    className="shrink-0"
                    onClick={() => {
                      switchLife(life.id);
                      onContinue();
                    }}
                  >
                    <Play size={14} /> {t('lives.play')}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ life, fromFull: false })}
                    aria-label={t('lives.delete.aria', { name: life.meta.name })}
                    className="hit-44 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-hibiscus-soft hover:text-hibiscus"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {boot?.status === 'corrupt' && (
          <p className="rounded-xl bg-hibiscus-soft p-3 text-sm text-hibiscus">
            {t('land.corrupt', { error: boot.error ?? '' })}
          </p>
        )}
        <button
          type="button"
          onClick={() => setDailyInfo(true)}
          className="flex min-h-[44px] w-full items-center gap-2 rounded-full border border-gold/70 bg-gold-soft px-3 py-1.5 text-left text-sm active:scale-[0.99]"
          aria-label={`${t('land.daily.short')}: ${today.title}`}
        >
          <span className="text-lg" aria-hidden>
            {today.icon}
          </span>
          <span className="min-w-0 flex-1 truncate">
            <span className="font-bold text-[#7a5a00]">{t('land.daily.short')}:</span> <span className="font-semibold">{today.title}</span>
            {today.saved && <span className="text-ink-soft"> · {t('land.daily.continue', { n: Math.min(7, today.saved.clock.day) + 1 })}</span>}
          </span>
          <Info size={16} className="shrink-0 text-[#7a5a00]" aria-hidden />
        </button>
      </div>

      <section className="mt-5 grid grid-cols-2 gap-1.5">
        {FEATURES.map(([icon, key]) => (
          <div key={key} className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 text-xs shadow-sm">
            <span className="text-base" aria-hidden>
              {icon}
            </span>
            <span className="font-medium leading-snug">{t(key)}</span>
          </div>
        ))}
      </section>

      <footer className="mt-6 space-y-2 text-[11px] leading-snug text-ink-soft">
        <p className="flex gap-1.5">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <span>
            {t('land.local')}{' '}
            <button type="button" onClick={() => setPrivacy(true)} className="font-semibold text-teal underline">
              {t('land.privacy')}
            </button>
          </span>
        </p>
        <p>
          {t('land.disclaimer')}
        </p>
      </footer>
      <PrivacyNotice open={privacy} onClose={() => setPrivacy(false)} />

      <Modal
        open={dailyInfo}
        onClose={() => setDailyInfo(false)}
        title={
          <span className="flex items-center gap-2">
            <span className="text-2xl">{today.icon}</span>
            {today.title}
          </span>
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setDailyInfo(false)}>
              {t('confirm.notNow')}
            </Button>
            <Button
              onClick={() => {
                setDailyInfo(false);
                playDaily();
                onDaily();
              }}
            >
              <Play size={16} /> {t(today.saved ? 'land.daily.resume' : 'land.daily.start')}
            </Button>
          </>
        }
      >
        <p className="text-sm">{today.blurb}</p>
        <div className="mt-3 rounded-2xl bg-gold-soft p-3 text-sm">
          <span className="font-bold text-[#7a5a00]">{t('land.daily.goal')}:</span> {today.goal}
        </div>
        <p className="mt-3 text-xs text-ink-soft">🗓️ {t('land.daily.what')}</p>
        {today.saved && <p className="mt-1 text-xs font-semibold text-teal">{t('land.daily.continue', { n: Math.min(7, today.saved.clock.day) + 1 })}</p>}
      </Modal>

      <Modal open={fullOpen} onClose={() => setFullOpen(false)} title={t('lives.full.title', { n: MAX_LIVES })} footer={<Button variant="secondary" onClick={() => setFullOpen(false)}>{t('confirm.notNow')}</Button>}>
        <p className="text-sm text-ink-soft">{t('lives.full.body')}</p>
        <ul className="mt-3 space-y-2">
          {lives.map((life) => (
            <li key={life.id} className="flex items-center gap-2.5 rounded-xl bg-paper-2 p-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">
                  {life.meta.name}
                  {life.active && <span className="ml-2 rounded-full bg-teal-soft px-2 py-0.5 text-[10px] font-bold text-teal">{t('lives.current')}</span>}
                </span>
                <span className="block truncate text-xs text-ink-soft">{t('lives.line', { n: life.meta.day + 1, when: new Date(life.meta.savedAt).toLocaleDateString() })}</span>
              </span>
              <Button variant="danger" className="shrink-0" onClick={() => setDeleteTarget({ life, fromFull: true })}>
                <Trash2 size={14} /> {t('lives.delete.btn')}
              </Button>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t('lives.delete.title', { name: deleteTarget?.life.meta.name ?? '' })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              {t('confirm.notNow')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const target = deleteTarget;
                setDeleteTarget(null);
                if (!target) return;
                deleteLife(target.life.id);
                if (target.fromFull) {
                  setFullOpen(false);
                  onNew();
                }
              }}
            >
              {t('lives.delete.confirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">{t('lives.delete.body')}</p>
      </Modal>
    </main>
  );
}
