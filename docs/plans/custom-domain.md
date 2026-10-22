# Plan: custom domain hidupmalaysia.com

Request (2026-10-22): the developer bought hidupmalaysia.com (Cloudflare Registrar) and set DNS
(4 A records to GitHub Pages, www CNAME, DNS only) and switched Umami to the new domain.

## Changes
1. `public/CNAME` containing `hidupmalaysia.com` so every deploy keeps the custom domain.
2. `src/config.ts`: `GAME_URL` = `https://hidupmalaysia.com/`; `ANALYTICS_DOMAINS` = new domain
   plus the old github.io host (old links forward, and the analytics gate stays valid either way).
3. Docs: README, CLAUDE.md, AGENTS.md (new live URL, DNS note), analytics setup text.
4. Verify: `npm run check`; after deploy, HTTPS answers on the new domain.

## Developer follow-up
Settings > Pages: confirm custom domain, tick Enforce HTTPS (once the certificate is issued).
