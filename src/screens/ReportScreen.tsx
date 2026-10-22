import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { formatRM } from '../engine/core';
import { endings, lifeReport, shareText } from '../engine/endings';
import { useLoadedGame } from '../hooks/useGame';
import { GAME_URL } from '../config';
import { track } from '../lib/analytics';
import { PixelAvatar } from '../components/PixelAvatar';
import { moodOf } from '../engine/appearance';
import { Button, Card, KeyValue, Modal, Pill, SectionTitle } from '../components/ui';

export function ReportScreen() {
  const { state, finishChapter, keepLiving } = useLoadedGame();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const report = lifeReport(state);
  const ended = !!state.ending;
  const ending = ended ? (endings.find((e) => e.id === state.ending!.id) ?? report.ending) : report.ending;
  const chapterLeft = Math.max(0, state.chapterDays - state.clock.day);

  const share = async () => {
    const text = `${shareText({ ...report, ending })}\nPlay: ${GAME_URL}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'HIDUP MALAYSIA', text });
        setShareMsg('Shared!');
        track('share', { source: 'native', ending: ending.id });
        return;
      }
    } catch {
      /* user cancelled or unsupported: fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareMsg('Copied to clipboard. Paste it anywhere!');
      track('share', { source: 'clipboard', ending: ending.id });
    } catch {
      setShareMsg('Sharing is not available here. Take a screenshot of the card instead.');
    }
  };

  return (
    <div>
      {!ended && (
        <p className="mb-3 rounded-2xl bg-gold-soft p-3 text-sm">
          {state.flags.chapterOffered ? 'Your chapter is complete. Lock in your ending, or keep living.' : `Preview: if your chapter ended today. ${chapterLeft} day(s) left in this chapter.`}
        </p>
      )}

      {/* Share card: sized for phone screenshots */}
      <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl bg-teal p-5 text-white shadow-xl">
        <div className="songket absolute inset-0 opacity-30" aria-hidden />
        <div className="relative flex h-full flex-col">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">Hidup Malaysia · {report.mode}</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-5xl">{ending.icon}</div>
            <div className="-mb-1 rounded-2xl bg-white/10 px-2 pt-2">
              <PixelAvatar appearance={state.character.appearance} mood={moodOf(state)} size={72} />
            </div>
          </div>
          <div className="font-display mt-1 text-3xl font-black leading-tight">{ending.title}</div>
          <p className="mt-1 text-sm text-white/80">{ending.blurb}</p>
          <div className="mt-auto space-y-1.5 text-sm">
            <Row k="Who" v={`${report.name}, ${report.age} · day ${report.days + 1}`} />
            <Row k="Career" v={report.career} />
            <Row k="Net worth" v={formatRM(report.netWorth)} />
            <Row k="Love" v={report.relationship} />
            <Row k="Home" v={report.housing} />
            <div className="pt-2">
              <div className="flex justify-between text-[11px] font-semibold text-white/70">
                <span>Life balance</span>
                <span>{report.balance}/100</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-gold" style={{ width: `${report.balance}%` }} />
              </div>
            </div>
            <div className="pt-1 text-[10px] text-white/60">🏆 {report.achievements}/{report.achievementTotal} achievements · Fictional game results</div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-3 grid max-w-sm grid-cols-1 gap-2">
        <Button onClick={share}>
          <Share2 size={16} /> Share result
        </Button>
        {shareMsg && <p className="text-center text-xs text-ink-soft">{shareMsg}</p>}
        {!ended ? (
          <Button variant="secondary" onClick={() => setConfirmEnd(true)}>
            End this chapter now
          </Button>
        ) : (
          <Button variant="secondary" onClick={keepLiving}>
            Keep living (new chapter)
          </Button>
        )}
      </div>

      <SectionTitle>Full life report</SectionTitle>
      <Card>
        <KeyValue label="Age" value={report.age} />
        <KeyValue label="Career" value={report.career} />
        {report.salary > 0 && <KeyValue label="Salary" value={`${formatRM(report.salary)}/mo`} />}
        <KeyValue label="Savings (incl. emergency fund)" value={formatRM(report.savings)} />
        <KeyValue label="Debt" value={formatRM(report.debt)} />
        <KeyValue label="EPF" value={formatRM(report.epf)} />
        <KeyValue label="Housing" value={report.housing} />
        <KeyValue label="Vehicle" value={report.vehicle} />
        <KeyValue label="Fitness" value={`${report.fitness}/100`} />
        <KeyValue label="Well-being" value={`${report.wellbeing}/100`} />
        <KeyValue label="Relationship" value={report.relationship} />
        <KeyValue label="Education" value={report.education} />
        <KeyValue label="Achievements" value={`${report.achievements}/${report.achievementTotal}`} />
      </Card>
      {report.memorable.length > 0 && (
        <>
          <SectionTitle>Memorable moments</SectionTitle>
          <Card>
            <ul className="space-y-1 text-sm">
              {report.memorable.map((m, i) => (
                <li key={i}>• {m}</li>
              ))}
            </ul>
          </Card>
        </>
      )}
      <SectionTitle>Other paths you were on</SectionTitle>
      <div className="flex flex-wrap gap-1">
        <Pill tone="teal">
          {report.runnerUp.icon} {report.runnerUp.title}
        </Pill>
        <Pill>No ending is "the best" one.</Pill>
      </div>

      <Modal
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="End this chapter?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmEnd(false)}>
              Not yet
            </Button>
            <Button
              onClick={() => {
                finishChapter();
                setConfirmEnd(false);
              }}
            >
              Lock in ending
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">Your ending will be locked as <b>{report.ending.title}</b>. You can still start a new chapter afterwards.</p>
      </Modal>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/10 pb-1">
      <span className="text-white/60">{k}</span>
      <span className="truncate text-right font-semibold">{v}</span>
    </div>
  );
}
