# Plan: landing sign-in redesign (the welcome dock)

## Why

The first sign-in card was a large white card between the hero and the main action. The white Google button sat on
white (weak), the card competed with "Start a new life", and its position felt arbitrary. The developer asked for a
better button and position, designed with the impeccable and frontend-design skills.

## Direction

- **Mode:** Persuade (the landing page), inside the game's existing world: deep teal, songket gold, warm paper,
  pixel title. Refinement: keep the identity, replace the sign-in surface.
- **The welcome dock:** the sign-in lives *inside the hero*, as a darker band under the skyline's gold ground line.
  The white Google pill sits on deep teal (strong contrast, thumb height, and part of the welcome, not another card).
  Content: one short message, the Google button, "Continue as guest" in gold below it. No icon tile, no title, no
  nested card, no kicker.
- **After a choice:** choosing guest folds the dock away (a smooth height and fade, one authored motion), the hero
  returns to its original shape, and a small white "G  Sign in" pill remains at the hero's top-left, opposite EN/BM.
  Signed in: that spot holds a translucent pill (same style as the language toggle) with the Google profile picture
  and first name. A ringed avatar floating beside the toggle was tried first and looked cluttered: two unrelated
  controls of different size and style crowding one corner.
- **Same for everyone** who has not yet chosen (new players and returning guests); it appears once.
- **Skyline bleeds to the card edges** so the gold ground line and the dock band meet cleanly.
- **Details:** visible focus rings (gold) on the button and guest link, a spinner and "Signing in..." state, the
  problem message styled for the dark band, reduced-motion respected by the existing global rule.
- **Copy** (EN and BM): "Save your lives to the cloud and play on any phone. Guests keep them on this device only."
  The button says "Sign in with Google" (Google's required wording).
- **Consistency fix:** the Settings cloud card title uses a drawn icon instead of an emoji.

## Out of scope

Any sync, account or engine behaviour. Strings that become unused are removed.

## Verification

No new logic, so no new unit tests; the existing 503 stay green. Checked by rendering the real page at 360px (first
run, and after choosing guest) with headless Edge, plus `npm run check`.