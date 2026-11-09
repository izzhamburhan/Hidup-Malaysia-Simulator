# Plan: more programmes and study fields (content/more-courses)

Source: player feedback (Mahfuzah, 2026-11-09): "when I picked UUM, I couldn't find my course in the list".

## Goal

Most players should find their own programme, or something close to it. Add the common
Malaysian programmes the catalogue is missing (law, HR, psychology, communication, tourism,
hospitality, public management, Islamic finance, economics, the sciences, counselling) and widen
which universities offer which fields.

## Non-goals

- Exact real course lists per university. `fields` stays game flavour, not a claim about what an
  institution offers.
- New skills (`SkillKey` is unchanged), new engine rules, or UI redesign. The course pickers are
  already dropdowns that filter by `uni.fields`.

## Acceptance criteria

1. Four new study fields exist: `law`, `social` (social sciences), `hospitality` (tourism and
   hospitality), `science` (applied and life sciences).
2. At least 20 new courses, all with unique ids and valid skills, difficulty between 0.85 and 1.35,
   and semesters between 5 and 10.
3. UUM offers at least 15 courses, including Bachelor of Laws, Human Resource Management,
   Communication, Tourism Management, Psychology and Islamic Finance.
4. Every course field is offered by at least one university, and every university still offers at
   least one course (existing test).
5. Every course field is listed in `fields` by at least one full-time job, so no degree is a dead
   end on the job board (the match score gets +10 for a field match and -8 without one).
6. New full-time jobs cover the new fields: Legal Executive (`law`), Counsellor (`social`,
   `education`), Administrative Officer (`social`, `business`, `law`), Front Office Executive
   (`hospitality`), Events Executive (`hospitality`, `creative`, `business`), Lab Executive
   (`science`, `health`). Each one can be offered by at least one company (existing test).
7. A new student game and a new fresh-grad game start cleanly for every course, at a university
   that offers its field (no throw, `education.field` equals the course field).

## Contract change

None to engine types. `Course.field` and `University.fields` are already plain strings.
`docs/contracts/data-contract.md` (if it lists fields) is updated to name the 11 fields.

## Save impact

Shape unchanged. Saves keep their `courseId` and `field`; new ids only add choices.

## Content impact

- Course names are generic programme titles. They make no claim that a named university runs them.
- University `fields` remain game flavour, as the catalogue header already says. No fees, rankings
  or entry requirements are added.
- New job salaries are FICTIONAL GAME ESTIMATES, in the same range as similar existing roles. The
  `jobs.ts` header already carries the label.
- Islamic Finance is a programme name only: no religious claims or humour.
- `content-guard` applies.

## UI impact

None in code. The course dropdowns in Character Creation and in Life → Study show more options.
A manual check at 360px confirms the longest name ("Bachelor of International Affairs
Management") does not overflow the select.

## Assumptions (made without asking)

- Economics, HR, logistics, entrepreneurship and Islamic finance stay in the `business` field so
  they match the many business jobs. Communication goes in `social`, beside the existing Mass
  Communication in `creative`.
- The shared `ALL` list (UM, UKM, USM, UPM, UiTM, IIUM, UTAR, UCSI) grows to all 11 fields.
- Other universities gain the new fields where the real institution is broadly known for them.
  This is flavour, not a claim.

## Slices

### Slice 1: tests first (red)

Files: `tests/data.test.ts`, with a new `describe('more programmes')`.

Failing tests:
- `defines the four new fields` (each of law/social/hospitality/science used by at least one course)
- `UUM offers at least 15 courses including law, HR, communication, tourism, psychology, Islamic finance`
- `every course field is offered by at least one university`
- `every course field is matched by at least one full-time job`
- `new courses have sane balance values` (difficulty, semesters, skill keys in SKILL_KEYS)
- `includes the new jobs` (`legal-exec`, `counsellor`, `admin-officer`, `front-office`, `events-exec`, `lab-exec`)
- `a new game starts for every course` (student and fresh_grad, using `newGame` with a fixed seed)

Command: `npx vitest run tests/data.test.ts -t "more programmes"`. Expected red: the new ids and
fields are missing.

### Slice 2: catalogue (green)

- `src/data/courses.ts`: add the courses. business: `hrm`, `islamic-fin`, `logistics-scm`,
  `econ`, `entrepreneurship`, `acc-dip`. law: `llb`. social: `psych`, `comm`, `pub-mgmt`,
  `social-work`, `intl-affairs`. hospitality: `tourism`, `hospitality`, `hotel-dip`. science:
  `biotech`, `food-sci`, `agri`, `marine-sci`. education: `edu-maths`, `counselling`.
- `src/data/universities.ts`: grow `ALL` and the field lists above. UUM gains law, social and
  hospitality.
- `src/data/jobs.ts`: add the six jobs, and widen the fields of existing jobs where natural: `hr`
  (+social), `marketing` (+social, hospitality), `data-analyst` (+science), `cabin-crew`
  (+hospitality), `intern-biz` (+law, social, hospitality), `intern-tech` (+science).

Command: `npx vitest run tests/data.test.ts`, then `npm test`.

### Slice 3: docs

- `CLAUDE.md` and `AGENTS.md` Status: Education course count, Career job count, test count.
- `docs/contracts/` data contract, if it names fields.
- `data_validate` MCP smoke call.

## Validation

`npm run check`; `npx tsx` MCP `data_validate` (stdio smoke); a manual 360px look at the course
select.

Files that must not change: `src/engine/**` (except none), `src/engine/save.ts`, `SAVE_VERSION`.
## As built (review changes)

- `law` is offered only where it is widely known: UM, UKM, UiTM, IIUM, UUM, USIM, UniSZA, MMU and Taylor's (dropped from APU, XMUM, Nottingham and INTI after review). The shared `ALL` list carries `social` and `science` but not `law` or `hospitality`; UiTM and UCSI add `hospitality` explicitly.
- Course id `hospitality` was renamed `hospitality-mgmt` so it does not clash with the field id.
- Extra tests: the law allow-list plus a UUM law student start, and the new jobs being full-time with a new field and an employer.
- Known limitation: there is no hotel or tourism industry in `companies.ts`, so Front Office Executive is offered by transport, retail and SME employers. A fictional hotel employer is a possible follow-up.
- Not done: the manual 360px look at the course select (native `<select>`). `data_validate` was run in-process via `npx tsx` (ok, 48 courses, 53 jobs).
