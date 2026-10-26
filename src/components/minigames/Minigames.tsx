// The mini-game picker for the room's Games button. A game only produces a score; the reward is
// the engine's play-minigame action, sent when the player taps "Collect". The games themselves
// live in Games.tsx and are shared with the action games.

import { useEffect, useState } from 'react';
import { MAMAK_MENU, MINIGAMES, minigameById, type MinigameId } from '../../data/minigames';
import { viewAction } from '../../engine/simulationEngine';
import { useLoadedGame } from '../../hooks/useGame';
import { Button, Modal } from '../ui';
import { MemoryOrder, TapRace, TehTarik } from './Games';

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
          {game === 'kejar-bas' && <TapRace theme="bus" onDone={setScore} />}
          {game === 'teh-tarik' && <TehTarik onDone={setScore} />}
          {game === 'ingat-order' && <MemoryOrder items={MAMAK_MENU} heading="Table 7 wants…" ask="What did they order?" onDone={setScore} />}
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
