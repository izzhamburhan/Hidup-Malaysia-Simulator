// One answer to "should this animate?": the in-app Reduced motion setting OR the
// system prefers-reduced-motion media query. Live: follows either changing.

import { useEffect, useState } from 'react';
import { useGame } from './useGame';

const QUERY = '(prefers-reduced-motion: reduce)';

function systemPrefersReduced(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

export function useReducedMotion(): boolean {
  const { settings } = useGame();
  const [system, setSystem] = useState(systemPrefersReduced);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setSystem(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return settings.reducedMotion || system;
}
