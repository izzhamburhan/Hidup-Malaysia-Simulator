// First-game "how to play" overlay. Five short steps; can be reopened from the menu.

import { useState } from 'react';
import type { Appearance } from '../engine/types';
import { useT } from '../hooks/useT';
import type { StringKey } from '../i18n';
import { track } from '../lib/analytics';
import { PixelAvatar } from './PixelAvatar';
import { Button, Modal } from './ui';

const STEPS: { icon: string; title: StringKey; text: StringKey }[] = [
  { icon: '👋', title: 'tut.1.title', text: 'tut.1.text' },
  { icon: '▶️', title: 'tut.2.title', text: 'tut.2.text' },
  { icon: '🧩', title: 'tut.3.title', text: 'tut.3.text' },
  { icon: '⏭️', title: 'tut.4.title', text: 'tut.4.text' },
  { icon: '🧭', title: 'tut.5.title', text: 'tut.5.text' },
];

export function Tutorial({ open, onClose, appearance }: { open: boolean; onClose: () => void; appearance: Appearance }) {
  const [step, setStep] = useState(0);
  const t = useT();
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const finish = (completed: boolean) => {
    track('tutorial', { step: step + 1, ok: completed });
    setStep(0);
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={() => finish(false)}
      title={t('tut.title', { n: step + 1, total: STEPS.length })}
      footer={
        <>
          <Button variant="ghost" onClick={() => finish(false)}>
            {t('tut.skip')}
          </Button>
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              {t('tut.back')}
            </Button>
          )}
          <Button onClick={() => (last ? finish(true) : setStep(step + 1))}>{last ? t('tut.go') : t('tut.next')}</Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <div className="flex h-28 w-24 shrink-0 items-end justify-center overflow-hidden rounded-2xl bg-teal-soft">
          {step === 0 ? <PixelAvatar appearance={appearance} mood="happy" size={88} bob /> : <span className="mb-6 text-5xl">{s.icon}</span>}
        </div>
        <div>
          <div className="font-display text-lg font-bold">{t(s.title)}</div>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t(s.text)}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-teal' : 'w-1.5 bg-ink/15'}`} />
        ))}
      </div>
    </Modal>
  );
}
