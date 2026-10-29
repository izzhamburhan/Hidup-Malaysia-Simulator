import { useMemo, useState, type ReactNode } from 'react';
import { companyById, industryLabels } from '../data/companies';
import { courseById, courses } from '../data/courses';
import { foods, portions } from '../data/foods';
import { housingOptions, properties } from '../data/housing';
import { jobById } from '../data/jobs';
import { gyms, hustleDefById, hustleDefs, shopItems } from '../data/lifestyle';
import { universities, universityById } from '../data/universities';
import { transportModes, vehicleById, vehicles } from '../data/vehicles';
import { VehicleSprite } from '../components/VehicleSprite';
import { formatDate, formatDuration } from '../engine/calendar';
import { scheduleLabel, jobEligibility } from '../engine/career';
import { formatRM, SKILL_KEYS } from '../engine/core';
import { CLASS_DAYS, computeGpa, isFinalSemester, semesterDay } from '../engine/education';
import { commuteMinutes, currentHome, scaledCost } from '../engine/living';
import { rankLifeTabs, type LifeTabId } from '../engine/insights';
import { listActions, viewAction, type ActionView } from '../engine/simulationEngine';
import { STAGE_LABEL } from '../engine/social';
import { hustleProfitTotal } from '../engine/business';
import { useLoadedGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import type { StringKey } from '../i18n';
import { OrgBadge } from '../components/OrgBadge';
import { NpcAvatar } from '../components/PixelAvatar';
import { ActionCard, VariantRow } from '../components/ActionCard';
import { CareerApplications, hasLiveApplications } from '../components/CareerApplications';
import { PixelMap } from '../components/PixelMap';
import { Button, Card, Disclaimer, EmptyState, KeyValue, Pill, SectionTitle, StatBar, Tabs, cx } from '../components/ui';

type Sub = LifeTabId;

const SKILL_LABEL: Record<(typeof SKILL_KEYS)[number], StringKey> = {
  tech: 'skill.tech',
  data: 'skill.data',
  business: 'skill.business',
  communication: 'skill.communication',
  creative: 'skill.creative',
  engineering: 'skill.engineering',
  care: 'skill.care',
  cooking: 'skill.cooking',
};

const LABELS: Record<Sub, { icon: string; key: StringKey }> = {
  career: { icon: '💼', key: 'life.tab.career' },
  study: { icon: '🎓', key: 'life.tab.study' },
  food: { icon: '🍛', key: 'life.tab.food' },
  fitness: { icon: '🏋️', key: 'life.tab.fitness' },
  people: { icon: '💞', key: 'life.tab.people' },
  home: { icon: '🏠', key: 'life.tab.home' },
  transport: { icon: '🚗', key: 'life.tab.transport' },
  hustle: { icon: '🛠️', key: 'life.tab.hustle' },
  shop: { icon: '🛒', key: 'life.tab.shop' },
  map: { icon: '🗺️', key: 'life.tab.map' },
};

export function LifeScreen() {
  const { state } = useLoadedGame();
  const t = useT();
  // Ordered by relevance to what the player is doing right now (never hidden, just reordered —
  // see docs/plans/cut-ui-width.md). Tabs don't jump around mid-visit: only the first render
  // of a new life picks the order and the default tab.
  const order = useMemo(() => rankLifeTabs(state), [state.character.backgroundId]);
  const SUBS = order.map((id) => ({ id, label: `${LABELS[id].icon} ${t(LABELS[id].key)}` }));
  const [sub, setSub] = useState<Sub>(order[0]);
  return (
    <div>
      <Tabs tabs={SUBS} value={sub} onChange={setSub} />
      <div className="mt-1">
        {sub === 'career' && <CareerTab />}
        {sub === 'study' && <StudyTab />}
        {sub === 'food' && <FoodTab />}
        {sub === 'fitness' && <FitnessTab />}
        {sub === 'people' && <PeopleTab />}
        {sub === 'home' && <HomeTab />}
        {sub === 'transport' && <TransportTab />}
        {sub === 'hustle' && <HustleTab />}
        {sub === 'shop' && <ShopTab />}
        {sub === 'map' && <PixelMap />}
      </div>
    </div>
  );
}

/** Render category actions from the shared catalogue (variants grouped). */
function CategoryActions({ ids }: { ids: string[] }) {
  const { state } = useLoadedGame();
  const views = listActions(state).filter((v) => ids.includes(v.id));
  const grouped = new Map<string, ActionView[]>();
  for (const v of views) grouped.set(v.id, [...(grouped.get(v.id) ?? []), v]);
  if (!grouped.size) return null;
  return (
    <div className="grid gap-2">
      {[...grouped.entries()].map(([id, vs]) =>
        vs.length > 1 ? <VariantRow key={id} views={vs} icon={vs[0].icon} title={vs[0].title.replace(/\s*\(.*\)$/, '')} description={vs[0].description} /> : <ActionCard key={id} view={vs[0]} />,
      )}
    </div>
  );
}

function V({ id, param, label, art }: { id: string; param?: string; label?: string; art?: ReactNode }) {
  const { state } = useLoadedGame();
  const view = viewAction(state, id, param);
  return view ? <ActionCard view={view} label={label} art={art} /> : null;
}

// ---------------- Career ----------------

function CareerTab() {
  const { state, request } = useLoadedGame();
  const t = useT();
  const job = state.career.job;
  const liveApps = hasLiveApplications(state.career.applications);
  const [industry, setIndustry] = useState<string>('all');
  const listings = state.career.listings.filter((l) => industry === 'all' || companyById(l.companyId)?.industry === industry);

  return (
    <div>
      {liveApps && (
        <>
          <CareerApplications />
          <div className="mt-5" />
        </>
      )}
      <SectionTitle>{t('life.career.current')}</SectionTitle>
      {job ? (
        <Card>
          <div className="flex items-start gap-3">
            <OrgBadge text={companyById(job.companyId)?.badge ?? '?'} kind={companyById(job.companyId)?.fictional ? 'fictional' : 'company'} size={48} title={companyById(job.companyId)?.name} />
            <div>
              <div className="text-base font-bold">
                {jobById(job.jobId)?.icon} {job.title}
              </div>
              <div className="text-sm text-ink-soft">{companyById(job.companyId)?.name}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Pill tone="teal">{scheduleLabel[job.schedule]}</Pill>
                <Pill>{job.schedule === 'parttime' ? t('life.perShift', { amount: formatRM(job.shiftPay) }) : t('money.perMonthLong', { amount: formatRM(job.monthlySalary) })}</Pill>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <StatBar label={t('life.career.performance')} value={job.performance} />
          </div>
          <KeyValue label={t('life.commute')} value={formatDuration(commuteMinutes(state))} />
          {job.schedule === 'fulltime' && <KeyValue label={t('life.career.review')} value={t('hud.day', { n: job.lastReviewDay + 182 + 1 })} />}
          <KeyValue label={t('life.career.absences')} value={job.absencesThisMonth} />
          <KeyValue label={t('life.career.experience')} value={t('life.years', { n: (state.career.experienceDays / 365).toFixed(1) })} />
        </Card>
      ) : (
        <EmptyState icon="🔎" title={t('life.career.none')}>{t('life.career.none.hint')}</EmptyState>
      )}
      <div className="mt-2">
        <CategoryActions ids={['work-shift', 'overtime', 'take-leave', 'update-cv', 'networking', 'online-course', 'self-study', 'resign']} />
      </div>

      <SectionTitle>{t('life.skills')}</SectionTitle>
      <Card className="grid grid-cols-2 gap-x-4 gap-y-2">
        {SKILL_KEYS.map((k) => (
          <div key={k}>
            <StatBar label={t(SKILL_LABEL[k])} value={state.skills[k]} tone="sky" />
            {state.skills[k] >= 100 && state.mastery[k] >= 1 && <div className="mt-0.5 text-[11px] font-semibold text-teal">{t('life.mastery', { n: Math.floor(state.mastery[k]) })}</div>}
          </div>
        ))}
        <StatBar label={t('life.cv')} value={state.career.cvQuality} tone="gold" />
      </Card>

      {!liveApps && <CareerApplications />}

      <SectionTitle action={<span className="text-[11px] text-ink-soft">{t('life.board.refresh')}</span>}>{t('life.board')}</SectionTitle>
      <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="mb-2 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm" aria-label={t('life.board.filter')}>
        <option value="all">{t('life.board.all')}</option>
        {Object.entries(industryLabels).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      {listings.length === 0 ? (
        <EmptyState icon="📭" title={t('life.board.none')}>{t('life.board.none.hint')}</EmptyState>
      ) : (
        <div className="space-y-2">
          {listings.map((l) => {
            const j = jobById(l.jobId)!;
            const c = companyById(l.companyId)!;
            const elig = jobEligibility(state, j);
            const view = viewAction(state, 'apply-job', l.id)!;
            return (
              <Card key={l.id} className="p-3">
                <div className="flex items-start gap-3">
                  <OrgBadge text={c.badge} kind={c.fictional ? 'fictional' : 'company'} size={44} title={c.name} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">{j.title}</div>
                    <div className="text-xs text-ink-soft">
                      {c.name} · {industryLabels[c.industry]}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Pill tone="gold">{j.schedule === 'parttime' ? t('life.perShift', { amount: formatRM(l.salary) }) : t('money.perMonth', { amount: formatRM(l.salary) })}</Pill>
                      <Pill>{scheduleLabel[j.schedule]}</Pill>
                      <Pill tone={elig.match >= 70 ? 'green' : elig.match >= 50 ? 'gold' : 'red'}>{t('life.match', { n: elig.match })}</Pill>
                    </div>
                    {elig.missing.length > 0 && <div className="mt-1 text-[11px] text-hibiscus">{elig.missing.join(' · ')}</div>}
                    <div className="mt-1 text-[11px] text-ink-soft">{t('life.closes', { n: l.expiresDay + 1 })}</div>
                  </div>
                </div>
                <Button className="mt-2 w-full" variant={view.available ? 'primary' : 'secondary'} onClick={() => request(view)}>
                  {view.available ? t('life.apply') : view.reason}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
      <Disclaimer>{t('life.board.note')}</Disclaimer>
    </div>
  );
}

// ---------------- Study ----------------

function StudyTab() {
  const { state } = useLoadedGame();
  const t = useT();
  const e = state.education;
  const [uniId, setUniId] = useState('um');
  const uni = universityById(uniId)!;
  const options = courses.filter((c) => uni.fields.includes(c.field));
  const [courseId, setCourseId] = useState(options[0]?.id ?? 'cs');

  if (e.status === 'studying') {
    const course = courseById(e.courseId)!;
    const d = Math.max(0, semesterDay(state));
    const attendance = e.classesHeld ? Math.min(100, Math.round((e.classesAttended / e.classesHeld) * 100)) : 100;
    return (
      <div>
        <SectionTitle>{t('life.study.studies')}</SectionTitle>
        <Card>
          <div className="mb-2 flex items-center gap-3">
            <OrgBadge text={universityById(e.universityId)?.short ?? '?'} kind={universityById(e.universityId)?.type === 'private' ? 'private-uni' : 'public-uni'} size={48} title={universityById(e.universityId)?.name} />
            <span className="text-[11px] text-ink-soft">{t('life.study.badge')}</span>
          </div>
          <div className="text-base font-bold">{course.name}</div>
          <div className="text-sm text-ink-soft">
            {universityById(e.universityId)?.name} · {universityById(e.universityId)?.type}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Pill tone="teal">
              {t('life.study.semester', { n: e.semester, total: e.totalSemesters })}
            </Pill>
            <Pill tone="gold">CGPA {e.gpaHistory.length ? e.cgpa.toFixed(2) : '—'}</Pill>
            {e.scholarship && <Pill tone="green">{t('life.study.scholarship')}</Pill>}
            {d >= CLASS_DAYS && <Pill tone="blue">{t('life.study.break')}</Pill>}
          </div>
          <div className="mt-3 space-y-2">
            <StatBar label={t('life.study.progress')} value={(Math.min(d, CLASS_DAYS) / CLASS_DAYS) * 100} />
            <StatBar label={t('life.study.knowledge')} value={e.knowledge} tone="sky" />
            <StatBar label={t('life.study.attendance')} value={attendance} tone="leaf" />
            {isFinalSemester(state) && <StatBar label={t('life.study.fyp')} value={e.fypProgress} tone="gold" />}
          </div>
          <KeyValue label={t('life.study.assignments')} value={t('life.study.assignments.value', { done: e.assignmentsDone, total: e.assignmentsTotal })} />
          <KeyValue label={t('life.study.gpaNow')} value={computeGpa(state).toFixed(2)} />
        </Card>
        <div className="mt-2">
          <CategoryActions ids={['attend-class', 'study', 'assignment', 'fyp', 'drop-out']} />
        </div>
        <SectionTitle>{t('life.study.intern')}</SectionTitle>
        <p className="text-sm text-ink-soft">{t('life.study.intern.hint')}</p>
        <GpaHistory history={e.gpaHistory} />
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>{t('life.study.education')}</SectionTitle>
      <Card>
        <KeyValue label={t('life.study.qual')} value={e.qualification.toUpperCase()} strong />
        {e.courseId && <KeyValue label={t('life.study.studied')} value={courseById(e.courseId)?.name} />}
        {e.status === 'graduated' && e.cgpa > 0 && <KeyValue label="CGPA" value={e.cgpa.toFixed(2)} />}
        {e.status === 'dropped' && <KeyValue label={t('life.study.status')} value={t('life.study.left')} />}
      </Card>
      <GpaHistory history={e.gpaHistory} />
      <SectionTitle>{t('life.study.enrol')}</SectionTitle>
      <Card className="space-y-3">
        <select value={uniId} onChange={(ev) => setUniId(ev.target.value)} className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm" aria-label={t('life.study.uni')}>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.short} — {u.type} — ~{formatRM(u.tuitionPerSemester)}/sem*
            </option>
          ))}
        </select>
        <select value={options.some((c) => c.id === courseId) ? courseId : options[0]?.id} onChange={(ev) => setCourseId(ev.target.value)} className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm" aria-label={t('life.study.course')}>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <V id="enroll" param={`${uniId}:${options.some((c) => c.id === courseId) ? courseId : options[0]?.id}`} />
        <Disclaimer>{t('life.study.note')}</Disclaimer>
      </Card>
    </div>
  );
}

function GpaHistory({ history }: { history: number[] }) {
  const t = useT();
  if (!history.length) return null;
  return (
    <>
      <SectionTitle>{t('life.study.results')}</SectionTitle>
      <Card className="flex items-end gap-2">
        {history.map((g, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="text-[10px] font-bold tabular-nums">{g.toFixed(2)}</div>
            <div className={cx('w-full rounded-t-md', g >= 3.67 ? 'bg-gold' : g >= 2 ? 'bg-teal-2' : 'bg-hibiscus')} style={{ height: `${(g / 4) * 80 + 6}px` }} />
            <div className="text-[10px] text-ink-soft">S{i + 1}</div>
          </div>
        ))}
      </Card>
    </>
  );
}

// ---------------- Food ----------------

function FoodTab() {
  const { state } = useLoadedGame();
  const t = useT();
  const [portion, setPortion] = useState('regular');
  const f = state.food;
  return (
    <div>
      <SectionTitle>{t('life.food.today')}</SectionTitle>
      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label={t('life.food.in')} value={Math.round(f.caloriesIn)} />
          <Stat label={t('life.food.burn')} value={Math.round(f.caloriesOut)} />
          <Stat label={t('life.food.water')} value={`${f.water} 💧`} />
        </div>
        {f.today.length ? (
          <div className="mt-3 divide-y divide-ink/5">
            {f.today.map((e, i) => (
              <KeyValue key={i} label={e.name} value={`${e.calories} kcal · ${formatRM(e.price, 2)}`} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">{t('life.food.none')}</p>
        )}
        <Disclaimer>{t('life.food.note')}</Disclaimer>
      </Card>
      <div className="mt-2">
        <V id="water" />
      </div>
      <SectionTitle>{t('life.food.portion')}</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {portions.map((p) => (
          <button key={p.id} type="button" onClick={() => setPortion(p.id)} className={cx('rounded-xl border py-2 text-sm font-semibold', portion === p.id ? 'border-teal bg-teal text-white' : 'border-ink/10 bg-white')}>
            {p.label}
          </button>
        ))}
      </div>
      <SectionTitle>{t('life.food.menu')}</SectionTitle>
      <div className="grid gap-2">
        {foods.map((food) => {
          const view = viewAction(state, 'eat', `${food.id}:${portion}`)!;
          return <ActionCard key={food.id} view={{ ...view, icon: food.icon }} />;
        })}
      </div>
      {f.history.length > 0 && (
        <>
          <SectionTitle>{t('life.food.last7')}</SectionTitle>
          <Card className="divide-y divide-ink/5 py-1">
            {f.history.slice(0, 7).map((h) => (
              <KeyValue key={h.day} label={formatDate(state, h.day)} value={t('life.food.hist', { in: h.caloriesIn, out: h.caloriesOut, water: h.water })} />
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-paper-2 p-2">
      <div className="text-[10px] font-semibold uppercase text-ink-soft">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}

// ---------------- Fitness ----------------

function FitnessTab() {
  const { state } = useLoadedGame();
  const t = useT();
  return (
    <div>
      <SectionTitle>{t('life.fit.body')}</SectionTitle>
      <Card className="space-y-2">
        <StatBar label={t('life.fit.fitness')} value={state.stats.fitness} tone="sky" />
        <StatBar label={t('life.fit.health')} value={state.stats.health} tone="leaf" />
        <KeyValue label={t('life.fit.streak')} value={`${state.fitness.streak} 🔥`} />
        <KeyValue label={t('life.fit.sessions')} value={state.fitness.sessions} />
        <KeyValue label={t('day.sleep')} value={`${(state.lastSleepMinutes / 60).toFixed(1)}h`} />
      </Card>
      <SectionTitle>{t('life.fit.exercise')}</SectionTitle>
      <CategoryActions ids={['gym', 'run', 'home-workout', 'badminton', 'futsal', 'football', 'cancel-gym']} />
      <SectionTitle>{t('life.fit.gyms')}</SectionTitle>
      <div className="grid gap-2">
        {gyms.map((g) => (
          <V key={g.id} id="join-gym" param={g.id} label={`${g.name} — ${t('money.perMonth', { amount: formatRM(g.monthlyFee) })}`} />
        ))}
      </div>
      <Disclaimer>{t('life.fit.note')}</Disclaimer>
    </div>
  );
}

// ---------------- People ----------------

function PeopleTab() {
  const { state } = useLoadedGame();
  const t = useT();
  const r = state.relationships;
  const p = r.partner;
  return (
    <div>
      <SectionTitle>{t('life.people.love')}</SectionTitle>
      {p ? (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <NpcAvatar name={p.name} size={52} />
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold">💞 {p.name}</div>
              <div className="text-xs text-ink-soft">
                {t('life.people.into', { trait: p.trait, interest: p.interest })} {p.longDistance && `· ${t('life.people.ldr')}`}
              </div>
            </div>
            <Pill tone="red">{STAGE_LABEL[p.stage]}</Pill>
          </div>
          <div className="mt-3 space-y-2">
            <StatBar label={t('life.people.trust')} value={p.trust} tone="teal" />
            <StatBar label={t('life.people.satisfaction')} value={p.satisfaction} tone="hibiscus" />
            <StatBar label={t('life.people.compat')} value={p.compatibility} tone="gold" />
          </div>
          {p.memories.length > 0 && <div className="mt-2 text-xs text-ink-soft">{t('life.people.memories')}: {p.memories.slice(0, 3).join(' · ')}</div>}
        </Card>
      ) : (
        <Card>
          <div className="text-sm font-semibold">{t('life.people.single')} 🌻</div>
          <p className="text-xs text-ink-soft">{t('life.people.single.hint')}</p>
        </Card>
      )}
      {r.prospects.length > 0 && (
        <>
          <SectionTitle>{t('life.people.met')}</SectionTitle>
          <div className="grid gap-2">
            {r.prospects.map((x) => (
              <div key={x.id} className="flex items-center gap-2">
                <NpcAvatar name={x.name} size={48} />
                <div className="min-w-0 flex-1">
                  <V id="talk-prospect" param={x.id} label={`${x.name} — ${t('life.people.into', { trait: x.trait, interest: x.interest })}`} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="mt-2">
        <CategoryActions ids={['chat-partner', 'date', 'deep-talk', 'gift', 'define-relationship', 'propose', 'wedding', 'dating-app', 'meet-people', 'break-up']} />
      </div>

      <SectionTitle>{t('life.people.fam')}</SectionTitle>
      <Card className="space-y-2">
        <StatBar label={t('life.people.family')} value={r.family} tone="gold" />
        <StatBar label={t('life.people.friends')} value={r.friends} tone="sky" />
        <KeyValue label={t('life.people.allowance')} value={formatRM(state.finance.parentAllowance)} />
        {r.moneyLent > 0 && <KeyValue label={t('life.people.lent')} value={formatRM(r.moneyLent)} />}
      </Card>
      <div className="mt-2">
        <CategoryActions ids={['call-parents', 'balik-kampung', 'family-time', 'give-parents', 'parent-allowance', 'mamak', 'karaoke', 'call-friend']} />
      </div>
    </div>
  );
}

// ---------------- Home ----------------

function HomeTab() {
  const { state } = useLoadedGame();
  const t = useT();
  const home = currentHome(state);
  return (
    <div>
      <SectionTitle>{t('life.home.where')}</SectionTitle>
      <Card>
        <div className="text-base font-bold">
          {home.icon} {home.name}
        </div>
        <KeyValue label={t('life.home.rent')} value={formatRM(home.rent)} />
        <KeyValue label={t('life.home.utilities')} value={formatRM(home.utilities + home.internet)} />
        {home.maintenance > 0 && <KeyValue label={t('life.home.maintenance')} value={formatRM(home.maintenance)} />}
        <KeyValue label={t('life.commute')} value={formatDuration(commuteMinutes(state))} />
        <KeyValue label={t('life.home.comfort')} value={`${home.comfort}/7 · ${home.privacy}/6`} />
        <KeyValue label={t('life.home.kitchen')} value={home.kitchen ? t('common.yes') : t('common.no')} />
        {state.housing.depositHeld > 0 && <KeyValue label={t('life.home.deposit')} value={formatRM(state.housing.depositHeld)} />}
      </Card>
      <div className="mt-2">
        <CategoryActions ids={['clean-house', 'sell-property']} />
      </div>
      <SectionTitle>{t('life.home.move')}</SectionTitle>
      <div className="grid gap-2">
        {housingOptions.map((h) => (
          <V key={h.id} id="move-home" param={h.id} label={`${h.icon} ${h.name} — ${h.rent ? t('money.perMonth', { amount: formatRM(scaledCost(state, h.rent)) }) : t('life.home.free')}`} />
        ))}
      </div>
      <SectionTitle>{t('life.home.buy')}</SectionTitle>
      <div className="grid gap-2">
        {properties.map((p) => (
          <V key={p.id} id="buy-property" param={p.id} label={`${p.icon} ${p.name} — ${formatRM(p.price)}`} />
        ))}
      </div>
      <Disclaimer>{t('life.home.note')}</Disclaimer>
    </div>
  );
}

// ---------------- Transport ----------------

function TransportTab() {
  const { state } = useLoadedGame();
  const t = useT();
  const tp = state.transport;
  const owned = vehicleById(tp.vehicleId);
  return (
    <div>
      <SectionTitle>{t('life.tr.around')}</SectionTitle>
      <Card>
        {owned && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-paper-2 p-2">
            <VehicleSprite shape={owned.shape} color={owned.color} size={88} title={owned.name} />
            <span className="text-sm font-bold">{owned.name}</span>
          </div>
        )}
        <KeyValue label={t('life.tr.mode')} value={transportModes.find((m) => m.mode === tp.mode)?.label} strong />
        <KeyValue label={t('life.tr.oneWay')} value={formatDuration(commuteMinutes(state))} />
        <KeyValue label={t('life.tr.licence')} value={tp.hasLicence ? t('life.tr.valid', { n: (tp.licenceExpiryDay ?? 0) + 1 }) : t('life.tr.none')} />
        {tp.vehicleId && <StatBar label={t('life.tr.condition')} value={tp.vehicleCondition} />}
        {tp.pendingFines > 0 && <KeyValue label={t('life.tr.fines')} value={<span className="text-hibiscus">{formatRM(tp.pendingFines)}</span>} />}
      </Card>
      <SectionTitle>{t('life.tr.mode')}</SectionTitle>
      <div className="grid gap-2">
        {transportModes.map((m) => (
          <V key={m.mode} id="set-transport" param={m.mode} label={`${m.icon} ${m.label}`} />
        ))}
      </div>
      <div className="mt-2">
        <CategoryActions ids={['get-licence', 'renew-licence', 'service-vehicle', 'sell-vehicle', 'pay-fines']} />
      </div>
      <SectionTitle>{t('life.tr.showroom')}</SectionTitle>
      <div className="grid gap-2">
        {vehicles.map((v) => (
          <V key={v.id} id="buy-vehicle" param={v.id} label={`${v.name} — ${formatRM(v.price)}`} art={<VehicleSprite shape={v.shape} color={v.color} size={48} />} />
        ))}
      </div>
      <Disclaimer>{t('life.tr.note')}</Disclaimer>
    </div>
  );
}

// ---------------- Hustle ----------------

function HustleTab() {
  const { state } = useLoadedGame();
  const t = useT();
  return (
    <div>
      <SectionTitle>{t('life.hustle.yours')}</SectionTitle>
      {state.hustles.length === 0 ? (
        <EmptyState icon="🛠️" title={t('life.hustle.none')}>{t('life.hustle.none.hint')}</EmptyState>
      ) : (
        <div className="space-y-2">
          {state.hustles.map((h) => {
            const def = hustleDefById(h.id)!;
            return (
              <Card key={h.id}>
                <div className="flex items-center justify-between">
                  <div className="text-base font-bold">
                    {def.icon} {def.name}
                  </div>
                  <Pill tone="gold">{t('life.hustle.level', { n: h.level })}</Pill>
                </div>
                <div className="mt-2 space-y-2">
                  <StatBar label={t('life.hustle.rep')} value={h.reputation} />
                  <StatBar label={t('life.hustle.csat')} value={h.satisfaction} tone="leaf" />
                </div>
                <KeyValue label={t('life.hustle.month')} value={`${formatRM(h.monthRevenue)} / ${formatRM(h.monthExpense)}`} />
                <KeyValue label={t('life.hustle.profit')} value={formatRM(hustleProfitTotal(h))} strong />
                <KeyValue label={t('life.hustle.staff')} value={h.employees} />
                {h.registered && <Pill tone="teal">{t('life.hustle.registered')}</Pill>}
                <div className="mt-2 grid gap-2">
                  <V id="work-hustle" param={h.id} />
                  <V id="hire-staff" param={h.id} />
                  <V id="register-company" param={h.id} />
                  <V id="close-hustle" param={h.id} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <SectionTitle>{t('life.hustle.start')}</SectionTitle>
      <div className="grid gap-2">
        {hustleDefs
          .filter((d) => !state.hustles.some((h) => h.id === d.id))
          .map((d) => (
            <V key={d.id} id="start-hustle" param={d.id} label={`${d.icon} ${d.name}${d.startupCost ? ` — ${t('life.hustle.toStart', { amount: formatRM(d.startupCost) })}` : ''}`} />
          ))}
      </div>
      <Disclaimer>{t('life.hustle.note')}</Disclaimer>
    </div>
  );
}

// ---------------- Shop ----------------

function ShopTab() {
  const { state } = useLoadedGame();
  const t = useT();
  return (
    <div>
      <SectionTitle>{t('life.shop.owned')}</SectionTitle>
      {state.inventory.items.length ? (
        <div className="flex flex-wrap gap-1">
          {state.inventory.items.map((i) => {
            const item = shopItems.find((x) => x.id === i);
            return <Pill key={i}>{item ? `${item.icon} ${item.name}` : i}</Pill>;
          })}
        </div>
      ) : (
        <p className="text-sm text-ink-soft">{t('life.shop.none')}</p>
      )}
      <SectionTitle>{t('life.shop.title')}</SectionTitle>
      <div className="space-y-2">
        {shopItems.map((item) => (
          <div key={item.id} className="space-y-1">
            <V id="buy-item" param={item.id} label={`${item.icon} ${item.name} — ${formatRM(item.price)}`} />
            {item.price >= 500 && !state.inventory.items.includes(item.id) && <V id="buy-item" param={`${item.id}|bnpl`} label={`↳ ${t('life.shop.bnpl', { name: item.name })}`} />}
          </div>
        ))}
      </div>
      <Disclaimer>{t('life.shop.note')}</Disclaimer>
    </div>
  );
}
