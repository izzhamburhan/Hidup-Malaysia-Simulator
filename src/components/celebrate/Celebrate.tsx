import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useLoadedGame } from '../../hooks/useGame';
import { FANFARE, buzz, playNotes } from '../../lib/sound';
import { celebrationsBetween, type Celebration } from './celebrations';

const SHOW_MS = 3400;
const COLORS = ['#e7b432', '#c2410c', '#155e5f', '#2563a8', '#2f7d4f', '#e86a92'];
const PIECES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 7) * 0.09,
  dur: 1.6 + ((i * 13) % 9) / 10,
  color: COLORS[i % COLORS.length],
  tilt: (i * 47) % 360,
  wide: i % 3 === 0,
}));

/** Confetti and a banner for big moments. Never blocks play: only the close button takes taps. */
export function Celebrate() {
  const { state, settings } = useLoadedGame();
  const prev = useRef(state);
  const seq = useRef(0);
  const [shown, setShown] = useState<{ c: Celebration; more: number; key: number } | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = state;
    if (before === state) return;
    const list = celebrationsBetween(before, state);
    if (!list.length) return;
    seq.current += 1;
    setShown({ c: list[0], more: list.length - 1, key: seq.current });
    if (settings.sound) playNotes(FANFARE);
    if (settings.vibration) buzz([20, 60, 20, 60, 40]);
    // Keyed on state only: a settings change must not replay a celebration.
  }, [state]);

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [shown]);

  if (!shown) return null;
  const { c, more } = shown;
  return (
    <div key={shown.key} className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" role="status" aria-live="polite">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="confetti absolute top-0"
          style={{ left: `${p.left}%`, width: p.wide ? 10 : 7, height: p.wide ? 6 : 12, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.tilt}deg)` }}
          aria-hidden
        />
      ))}
      <div className="mx-auto max-w-lg px-4 pt-28">
        <div className="anim-pop relative flex items-center gap-3 rounded-3xl border-2 border-gold bg-white p-4 shadow-xl">
          <span className="celebrate-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold-soft text-4xl">{c.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="font-pixel text-2xl font-bold leading-tight text-ink">{c.title}</div>
            <div className="text-sm text-ink-soft">{c.sub}</div>
            {more > 0 && <div className="mt-0.5 text-xs font-bold text-teal">+{more} more in your log</div>}
          </div>
          <button type="button" onClick={() => setShown(null)} className="pointer-events-auto self-start rounded-full p-1 text-ink-soft hover:bg-paper-2" aria-label="Close">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
