// First-game "how to play" overlay. Five short steps; can be reopened from the menu.

import { useState } from 'react';
import type { Appearance } from '../engine/types';
import { track } from '../lib/analytics';
import { PixelAvatar } from './PixelAvatar';
import { Button, Modal } from './ui';

const STEPS = [
  { icon: '👋', title: 'This is you', text: 'Your character lives one simulated day at a time. Their face shows how they feel: tired, stressed, happy or unwell.' },
  { icon: '▶️', title: 'The big button', text: 'It always does the most sensible thing right now: go to work, attend class, eat, go to an interview or sleep. Tap it and see what happens.' },
  { icon: '🧩', title: 'Quick tiles', text: 'The six tiles change with the time of day. Every action costs time, and often money or energy. The numbers on each tile tell you how much.' },
  { icon: '⏭️', title: 'Let time pass', text: 'Next does one sensible activity. End day and Week live on your routine and stop whenever something needs your decision.' },
  { icon: '🧭', title: 'Bigger decisions', text: 'Use the tabs below for the big stuff: job board, payslips, moving house, buying a car, dating and side hustles. Bills are paid on the 1st, salary arrives at month end.' },
];

export function Tutorial({ open, onClose, appearance }: { open: boolean; onClose: () => void; appearance: Appearance }) {
  const [step, setStep] = useState(0);
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
      title={`How to play (${step + 1}/${STEPS.length})`}
      footer={
        <>
          <Button variant="ghost" onClick={() => finish(false)}>
            Skip
          </Button>
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button onClick={() => (last ? finish(true) : setStep(step + 1))}>{last ? "Let's go!" : 'Next'}</Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <div className="flex h-28 w-24 shrink-0 items-end justify-center overflow-hidden rounded-2xl bg-teal-soft">
          {step === 0 ? <PixelAvatar appearance={appearance} mood="happy" size={88} bob /> : <span className="mb-6 text-5xl">{s.icon}</span>}
        </div>
        <div>
          <div className="font-display text-lg font-bold">{s.title}</div>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.text}</p>
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
