import { useState } from 'react';
import { Play, Plus, ShieldCheck } from 'lucide-react';
import { useGame } from '../hooks/useGame';
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
  const { state, boot, daily, playDaily, slot } = useGame();
  const today = daily();
  const main = slot === 'main' ? state : null;
  const [confirmNew, setConfirmNew] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-8 pt-6">
      <div className="relative overflow-hidden rounded-3xl bg-teal px-5 pb-0 pt-8 text-white shadow-lg">
        <div className="songket absolute inset-0 opacity-40" aria-hidden />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Life simulator · Malaysia</p>
          <h1 className="font-display mt-2 text-5xl font-black leading-[0.95] tracking-tight">
            HIDUP
            <br />
            MALAYSIA
          </h1>
          <p className="mt-3 max-w-xs text-sm text-white/85">Can you build the life you want in Malaysia? Salary masuk, salary keluar — every choice counts.</p>
        </div>
        <Skyline />
      </div>

      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={() => {
            playDaily();
            onDaily();
          }}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-gold bg-gold-soft p-3 text-left shadow-sm active:scale-[0.99]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-3xl">{today.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a5a00]">🗓️ Today's challenge · 7 days</span>
            <span className="block font-bold leading-tight">{today.title}</span>
            <span className="block text-xs text-ink-soft">{today.saved ? `Continue: day ${Math.min(7, today.saved.clock.day) + 1} of 7` : today.goal}</span>
          </span>
          <span className="text-xl font-black text-[#7a5a00]" aria-hidden>
            ▶
          </span>
        </button>
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
              <span className="block font-bold">Continue {main.character.name}'s life</span>
              <span className="block text-xs text-ink-soft">
                Day {main.clock.day + 1} · {formatDate(main)} · {formatRM(main.finance.cash)} · {main.mode === 'chaotic' ? 'Chaotic' : 'Realistic'}
              </span>
            </span>
          </button>
        )}
        <Button className="w-full py-3.5 text-base" variant={main ? 'secondary' : 'primary'} onClick={() => (main ? setConfirmNew(true) : onNew())}>
          <Plus size={18} /> Start a new life
        </Button>
        {boot?.status === 'corrupt' && (
          <p className="rounded-xl bg-hibiscus-soft p-3 text-sm text-hibiscus">
            Your previous save could not be read ({boot.error}). It was set aside safely; you can start a new life.
          </p>
        )}
      </div>

      <section className="mt-6 grid grid-cols-2 gap-2">
        {FEATURES.map(([icon, text]) => (
          <div key={text} className="rounded-2xl bg-white p-3 text-sm shadow-sm">
            <div className="text-xl">{icon}</div>
            <div className="mt-1 font-medium leading-snug">{text}</div>
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
