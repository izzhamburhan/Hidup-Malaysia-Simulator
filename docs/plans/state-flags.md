# Plan: state flags

## Why

The developer asked for each state's flag next to the home state. Players like seeing their
own state, and it makes the character creation screen feel local.

## Decisions

- **Official artwork, not hand-drawn.** State flags carry royal crests and religious symbols; a
  hand-drawn approximation risks getting them wrong, which is disrespectful on a sensitive
  subject. The files are unmodified SVGs from Wikimedia Commons, licence checked file by file
  through the Commons API: 12 public domain, 4 CC BY-SA 3.0 (Kelantan, Sarawak, Selangor,
  Terengganu), which keep that licence and their author credit.
- **Files** in `public/flags/` (loaded lazily as images, so scripts inside an SVG could never run;
  a test also checks none contain scripts or outside links). Credits in `src/data/stateFlags.ts`
  and a Credits section in Settings with author and licence links.
- **Identification only.** Flags are government symbols, not brand logos, so the "no logos" rule
  does not forbid them, but they imply no endorsement; Settings says so. Rule added to CLAUDE.md,
  AGENTS.md and content-guard.
- **UI**: the home-state dropdown becomes a 4-column grid of flags; a small flag sits before the
  date in the game header.
- Fix found on the way: the Jimat Cermat daily used `Penang` while the state list says
  `Pulau Pinang`; corrected, with a test that dailies use real home-state names.

## Tests (tests/stateFlags.test.ts)

Every home state has a file and a credit; CC BY-SA files name their author; no scripts or
outside links in any file; daily challenge home states are real.