import { achievements, challenges, MAX_ACTIVE_CHALLENGES } from '../data/achievements';
import { formatRM } from '../engine/core';
import { canStartChallenge } from '../engine/progression';
import { useLoadedGame } from '../hooks/useGame';
import { Button, Card, Pill, SectionTitle, cx } from '../components/ui';

export function GoalsScreen() {
  const { state, interact } = useLoadedGame();
  const unlocked = Object.keys(state.achievements).length;
  return (
    <div>
      <SectionTitle action={<Pill tone="teal">{state.challenges.active.length}/{MAX_ACTIVE_CHALLENGES} active</Pill>}>Life challenges</SectionTitle>
      <div className="space-y-2">
        {challenges.map((c) => {
          const active = state.challenges.active.includes(c.id);
          const done = state.challenges.completed[c.id] !== undefined;
          const failed = state.challenges.failed.includes(c.id);
          const { current, target } = c.progress(state);
          const pct = Math.max(0, Math.min(100, (current / target) * 100));
          const reason = canStartChallenge(state, c.id);
          const money = target >= 1000;
          return (
            <Card key={c.id} className={cx('p-3', active && 'border-teal', done && 'border-leaf bg-leaf-soft/40')}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{c.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">{c.title}</span>
                    {done ? <Pill tone="green">Done</Pill> : failed ? <Pill tone="red">Missed</Pill> : active ? <Pill tone="teal">Active</Pill> : null}
                  </div>
                  <p className="text-xs text-ink-soft">{c.description}</p>
                  {(active || done) && (
                    <>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2">
                        <div className={cx('h-full rounded-full', done ? 'bg-leaf' : 'bg-teal-2')} style={{ width: `${done ? 100 : pct}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] text-ink-soft">
                        {money ? `${formatRM(current)} / ${formatRM(target)}` : `${Math.round(current)} / ${target}`} · Reward: {c.reward}
                      </div>
                    </>
                  )}
                  {!active && !done && !failed && (
                    <Button variant="secondary" className="mt-2 px-3 py-1.5 text-xs" disabled={!!reason} onClick={() => interact('challenge', c.id)}>
                      {reason ?? 'Take on this challenge'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <SectionTitle action={<Pill tone="gold">{unlocked}/{achievements.length}</Pill>}>Achievements</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {achievements.map((a) => {
          const got = state.achievements[a.id] !== undefined;
          return (
            <div key={a.id} className={cx('rounded-2xl border p-3', got ? 'border-gold bg-gold-soft/50' : 'border-ink/10 bg-white opacity-70')}>
              <div className={cx('text-2xl', !got && 'grayscale')}>{got ? a.icon : '🔒'}</div>
              <div className="mt-1 text-sm font-bold leading-tight">{a.title}</div>
              <div className="text-[11px] leading-snug text-ink-soft">{a.description}</div>
              {got && <div className="mt-1 text-[10px] font-semibold text-[#7a5a00]">Day {state.achievements[a.id] + 1}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
