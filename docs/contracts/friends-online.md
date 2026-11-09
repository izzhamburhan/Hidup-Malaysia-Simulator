# Real-player friends contract

Signed-in players can add each other as friends, visit a snapshot of each other's life, send a free gift a day,
react with stickers, compare on a friends leaderboard and chat in the in-game phone. UI layer only: the simulation
engine imports none of it, and the save (`SAVE_VERSION`) is unaffected. **Guests are unaffected**: no Firebase code
loads for them, and their phone shows the NPC chats only.

Code: `src/lib/social.ts` (types, `SocialStore`, pure helpers), `src/lib/socialClient.ts` (every operation over an
injected store; results are values, never throws), `src/lib/wordFilter.ts` with `src/data/blockedWords.ts`,
`src/lib/firebaseSocial.ts` (Firestore adapter and live listeners, built lazily by `firebaseClient.ts`),
`src/hooks/useSocial.tsx`, `src/components/phone/*` (UI). Rules: `firestore.rules`. Catalogues: `src/data/gifts.ts`,
`src/data/stickers.ts`.

## Opt-in

Friends is off until a signed-in player turns it on in the phone (Profil) or Settings and picks a **display name**
(3-16 letters, digits and single spaces, no blocked word; never the Google name). Turning it on writes:

| Document | Fields | Who can read |
| --- | --- | --- |
| `profiles/{uid}` | `code`, `displayName`, `chatOpen`, `snapshot`, `updatedAt` | any signed-in player, `get` by id only, never `list` |
| `codes/{code}` | `uid` | any signed-in player, `get` only |

The **snapshot** (`profileSnapshot(state)`, refreshed when the phone opens and once per game day) holds the pixel
look and gender, life stage, job title, residence state, age, game day, achievements unlocked, travel stamps and a
coarse net-worth band (`bandOf`, e.g. `rm5k-20k`) with a rank for sorting. Never the character name, the Google name,
the email or an exact amount.

**Friend code**: 6 characters from `CODE_ALPHABET` (no 0, O, 1, I, L), shown as `HM-XXXXXX`, generated on the device
with `crypto.getRandomValues`, claimed in a transaction (a taken code is retried, up to 5 times).

## Friendship

- `users/{uid}/friends/{other}` (`since`) means "uid counts other as a friend". **Mutual** = both docs exist.
  Only mutual friends can send gifts or messages; removing or blocking deletes your own doc, which ends that at once.
- Adding by code previews the profile first, then writes `users/{them}/requests/{me}` (`displayName`, `at`) and your
  own link. If they had already asked you, it simply accepts. Accept writes your link and deletes the request;
  decline deletes it; the sender may cancel it.
- Reasons the player sees: "That code does not look right…", "No player has that code.", "That is your own code.",
  "You are already friends.", "You blocked that player. Unblock them first.", and a full list (`MAX_REAL_FRIENDS` = 50).
- Blocking (`users/{uid}/blocked/{other}`) removes your link and their request, and the rules refuse their new
  requests to you.

## Gifts

