// Pou-style room: the character big in the middle, a backdrop that follows the activity,
// and a short animation after each action.

import { useEffect, useState } from 'react';
import { foodById } from '../../data/foods';
import { moodOf } from '../../engine/appearance';
import type { Mood } from '../../engine/types';
import { decorById } from '../../data/decor';
import { festiveSeason } from '../../engine/festive';
import { viewAction } from '../../engine/simulationEngine';
import { useLoadedGame } from '../../hooks/useGame';
import { useT } from '../../hooks/useT';
import { PixelAvatar } from '../PixelAvatar';
import { cx } from '../ui';
import { ACTIVITIES, ROOMS, activityFor, idleRoom, type Activity } from './activity';
import { DecorShop } from './DecorShop';
import { Wardrobe } from './Wardrobe';
import { Minigames } from '../minigames/Minigames';

const PLAY_MS = 2600;
const MOOD_BUBBLE: Record<Mood, string> = { happy: '😄', neutral: '', tired: '💤', stressed: '😰', unwell: '🤒' };

// Survives Home unmounting, so switching tabs never replays an old animation,
// but an action taken on another tab still plays when the player comes back.
let seenSeq = 0;

interface Playing {
  activity: Activity;
  held?: string;
  key: number;
}

function sky(minute: number): string {
  const h = minute / 60;
  if (h >= 5 && h < 11) return '🌤️';
  if (h >= 11 && h < 16) return '☀️';
  if (h >= 16 && h < 19.5) return '🌇';
  return '🌙';
}

