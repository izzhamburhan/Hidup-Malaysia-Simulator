# Plan: money unit labels, gendered dating and avatars, aesthetic palette, lofi music

Bucket: bug fix (1-3) plus small features (4-5). Item 6 (Google / phone login) is NOT in this plan: see "Out of scope".

## Findings

1. Money tab pills for `unit-trust-deposit`, `unit-trust-withdraw` and `sedekah` fall through `variantLabel` in `src/components/ActionCard.tsx` to the hours suffix, so RM500 shows as "500h".
2. `meetSomeone` (`src/engine/social.ts`) picks any name from `npcNames`, ignoring the player's gender.
3. `PixelAvatar` paints only from `Appearance`; nothing in the sprite is gendered, so a female character with short hair and a T-shirt looks male. NPC faces come from `appearanceFromName` with no gender.

## Design (no GameState change, so no SAVE_VERSION bump)

- NPC gender is derived from the catalogue name (`npcGender(name)` in `src/data/lifestyle.ts`), not stored.
- `meetSomeone` meets people of the opposite gender when `character.gender` is set; unset (old saves) keeps every name. Same state, same seed, same result.
- `PixelAvatar` takes an optional `gender`. Female cues: eyelashes, pink lips, side locks on short hair. Player call sites pass `character.gender`; `NpcAvatar` uses `npcGender`.
- Aesthetic palette: append soft pastel entries to `hairColors` and `outfitColors` (existing indices unchanged, so every saved look still validates).
- Lofi: `src/lib/music.ts` synthesises a looping chord/bass/drum/vinyl-crackle track with Web Audio, 4 stations. Settings `music`, `musicStation`, `musicVolume` live in UI settings (LocalStorage), not the save. No audio files, so nothing to license.

## Test-first slices

1. `tests/social.test.ts`: a male life only meets female names, a female life only male names, a life with no gender can meet either. Command: `npx vitest run tests/social.test.ts`.
2. `tests/data.test.ts` / `tests/content.test.ts`: every `npcNames` entry has a gender; palettes have unique valid colours. Command: `npx vitest run tests/data.test.ts tests/appearance.test.ts`.
3. `tests/music.test.ts`: station catalogue ids unique, every chord note is a finite frequency, the pure `stationNotes` scheduler is deterministic. Command: `npx vitest run tests/music.test.ts`.
4. `tests/appearance.test.ts`: `avatarCells` for female differs from male with the same look.
5. Full gate: `npm run check`.

## Out of scope

Google or phone login and cloud save need a hosted backend and credentials. `CLAUDE.md` says no backend, no accounts, no API keys in v1 and to stop and ask the developer. Needs a developer decision before any work.