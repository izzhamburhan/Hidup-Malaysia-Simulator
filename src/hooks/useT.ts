import { translate, type StringKey } from '../i18n';
import { useGame } from './useGame';

/** Translate a UI string into the player's chosen language. */
export function useT() {
  const { settings } = useGame();
  return (key: StringKey, vars?: Record<string, string | number>) => translate(settings.language, key, vars);
}