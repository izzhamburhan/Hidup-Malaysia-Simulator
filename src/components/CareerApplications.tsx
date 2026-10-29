import { useState } from 'react';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { companyById } from '../data/companies';
import { jobById } from '../data/jobs';
import { formatRM } from '../engine/core';
import type { ApplicationStatus, JobApplication } from '../engine/types';
import { viewAction } from '../engine/simulationEngine';
import { useLoadedGame } from '../hooks/useGame';
import { ActionCard } from './ActionCard';
import { OrgBadge } from './OrgBadge';
import { Button, Card, Modal, Pill, SectionTitle, cx } from './ui';

const PAST: ApplicationStatus[] = ['rejected', 'expired', 'declined'];

/** True when an offer or an interview is waiting: Career shows Applications first. */
export function hasLiveApplications(apps: JobApplication[]): boolean {
  return apps.some((a) => a.status === 'offer' || a.status === 'interview');
}

function salaryLabel(a: JobApplication): string {
  const perShift = jobById(a.jobId)?.schedule === 'parttime';
  return `${formatRM(a.offerSalary ?? 0)}${perShift ? '/shift' : '/mo'}`;
}

function statusTone(s: ApplicationStatus) {
  return s === 'offer' ? 'green' : s === 'interview' ? 'blue' : s === 'rejected' || s === 'expired' ? 'red' : 'neutral';
}

/** Applications on Life > Career: live ones first, offers as compact rows, dead ones under "Past (n)". */
export function CareerApplications() {
  const { state, request } = useLoadedGame();
  const [respondId, setRespondId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const apps = state.career.applications.slice(0, 10);
  if (apps.length === 0) return null;

  const rank = (a: JobApplication) => (a.status === 'offer' ? 0 : a.status === 'interview' ? 1 : 2);
  const live = apps.filter((a) => !PAST.includes(a.status)).sort((a, b) => rank(a) - rank(b));
  const past = apps.filter((a) => PAST.includes(a.status));
  const responding = respondId ? apps.find((a) => a.id === respondId && a.status === 'offer') : undefined;

  const respond = (id: string, param: string) => {
    const view = viewAction(state, id, param);
    if (!view) return;
    setRespondId(null);
    request(view);
  };

  return (
    <>
      <SectionTitle>Applications</SectionTitle>
      <div className="space-y-2">
        {live.map((a) =>
          a.status === 'offer' ? (
            <Card key={a.id} tier="hero" className="p-3 pt-4">
              <div className="flex items-center gap-3">
                <OrgBadge text={companyById(a.companyId)?.badge ?? '?'} kind={companyById(a.companyId)?.fictional ? 'fictional' : 'company'} size={40} title={companyById(a.companyId)?.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{jobById(a.jobId)?.title}</div>
                  <div className="truncate text-xs text-ink-soft">{companyById(a.companyId)?.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    <Pill tone="green">Offer</Pill>
                    <span className="text-xs font-bold tabular-nums">{salaryLabel(a)}</span>
                  </div>
                </div>
                <Button className="hit-44 h-9 shrink-0 px-3.5" onClick={() => setRespondId(a.id)} aria-label={`Respond to offer from ${companyById(a.companyId)?.name ?? 'employer'}`}>
                  Respond
                  <ChevronRight size={16} aria-hidden />
                </Button>
              </div>
            </Card>
          ) : (
            <Card key={a.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{jobById(a.jobId)?.title}</div>
                  <div className="truncate text-xs text-ink-soft">{companyById(a.companyId)?.name}</div>
                </div>
                <Pill tone={statusTone(a.status)}>{a.status}</Pill>
              </div>
              {a.status === 'pending' && <div className="mt-1 text-xs text-ink-soft">Reply expected around day {a.respondDay + 1}.</div>}
              {a.status === 'interview' && <InterviewAttend id={a.id} day={(a.interviewDay ?? 0) + 1} />}
            </Card>
          ),
        )}
      </div>

      {past.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
            aria-controls="past-applications"
            className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-2 text-sm font-semibold text-ink-soft hover:bg-paper-2"
          >
            <span>Past ({past.length})</span>
            <ChevronDown size={16} aria-hidden className={cx('transition-transform', showPast && 'rotate-180')} />
          </button>
          {showPast && (
            <div id="past-applications" className="mt-1 space-y-2">
              {past.map((a) => (
                <Card key={a.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{jobById(a.jobId)?.title}</div>
                      <div className="truncate text-xs text-ink-soft">{companyById(a.companyId)?.name}</div>
                    </div>
                    <Pill tone={statusTone(a.status)}>{a.status}</Pill>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={!!responding}
        onClose={() => setRespondId(null)}
        title="Respond to offer"
      >
        {responding && (
          <div>
            <div className="flex items-center gap-3">
              <OrgBadge text={companyById(responding.companyId)?.badge ?? '?'} kind={companyById(responding.companyId)?.fictional ? 'fictional' : 'company'} size={44} title={companyById(responding.companyId)?.name} />
              <div className="min-w-0">
                <div className="text-sm font-bold">{jobById(responding.jobId)?.title}</div>
                <div className="text-xs text-ink-soft">{companyById(responding.companyId)?.name}</div>
                <div className="mt-0.5 text-sm">
                  <b>{formatRM(responding.offerSalary ?? 0)}</b>
                  {jobById(responding.jobId)?.schedule === 'parttime' ? ' per shift' : ' per month (gross)'}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <SheetAction id="accept-offer" param={responding.id} label="Accept offer" variant="primary" onPick={respond} />
              <SheetAction id="negotiate-offer" param={responding.id} label="Negotiate salary" variant="secondary" onPick={respond} />
              <SheetAction id="decline-offer" param={responding.id} label="Decline offer" variant="secondary" onPick={respond} />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function InterviewAttend({ id, day }: { id: string; day: number }) {
  const { state } = useLoadedGame();
  const view = viewAction(state, 'attend-interview', id);
  if (!view) return null;
  return (
    <div className="mt-2">
      <ActionCard view={view} label={`Attend interview (day ${day})`} />
    </div>
  );
}

function SheetAction({ id, param, label, variant, onPick }: { id: string; param: string; label: string; variant: 'primary' | 'secondary'; onPick: (id: string, param: string) => void }) {
  const { state } = useLoadedGame();
  const view = viewAction(state, id, param);
  if (!view) return null;
  return (
    <div>
      <Button variant={variant} className="min-h-[44px] w-full" disabled={!view.available} onClick={() => onPick(id, param)}>
        {label}
      </Button>
      {!view.available && view.reason && (
        <div className="mt-1 flex items-start gap-1 text-[11px] font-medium text-hibiscus">
          <Lock size={11} className="mt-0.5 shrink-0" aria-hidden /> {view.reason}
        </div>
      )}
    </div>
  );
}
