# Plan: real-player friends and the in-game phone

Branch `feat/social-real-friends` (worktree `.worktrees/social-real-friends`), based on `feat/social-friends-roster`.
Feedback: Jocelyn asked for making friends "like the OG Facebook games". The developer chose the five Phase 1 items
(friend codes, visit a friend, daily gift, preset reactions, friends leaderboard) plus a phone-style chat between real
friends with **free text and safety on** (word filter, 200-character limit, block, report, chat switch).

## Goal

Signed-in players can add real friends by code, visit a read-only snapshot of a friend's life, send one free gift a
day, react with preset stickers, compare on a friends-only leaderboard and chat in a phone UI. Guests keep the whole
offline game; their phone shows the NPC chats and a "sign in to add real friends" card.

## Non-goals

No search by name or email, no strangers, no public lobbies, no group chats, no images, no push notifications, no
server code (no Cloud Functions: the Spark plan and the "no backend of our own" rule stay), no visiting a friend's
save (only the published snapshot), no cash gifts.

## Acceptance criteria

1. **Opt-in.** Friends is off until a signed-in player turns it on and picks a display name (3-16 letters, digits and
   spaces, passes the word filter). Turning it on creates `profiles/{uid}` and `codes/{code}`. Guests never load it.
2. **Friend code.** A 6-character code from an unambiguous alphabet (no 0/O/1/I/L), shown as `HM-XXXXXX`, generated
   in the UI with `crypto.getRandomValues`; a taken code is retried.
3. **Add by code.** Entering a code shows the friend's display name and look before sending. Sending writes
   `users/{them}/requests/{me}` and `users/{me}/friends/{them}`. Unknown code, own code, already friends, blocked or a
   full list (`MAX_REAL_FRIENDS` = 50) each return a reason.
4. **Accept / decline.** Accept writes `users/{me}/friends/{them}` and deletes the request; friendship is mutual only
   when both friend docs exist. Decline deletes the request.
5. **Visit.** A friend's profile card shows display name, pixel character, life stage, job title, state, day/age,
   achievements count, travel stamps and a coarse net-worth band (never exact money, never the Google name).
6. **Daily gift.** One gift per friend per real day (doc id `{from}_{YYYY-MM-DD}`; a second send is refused by the
   rules and by the client with "You already sent {name} a gift today."). Gifts are free to send.
7. **Open a gift.** The engine action `open-gift` (param = gift kind from `src/data/gifts.ts`) applies a small
   non-cash effect, at most `GIFTS_PER_DAY` = 3 a game day ("You have opened 3 gifts today. Open the rest tomorrow."),
   counts `flags.giftsOpened`; achievement `hadiah-kawan` at 5. The gift doc is deleted after a successful open.
8. **Reactions.** Preset stickers (`src/data/stickers.ts`, EN/BM labels, emoji from the halal-safe list) can be sent
   from the visit card or the chat; they arrive as sticker messages.
9. **Leaderboard.** Friends plus you, ranked by one of: achievements, days lived, travel stamps, net-worth band.
10. **Chat.** A phone overlay (status bar, app grid: Sembang, Kawan, Hadiah, Ranking, Profil). Sembang lists the NPC
    threads (existing `ChatSheet`) and real friends with last message preview and unread dot. A thread shows bubbles,
    a sticker row and a text box (max 200 chars). Text is filtered before sending **and** masked again on display
    (a modified client cannot bypass the reader's filter). Links and phone numbers are hidden. Only mutual friends
    with chat on can message (enforced in `firestore.rules`).
11. **Safety.** Block (removes friendship, hides them, refuses their requests), Report (writes `reports/{id}` with the
    last 20 messages, then blocks; nobody can read reports except the owner in the Firebase console), Chat switch in
    Settings (off hides chat and sets `profiles/{uid}.chatOpen = false`, which the rules check).
12. **Leave.** "Turn off Friends" deletes the profile, code, friend list, requests, gifts, blocks and the player's own
    messages, then removes the player from friends' lists as far as the rules allow (own docs only; friends' docs
    simply stop being mutual). "Delete my cloud data" also does this.
13. **Failures are values.** Every network call returns `{ ok: false, error }` instead of throwing; the game is never
    affected.

## Contract change

- New `docs/contracts/friends-online.md` (data model, rules, privacy, safety, limits).
- `docs/contracts/cloud-save.md` privacy section points to it; `action-contract.md` rule 16 (`open-gift`);
  `engine-api.md` gifts; `data-catalogues.md` gifts and stickers; `analytics.md` unchanged (no new events).
- `firestore.rules` grows: `profiles`, `codes`, `users/{uid}/{friends,requests,gifts,blocked}`, `chats`, `reports`.

## Save impact

Shape unchanged: `open-gift` uses `flags.giftsOpened`, `flags['gift-day']`, `flags['gifts-today']`. `SAVE_VERSION`
stays 11. Settings gain `friendsChat: boolean` (default true) under `hidup-malaysia:settings` (merged over defaults,
no migration). Friends state lives in Firestore and in memory only, never in the save.

## Content impact

