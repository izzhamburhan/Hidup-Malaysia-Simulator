# Plan: part-time work for students (feat/career-student-parttime)

Source: player feedback (Adibah, 2026-11-09): "include part time work options for students ...
balancing work and studies ... financial independence instead of relying solely on parental support".

## Discovery summary

Part-time work already exists. `barista`, `retail`, `tutor` and `fnb-crew` are `parttime` and
`studentFriendly`, and `jobEligibility` (`src/engine/career.ts:33`) lets students take them.
The player did not find it because:
- the job board is three taps deep (Life → Career, under skills), with no student hint;
- `refreshListings` (`src/engine/career.ts:68`) does not guarantee a part-time listing, so a board can be all internships and stretch roles;
- the shift itself ignores classes (`work-shift`, `src/engine/actions/workActions.ts:92`), so there is no "balancing" to feel.

## Goal

A student can find, get and work a part-time job, and feels the trade-off with classes.

## Non-goals

- A timetable system or per-hour class schedule.
- Changing full-time or intern rules.
- Changing gig work (delivery gig) rules.

## Acceptance criteria

1. Three more student-friendly part-time jobs: `bookshop-assistant` (Part-time Bookshop Assistant,
   retail/sme, RM45 a shift, 4h; first drafted as a library assistant, changed on review because the only public employers are a school and clinics), `event-crew` (Part-time Event Crew, sme/retail, RM65, 5h),
   `promoter` (Part-time Promoter, retail, RM60, 5h). Pay is labelled a fictional game estimate.
2. When the board refreshes for a student who has no job, it holds at least 2 part-time listings.
3. On a class day before 5PM, a student who has not attended class cannot start a part-time
   shift. The reason reads "You have class today. Attend first, shift after." After class, or
   after 5PM, the shift is available.
4. Part-time shifts can start from 8AM to 7PM (was 8AM to 5PM), so an after-class shift fits.
   Outside that window the reason is "Shifts start 8AM–7PM." (from `hoursLabel`).
5. Every part-time shift worked while studying adds 1 to `flags.studentShifts`. A new achievement,
   "Kerja Sambil Belajar", unlocks at 20 such shifts.
6. A new random event, `cover-shift` (context `work`, studying with a part-time job, cooldown 21
   days): your supervisor asks you to cover an extra shift before exams. "Take it" gives
   +shift pay cash, +stress and -energy; "Say no, I need to study" gives -2 stress and a small
   -performance. Both choices are always available.
7. The job board has a "Part-time only" filter. A student with no job sees a hint card in Life →
   Career pointing at it. EN and BM strings are both added.
8. Determinism: the same seed and the same actions still give the same state.

## Contract change

- `work-shift` availability (new class rule, wider window): `docs/contracts/action-contract.md`.
- `refreshListings` part-time guarantee for students: `docs/contracts/engine-api.md` (Career).
- New event `cover-shift`: `docs/contracts/event-contract.md` lists no individual events, so no change there.

## Save impact

Shape unchanged. `flags` is an existing free-form record; `studentShifts` is read as
`Number(flags.studentShifts ?? 0)`.

## Content impact

- Three job titles, one event and one achievement. Shift pay is a FICTIONAL GAME ESTIMATE, in line
  with the existing part-time jobs.
- The humour is friendly, about student life, with no stereotypes.
- `content-guard` applies.

## UI impact

- `src/screens/LifeScreen.tsx` CareerTab: the filter `<select>` gains a "Part-time only" option,
  and a hint card shows for studying players with no job.
- 360px check: the hint card wraps, and the select stays full width.
- `mobile-ui-guard` applies.

## Risks

The extra part-time picks in `refreshListings` consume `state.rng` for student lives, so seeded
student runs change from the first weekly refresh on. Any existing test whose exact numbers move
only because of that stream shift is listed in the handoff. Such a test is not edited unless it
asserted the old behaviour on purpose.

## Slices

### Slice 1: data (red, then green)

- Tests in `tests/career.test.ts`, `describe('student part-time')`:
  - `adds three student-friendly part-time jobs`.
- Then add the 3 jobs to `src/data/jobs.ts`.
- `npx vitest run tests/career.test.ts -t "student part-time"`.

### Slice 2: board guarantee

