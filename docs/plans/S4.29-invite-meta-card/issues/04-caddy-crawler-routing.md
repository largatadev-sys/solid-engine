# 04 — Caddy routes crawlers to the preview

**What to build:** The one Caddyfile (preview container and deployed rung alike) gains a curated crawler-UA matcher on `/join/*` — facebookexternalhit, Facebot, WhatsApp, Twitterbot, TelegramBot, LinkedInBot, Slackbot, Discordbot — reverse-proxying matched requests to ticket 03's preview route on the backend. Every other user agent keeps the static SPA exactly as today. Adding a missed platform later is a one-line change reviewable in git. Remember the standing rule: workflow-adjacent deploy config edits get credential-change scrutiny.

**Blocked by:** 03 — the preview route being proxied to.

**Status:** ready-for-agent

- [ ] `curl -A "facebookexternalhit/1.1" http://localhost:8081/join/<token>` against the rebuilt preview container returns that trip's tags
- [ ] The same URL with a browser UA returns the SPA shell (`<div id="root">`-style export, no per-trip tags)
- [ ] A crawler UA on a non-`/join` path still gets the SPA (matcher is path-scoped)
- [ ] The generic sitewide og tags injected at export time are untouched for non-crawler and non-join traffic
- [ ] CI's clean-checkout compose build passes with the new Caddyfile
- [ ] Demoable: the two curl commands above, side by side
