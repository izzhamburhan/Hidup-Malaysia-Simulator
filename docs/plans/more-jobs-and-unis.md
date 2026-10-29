# Plan: more jobs and university options

Request (2026-10-29): "for job and uni options, can you add more". Content-only change.

## Goal and non-goals

- Goal: more variety on the job board and in university and course choice.
- Non-goals: no engine, UI, save or contract change; no new study fields or industries (every
  new entry uses the existing 7 fields and 8 industries, so no labels or rules need to change).

## Acceptance criteria

1. 16 more real Malaysian (or Malaysia-campus) private universities, each with a fictional
   per-semester tuition estimate, game-flavour `strengths` and `industryLinks` (40 in total).
2. 13 more generic courses across the existing fields, including diplomas (27 in total).
3. 22 more jobs: 19 full-time roles for every field (health, engineering, finance, creative,
   education, service), plus 2 part-time student jobs and 1 engineering internship (47 in total).
   Health, preschool and tuition jobs stay in the `public` (schools and clinics, fictional)
   industry so they never land at a coffee chain or kopitiam; 1 fictional employer, Hospital
   Seri Harapan, gives them a fitting workplace.
4. Every new id is unique, every job has an employer, every university offers a course
   (existing integrity tests), and the new items exist (new test).

## Contract, save, content, UI impact

- Contract: none. `docs/contracts/data-catalogues.md` already covers these catalogues.
- Save: none. New ids are additive; existing saves reference existing ids.
- Content: real university names only, no rankings, fees or entry requirements implied; tuition
  and salaries are fictional estimates under the existing file headers. No banned emoji.
- UI: none. Character creation and the Life screen list universities and courses from the data.
- Docs: counts in `CLAUDE.md`, `AGENTS.md` and `README.md` (now 40 institutions, 27 courses, 47 jobs, 24 employers, 222 tests).

## Slices

1. Red: `tests/data.test.ts` asserts the new university shorts, course ids and job ids exist.
   `npx vitest run tests/data.test.ts` fails on the missing ids.
2. Green: add the entries to `src/data/universities.ts`, `src/data/courses.ts`, `src/data/jobs.ts`,
   and the fictional hospital to `src/data/companies.ts`.
3. Validate: `npm run check` (seeded tests that pick a random course or job may shift; fix the
   test only if the assertion was tied to the old catalogue size, never weaken a rule).
4. Docs: update the counts.

## Commands

```bash
npx vitest run tests/data.test.ts
npm run check
```