- Test: `a student with no job sees at least 2 part-time listings after a refresh`. Run it over
  several seeds with `newGame({ lifeStage: 'student' })`, then `refreshListings`.
- Test: `a working adult's board is unchanged by the guarantee`. Same seed, a non-student life,
  the same listings as before. Snapshot the job ids taken before the change.
- Implementation: after the main loop in `refreshListings`, while the student has no job and
  fewer than 2 part-time listings are on the board, add one from the student-friendly part-time
  pool (skipping duplicates, with a guard).

### Slice 3: shift and class rule, wider window, counter

- Tests in `tests/career.test.ts`:
  - `student with a part-time job cannot shift on a class day before attending` (reason text);
  - `can shift after attending class`;
  - `can shift at 6PM` (window);
  - `shift at 8PM is unavailable with the window reason`;
  - `a weekend shift has no class rule`;
  - `studentShifts counts shifts worked while studying`.
- Implementation in `workActions.ts` `work-shift.available` and `run` (counter only while studying).

### Slice 4: achievement and event

- Tests: `kerja-sambil-belajar unlocks at 20 student shifts` (`tests/progression.test.ts`).
  `cover-shift has an always-available choice` is covered by the existing event validation in
  `tests/events.test.ts`. Add a focused test that resolving each choice keeps cash at 0 or above
  and stats within bounds.
- `src/data/achievements.ts`, `src/data/events.ts`.

### Slice 5: UI

- `LifeScreen.tsx` filter option `parttime`, plus the student hint. `src/i18n.ts` gets EN and BM
  strings (the `tests/i18n.test.ts` parity test).
- Manual check: `npm run dev` at 360px.

### Slice 6: docs

- `CLAUDE.md`/`AGENTS.md` Status (Career, Events count, Achievements count, tests), and the
  contracts named above.

## Validation

`npm run check`; MCP stdio smoke: `sim_new_game` (student) and `sim_list_actions` show the shift
rule; 360px check.

## As built (deviations from the plan)

- `refreshListings` now posts through a small private helper `postListing` (same draw order as the old loop, so working adults' boards are byte-identical; a test pins three seeds). The part-time top-up reuses it. `MIN_STUDENT_PARTTIME_LISTINGS` (2) is exported.
- Slice 2 gained two tests: a full board of other roles is topped up to 2 part-time listings, and a student who already has a job gets no top-up.
- Slice 3 gained two tests: a working adult with a part-time job is not held back by the class rule, and a class day at 5PM or later is open. The counter test also checks that a non-student shift does not set `studentShifts`.
- Slice 4: `cover-shift` pays the job's `shiftPay` through `earn` in the outcome `apply` (the pay depends on the job, so a fixed `effect.cash` would not do), also adds it to the tax-year gross income like a normal shift, and the extra shift does not count towards `studentShifts`.
- Slice 5 gained two pure view helpers in `career.ts`, `boardListings(state, filter)` and `showStudentJobHint(state)` (plus `PARTTIME_FILTER`), so the filter and hint rules are tested rather than living in the component. The hint card has a "Show part-time jobs" button that sets the filter and scrolls to the board.
- Adding the three jobs to the catalogue already moves every seeded `refreshListings` draw (the job pool is larger). No existing test depended on it.
- Docs: `action-contract.md` rule 17 (was 15 before it merged with the friends rules), `engine-api.md` "Student part-time" bullet; `CLAUDE.md` and `AGENTS.md` Status rows (Career: 50 jobs, Events: 112 = 91 random + 21 scheduled, Achievements: 49, Tests: 57 files and 559 tests).
- Not done here: the 360px browser check (no browser in this run).


## Review changes

- A part-time shift, with both commute legs, must end by 2AM; otherwise "Too late: this shift would end after 2AM." (A midnight cap was tried first, but with a typical 75-minute commute it blocked every after-class shift; the old 5PM window could already end around 12:30AM.) Before this, a 7PM start with a long commute could run until about 2:30AM or later. New test: `a shift that would end after 2AM is unavailable, and one that ends in time is fine`.
- The `cover-shift` copy no longer claims exams are close, because the event is not gated on exam weeks.
- The board filter label is now "Filter jobs" / "Tapis kerja", since it also holds "Part-time only".
- The docs now say the 2+ part-time guarantee holds at each weekly refresh, not always.
