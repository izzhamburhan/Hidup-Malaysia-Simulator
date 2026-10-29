// The quick game before an everyday action. Play it for a small bonus, or skip to do the
// action exactly as before. The bonus itself is the engine's (src/engine/actionGames.ts).

import { useEffect, useState } from 'react';
import { MEMORY_SETS } from '../../data/minigames';
import { actionGameFor, gameTier } from '../../engine/actionGames';
import { useLoadedGame } from '../../hooks/useGame';
import { Button, Modal } from '../ui';
import { MemoryOrder, PickReply, QuickMath, TapRace, TehTarik, TimingBar } from './Games';

const MEMORY_TEXT: Record<string, [string, string]> = {
  office: ["Today's tasks…", 'Do them in order'],
  hustle: ['Orders coming in…', 'Fill them in order'],
  mamak: ['Table 7 wants…', 'What did they order?'],
};

export function ActionGame() {
  const { gameFor, finishGame } = useLoadedGame();
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [score, setScore] = useState(0);

  useEffect(() => {
    setPhase('intro');
    setScore(0);
  }, [gameFor]);

  const game = gameFor ? actionGameFor(gameFor.id) : null;
  if (!gameFor || !game) return null;

  const done = (s: number) => {
    setScore(s);
    setPhase('done');
  };
  const tier = gameTier(score);
  const memory = MEMORY_SETS[game.theme as keyof typeof MEMORY_SETS];
  const [heading, ask] = MEMORY_TEXT[game.theme] ?? MEMORY_TEXT.mamak;

  return (
    <Modal
      open
      dismissable={false}
      title={
        <span className="flex items-center gap-2">
          <span className="text-2xl">{gameFor.icon}</span>
          {gameFor.title}
        </span>
      }
    >
      {phase === 'intro' && (
        <div>
          <div className="rounded-2xl bg-gold-soft p-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a5a00]">🎮 Quick game</div>
            <p className="mt-1 text-sm font-semibold">{game.intro}</p>
            <p className="mt-1 text-xs text-ink-soft">Score well for a small bonus. Skipping does the action as normal.</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => finishGame()}>
              Skip
            </Button>
            <Button onClick={() => setPhase('play')}>Play ▶</Button>
          </div>
        </div>
      )}
      {phase === 'play' && (
        <div>
          {game.kind === 'tap' && <TapRace theme={game.theme} onDone={done} />}
          {game.kind === 'timing' && <TimingBar theme={game.theme} onDone={done} />}
          {game.kind === 'pour' && <TehTarik onDone={done} />}
          {game.kind === 'math' && <QuickMath onDone={done} />}
          {game.kind === 'pick' && <PickReply theme={game.theme} onDone={done} />}
          {game.kind === 'memory' && <MemoryOrder items={memory ?? MEMORY_SETS.mamak} heading={heading} ask={ask} onDone={done} />}
        </div>
      )}
      {phase === 'done' && (
        <div className="anim-pop py-2 text-center">
          <div className="text-5xl">{score >= 90 ? '🏆' : score >= 60 ? '😄' : score >= 30 ? '🙂' : '😅'}</div>
          <div className="font-display mt-1 text-3xl font-black">{score}</div>
          <div className="text-sm text-ink-soft">{tier === 1 ? 'Terbaik! Full bonus.' : tier > 0.5 ? 'Nice! A good bonus.' : tier > 0 ? 'Boleh lah. A small bonus.' : 'No bonus this time.'}</div>
          <Button className="mt-4 w-full" onClick={() => finishGame(score)}>
            Continue
          </Button>
        </div>
      )}
    </Modal>
  );
}