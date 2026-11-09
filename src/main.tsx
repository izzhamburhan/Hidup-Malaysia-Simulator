import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { CloudProvider } from './hooks/useCloud';
import { GameProvider } from './hooks/useGame';
import { SocialProvider } from './hooks/useSocial';
import { setupInstall } from './lib/install';

setupInstall();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider>
      <CloudProvider>
        <SocialProvider>
          <App />
        </SocialProvider>
      </CloudProvider>
    </GameProvider>
  </StrictMode>,
);