- `users/{to}/gifts/{from}_{giftDay}` (`from`, `fromName`, `kind`, `date`, `at`). The id makes it **one gift per
  friend per day**. `giftDay` is `giftDayKey(Date.now())` (`src/lib/social.ts`): whole days since the epoch in Malaysia
  time (UTC+8), so the day resets at midnight Malaysia time; the rules require `date` to equal the server's own Malaysia
  day number or the day before (a device clock a little behind still works). Known limit: once the friend opens (and so
  deletes) a gift, the same id could be written again that day by a modified client; opening stays capped at 3 a game
  day, and only a mutual friend can do it (block ends it). The engine's `open-gift` does not check that a gift really
  arrived (anyone with the engine, such as the MCP server, can call it); it is capped and non-cash. Gifts are never updated, so a second send is refused ("You already sent {name} a gift today, or you are
  no longer friends.": the store cannot tell the two denials apart). Sending is free. `kind` must be an id in `GIFTS`; the rules list the same ids
  (`tests/firestoreRules.test.ts` keeps them in step).
- Opening one runs the engine action `open-gift` (`action-contract.md` rule 16): a small non-cash effect, at most
  `GIFTS_PER_DAY` (3) per game day. The gift document is deleted only after the action succeeded.

## Chat

- `chats/{a_b}` (ids sorted, joined with `_`): `members`, `lastText`, `lastFrom`, `lastAt`, the list preview.
  `chats/{a_b}/messages/{id}`: `from`, `kind` (`text` | `sticker`), `text`, `sticker`, `at` (server time).
- A message can be sent only between **mutual friends** while the receiver's profile has `chatOpen: true` (and the
  sender's own chat switch is on). Text: at most `MESSAGE_MAX` (200) characters; the rules allow 400 UTF-16 units for
  emoji and masks. Sticker messages carry a `STICKERS` id and empty text; the preview reads `[sticker]`.
- **Word filter** (`maskText`): blocked English and Bahasa Malaysia words (whole words, also with leetspeak, repeated
  letters and separators) are masked, and links and phone numbers become `[hidden]`. Text is masked **before sending
  and again on display**, so a modified client cannot bypass the reader's filter. Display names are refused if they
  contain a blocked word.
- A thread loads the latest `HISTORY_LIMIT` (50) messages, live. Read state is per device under
  `hidup-malaysia:friends` (`{ lastRead: { [chatId]: iso } }`; broken value = empty).
- Chat switch: Settings `friendsChat` (default on). Off hides the input and sets `chatOpen: false`.

## Safety

- **Block** as above. **Report** (`reports/{id}`: `reporter`, `reported`, `chatId`, `reason` in `REPORT_REASONS`,
  the last `REPORT_MESSAGES` (20) messages, `at`) then blocks. Reports are create-only: nobody can read them through
  the app; the owner reads them in the Firebase console.
- No search by name or email, no strangers, no group chats, no images, no links or phone numbers in chat.
- All text renders as React text (no `innerHTML`).

## Leaving

"Turn off Friends" (`disableFriends`) deletes your own messages in every chat, blanks previews you wrote, your
friend links, your pending requests to others, your inbox (requests, gifts), your blocks, your profile and then your
code; it carries on past a failing step and reports the first error. Not removed: reports you were part of (kept for
safety) and gifts you already sent, which stay in your friends' inboxes until they open them. "Delete my cloud data" runs it first when
Friends is on. Friends' own documents are theirs; their link to you simply stops being mutual.

## The phone (UI)

A phone button in the game header (with a dot for unread real chats, friend requests, gifts and NPC chats) and the
Settings "Friends" card open `PhoneSheet`: Sembang (NPC threads through the existing `ChatSheet`, plus real chats),
Kawan (my code, add by code, requests, friends, sent requests, blocked list), Hadiah (open gifts, send one), Ranking,
Profil (opt-in explainer, display name, chat switch, turn off). Guests and signed-out players see the NPC chats and a
sign-in card. `useSocial` loads Firebase only for a signed-in player, keeps live listeners for chats, requests and
gifts while Friends is on, and publishes the snapshot when the phone opens and at most once per game day (never from
the daily-challenge slot). Full screen at 360px; a phone frame from `sm` up.

## Limits and costs

Firestore on the free Spark plan. There is no server code and no rate limit beyond the text cap; Spark's daily
quotas are the backstop. Each message costs the rules three document reads (two friend links and the profile).

## Tests

`tests/social.test.ts`, `tests/socialClient.test.ts` (in-memory `tests/fakeSocialStore.ts`), `tests/wordFilter.test.ts`,
`tests/gifts.test.ts`, `tests/firestoreRules.test.ts` (rules text in step with catalogues and limits;
`friendlyError`). The rules themselves need the Firebase emulator (Java 21+) and are not executed in `npm test`.
The React wiring and the Firestore adapter are checked by hand.