Gift names and effects (fictional, small, non-cash), sticker phrases (original, friendly, EN/BM), a word filter list
(`src/data/blockedWords.ts`, EN and BM vulgarities and slurs, used only to mask). No real names, no prices.

## UI impact

New phone overlay (full screen at 360px, a phone bezel only from `sm`), a phone button in the game header with an
unread dot, Settings "Friends" card (display name, code, chat switch, blocked list, turn off). Mobile-first, no dead
buttons: every disabled action shows its reason.

## Assumptions (developer can overturn)

- Profile and code docs are readable (`get` only, never `list`) by any signed-in player, so a code can be previewed
  before adding. They hold only the chosen display name, look and coarse snapshot.
- No message rate limit in rules beyond the 200-char cap (Spark quotas are the backstop); flagged as a risk.
- Gifts use the device's local date for the daily limit; changing the clock only lets you send more free gifts.
- Old messages are not auto-expired; a thread loads the last 50.
- The phone also hosts the NPC chats so guests get value; the Feed tab keeps its list too.

## Slices

### S1 Engine and data: gifts (engine-contract-guard, content-guard)

Files: `src/data/gifts.ts` (new), `src/data/stickers.ts` (new), `src/engine/actions/peopleActions.ts`,
`src/data/achievements.ts`, `src/components/room/activity.ts` (map `open-gift` to the phone animation), tests
`tests/gifts.test.ts` (new), `tests/data.test.ts`, `tests/content.test.ts` (sticker emoji in the safe list).
Red first: `npx vitest run tests/gifts.test.ts` fails (module missing). Tests: happy path through `performAction` with a
fixed seed, unknown kind reason, fourth gift of a day reason, cap resets next day, input not mutated, bounds, no cash
change, achievement at 5.

### S2 Pure social library (no Firebase)

Files: `src/lib/wordFilter.ts` + `src/data/blockedWords.ts`, `src/lib/social.ts` (types, `SocialStore` interface,
`newFriendCode(random)`, `formatCode/parseCode`, `validateDisplayName`, `chatIdOf`, `giftDocId`, `profileSnapshot(state)`,
`rankFriends`, `prepareMessage`), `src/lib/socialClient.ts` (enable, addByCode, accept, decline, remove, block, report,
sendGift, claimGift, sendMessage, markRead, disable; all over the injected store, errors as values), tests
`tests/wordFilter.test.ts`, `tests/social.test.ts`, `tests/socialClient.test.ts` with an in-memory fake store.

### S3 Firestore adapter and rules

Files: `src/lib/firebaseSocial.ts` (SocialStore over Firestore, lazy, with `onSnapshot` subscriptions), `firebaseClient.ts`
(expose `db` handle to the social adapter), `firestore.rules`, `tests-rules/firestore.rules.test.ts` (emulator test,
excluded from `npm test`; this machine has Java 8, the emulator needs Java 21, so it is written but not run here).

### S4 UI

Files: `src/hooks/useSocial.tsx`, `src/components/phone/*` (PhoneSheet, PhoneHome, ChatApp, ChatThread, FriendsApp,
GiftsApp, RankApp, ProfileCard), `src/screens/GameShell.tsx` (phone button), `src/screens/SettingsScreen.tsx`,
`src/hooks/useGame.tsx` (`friendsChat` setting), `src/i18n.ts`, `src/components/PrivacyNotice.tsx`. Check at 360px.

### S5 Docs

CLAUDE.md, AGENTS.md (status row, layout, privacy wording, counts), contracts listed above, this plan's "As built".

## Validation

`npm run check` after each slice; `git diff --stat` insertion-only scan (environment quirk); engine purity grep; MCP
stdio smoke (`open-gift` via `sim_perform_action`); 360px check if a browser is available.

## As built

- S1 (gifts engine and data), S2 (pure social library, word filter), S3 (Firestore adapter in `src/lib/firebaseSocial.ts`,
  rules, `tests/firestoreRules.test.ts`), S4 (phone UI, `useSocial`, Settings card, `src/i18n.phone.ts`) and S5 (docs) as
  planned. Counts: 114 actions, 51 achievements, 64 test files, 717 tests.
- Deviations: chat text is capped at 200 characters for the player but the rules allow 400 UTF-16 units (emoji and
  `[hidden]` masks); a chat preview may be blanked by its author after the friendship ended (turning Friends off);
  "already sent a gift today" arrives from Firestore as permission-denied and is mapped to the reason; sending a request
  to someone who already asked you accepts it. Strings from the social client are English only.
- Not verified here: the rules in the Firebase emulator (this machine has Java 8, the emulator needs Java 21), and
  real Google sign-in with live Firestore. The signed-in screens were checked at 360px against a mock of the friends
  data, the guest screens against the real app.
- Review fixes: the rules file was rebuilt after the edit quirk broke it (a structure test in `tests/firestoreRules.test.ts` now guards it); gift ids use the server's Malaysia day; Delete my cloud data runs the friends cleanup first, once; display names come from the current profile; snapshot text masked; the word filter folds Unicode tricks and hides more handles; privacy copy names what stays behind.