export function Room({ greeting, title, detail, onGoal }: { greeting: string; title: string; detail: string; onGoal?: () => void }) {
  const { state, lastActivity, settings, request } = useLoadedGame();
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [shop, setShop] = useState(false);
  const t = useT();
  const [wardrobe, setWardrobe] = useState(false);
  const [games, setGames] = useState(false);

  useEffect(() => {
    if (!lastActivity || lastActivity.seq <= seenSeq) return;
    seenSeq = lastActivity.seq;
    const activity = activityFor(lastActivity.id, lastActivity.param);
    if (activity === 'idle') return;
    const food = activity === 'eat' ? foodById(lastActivity.param?.split(':')[0])?.icon : undefined;
    setPlaying({ activity, held: food, key: lastActivity.seq });
  }, [lastActivity]);

  useEffect(() => {
    if (!playing) return;
    // Tapped Next or End day further down the page: bring the room back so the animation is seen.
    if (window.scrollY > 40) window.scrollTo({ top: 0, behavior: settings.reducedMotion ? 'auto' : 'smooth' });
    const t = setTimeout(() => setPlaying(null), PLAY_MS);
    return () => clearTimeout(t);
  }, [playing, settings.reducedMotion]);

  const def = playing ? ACTIVITIES[playing.activity] : null;
  const roomId = def?.room ?? idleRoom(state.clock.minute);
  const room = ROOMS[roomId];
  const mood = moodOf(state);
  const motion = def?.motion ?? 'idle';
  const held = playing?.held ?? def?.held;
  const travels = motion === 'run' || motion === 'walk';
  const home = roomId === 'livingroom' || roomId === 'bedroom';
  const mine = (slot: 'wall' | 'left' | 'right' | 'centre', fallback: string) => (home ? decorById(state.decor.placed[slot])?.icon : undefined) ?? fallback;
  const centre = home ? decorById(state.decor.placed.centre)?.icon : undefined;
  const season = home ? festiveSeason(state) : null;
  const petBusy = playing?.activity === 'petfeed' || playing?.activity === 'petplay';

  return (
    <>
      <section className={cx('relative h-[290px] overflow-hidden rounded-3xl bg-gradient-to-b shadow-md transition-colors duration-500', room.wall)} aria-label={`${state.character.name} in the ${room.label.toLowerCase()}`}>
        {/* Wall */}
        <div className="absolute right-4 top-14 text-4xl opacity-90" aria-hidden>
          {mine('wall', room.wallItem)}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-white/70 px-2 py-0.5 text-lg leading-none shadow-sm" aria-hidden>
          {sky(state.clock.minute)}
        </div>

        {/* Goal */}
        <button type="button" onClick={onGoal} disabled={!onGoal} className="absolute left-3 right-14 top-3 rounded-2xl bg-white/80 px-3 py-2 text-left shadow-sm backdrop-blur-sm enabled:active:scale-[0.99]">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal">{greeting}</div>
          <div className="font-display truncate text-[15px] font-black leading-tight text-ink">{title}</div>
          <div className="truncate text-xs text-ink-soft">{detail}</div>
        </button>

        {season && (
          <div className="garland pointer-events-none absolute inset-x-6 top-[88px] flex justify-between text-xl" aria-label={`${season.name} decorations`}>
            {[...season.garland, ...season.garland].map((g, i) => (
              <span key={i} className="garland-item" style={{ animationDelay: `${(i % 4) * 0.25}s` }} aria-hidden>
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Floor */}
        <div className="room-floor absolute inset-x-0 bottom-0 h-[30%]" style={{ backgroundColor: room.floor }} aria-hidden />
        <div className="absolute bottom-[22%] left-3 text-5xl" aria-hidden>
          {mine('left', room.decor[0])}
        </div>
        <div className="absolute bottom-[22%] right-3 text-5xl" aria-hidden>
          {mine('right', room.decor[1])}
        </div>
        {centre && (
          <div className="absolute bottom-[24%] left-[27%] text-3xl" aria-hidden>
            {centre}
          </div>
        )}

        {/* Oyen */}
        {state.pet && (
          <button
            type="button"
            onClick={() => {
              const v = viewAction(state, 'play-pet');
              if (v) request(v, 'tile');
            }}
            className="absolute bottom-[10%] right-[4%] z-10 flex flex-col items-center"
            aria-label={`Play with ${state.pet.name}`}
          >
            <span className="rounded-full bg-white/85 px-1.5 text-sm leading-tight shadow-sm" aria-hidden>
              {state.pet.fullness < 30 ? '🍽️' : state.pet.mood < 40 ? '😾' : state.pet.mood >= 80 ? '💕' : '😺'}
            </span>
            <span className={cx('inline-block text-[44px] leading-none', petBusy ? 'motion-hop' : 'cat-idle')} aria-hidden>
              🐈
            </span>
            <span className="mt-0.5 rounded-full bg-black/30 px-1.5 text-[9px] font-bold uppercase tracking-wider text-white">{state.pet.name}</span>
          </button>
        )}

        {/* Character */}
        <div className="absolute bottom-[12%] left-1/2 w-[140px] -translate-x-1/2">
          <div className="room-shadow mx-auto" aria-hidden />
          <div key={playing?.key ?? 'idle'} className={cx('relative', travels && `travel-${motion}`)}>
            <div className={cx('origin-bottom', motion === 'idle' ? 'avatar-bob' : `motion-${motion}`)}>
              <PixelAvatar appearance={state.character.appearance} mood={motion === 'sleep' ? 'tired' : mood} size={140} title={`${state.character.name} feels ${mood}`} />
            </div>
            {held && (
              <span className={cx('absolute -right-2 bottom-[26%] text-4xl', motion === 'eat' ? 'held-eat' : 'held-bob')} aria-hidden>
                {held}
              </span>
            )}
            {def?.float.map((f, i) => (
              <span key={i} className="float-up absolute top-[8%] text-2xl" style={{ left: `${18 + i * 30}%`, animationDelay: `${i * 0.4}s` }} aria-hidden>
                {f}
              </span>
            ))}
            {!def && MOOD_BUBBLE[mood] && (
              <span className="absolute -left-2 top-[14%] rounded-full bg-white px-1.5 py-0.5 text-lg shadow" aria-hidden>
                {MOOD_BUBBLE[mood]}
              </span>
            )}
          </div>
        </div>

        {def?.bubble && (
          <div key={`b${playing?.key}`} className="anim-pop absolute left-1/2 top-[27%] -translate-x-1/2 whitespace-nowrap rounded-2xl bg-white px-3 py-1 text-sm font-bold text-ink shadow-md">
            {def.bubble}
          </div>
        )}

        {/* Lights down while sleeping */}
        <div className={cx('pointer-events-none absolute inset-0 bg-[#0b1230] transition-opacity duration-700', motion === 'sleep' ? 'opacity-45' : 'opacity-0')} aria-hidden />

        {home && !playing ? (
          <div className="absolute bottom-2 left-3 z-10 flex gap-1.5">
            <button type="button" onClick={() => setShop(true)} className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm active:scale-95">
              🛋️ {t('room.decor')}
            </button>
            <button type="button" onClick={() => setWardrobe(true)} className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm active:scale-95">
              👕 {t('room.style')}
            </button>
            <button type="button" onClick={() => setGames(true)} className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm active:scale-95">
              🎮 {t('room.games')}
            </button>
          </div>
        ) : (
          <div className="absolute bottom-2 left-3 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{room.label}</div>
        )}
      </section>
      <DecorShop open={shop} onClose={() => setShop(false)} />
      <Wardrobe open={wardrobe} onClose={() => setWardrobe(false)} />
      <Minigames open={games} onClose={() => setGames(false)} />
    </>
  );
}