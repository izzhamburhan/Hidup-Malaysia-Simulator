import { useMemo, useState } from 'react';
import { ArrowLeft, Dices, Sparkles } from 'lucide-react';
import { backgrounds, lifeStages } from '../data/backgrounds';
import { courses } from '../data/courses';
import { jobs } from '../data/jobs';
import { homeStates } from '../data/lifestyle';
import { universities } from '../data/universities';
import { formatRM } from '../engine/core';
import type { Appearance, GameMode, Gender, LifeStage, Mood } from '../engine/types';
import { randomAppearance } from '../engine/appearance';
import { AvatarEditor } from '../components/AvatarEditor';
import { PixelAvatar } from '../components/PixelAvatar';
import { StateFlag } from '../components/StateFlag';
import { useGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import { Button, Card, Disclaimer, SectionTitle, cx } from '../components/ui';

const NAMES = ['Aiman', 'Mei Ling', 'Kumar', 'Nurul', 'Jason', 'Siti', 'Arif', 'Kavya', 'Hakim', 'Wei Jie'];

const selectClass = 'w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm focus:border-teal focus:outline-none';

export function CharacterCreation({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { start } = useGame();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<GameMode>('realistic');
  const [stage, setStage] = useState<LifeStage>('fresh_grad');
  const [backgroundId, setBackgroundId] = useState('middle');
  const [homeState, setHomeState] = useState('Selangor');
  const stageDef = lifeStages.find((s) => s.id === stage)!;
  const [age, setAge] = useState(stageDef.defaultAge);
  const [universityId, setUniversityId] = useState('um');
  const [courseId, setCourseId] = useState('cs');
  const [startSemester, setStartSemester] = useState(1);
  const [jobId, setJobId] = useState('swe');
  const [chapterYears, setChapterYears] = useState(1);
  const [appearance, setAppearance] = useState<Appearance>(() => randomAppearance(Math.floor(Math.random() * 1e9), 'male'));
  const [previewMood, setPreviewMood] = useState<Mood>('happy');
  const [gender, setGender] = useState<Gender>('male');
  const t = useT();

  const pickGender = (g: Gender) => {
    setGender(g);
    setAppearance(randomAppearance(Math.floor(Math.random() * 1e9), g));
  };

  const uni = universities.find((u) => u.id === universityId)!;
  const uniCourses = useMemo(() => courses.filter((c) => uni.fields.includes(c.field)), [uni]);
  const course = uniCourses.find((c) => c.id === courseId) ?? uniCourses[0];
  const fulltimeJobs = jobs.filter((j) => j.schedule === 'fulltime');
  const bg = backgrounds.find((b) => b.id === backgroundId)!;

  const pickStage = (id: LifeStage) => {
    setStage(id);
    setAge(lifeStages.find((s) => s.id === id)!.defaultAge);
  };

  const create = () => {
    start({
      name: name.trim() || NAMES[Math.floor(Math.random() * NAMES.length)],
      startAge: age,
      homeState,
      backgroundId,
      lifeStage: stage,
      mode,
      universityId,
      courseId: course.id,
      startSemester,
      jobId,
      chapterYears,
      appearance,
      gender,
    });
    onDone();
  };

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-4">
      <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-teal">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="font-display text-3xl font-black">Create your life</h1>
      <p className="text-sm text-ink-soft">Backgrounds change your starting point, not your destiny.</p>

      <SectionTitle>{t('create.gender')}</SectionTitle>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('create.gender')}>
        {(
          [
            ['male', '👨', t('create.male')],
            ['female', '👩', t('create.female')],
          ] as const
        ).map(([id, icon, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={gender === id}
            onClick={() => pickGender(id)}
            className={cx('flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 p-3 font-bold transition', gender === id ? 'border-teal bg-teal-soft' : 'border-transparent bg-white')}
          >
            <span className="text-2xl" aria-hidden>
              {icon}
            </span>
            {label}
          </button>
        ))}
      </div>
      <Disclaimer>{t('create.gender.hint')}</Disclaimer>

      <SectionTitle>Your character</SectionTitle>
      <AvatarEditor gender={gender} value={appearance} onChange={setAppearance} preview={previewMood} onPreview={setPreviewMood} />

      <SectionTitle>Name</SectionTitle>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="Your nickname"
          className="flex-1 rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm focus:border-teal focus:outline-none"
          aria-label="Character name"
        />
        <Button variant="secondary" onClick={() => setName(NAMES[Math.floor(Math.random() * NAMES.length)])} aria-label="Random name">
          <Dices size={18} />
        </Button>
      </div>

      <SectionTitle>Game mode</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ['realistic', '🧭', 'Realistic', 'Believable events. Budgets, careers, family.'],
            ['chaotic', '🌀', 'Chaotic', 'Same life, more absurd meme-worthy events.'],
          ] as const
        ).map(([id, icon, title, desc]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cx('rounded-2xl border-2 p-3 text-left transition', mode === id ? 'border-teal bg-teal-soft' : 'border-transparent bg-white')}
            aria-pressed={mode === id}
          >
            <div className="text-2xl">{icon}</div>
            <div className="font-bold">{title}</div>
            <div className="text-xs text-ink-soft">{desc}</div>
          </button>
        ))}
      </div>

      <SectionTitle>Life stage</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {lifeStages.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pickStage(s.id)}
            className={cx('rounded-2xl border-2 p-3 text-left transition', stage === s.id ? 'border-teal bg-teal-soft' : 'border-transparent bg-white')}
            aria-pressed={stage === s.id}
          >
            <div className="text-xl">{s.icon}</div>
            <div className="text-sm font-bold">{s.name}</div>
            <div className="mt-0.5 text-[11px] leading-snug text-ink-soft">{s.description}</div>
          </button>
        ))}
      </div>

      <SectionTitle>Background</SectionTitle>
      <div className="space-y-2">
        {backgrounds.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBackgroundId(b.id)}
            className={cx('flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left transition', backgroundId === b.id ? 'border-teal bg-teal-soft' : 'border-transparent bg-white')}
            aria-pressed={backgroundId === b.id}
          >
            <span className="text-2xl">{b.icon}</span>
            <span className="flex-1">
              <span className="block text-sm font-bold">{b.name}</span>
              <span className="block text-xs text-ink-soft">{b.blurb}</span>
              <span className="mt-1 flex flex-wrap gap-x-3 text-[11px] font-medium text-ink-soft">
                <span>Cash {formatRM(b.cash)}</span>
                <span>Savings {formatRM(b.savings)}</span>
                {b.studyLoan > 0 && <span className="text-hibiscus">Study loan {formatRM(b.studyLoan)}</span>}
                {b.scholarship && <span className="text-leaf">Scholarship</span>}
              </span>
            </span>
          </button>
        ))}
      </div>

      <SectionTitle>Details</SectionTitle>
      <Card className="space-y-4">
        <label className="block text-sm">
          <span className="flex justify-between font-medium">
            Starting age <span className="tabular-nums">{age}</span>
          </span>
          <input type="range" min={stageDef.ageRange[0]} max={stageDef.ageRange[1]} value={age} onChange={(e) => setAge(Number(e.target.value))} className="mt-1 w-full accent-teal" />
        </label>
        <div className="text-sm">
          <span className="font-medium">Home state</span>
          <div className="mt-1 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Home state">
            {homeStates.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={homeState === s}
                onClick={() => setHomeState(s)}
                className={cx('flex flex-col items-center gap-1 rounded-xl border p-1.5 text-center', homeState === s ? 'border-teal bg-teal-soft ring-2 ring-teal/30' : 'border-ink/10 bg-white')}
              >
                <StateFlag state={s} width={44} />
                <span className="line-clamp-2 text-[10px] font-semibold leading-tight">{s}</span>
              </button>
            ))}
          </div>
        </div>

        {stage === 'student' && (
          <>
            <label className="block text-sm">
              <span className="font-medium">University</span>
              <select value={universityId} onChange={(e) => setUniversityId(e.target.value)} className={selectClass}>
                <optgroup label="Public universities">
                  {universities.filter((u) => u.type === 'public').map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.short} — {u.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Private institutions">
                  {universities.filter((u) => u.type === 'private').map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.short} — {u.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <Disclaimer>
                {uni.type === 'public' ? 'Public' : 'Private'} · {uni.state} · tuition ~{formatRM(uni.tuitionPerSemester)}/semester (fictional game estimate, not the official fee).
              </Disclaimer>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Course</span>
              <select value={course.id} onChange={(e) => setCourseId(e.target.value)} className={selectClass}>
                {uniCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.semesters} sem)
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="flex justify-between font-medium">
                Start at semester <span className="tabular-nums">{startSemester}</span>
              </span>
              <input type="range" min={1} max={course.semesters} value={Math.min(startSemester, course.semesters)} onChange={(e) => setStartSemester(Number(e.target.value))} className="mt-1 w-full accent-teal" />
            </label>
          </>
        )}

        {stage !== 'student' && (
          <label className="block text-sm">
            <span className="font-medium">Studied</span>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={selectClass}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {(stage === 'working' || stage === 'experienced') && (
          <label className="block text-sm">
            <span className="font-medium">Current role</span>
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} className={selectClass}>
              {fulltimeJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.icon} {j.title}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="text-sm">
          <span className="font-medium">Chapter length</span>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {[1, 3, 5].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setChapterYears(y)}
                className={cx('rounded-xl border py-2 text-sm font-semibold', chapterYears === y ? 'border-teal bg-teal text-white' : 'border-ink/15 bg-white')}
              >
                {y} year{y > 1 ? 's' : ''}
              </button>
            ))}
          </div>
          <Disclaimer>Your life report and ending unlock at the end of the chapter. You can keep playing afterwards.</Disclaimer>
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-paper/95 px-4 pt-3 backdrop-blur safe-bottom">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <PixelAvatar appearance={appearance} mood="happy" size={36} />
          <div className="min-w-0 flex-1 text-xs text-ink-soft">
            <div className="truncate font-semibold text-ink">
              {bg.icon} {stageDef.name}, {age}
            </div>
            <div className="truncate">
              {gender ? `${t(gender === 'male' ? 'create.male' : 'create.female')} · ` : ''}
              {mode === 'chaotic' ? 'Chaotic' : 'Realistic'} · {homeState}
            </div>
          </div>
          <Button onClick={create} className="px-5">
            <Sparkles size={16} /> Start life
          </Button>
        </div>
      </div>
    </main>
  );
}