import { useEffect } from 'react';
import { activityFor } from '../components/room/activity';
import { startMusic, stopMusic } from '../lib/music';
import { ERROR_SOUND, SOUNDS, buzz, playNotes, unlockAudio } from '../lib/sound';
import { useLoadedGame } from './useGame';

/** Plays a sound and a light buzz after every action, and a soft "bonk" when a tap is refused. */
export function useGameSounds(): void {
  const { lastActivity, feedback, settings } = useLoadedGame();

  useEffect(() => unlockAudio(), []);

  // Background lofi. Browsers keep audio locked until a tap, so start on the first pointerdown if needed.
  useEffect(() => {
    if (!settings.music) {
      stopMusic();
      return;
    }
    const start = () => startMusic(settings.musicStation, settings.musicVolume);
    start();
    window.addEventListener('pointerdown', start, { once: true, passive: true });
    return () => window.removeEventListener('pointerdown', start);
  }, [settings.music, settings.musicStation, settings.musicVolume]);

  // Leaving the game screen (back to the landing page) ends the music.
  useEffect(() => () => stopMusic(), []);

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