import { useState } from 'react';
import { Info, Play, Plus, ShieldCheck } from 'lucide-react';
import { useGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import { Button, Modal } from '../components/ui';
import { formatDate } from '../engine/calendar';
import { formatRM } from '../engine/core';
import { Skyline } from '../components/Skyline';
import { PixelAvatar } from '../components/PixelAvatar';
import { moodOf } from '../engine/appearance';
import { PrivacyNotice } from '../components/PrivacyNotice';

const FEATURES = [
  ['🎓', 'Study at UM, UTM, MMU and 21 more'],
  ['💼', 'Job hunt at PETRONAS, Maybank, AirAsia…'],
  ['🧾', 'Payslips with EPF, SOCSO, EIS & PCB'],
  ['🍛', 'Nasi lemak, gym streaks & calories'],
  ['💞', 'Dating, family & balik kampung'],
  ['🚗', 'Myvi loans, tolls & traffic jams'],
];

export function Landing({ onNew, onContinue, onDaily }: { onNew: () => void; onContinue: () => void; onDaily: () => void }) {
  const { state, boot, daily, playDaily, slot, settings, setSettings } = useGame();
  const t = useT();
  const today = daily();
  const main = slot === 'main' ? state : null;
  const [confirmNew, setConfirmNew] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [dailyInfo, setDailyInfo] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-8 pt-6">
      <div className="relative overflow-hidden rounded-3xl bg-teal px-5 pb-0 pt-3 text-white shadow-lg">
        <div className="songket absolute inset-0 opacity-40" aria-hidden />
        <div className="relative z-10 ml-auto flex w-fit rounded-full bg-white/15 p-0.5 text-[11px] font-bold" role="group" aria-label="Language / Bahasa">
          {(['en', 'ms'] as const).map((l) => (
            <button key={l} type="button" onClick={() => setSettings({ language: l })} aria-pressed={settings.language === l} className={settings.language === l ? 'hit-44 h-8 min-w-[44px] rounded-full bg-white px-3 text-teal' : 'hit-44 h-8 min-w-[44px] px-3 text-white/80'}>
              {l === 'en' ? 'EN' : 'BM'}
            </button>
          ))}
        </div>
        <div className="relative mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Life simulator · Malaysia</p>
          <h1 className="font-pixel mt-2 font-bold text-5xl leading-[0.95]">
            HIDUP
            <br />
            MALAYSIA
          </h1>
          <p className="mt-3 max-w-xs text-sm text-white/85">{t('land.tagline')}</p>
        </div>
        <Skyline />
      </div>

      <div className="mt-5 space-y-3">
        {main && (
          <button
            type="button"
            onClick={onContinue}
            className="anim-pop flex w-full items-center gap-3 rounded-2xl border-2 border-teal bg-white p-4 text-left shadow-sm transition hover:bg-teal-soft"
          >
            <span className="relative flex h-14 w-12 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-teal-soft">
              <PixelAvatar appearance={main.character.appearance} mood={moodOf(main)} size={44} />
              <span className="absolute bottom-0.5 right-0.5 rounded-full bg-teal p-0.5 text-white">
                <Play size={10} />
              </span>
            </span>
            <span className="flex-1">
              <span className="block font-bold">{t('land.continue', { name: main.character.name })}</span>
              <span className="block text-xs text-ink-soft">
                Day {main.clock.day + 1} · {formatDate(main)} · {formatRM(main.finance.cash)} · {main.mode === 'chaotic' ? 'Chaotic' : 'Realistic'}
              </span>
            </span>
          </button>
        )}
        <Button className="w-full py-3.5 text-base" variant={main ? 'secondary' : 'primary'} onClick={() => (main ? setConfirmNew(true) : onNew())}>
          <Plus size={18} /> {t('land.new')}
        </Button>
        {boot?.status === 'corrupt' && (
          <p className="rounded-xl bg-hibiscus-soft p-3 text-sm text-hibiscus">
            Your previous save could not be read ({boot.error}). It was set aside safely; you can start a new life.
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
        {FEATURES.map(([icon, text]) => (
          <div key={text} className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 text-xs shadow-sm">
            <span className="text-base" aria-hidden>
              {icon}
            </span>
            <span className="font-medium leading-snug">{text}</span>
          </div>
        ))}
      </section>

      <footer className="mt-6 space-y-2 text-[11px] leading-snug text-ink-soft">
        <p className="flex gap-1.5">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <span>
            Runs entirely in your browser. No account, no ads, no tracking cookies; your save stays on this device.{' '}
            <button type="button" onClick={() => setPrivacy(true)} className="font-semibold text-teal underline">
              Privacy
            </button>
          </span>
        </p>
        <p>
          Real universities and companies appear as names only and do not imply vacancies, fees or rankings. Salaries, prices and calories are fictional game estimates. Payroll is a simplified simulation, not
          an official KWSP, PERKESO or LHDN calculation. Politics are fictional.
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
              Not now
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

      <Modal
        open={confirmNew}
        onClose={() => setConfirmNew(false)}
        title="Start a new life?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmNew(false)}>
              Keep current life
            </Button>
            <Button variant="danger" onClick={() => { setConfirmNew(false); onNew(); }}>
              Start over
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">Starting a new game will replace {main?.character.name}'s saved life on this device once you create the new character. You can export a backup in Settings first.</p>
      </Modal>
    </main>
  );
}
