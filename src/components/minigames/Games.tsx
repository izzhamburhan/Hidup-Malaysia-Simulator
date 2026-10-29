// The mini-game components. Each game only produces a 0-100 score through onDone; rewards are
// the engine's (play-minigame from the Games button, or an action's game bonus).
// Shuffles inside a game are UI-only input, like a player's choice; they never touch state.rng.

import { useEffect, useRef, useState } from 'react';
import { PICK_PROMPTS, type PickPrompt } from '../../data/minigames';
import { cx } from '../ui';
import { busScore, mathScore, orderScore, pickScore, pourScore, timingScore } from './scoring';

type Done = (score: number) => void;

function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The runner emoji faces left on every platform; `flip` turns it towards the goal on the right.
const TAP_THEMES: Record<string, { runner: string; flip?: boolean; goal: string; start: string; go: string; sky: string }> = {
  bus: { runner: '🏃', flip: true, goal: '🚌', start: 'Tap to start running', go: 'LARI! TAP TAP TAP', sky: 'from-[#9fd6f2] to-[#d8f0c2]' },
  run: { runner: '🏃', flip: true, goal: '🏁', start: 'Tap to start your run', go: 'FASTER! TAP TAP TAP', sky: 'from-[#ffd7a8] to-[#d8f0c2]' },
  pushup: { runner: '🤸', goal: '💪', start: 'Tap to start', go: 'PUSH! TAP TAP TAP', sky: 'from-[#e7defc] to-[#fbefd9]' },
};

/** Tap fast enough to close the gap before time runs out. */
export function TapRace({ theme = 'bus', onDone }: { theme?: string; onDone: Done }) {
  const look = TAP_THEMES[theme] ?? TAP_THEMES.bus;
  const GAP = 40;
  const SECONDS = 8;
  const [taps, setTaps] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [started, setStarted] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setLeft((l) => Math.max(0, +(l - 0.1).toFixed(1))), 100);
    return () => clearInterval(t);
  }, [started]);

  useEffect(() => {
    if (done.current) return;
    if (taps >= GAP || (started && left <= 0)) {
      done.current = true;
      onDone(busScore(taps, GAP));
    }
  }, [taps, left, started, onDone]);

  const progress = Math.min(1, taps / GAP);
  return (
    <div className="select-none">
      <div className={cx('relative h-24 overflow-hidden rounded-2xl bg-gradient-to-b', look.sky)}>
        <div className="absolute inset-x-0 bottom-0 h-6 bg-[#6b6b6b]" />
        <span className={cx('absolute bottom-4 text-4xl transition-all duration-100', look.flip && '-scale-x-100')} style={{ left: `${4 + progress * 62}%` }} aria-hidden>
          {look.runner}
        </span>
        <span className="absolute bottom-4 right-3 text-5xl" aria-hidden>
          {look.goal}
        </span>
      </div>
      <div className="mt-2 flex justify-between text-xs font-bold text-ink-soft">
        <span>{Math.round(progress * 100)}% there</span>
        <span>{left.toFixed(1)}s</span>
      </div>
      <button
        type="button"
        onPointerDown={() => {
          if (done.current) return;
          setStarted(true);
          setTaps((n) => n + 1);
        }}
        className="mt-3 w-full rounded-2xl bg-hibiscus py-6 text-xl font-black text-white shadow-lg active:scale-[0.97]"
      >
        {started ? look.go : look.start}
      </button>
    </div>
  );
}

