import { useEffect } from 'react';
import { activityFor } from '../components/room/activity';
import { ERROR_SOUND, SOUNDS, buzz, playNotes, unlockAudio } from '../lib/sound';
import { useLoadedGame } from './useGame';

/** Plays a sound and a light buzz after every action, and a soft "bonk" when a tap is refused. */
export function useGameSounds(): void {
  const { lastActivity, feedback, settings } = useLoadedGame();

  useEffect(() => unlockAudio(), []);

  useEffect(() => {
    if (!lastActivity) return;
    const activity = activityFor(lastActivity.id, lastActivity.param);
    if (settings.sound) playNotes(SOUNDS[activity]);
    if (settings.vibration) buzz(activity === 'money' ? [10, 40, 10] : 15);
    // Keyed on the action only, so flipping a setting never makes a noise.
  }, [lastActivity]);

  useEffect(() => {
    if (!feedback || feedback.ok) return;
    if (settings.sound) playNotes(ERROR_SOUND);
    if (settings.vibration) buzz([30, 40, 30]);
  }, [feedback]);
}