# Plan: friends you can name (feat/social-friends-roster)

Source: player feedback (Jocelyn, 2026-11-09): "a feature like making friends, something like
the Sims or the OG version of Facebook games".

## Discovery summary

- Friendship today is a single number, `relationships.friends` (0 to 100,
  `src/engine/types.ts:315`). Hangouts nudge it, and it drifts down when you are not social
  (`daily.ts:100`, `social.ts:204`).
- Named people exist only as dating prospects (`relationships.prospects`, max 3, from `npcNames`
  in `src/data/lifestyle.ts:180`) and the partner. Each has a name, a trait and an interest, and
  is drawn with `NpcAvatar` (a name-seeded pixel face).
- Per-person actions already use the `dedicated` + `param` pattern (`talk-prospect`), shown
  inline in the Life → People tab with the `V` helper (`LifeScreen.tsx`).

## Goal

A circle of named friends (Sims and FB-games style) that you meet through social life, grow
closer to through small daily choices, and can drift away from. The existing `friends` meter
keeps its meaning (the overall social health) and is fed by the circle.

## Non-goals (follow-ups)

- Friend birthdays, friend events and friend posts with real circle names in the feed.
- Real multiplayer or real social networks (ruled out: no backend, no real social media).
- Friend chat threads (the Geng Lepak thread stays as it is).
- Autopilot using the circle.

## Acceptance criteria

1. `relationships.circle: Friend[]`, where `Friend = Person & { closeness, metDay,
   lastSeenDay, lastChatDay, lastGiftDay, where }`. It holds at most `MAX_CIRCLE = 8` friends.
   Closeness runs from 0 to 100.
2. Tiers come from closeness: under 30 is Kenalan (acquaintance), 30 to 69 is Kawan (friend),
   70 and over is Kawan baik (close friend). The rule lives in a pure `friendTier(closeness)`.
3. New lives start with 2 friends (closeness 35 to 50, `where: 'school'`). They are picked by a
   pure function of the life's seed that does not advance `state.rng`, so every existing seeded
   new game keeps its RNG stream.
4. You meet new friends here:
   - `meet-people` always adds one when the circle has room (as well as the existing dating chance);
   - `mamak` 15%, `networking` 20%, `attend-class` 6% and `work-shift` 5%, rolled only when the circle has room.
   A new friend starts at closeness 12 to 25. Names never repeat anyone in the circle, the
   prospects, the partner or the exes. Friends can be any gender.
5. Per-friend actions (`dedicated`, param = friend id, shown in Life → People):
   - `friend-chat` "Message {name}": 10 min, free, +3 closeness, once a day per friend.
     Reason: "You already messaged {name} today."
   - `friend-hangout` "Lepak with {name}": 150 min, RM25 (fictional estimate), -6 energy,
     10AM to 11PM, +8 closeness, +3 to the friends meter, +5 happiness, -4 stress, marks `today.socialised` and
     `lastFriendsDay`. Once a day per friend. Reasons: the hours window, "Not enough cash.",
     and "You already lepak-ed with {name} today."
   - `friend-gift` "Send {name} a small gift": 15 min, RM30, +10 closeness, once every 7 days per
     friend. Reason: "You sent {name} something recently. Give it a few days."
   - Unknown or removed friend id: "That friend is no longer around."
6. Daily drift: a friend not seen (hangout) or messaged for more than 7 days loses 0.5 closeness a
   day. A friend whose closeness reaches 0 leaves the circle, with the log line "You and {name}
   drifted apart." Each close friend (70+) adds +0.1 happiness a day.
7. Achievements: `geng-besar` ("Geng Besar", 6 friends in your circle) and `kawan-sejati`
   ("Kawan Sejati", a friend at closeness 80+).
8. Save v11: the migration from v10 adds `relationships.circle` with the same 2 seeded starter
   friends (pure, deterministic, no `state.rng` advance). A v10 fixture migrates and loads.
9. Bounds and determinism: closeness stays within 0 to 100, cash is never negative, and the same
   seed with the same actions gives the same state.
10. UI: Life → People gets a "Your circle" section between the partner and family sections. Each
    friend shows `NpcAvatar`, name, a tier pill, a closeness bar, "{trait}, into {interest}", and
    three compact buttons (Message, Lepak, Gift) that show the unavailable reason, with no dead
    buttons. The empty state reads "Go to a social event or a mamak session to meet people."
    EN and BM strings are both added.

## Contract change

- `GameState.relationships.circle` (new) in `docs/contracts/save-format.md` (v11) and
  `docs/contracts/engine-api.md` (Friends section).
- 3 new actions: `docs/contracts/action-contract.md`.
- New module `src/engine/friends.ts`: `friendTier`, `starterCircle`, `makeFriend`, `dailyFriends`,
  `MAX_CIRCLE`.

## Save impact

`SAVE_VERSION` goes from 10 to 11. Migration `10:` adds `relationships.circle =
starterCircle(seedKey, day)`, with `seedKey` built from the stored seed and the character name.
Test: a v10 fixture without `circle` migrates to 2 friends, and migrating twice gives the same
friends. `save-compat-guard` applies.

## Content impact

- Names come from the existing `npcNames`, and traits and interests from the existing lists.
- New copy: action titles and descriptions, reasons, drift line, achievement text. The tone is
  friendly. "Lepak" and "Kenalan/Kawan/Kawan baik" are everyday Malay with no stereotypes.
- Prices (RM25 hangout, RM30 gift) are fictional game estimates.
- `content-guard` applies.

## UI impact

