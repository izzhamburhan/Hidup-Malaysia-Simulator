// Quick in-game feedback: an emoji rating plus "what should we improve" chips,
// sent as anonymous analytics events (no free text, no personal data). An
// optional external form takes longer comments.

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { FEEDBACK_FORM_URL } from '../config';
import { analyticsConfigured, track } from '../lib/analytics';
import { Button, Modal, cx } from './ui';

const RATINGS = [
  { value: 1, emoji: '😩', label: 'Not fun' },
  { value: 2, emoji: '😐', label: 'Meh' },
  { value: 3, emoji: '🙂', label: 'Good' },
  { value: 4, emoji: '😍', label: 'Love it' },
];

const TOPICS = [
  { id: 'confusing', label: 'Confusing' },
  { id: 'too_hard', label: 'Too hard' },
  { id: 'too_easy', label: 'Too easy' },
  { id: 'boring', label: 'Gets boring' },
  { id: 'bugs', label: 'Bugs' },
  { id: 'more_events', label: 'More events' },
  { id: 'more_jobs', label: 'More jobs and places' },
  { id: 'bahasa', label: 'Bahasa Malaysia please' },
  { id: 'more_characters', label: 'More character styles' },
];

/** Feedback is offered only when it can actually go somewhere. */
export const feedbackAvailable = () => analyticsConfigured() || FEEDBACK_FORM_URL.length > 0;

export function FeedbackSheet({ open, onClose, optedOut }: { open: boolean; onClose: () => void; optedOut: boolean }) {
  const [rating, setRating] = useState<number | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const canSend = analyticsConfigured() && !optedOut;

  const toggle = (id: string) => setTopics((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  const send = () => {
    if (rating !== null) track('feedback', { rating });
    for (const topic of topics) track('feedback', { topic });
    setSent(true);
  };
  const close = () => {
    setRating(null);
    setTopics([]);
    setSent(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="How's the game?">
      {sent ? (
        <div className="py-4 text-center">
          <div className="text-4xl">🙏</div>
          <p className="mt-2 font-semibold">Terima kasih! Your feedback shapes the next update.</p>
          <Button className="mt-4" onClick={close}>
            Back to the game
          </Button>
        </div>
      ) : (
        <>
          {canSend ? (
            <>
              <div className="grid grid-cols-4 gap-2">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRating(r.value)}
                    aria-pressed={rating === r.value}
                    className={cx('flex flex-col items-center rounded-2xl border p-2', rating === r.value ? 'border-teal bg-teal-soft' : 'border-ink/10 bg-white')}
                  >
                    <span className="text-3xl">{r.emoji}</span>
                    <span className="mt-1 text-[11px] font-semibold text-ink-soft">{r.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 text-xs font-bold uppercase tracking-wider text-ink-soft">What should we improve?</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    aria-pressed={topics.includes(t.id)}
                    className={cx('rounded-full border px-3 py-1 text-xs font-semibold', topics.includes(t.id) ? 'border-teal bg-teal text-white' : 'border-ink/15 bg-paper')}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <Button className="mt-4 w-full" disabled={rating === null && topics.length === 0} onClick={send}>
                Send anonymously
              </Button>
              <p className="mt-2 text-[11px] text-ink-soft">Sends only your choices above. No name, no save data.</p>
            </>
          ) : (
            <p className="text-sm text-ink-soft">
              {optedOut ? 'You turned off anonymous stats in Settings, so quick ratings are off.' : 'Quick ratings are not set up yet.'}
            </p>
          )}
          {FEEDBACK_FORM_URL && (
            <a href={FEEDBACK_FORM_URL} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-teal">
              Write longer feedback <ExternalLink size={14} />
            </a>
          )}
        </>
      )}
    </Modal>
  );
}
