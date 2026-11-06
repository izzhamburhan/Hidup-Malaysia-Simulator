# Plan: security hardening (actions pinning, Dependabot, CSP)

Task bucket: implementation (config only, no engine, save or content change). Guards: doc-drift.
Source: the security audit in this session (no secrets found, rules sound, XSS surface clean).

## Slices
1. **Pin GitHub Actions to commit SHAs** in `.github/workflows/deploy.yml` (checkout v4.4.0, setup-node v4.4.0),
   keeping the tag in a comment. Verified with `git ls-remote`. Check: the next deploy run succeeds.
2. **Dependabot** (`.github/dependabot.yml`): weekly npm and github-actions updates, grouped to limit noise.
   Dependabot alerts and secret scanning are repo settings, not files: the developer turns them on in GitHub.
3. **Content Security Policy** as a `<meta>` tag in `index.html` (GitHub Pages cannot send headers). Own branch
   `feat/ui-csp`, merged only after the developer tests Google sign-in on the built site.
4. **Firestore rules**: developer publishes `firestore.rules` and adds `hidupmalaysia.com` as an authorised domain
   in the Firebase console (cannot be done from the repo).

## Commands
`npm run check`; after push, read the deploy run status from the GitHub API.