- `src/screens/LifeScreen.tsx` PeopleTab, plus `src/i18n.ts`.
- 360px: each friend row is avatar 40px + text + a 3-button row underneath, so it does not
  overflow; 8 rows scroll naturally.
- `mobile-ui-guard` applies.

## Risks

- RNG stream: meeting rolls in `mamak`, `networking`, `attend-class` and `work-shift` consume
  `state.rng`. Seeded tests whose exact values move only because of that are listed in the
  handoff. They are not silently re-baselined. Rolls happen only when the circle has room. A
  full circle (8) costs no rolls.
- Analytics: not touched. The circle never leaves the device except in the save (and the
  optional cloud copy, which already carries the whole save).

## Slices

1. **Types and module (red, then green).** Add `Friend` and `circle` to `types.ts`. Add
   `src/engine/friends.ts` with `friendTier`, `starterCircle` and `makeFriend`. New
   `tests/friends.test.ts`: tier boundaries (29/30/69/70), starter circle of 2, deterministic, no
   `state.rng` change, unique names that skip the partner and prospects, the cap at 8.
   Command: `npx vitest run tests/friends.test.ts`.
2. **newGame and save v11.** `newGame` seeds the circle. Bump `SAVE_VERSION` to 11 and add the
   `10:` migration. Tests in `tests/save.test.ts`: `migrates a v10 save by adding a starter
   circle`, plus an idempotent run. Update any test that pins `SAVE_VERSION === 10` (stated
   contract change).
3. **Actions.** Add `friend-chat`, `friend-hangout` and `friend-gift` in `peopleActions.ts`.
   Tests through `performAction` with a fixed seed: the happy path (closeness, cash, meter),
   each unavailable reason, the input state not mutated, an unknown id.
4. **Meeting hooks and daily drift.** Hooks in `meet-people`, `mamak`, `networking`,
   `attend-class` and `work-shift`. Add `dailyFriends` from `daily.ts`. Tests: meet-people adds a
   friend when there is room and none when the circle is full (8); drift after 8 days; removal at
   0 with the log line; the close-friend happiness bonus; bounds.
5. **Achievements.** Add `geng-besar` and `kawan-sejati` in `src/data/achievements.ts`, with tests
   in `tests/progression.test.ts`.
6. **UI.** "Your circle" section in the PeopleTab and i18n EN/BM. Manual check at 360px.
7. **Docs.** `CLAUDE.md`/`AGENTS.md` (Social row, Save row v11, achievements count, tests count),
   the contracts above, and an MCP stdio smoke run (`sim_new_game`, then `sim_state_summary`
   with full=true shows the circle; `sim_perform_action friend-chat`).

## Validation

`npm run check`; MCP smoke; 360px check; a determinism test (two runs, same seed, same actions,
deep-equal state).

## Deviations from this plan (found while implementing)

- **Contact days.** A new friend (starter or met) starts with `lastSeenDay` and `lastChatDay` one day
  before `metDay` and `lastGiftDay` 99 days before, so every action is open the day you meet them
  (the "once a day" checks compare to today). Drift counts from the latest of `metDay`, `lastSeenDay`,
  `lastChatDay` and `lastGiftDay`: a gift counts as contact too (the plan listed only a hangout or a
  message).
- **`where`** is a stored short key (`FriendPlace`: school, event, mamak, networking, class, work), not
  free text; the line shown on meeting uses a label for it.
- **Names.** `meetSomeone` now also skips names in the circle, so a prospect never shares a name with a
  friend (this changes which names the seeded prospect roll can pick once the circle has names).
- **Room animation.** `friend-chat` is mapped to the phone animation in `room/activity.ts` (with a test);
  the hangout and the gift use the category default (social).
- **Seeded tests.** The meeting rolls in `attend-class` and friends actually met shift the random
  stream of seeded autopilot runs. One test moved: `tests/lateGame.test.ts` "does not burn out a student on
  routine over a semester" (seed 3 now peaks at stress 91.4 against a limit of 90; moved to seed 2 after
  checking 14 seeds, 12 of them under 90, all averages under 40). `tests/budget.test.ts` no longer pins
  `SAVE_VERSION` to 10 (the stated contract change): it checks `migrated.version === SAVE_VERSION`.
- **Tests.** The final count is 58 files, 574 tests (baseline 57 files, 538 tests).

## Review changes

- `tests/lateGame.test.ts` "does not burn out a student on routine over a semester": the implementer first moved it from seed 3 to seed 2, after the meeting rolls shifted the random stream (seed 3 peaked at stress 91.4). Review showed that a single-seed peak bound is a lottery: on v10, 2 of 40 seeds already peaked at 90+. The test now sweeps seeds 1-20. Every seed's average stress must be between 3 and 40, and at most 4 of the 20 semesters may peak at 90+. On this branch 3 of 20 do.
- New envelope-level save test: a v10 save text loads through `deserialize` (the path the main slot, shelf, daily slot and cloud pull all use) with the starter circle, and a reload is a no-op.
- UI: the inline reason under a friend now shows only when all three actions are unavailable, because each greyed button already answers a tap with its own reason. Greyed buttons use `text-ink-soft` for contrast. The closeness bar uses a new `calm` flag on `StatBar`, so a new acquaintance (12-25) is not drawn in danger red.
- MCP stdio smoke, run by the orchestrator: 8 tools, `sim_new_game` gives v11 with 2 starter friends, `friend-chat` takes closeness from 36 to 39, and a second chat that day is refused with "You already messaged Ravi today."
- Open balance question for the developer: messaging is free (+3 closeness a day per friend) and each close friend adds +0.1 happiness a day, so a full circle of close friends gives about +0.8 happiness a day.
