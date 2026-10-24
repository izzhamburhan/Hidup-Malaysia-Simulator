// The mini-game picker and the three games. A game only produces a score; the reward is the
// engine's play-minigame action, sent when the player taps "Collect".

import { useEffect, useRef, useState } from 'react';
import { MAMAK_MENU, MINIGAMES, minigameById, type MinigameId } from '../../data/minigames';
import { viewAction } from '../../engine/simulationEngine';
import { useLoadedGame } from '../../hooks/useGame';
import { Button, Modal, cx } from '../ui';
import { busScore, orderScore, pourScore } from './scoring';

export function Minigames({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, request } = useLoadedGame();
  const [game, setGame] = useState<MinigameId | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!open) {
      setGame(null);
      setScore(null);
    }
  }, [open]);

  const start = (id: MinigameId) => {
    setGame(id);
    setScore(null);
    setRound((r) => r + 1);
  };
  const collect = () => {
    if (!game || score === null) return;
    const v = viewAction(state, 'play-minigame', `${game}:${score}`);
    onClose();
    if (v) request(v, 'list');
  };
  const def = game ? minigameById(game) : null;
  const best = (id: string) => Number(state.flags[`mg-best-${id}`] ?? 0);

  return (
    <Modal open={open} onClose={onClose} title={def ? `${def.icon} ${def.name}` : '🎮 Mini-games'}>
      {!def && (
        <div className="grid gap-2">
          {MINIGAMES.map((g) => (
            <button key={g.id} type="button" onClick={() => start(g.id)} className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-3 text-left active:scale-[0.98]">
              <span className="text-4xl">{g.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{g.name}</span>
                <span className="block text-xs text-ink-soft">{g.blurb}</span>
              </span>
              {best(g.id) > 0 && <span className="text-xs font-bold text-teal">Best {best(g.id)}</span>}
            </button>
          ))}
          <p className="text-center text-[11px] text-ink-soft">Each game takes 10 minutes of your day. Your first 3 games a day lift your mood.</p>
        </div>
      )}
      {def && score === null && (
        <div key={round}>
          <p className="mb-3 text-center text-sm text-ink-soft">{def.blurb}</p>
          {game === 'kejar-bas' && <KejarBas onDone={setScore} />}
          {game === 'teh-tarik' && <TehTarik onDone={setScore} />}
          {game === 'ingat-order' && <IngatOrder onDone={setScore} />}
        </div>
      )}
      {def && score !== null && (
        <div className="anim-pop py-2 text-center">
          <div className="text-5xl">{score >= 90 ? '🏆' : score >= 60 ? '😄' : score >= 30 ? '🙂' : '😅'}</div>
          <div className="font-display mt-1 text-3xl font-black">{score}</div>
          <div className="text-sm text-ink-soft">{score >= 90 ? 'Terbaik!' : score >= 60 ? 'Not bad at all.' : score >= 30 ? 'Boleh lah.' : 'Next time, next time.'}</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => start(def.id)}>
              Try again
            </Button>
            <Button onClick={collect}>Collect</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Tap fast enough to close the gap to the bus before it pulls away. */
function KejarBas({ onDone }: { onDone: (score: number) => void }) {
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
      <div className="relative h-24 overflow-hidden rounded-2xl bg-gradient-to-b from-[#9fd6f2] to-[#d8f0c2]">
        <div className="absolute inset-x-0 bottom-0 h-6 bg-[#6b6b6b]" />
        <span className="absolute bottom-4 text-4xl transition-all duration-100" style={{ left: `${4 + progress * 62}%` }} aria-hidden>
          🏃
        </span>
        <span className="absolute bottom-4 right-3 text-5xl" aria-hidden>
          🚌
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
        {started ? 'LARI! TAP TAP TAP' : 'Tap to start running'}
      </button>
    </div>
  );
}

/** Hold to pour, release when the foam reaches the green zone. Three pours. */
function TehTarik({ onDone }: { onDone: (score: number) => void }) {
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

/** Remember the order, then tap it back in the same order. */
function IngatOrder({ onDone }: { onDone: (score: number) => void }) {
  const [order] = useState(() => {
    // UI-only shuffle: the order is the challenge shown to the player, like an event's wording.
    const menu = [...MAMAK_MENU];
    for (let i = menu.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [menu[i], menu[j]] = [menu[j], menu[i]];
    }
    return menu.slice(0, 4).map((m) => m.id);
  });
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
  const item = (id: string) => MAMAK_MENU.find((m) => m.id === id)!;

  return (
    <div className="select-none">
      <div className="mb-3 rounded-2xl bg-paper-2 p-3 text-center">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{showing ? 'Table 7 wants…' : 'What did they order?'}</div>
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
        {MAMAK_MENU.map((m) => (
          <button key={m.id} type="button" onClick={() => pick(m.id)} disabled={showing} className="flex flex-col items-center rounded-2xl border border-ink/10 bg-white p-2 text-center active:scale-95 disabled:opacity-40">
            <span className="text-3xl">{m.icon}</span>
            <span className="text-[10px] font-semibold leading-tight">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}