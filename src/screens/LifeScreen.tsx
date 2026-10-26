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
import { commuteMinutes, currentHome } from '../engine/living';
import { rankLifeTabs, type LifeTabId } from '../engine/insights';
import { listActions, viewAction, type ActionView } from '../engine/simulationEngine';
import { STAGE_LABEL } from '../engine/social';
import { hustleProfitTotal } from '../engine/business';
import { useLoadedGame } from '../hooks/useGame';
import { OrgBadge } from '../components/OrgBadge';
import { NpcAvatar } from '../components/PixelAvatar';
import { ActionCard, VariantRow } from '../components/ActionCard';
import { Button, Card, Disclaimer, EmptyState, KeyValue, Pill, SectionTitle, StatBar, Tabs, cx } from '../components/ui';

type Sub = LifeTabId;

const LABELS: Record<Sub, string> = {
  career: '💼 Career',
  study: '🎓 Study',
  food: '🍛 Food',
  fitness: '🏋️ Fitness',
  people: '💞 People',
  home: '🏠 Home',
  transport: '🚗 Transport',
  hustle: '🛠️ Hustle',
  shop: '🛒 Shop',
};

export function LifeScreen() {
  const { state } = useLoadedGame();
  // Ordered by relevance to what the player is doing right now (never hidden, just reordered —
  // see docs/plans/cut-ui-width.md). Tabs don't jump around mid-visit: only the first render
  // of a new life picks the order and the default tab.
  const order = useMemo(() => rankLifeTabs(state), [state.character.backgroundId]);
  const SUBS = useMemo(() => order.map((id) => ({ id, label: LABELS[id] })), [order]);
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
  const job = state.career.job;
  const apps = state.career.applications;
  const [industry, setIndustry] = useState<string>('all');
  const listings = state.career.listings.filter((l) => industry === 'all' || companyById(l.companyId)?.industry === industry);

  return (
    <div>
      <SectionTitle>Current job</SectionTitle>
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
                <Pill>{job.schedule === 'parttime' ? `${formatRM(job.shiftPay)}/shift` : `${formatRM(job.monthlySalary)}/month`}</Pill>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <StatBar label="Performance" value={job.performance} />
          </div>
          <KeyValue label="Commute (one way)" value={formatDuration(commuteMinutes(state))} />
          {job.schedule === 'fulltime' && <KeyValue label="Next review" value={`Day ${job.lastReviewDay + 182 + 1}`} />}
          <KeyValue label="Absences this month" value={job.absencesThisMonth} />
          <KeyValue label="Experience" value={`${(state.career.experienceDays / 365).toFixed(1)} years`} />
        </Card>
      ) : (
        <EmptyState icon="🔎" title="Not employed">Apply below. Polishing your CV and building skills improves your odds.</EmptyState>
      )}
      <div className="mt-2">
        <CategoryActions ids={['work-shift', 'overtime', 'take-leave', 'update-cv', 'networking', 'online-course', 'self-study', 'resign']} />
      </div>

      <SectionTitle>Skills</SectionTitle>
      <Card className="grid grid-cols-2 gap-x-4 gap-y-2">
        {SKILL_KEYS.map((k) => (
          <StatBar key={k} label={k[0].toUpperCase() + k.slice(1)} value={state.skills[k]} tone="sky" />
        ))}
        <StatBar label="CV quality" value={state.career.cvQuality} tone="gold" />
      </Card>

      {apps.length > 0 && (
        <>
          <SectionTitle>Applications</SectionTitle>
          <div className="space-y-2">
            {apps.slice(0, 10).map((a) => (
              <Card key={a.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{jobById(a.jobId)?.title}</div>
                    <div className="truncate text-xs text-ink-soft">{companyById(a.companyId)?.name}</div>
                  </div>
                  <Pill tone={a.status === 'offer' ? 'green' : a.status === 'interview' ? 'blue' : a.status === 'rejected' || a.status === 'expired' ? 'red' : 'neutral'}>{a.status}</Pill>
                </div>
                {a.status === 'pending' && <div className="mt-1 text-xs text-ink-soft">Reply expected around day {a.respondDay + 1}.</div>}
                {a.status === 'interview' && (
                  <div className="mt-2">
                    <V id="attend-interview" param={a.id} label={`Attend interview (day ${(a.interviewDay ?? 0) + 1})`} />
                  </div>
                )}
                {a.status === 'offer' && (
                  <div className="mt-2 space-y-2">
                    <div className="text-sm">
                      Offer: <b>{formatRM(a.offerSalary ?? 0)}</b>
                      {jobById(a.jobId)?.schedule === 'parttime' ? ' per shift' : ' per month (gross)'}
                    </div>
                    <div className="grid gap-2">
                      <V id="accept-offer" param={a.id} />
                      <V id="negotiate-offer" param={a.id} />
                      <V id="decline-offer" param={a.id} />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      <SectionTitle action={<span className="text-[11px] text-ink-soft">Refreshes weekly</span>}>Job board</SectionTitle>
      <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="mb-2 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm" aria-label="Filter by industry">
        <option value="all">All industries</option>
        {Object.entries(industryLabels).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      {listings.length === 0 ? (
        <EmptyState icon="📭" title="No listings here">Check back next week or change the filter.</EmptyState>
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
                      <Pill tone="gold">{j.schedule === 'parttime' ? `${formatRM(l.salary)}/shift` : `${formatRM(l.salary)}/mo`}</Pill>
                      <Pill>{scheduleLabel[j.schedule]}</Pill>
                      <Pill tone={elig.match >= 70 ? 'green' : elig.match >= 50 ? 'gold' : 'red'}>Match {elig.match}%</Pill>
                    </div>
                    {elig.missing.length > 0 && <div className="mt-1 text-[11px] text-hibiscus">{elig.missing.join(' · ')}</div>}
                    <div className="mt-1 text-[11px] text-ink-soft">Closes day {l.expiresDay + 1}</div>
                  </div>
                </div>
                <Button className="mt-2 w-full" variant={view.available ? 'primary' : 'secondary'} onClick={() => request(view)}>
                  {view.available ? 'Apply (30 min)' : view.reason}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
      <Disclaimer>Companies are example employers only; listings are fictional and do not represent real vacancies. Salaries are game estimates.</Disclaimer>
    </div>
  );
}

// ---------------- Study ----------------

function StudyTab() {
  const { state } = useLoadedGame();
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
        <SectionTitle>Studies</SectionTitle>
        <Card>
          <div className="mb-2 flex items-center gap-3">
            <OrgBadge text={universityById(e.universityId)?.short ?? '?'} kind={universityById(e.universityId)?.type === 'private' ? 'private-uni' : 'public-uni'} size={48} title={universityById(e.universityId)?.name} />
            <span className="text-[11px] text-ink-soft">Name badge only, not the institution's logo.</span>
          </div>
          <div className="text-base font-bold">{course.name}</div>
          <div className="text-sm text-ink-soft">
            {universityById(e.universityId)?.name} · {universityById(e.universityId)?.type}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Pill tone="teal">
              Semester {e.semester}/{e.totalSemesters}
            </Pill>
            <Pill tone="gold">CGPA {e.gpaHistory.length ? e.cgpa.toFixed(2) : '—'}</Pill>
            {e.scholarship && <Pill tone="green">Scholarship</Pill>}
            {d >= CLASS_DAYS && <Pill tone="blue">Semester break</Pill>}
          </div>
          <div className="mt-3 space-y-2">
            <StatBar label="Semester progress" value={(Math.min(d, CLASS_DAYS) / CLASS_DAYS) * 100} />
            <StatBar label="Knowledge" value={e.knowledge} tone="sky" />
            <StatBar label="Attendance %" value={attendance} tone="leaf" />
            {isFinalSemester(state) && <StatBar label="Final-year project" value={e.fypProgress} tone="gold" />}
          </div>
          <KeyValue label="Assignments" value={`${e.assignmentsDone} submitted / ${e.assignmentsTotal} released / 4`} />
          <KeyValue label="Projected GPA now" value={computeGpa(state).toFixed(2)} />
        </Card>
        <div className="mt-2">
          <CategoryActions ids={['attend-class', 'study', 'assignment', 'fyp', 'drop-out']} />
        </div>
        <SectionTitle>Internships & part-time</SectionTitle>
        <p className="text-sm text-ink-soft">Part-time roles and final-year internships appear on the Career job board.</p>
        <GpaHistory history={e.gpaHistory} />
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Education</SectionTitle>
      <Card>
        <KeyValue label="Highest qualification" value={e.qualification.toUpperCase()} strong />
        {e.courseId && <KeyValue label="Studied" value={courseById(e.courseId)?.name} />}
        {e.status === 'graduated' && e.cgpa > 0 && <KeyValue label="CGPA" value={e.cgpa.toFixed(2)} />}
        {e.status === 'dropped' && <KeyValue label="Status" value="Left university" />}
      </Card>
      <GpaHistory history={e.gpaHistory} />
      <SectionTitle>Go (back) to university</SectionTitle>
      <Card className="space-y-3">
        <select value={uniId} onChange={(ev) => setUniId(ev.target.value)} className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm" aria-label="University">
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.short} — {u.type} — ~{formatRM(u.tuitionPerSemester)}/sem*
            </option>
          ))}
        </select>
        <select value={options.some((c) => c.id === courseId) ? courseId : options[0]?.id} onChange={(ev) => setCourseId(ev.target.value)} className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm" aria-label="Course">
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <V id="enroll" param={`${uniId}:${options.some((c) => c.id === courseId) ? courseId : options[0]?.id}`} />
        <Disclaimer>*Tuition figures are fictional game estimates, not official fees. University choice changes costs and some opportunities — never your whole future.</Disclaimer>
      </Card>
    </div>
  );
}

function GpaHistory({ history }: { history: number[] }) {
  if (!history.length) return null;
  return (
    <>
      <SectionTitle>Results</SectionTitle>
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
  const [portion, setPortion] = useState('regular');
  const f = state.food;
  return (
    <div>
      <SectionTitle>Today (estimates)</SectionTitle>
      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Calories in" value={Math.round(f.caloriesIn)} />
          <Stat label="Exercise burn" value={Math.round(f.caloriesOut)} />
          <Stat label="Water" value={`${f.water} 💧`} />
        </div>
        {f.today.length ? (
          <div className="mt-3 divide-y divide-ink/5">
            {f.today.map((e, i) => (
              <KeyValue key={i} label={e.name} value={`${e.calories} kcal · ${formatRM(e.price, 2)}`} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">Nothing eaten yet today.</p>
        )}
        <Disclaimer>Calories are rough game estimates and a baseline ~1,900 kcal daily burn is added at day end. This is not a medical or nutrition tool.</Disclaimer>
      </Card>
      <div className="mt-2">
        <V id="water" />
      </div>
      <SectionTitle>Portion</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {portions.map((p) => (
          <button key={p.id} type="button" onClick={() => setPortion(p.id)} className={cx('rounded-xl border py-2 text-sm font-semibold', portion === p.id ? 'border-teal bg-teal text-white' : 'border-ink/10 bg-white')}>
            {p.label}
          </button>
        ))}
      </div>
      <SectionTitle>Menu</SectionTitle>
      <div className="grid gap-2">
        {foods.map((food) => {
          const view = viewAction(state, 'eat', `${food.id}:${portion}`)!;
          return <ActionCard key={food.id} view={{ ...view, icon: food.icon }} />;
        })}
      </div>
      {f.history.length > 0 && (
        <>
          <SectionTitle>Last 7 days</SectionTitle>
          <Card className="divide-y divide-ink/5 py-1">
            {f.history.slice(0, 7).map((h) => (
              <KeyValue key={h.day} label={formatDate(state, h.day)} value={`${h.caloriesIn} in · ${h.caloriesOut} out · ${h.water}💧`} />
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
  return (
    <div>
      <SectionTitle>Body</SectionTitle>
      <Card className="space-y-2">
        <StatBar label="Fitness" value={state.stats.fitness} tone="sky" />
        <StatBar label="Health" value={state.stats.health} tone="leaf" />
        <KeyValue label="Workout streak" value={`${state.fitness.streak} 🔥`} />
        <KeyValue label="Gym sessions" value={state.fitness.sessions} />
        <KeyValue label="Last sleep" value={`${(state.lastSleepMinutes / 60).toFixed(1)}h`} />
      </Card>
      <SectionTitle>Exercise</SectionTitle>
      <CategoryActions ids={['gym', 'run', 'home-workout', 'badminton', 'futsal', 'football', 'cancel-gym']} />
      <SectionTitle>Gym memberships</SectionTitle>
      <div className="grid gap-2">
        {gyms.map((g) => (
          <V key={g.id} id="join-gym" param={g.id} label={`${g.name} — ${formatRM(g.monthlyFee)}/mo`} />
        ))}
      </div>
      <Disclaimer>Fees are fictional game estimates.</Disclaimer>
    </div>
  );
}

// ---------------- People ----------------

function PeopleTab() {
  const { state } = useLoadedGame();
  const r = state.relationships;
  const p = r.partner;
  return (
    <div>
      <SectionTitle>Love life</SectionTitle>
      {p ? (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <NpcAvatar name={p.name} size={52} />
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold">💞 {p.name}</div>
              <div className="text-xs text-ink-soft">
                {p.trait}, into {p.interest} {p.longDistance && '· long-distance'}
              </div>
            </div>
            <Pill tone="red">{STAGE_LABEL[p.stage]}</Pill>
          </div>
          <div className="mt-3 space-y-2">
            <StatBar label="Trust" value={p.trust} tone="teal" />
            <StatBar label="Satisfaction" value={p.satisfaction} tone="hibiscus" />
            <StatBar label="Compatibility" value={p.compatibility} tone="gold" />
          </div>
          {p.memories.length > 0 && <div className="mt-2 text-xs text-ink-soft">Memories: {p.memories.slice(0, 3).join(' · ')}</div>}
        </Card>
      ) : (
        <Card>
          <div className="text-sm font-semibold">Single 🌻</div>
          <p className="text-xs text-ink-soft">A perfectly good way to live. Meet people at mamak, social events, networking or on dating apps if you want to.</p>
        </Card>
      )}
      {r.prospects.length > 0 && (
        <>
          <SectionTitle>People you've met</SectionTitle>
          <div className="grid gap-2">
            {r.prospects.map((x) => (
              <div key={x.id} className="flex items-center gap-2">
                <NpcAvatar name={x.name} size={48} />
                <div className="min-w-0 flex-1">
                  <V id="talk-prospect" param={x.id} label={`${x.name} — ${x.trait}, into ${x.interest}`} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="mt-2">
        <CategoryActions ids={['chat-partner', 'date', 'deep-talk', 'gift', 'define-relationship', 'propose', 'wedding', 'dating-app', 'meet-people', 'break-up']} />
      </div>

      <SectionTitle>Family & friends</SectionTitle>
      <Card className="space-y-2">
        <StatBar label="Family" value={r.family} tone="gold" />
        <StatBar label="Friends" value={r.friends} tone="sky" />
        <KeyValue label="Monthly allowance to parents" value={formatRM(state.finance.parentAllowance)} />
        {r.moneyLent > 0 && <KeyValue label="Money lent to friends" value={formatRM(r.moneyLent)} />}
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
  const home = currentHome(state);
  return (
    <div>
      <SectionTitle>Where you live</SectionTitle>
      <Card>
        <div className="text-base font-bold">
          {home.icon} {home.name}
        </div>
        <KeyValue label="Rent" value={formatRM(home.rent)} />
        <KeyValue label="Utilities + internet" value={formatRM(home.utilities + home.internet)} />
        {home.maintenance > 0 && <KeyValue label="Maintenance" value={formatRM(home.maintenance)} />}
        <KeyValue label="Commute (one way)" value={formatDuration(commuteMinutes(state))} />
        <KeyValue label="Comfort / privacy" value={`${home.comfort}/7 · ${home.privacy}/6`} />
        <KeyValue label="Kitchen" value={home.kitchen ? 'Yes' : 'No'} />
        {state.housing.depositHeld > 0 && <KeyValue label="Deposit held" value={formatRM(state.housing.depositHeld)} />}
      </Card>
      <div className="mt-2">
        <CategoryActions ids={['clean-house', 'sell-property']} />
      </div>
      <SectionTitle>Move</SectionTitle>
      <div className="grid gap-2">
        {housingOptions.map((h) => (
          <V key={h.id} id="move-home" param={h.id} label={`${h.icon} ${h.name} — ${h.rent ? `${formatRM(h.rent)}/mo` : 'free'}`} />
        ))}
      </div>
      <SectionTitle>Buy property</SectionTitle>
      <div className="grid gap-2">
        {properties.map((p) => (
          <V key={p.id} id="buy-property" param={p.id} label={`${p.icon} ${p.name} — ${formatRM(p.price)}`} />
        ))}
      </div>
      <Disclaimer>Prices, rents and loan rules (60% debt-service limit) are fictional game rules, not bank policy.</Disclaimer>
    </div>
  );
}

// ---------------- Transport ----------------

function TransportTab() {
  const { state } = useLoadedGame();
  const t = state.transport;
  const owned = vehicleById(t.vehicleId);
  return (
    <div>
      <SectionTitle>Getting around</SectionTitle>
      <Card>
        {owned && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-paper-2 p-2">
            <VehicleSprite shape={owned.shape} color={owned.color} size={88} title={owned.name} />
            <span className="text-sm font-bold">{owned.name}</span>
          </div>
        )}
        <KeyValue label="Commute mode" value={transportModes.find((m) => m.mode === t.mode)?.label} strong />
        <KeyValue label="One-way commute" value={formatDuration(commuteMinutes(state))} />
        <KeyValue label="Driving licence" value={t.hasLicence ? `Valid until day ${(t.licenceExpiryDay ?? 0) + 1}` : 'None'} />
        {t.vehicleId && <StatBar label="Vehicle condition" value={t.vehicleCondition} />}
        {t.pendingFines > 0 && <KeyValue label="Unpaid summons" value={<span className="text-hibiscus">{formatRM(t.pendingFines)}</span>} />}
      </Card>
      <SectionTitle>Commute mode</SectionTitle>
      <div className="grid gap-2">
        {transportModes.map((m) => (
          <V key={m.mode} id="set-transport" param={m.mode} label={`${m.icon} ${m.label}`} />
        ))}
      </div>
      <div className="mt-2">
        <CategoryActions ids={['get-licence', 'renew-licence', 'service-vehicle', 'sell-vehicle', 'pay-fines']} />
      </div>
      <SectionTitle>Vehicle showroom</SectionTitle>
      <div className="grid gap-2">
        {vehicles.map((v) => (
          <V key={v.id} id="buy-vehicle" param={v.id} label={`${v.name} — ${formatRM(v.price)}`} art={<VehicleSprite shape={v.shape} color={v.color} size={48} />} />
        ))}
      </div>
      <Disclaimer>Vehicle prices, loans, insurance and road tax are fictional game estimates, not dealer or official figures.</Disclaimer>
    </div>
  );
}

// ---------------- Hustle ----------------

function HustleTab() {
  const { state } = useLoadedGame();
  return (
    <div>
      <SectionTitle>Your hustles</SectionTitle>
      {state.hustles.length === 0 ? (
        <EmptyState icon="🛠️" title="No side hustle yet">Start one below. Growth is gradual and never guaranteed.</EmptyState>
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
                  <Pill tone="gold">Level {h.level}</Pill>
                </div>
                <div className="mt-2 space-y-2">
                  <StatBar label="Reputation" value={h.reputation} />
                  <StatBar label="Customer satisfaction" value={h.satisfaction} tone="leaf" />
                </div>
                <KeyValue label="This month: revenue / costs" value={`${formatRM(h.monthRevenue)} / ${formatRM(h.monthExpense)}`} />
                <KeyValue label="All-time profit" value={formatRM(hustleProfitTotal(h))} strong />
                <KeyValue label="Staff" value={h.employees} />
                {h.registered && <Pill tone="teal">Registered company</Pill>}
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
      <SectionTitle>Start something</SectionTitle>
      <div className="grid gap-2">
        {hustleDefs
          .filter((d) => !state.hustles.some((h) => h.id === d.id))
          .map((d) => (
            <V key={d.id} id="start-hustle" param={d.id} label={`${d.icon} ${d.name}${d.startupCost ? ` — ${formatRM(d.startupCost)} to start` : ''}`} />
          ))}
      </div>
      <Disclaimer>Revenue figures are fictional and volatile by design.</Disclaimer>
    </div>
  );
}

// ---------------- Shop ----------------

function ShopTab() {
  const { state } = useLoadedGame();
  return (
    <div>
      <SectionTitle>Owned</SectionTitle>
      {state.inventory.items.length ? (
        <div className="flex flex-wrap gap-1">
          {state.inventory.items.map((i) => {
            const item = shopItems.find((x) => x.id === i);
            return <Pill key={i}>{item ? `${item.icon} ${item.name}` : i}</Pill>;
          })}
        </div>
      ) : (
        <p className="text-sm text-ink-soft">Nothing yet. Minimalism or poverty? You decide.</p>
      )}
      <SectionTitle>Shop</SectionTitle>
      <div className="space-y-2">
        {shopItems.map((item) => (
          <div key={item.id} className="space-y-1">
            <V id="buy-item" param={item.id} label={`${item.icon} ${item.name} — ${formatRM(item.price)}`} />
            {item.price >= 500 && !state.inventory.items.includes(item.id) && <V id="buy-item" param={`${item.id}|bnpl`} label={`↳ ${item.name} on 12-month instalments`} />}
          </div>
        ))}
      </div>
      <Disclaimer>Prices are fictional. Instalment plans add a 10% fictional fee and a monthly commitment.</Disclaimer>
    </div>
  );
}