/** Hold to pour, release when the foam reaches the green zone. Three pours. */
export function TehTarik({ onDone }: { onDone: Done }) {
  const TARGET = 0.7;
  const POURS = 3;
  const [level, setLevel] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const holding = useRef(false);
  const frame = useRef(0);
  const startAt = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const tick = (now: number) => {
    if (!holding.current) return;
    setLevel(Math.min(1.1, (now - startAt.current) / 1600));
    frame.current = requestAnimationFrame(tick);
  };
  const press = () => {
    if (levels.length >= POURS) return;
    holding.current = true;
    startAt.current = performance.now();
    setLevel(0);
    frame.current = requestAnimationFrame(tick);
  };
  const release = () => {
    if (!holding.current) return;
    holding.current = false;
    cancelAnimationFrame(frame.current);
    const next = [...levels, level];
    setLevels(next);
    if (next.length >= POURS) setTimeout(() => onDone(pourScore(next, TARGET)), 400);
  };

  return (
    <div className="select-none">
      <div className="mx-auto flex items-end justify-center gap-6">
        <div className="relative h-44 w-24 overflow-hidden rounded-b-3xl rounded-t-md border-4 border-white/80 bg-white/40 shadow-inner">
          <div className="absolute inset-x-0 border-y-2 border-dashed border-leaf bg-leaf/20" style={{ bottom: '60%', height: '20%' }} />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#b9773d] to-[#e8c28f]" style={{ height: `${Math.min(100, level * 100)}%` }}>
            <div className="h-2 bg-[#fbefd9]" />
          </div>
        </div>
        <div className="pb-2 text-left text-xs font-bold text-ink-soft">
          {Array.from({ length: POURS }, (_, i) => (
            <div key={i}>
              Pour {i + 1}: {levels[i] === undefined ? '…' : Math.abs(levels[i] - TARGET) <= 0.1 ? '✅ Perfect' : levels[i] > 1 ? '💦 Spilled' : levels[i] > TARGET ? 'A bit much' : 'A bit little'}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        className="mt-4 w-full touch-none rounded-2xl bg-[#9c6b43] py-6 text-xl font-black text-white shadow-lg active:scale-[0.97]"
      >
        {levels.length >= POURS ? 'Siap!' : 'Hold to pour ☕'}
      </button>
    </div>
  );
}

/** Remember the sequence, then tap it back in the same order. */
export function MemoryOrder({ items, heading, ask, onDone }: { items: { id: string; label: string; icon: string }[]; heading: string; ask: string; onDone: Done }) {
  const [order] = useState(() => shuffled(items).slice(0, 4).map((m) => m.id));
  const [showing, setShowing] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setShowing(false), 3500);
    return () => clearTimeout(t);
  }, []);

  const pick = (id: string) => {
    if (showing || picked.length >= order.length) return;
    const next = [...picked, id];
    setPicked(next);
    if (next.length === order.length) setTimeout(() => onDone(orderScore(order, next)), 500);
  };
  const item = (id: string) => items.find((m) => m.id === id)!;

  return (
    <div className="select-none">
      <div className="mb-3 rounded-2xl bg-paper-2 p-3 text-center">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{showing ? heading : ask}</div>
        <div className="mt-1 flex justify-center gap-2 text-3xl">
          {order.map((id, i) => (
            <span key={i} className={cx('flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm', !showing && !picked[i] && 'text-ink-soft')}>
              {showing ? item(id).icon : picked[i] ? item(picked[i]).icon : i + 1}
            </span>
          ))}
        </div>
        {showing && <div className="mt-1 text-xs text-ink-soft">{order.map((id) => item(id).label).join(', ')}</div>}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {items.map((m) => (
          <button key={m.id} type="button" onClick={() => pick(m.id)} disabled={showing} className="flex min-h-[64px] flex-col items-center justify-center rounded-2xl border border-ink/10 bg-white p-2 text-center active:scale-95 disabled:opacity-40">
            <span className="text-3xl">{m.icon}</span>
            <span className="text-[10px] font-semibold leading-tight">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const TIMING_THEMES: Record<string, { icon: string; button: string; good: string }> = {
  lift: { icon: '🏋️', button: 'LIFT!', good: 'Clean lift' },
  smash: { icon: '🏸', button: 'SMASH!', good: 'Smash!' },
  kick: { icon: '⚽', button: 'SHOOT!', good: 'GOL!' },
};

/** A marker sweeps across a bar; tap when it is inside the green zone. Three tries. */
export function TimingBar({ theme = 'kick', onDone }: { theme?: string; onDone: Done }) {
  const look = TIMING_THEMES[theme] ?? TIMING_THEMES.kick;
  const ZONES = [0.5, 0.3, 0.72];
  const HALF = 0.08;
  const [pos, setPos] = useState(0);
  const [taps, setTaps] = useState<number[]>([]);
  const posRef = useRef(0);
  const frame = useRef(0);

  useEffect(() => {
    if (taps.length >= ZONES.length) return;
    const t0 = performance.now();
    const speed = 1100 - taps.length * 150;
    const tick = (now: number) => {
      const phase = ((now - t0) / speed) % 2;
      posRef.current = phase < 1 ? phase : 2 - phase;
      setPos(posRef.current);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [taps.length]);

  const round = Math.min(taps.length, ZONES.length - 1);
  const tap = () => {
    if (taps.length >= ZONES.length) return;
    const next = [...taps, posRef.current];
    setTaps(next);
    if (next.length >= ZONES.length) {
      const offsets = next.map((p, i) => p - ZONES[i] + 0.5);
      setTimeout(() => onDone(timingScore(offsets, 0.5, HALF)), 400);
    }
  };
  const last = taps.length ? Math.abs(taps[taps.length - 1] - ZONES[taps.length - 1]) : null;

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between text-xs font-bold text-ink-soft">
        <span>
          Try {Math.min(taps.length + 1, ZONES.length)} of {ZONES.length}
        </span>
        <span>{last === null ? '' : last <= HALF ? `✅ ${look.good}` : last <= HALF + 0.12 ? '🙂 Close' : '😅 Miss'}</span>
      </div>
      <div className="relative h-14 overflow-hidden rounded-2xl bg-paper-2">
        <div className="absolute inset-y-0 border-x-2 border-leaf bg-leaf/25" style={{ left: `${(ZONES[round] - HALF) * 100}%`, width: `${HALF * 200}%` }} />
        <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl" style={{ left: `${4 + pos * 92}%` }} aria-hidden>
          {look.icon}
        </span>
      </div>
      <button type="button" onPointerDown={tap} className="mt-3 w-full rounded-2xl bg-teal py-6 text-xl font-black text-white shadow-lg active:scale-[0.97]">
        {taps.length >= ZONES.length ? 'Siap!' : look.button}
      </button>
    </div>
  );
}

interface Sum {
  text: string;
  answer: number;
  choices: number[];
}

function makeSum(): Sum {
  const r = (n: number) => 1 + Math.floor(Math.random() * n);
  const kind = Math.floor(Math.random() * 3);
  const [a, b] = [r(kind === 2 ? 9 : 20), r(kind === 2 ? 9 : 20)];
  const [text, answer] = kind === 0 ? [`${a} + ${b}`, a + b] : kind === 1 ? [`${Math.max(a, b)} − ${Math.min(a, b)}`, Math.max(a, b) - Math.min(a, b)] : [`${a} × ${b}`, a * b];
  const wrong = new Set<number>();
  while (wrong.size < 2) {
    const w = answer + (Math.floor(Math.random() * 7) - 3 || 4);
    if (w !== answer && w >= 0) wrong.add(w);
  }
  return { text, answer, choices: shuffled([answer, ...wrong]) };
}

/** Answer as many quick sums as you can before the timer ends. */
export function QuickMath({ onDone }: { onDone: Done }) {
  const SECONDS = 12;
  const TARGET = 6;
  const [sum, setSum] = useState(makeSum);
  const [left, setLeft] = useState(SECONDS);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setLeft((l) => Math.max(0, +(l - 0.1).toFixed(1))), 100);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (done.current || left > 0) return;
    done.current = true;
    onDone(mathScore(right, wrong, TARGET));
  }, [left, right, wrong, onDone]);

  const answer = (n: number) => {
    if (done.current) return;
    if (n === sum.answer) setRight((x) => x + 1);
    else setWrong((x) => x + 1);
    setFlash(n === sum.answer ? 'ok' : 'no');
    setSum(makeSum());
  };

  return (
    <div className="select-none">
      <div className="mb-2 flex justify-between text-xs font-bold text-ink-soft">
        <span>
          ✅ {right} · ❌ {wrong}
        </span>
        <span>{left.toFixed(1)}s</span>
      </div>
      <div key={`${right}-${wrong}`} className={cx('anim-pop rounded-2xl py-6 text-center font-display text-4xl font-black', flash === 'ok' ? 'bg-leaf/15' : flash === 'no' ? 'bg-hibiscus-soft' : 'bg-paper-2')}>
        {sum.text} = ?
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {sum.choices.map((c) => (
          <button key={c} type="button" onClick={() => answer(c)} className="rounded-2xl border border-ink/10 bg-white py-5 text-2xl font-black active:scale-95">
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Three rounds: read the line, pick the best reply. */
export function PickReply({ theme, onDone }: { theme: string; onDone: Done }) {
  const ROUNDS = 3;
  const [rounds] = useState(() => {
    const pool = PICK_PROMPTS[theme as keyof typeof PICK_PROMPTS] ?? PICK_PROMPTS.chat;
    return shuffled(pool)
      .slice(0, ROUNDS)
      .map((p: PickPrompt) => {
        const order = shuffled([0, 1, 2]);
        return { prompt: p.prompt, options: order.map((i) => p.options[i]), best: order.indexOf(p.best) };
      });
  });
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);

  const choose = (k: number) => {
    if (chosen !== null) return;
    setChosen(k);
    const good = k === rounds[i].best;
    const total = correct + (good ? 1 : 0);
    setTimeout(() => {
      if (i + 1 >= rounds.length) onDone(pickScore(total, rounds.length));
      else {
        setCorrect(total);
        setI(i + 1);
        setChosen(null);
      }
    }, 700);
  };
  const r = rounds[i];

  return (
    <div className="select-none">
      <div className="mb-2 text-xs font-bold text-ink-soft">
        {i + 1} of {rounds.length}
      </div>
      <div className="mb-3 rounded-2xl rounded-bl-sm bg-paper-2 p-3 text-[15px] font-semibold">{r.prompt}</div>
      <div className="space-y-2">
        {r.options.map((o, k) => (
          <button
            key={k}
            type="button"
            onClick={() => choose(k)}
            className={cx(
              'w-full rounded-2xl border p-3 text-left text-sm font-medium transition active:scale-[0.99]',
              chosen === null ? 'border-ink/10 bg-white' : k === r.best ? 'border-leaf bg-leaf/15' : k === chosen ? 'border-hibiscus bg-hibiscus-soft' : 'border-ink/5 bg-white/60 text-ink-soft',
            )}
          >
            {chosen !== null && k === r.best ? '✅ ' : chosen === k ? '❌ ' : ''}
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}