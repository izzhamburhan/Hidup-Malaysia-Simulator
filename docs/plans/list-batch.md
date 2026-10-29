# Plan: the list batch (Ramadan, banjir, Bahasa Malaysia, balance)

Request (2026-10-30): "lets do all that on the list". Developer decisions: Ramadan is festive only
(no fasting mechanic; the game never infers religion from a name or look); the cash-pile fix is the
routine saving surplus on payday.

## Groups (one implementer each, own worktree based on the plan commit)

### RAM Ramadan, festive only (`data/festive.ts`, `engine/festive.ts`, `actions/peopleActions.ts`, `data/feed.ts`)
1. A Ramadan season on the simulated calendar, in the weeks before Hari Raya (existing holiday
   data decides the date; the season ends when Raya begins). Warm, respectful decorations in the
   room garland (crescent and stars style; halal-friendly emoji only).
2. Pasar Ramadan: an action open to everyone during the season (late afternoon): buy a bag of
   bazaar food with fictional prices, mood up, a small chance of an iconic find in the feedback.
3. Buka puasa gathering: a social action during the season (around sunset) with friends or family,
   for everyone, raising relationships and mood; an invite-style feed post now and then.
4. No fasting rules, no judgement, no assumption that the player or any NPC observes; copy is warm
   and inclusive ("everyone is welcome at the buka puasa table").

### BNJ Banjir at home (`data/events.ts` only, plus tests)
5. Two or three flood events at home, weighted by residence state and month: the monsoon months
   (fictionally November to January) on the east coast (Kelantan, Terengganu, Pahang) and some
   other low-lying states, rarer elsewhere. Choices: move things upstairs (small cost), evacuate to
   the relief centre (time, stress), volunteer with the neighbourhood relief (community, mood), each
   with at least one free choice; damage never pushes cash below zero; kind tone, safety first.
   Place new events directly after the last existing 'chaos' or 'world' category event.

### BAL Balance (`simulationEngine.ts` routine, the self-study action, `economy.ts` if needed)
6. Routine saves surplus: on payday (or the first routine step after it), move cash above a buffer
   of about 3 months of monthly commitments into savings, through the existing save rules (core
   helpers). Offers and other choices stay the player's.
7. Free self-study slows near the top: diminishing returns as a skill approaches 100 (and a daily
   cap if needed), so free study alone does not max a skill and pile mastery within a year.
8. Report seeded 730-day numbers before and after (employed middle seed 1: cash and savings;
   jobless grad seed 42: communication skill and mastery at day 365).

### BM Bahasa Malaysia coverage (`src/i18n.ts`, `src/screens/*`, `src/components/*` strings only)
9. Move remaining English UI chrome into i18n keys with natural Bahasa Malaysia: the tutorial,
   overlays (confirm, day report, toasts), tab labels (Act, Life including Map, Money), Settings,
   Landing, the map screen labels and legend, starter quests panel, career offers sheet.
10. Content (events, catalogue names, feed text) stays English for now, as before. No layout
   breaks at 360px with longer Malay strings.

## Validation

Each group test-first where there is logic, `npm run check` green, content-guard on all copy.
After merge: full check, unreachable-code check, seeded balance runs, 360px screenshots in BM.
