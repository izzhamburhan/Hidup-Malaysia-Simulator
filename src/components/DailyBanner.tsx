import { useState } from 'react';
import { GAME_URL } from '../config';
import type { DailyStatus } from '../engine/dailyChallenge';
import { useLoadedGame } from '../hooks/useGame';
import { track } from '../lib/analytics';
import { Button, cx } from './ui';

/** Progress for today's daily challenge, with Share and "back to my life" when it is over. */
export function DailyBanner({ status }: { status: DailyStatus }) {
  const { exitDaily } = useLoadedGame();
  const [msg, setMsg] = useState<string | null>(null);
  const { def, day, won, finished, date } = status;

  const share = async () => {
    const text = `${won ? 'I beat' : 'I tried'} today's Hidup Malaysia daily challenge: ${def.icon} ${def.title} ${won ? '✅' : '❌'} (${date})\nPlay: ${GAME_URL}`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        track('share', { source: 'daily' });
        return;
      }
      await navigator.clipboard.writeText(text);
      setMsg('Copied! Paste it anywhere.');
      track('share', { source: 'daily_clipboard' });
    } catch {
      setMsg('Could not share from this browser.');
    }
  };

  return (
    <section className="rounded-2xl border-2 border-gold bg-gold-soft p-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>
          {def.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a5a00]">🗓️ Daily challenge · day {finished ? 7 : day + 1}/7</div>
          <div className="font-bold leading-tight">{def.title}</div>
          <div className="text-xs text-ink-soft">{def.goal}</div>
        </div>
        <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', won ? 'bg-leaf text-white' : 'bg-white text-ink-soft')}>{won ? '✅ Goal met' : finished ? '❌ Missed' : '⏳ Going'}</span>
      </div>
      {finished && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button onClick={share}>Share result</Button>
          <Button variant="secondary" onClick={exitDaily}>
            Back to my life
          </Button>
        </div>
      )}
      {msg && <p className="mt-1 text-center text-xs text-ink-soft">{msg}</p>}
    </section>
  );
}