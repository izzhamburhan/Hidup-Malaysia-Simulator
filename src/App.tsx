import { useEffect, useState } from 'react';
import { useGame } from './hooks/useGame';
import { Landing } from './screens/Landing';
import { CharacterCreation } from './screens/CharacterCreation';
import { GameShell } from './screens/GameShell';
import { cx } from './components/ui';

type View = 'landing' | 'create' | 'game';

export default function App() {
  const { state, settings, slot, exitDaily } = useGame();
  const [view, setView] = useState<View>('landing');
  const current: View = view === 'game' && !state ? 'landing' : view;

  useEffect(() => {
    document.documentElement.lang = settings.language === 'ms' ? 'ms' : 'en';
  }, [settings.language]);

  // Each screen starts at the top (creation is long; the game should not open scrolled down).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [current]);

  return (
    <div className={cx('min-h-screen bg-paper', settings.reducedMotion && 'reduced-motion')}>
      {current === 'game' && (
        <GameShell
          onExit={() => {
            if (slot === 'daily') exitDaily();
            setView('landing');
          }}
        />
      )}
      {current === 'create' && <CharacterCreation onBack={() => setView('landing')} onDone={() => setView('game')} />}
      {current === 'landing' && <Landing onNew={() => setView('create')} onContinue={() => setView('game')} onDaily={() => setView('game')} />}
    </div>
  );
}
