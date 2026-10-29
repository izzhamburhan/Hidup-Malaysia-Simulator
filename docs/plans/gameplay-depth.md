# Plan: gameplay depth (money sinks, a way out of broke, year 2+)

Request (2026-10-29): from the whole-game review, the developer chose: a fictional unit trust,
lifestyle upgrades, family duties and sedekah as money sinks; a way out of the broke loop; and
for year 2+ a longer career ladder, skill mastery, stress for students and fewer repeat events.

Evidence (balance scout, seeded autopilot): employed players reach about RM98k cash in 2 years with
nothing to spend it on; unemployed fresh grads sit under RM100 with growing debt and the broke
event every 10 days; careers stall after one promotion; skills hit 100 within 2 years; students'
stress stays at 0; stray cat 4-7x a year, birthdays 9x, noisy neighbours 8x in 2 years.

## Save

Shape change done first in its own commit (d88ef06): SAVE_VERSION 8 adds `finance.unitTrust` and
`mastery: Skills`, with migration and test. No further shape changes in this batch.

## Groups (one implementer each, own worktree based on d88ef06)

### GD1 Money sinks (`actions/ownershipActions.ts`, `economy.ts`, `data/lifestyle.ts`, new events in `data/events.ts` family section)
1. Unit trust: deposit and withdraw actions (fixed amounts like the savings actions), money category,
   fictional fund name in Seri Harapan, clearly labelled a game estimate; a yearly dividend paid
   into `unitTrust` at the tax-year turn, rate varying by year from the seeded rng within a modest
   fictional range; withdrawals move money back to cash. Never real fund names or return promises.
2. Lifestyle upgrades: a handful of optional big purchases (new phone or laptop refresh, a holiday
   abroad, a home upgrade) with mood or comfort effects; they cost real money and say so.
3. Family duties: 3 to 4 events that ask for money as life goes on (a parent's clinic bill, a
   sibling's tuition, a family wedding contribution), each with a free choice, gated by age or
   income so they hit employed players more than broke ones.
4. Sedekah: a give-to-a-fictional-cause action (amounts) for mood and reputation, with a daily cap.

### GD2 A way out of broke (`actions/workActions.ts`, `daily.ts`, new events in `data/events.ts` money section)
5. Gig work: a generic delivery or e-hailing gig action (no brand names) available to anyone with a
   way to get around, paying modest cash per session with energy cost, so a broke player can always
   earn something.
6. Family top-up: an event that can fire when cash is very low and the player is not supported,
   offering help with strings attached (pride, family relationship), with a free choice.
7. The broke event repeats far less often (longer gap, and not while a recovery is under way).

### GD3 Year 2 and beyond (`career.ts`, `core.ts`, `education.ts`, `jobs` eligibility, cooldowns in `data/events.ts`, Life skills UI)
8. Longer career ladder: promotions keep coming past the first, with tougher reviews at higher
   levels, and occasional better-paid job-hop offers that reset seniority.
9. Skill mastery: skill gains past 100 accrue into `mastery`; mastery gates senior roles and higher
   hustle tiers; the Life screen shows it.
10. Student stress: exams, assignment deadlines and money worries raise stress for students and
    fresh grads so rest and fun matter.
11. Fewer repeat events: longer cooldowns for the most repeated events (stray cat, birthday
    celebration, noisy neighbours and any others the scout shows repeating), edited in place.

## Validation

Each group test-first for engine rules, `npm run check` green, content-guard on new copy, and
seeded autopilot numbers before and after (2 years, employed middle background seed 1; fresh grad
struggling seed 42) reported in its handoff. After merge: full check, the same autopilot numbers,
`data_validate`-style integrity tests, and 360px screenshots of Money and Life.
