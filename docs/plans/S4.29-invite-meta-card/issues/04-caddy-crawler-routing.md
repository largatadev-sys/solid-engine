# 04 — Caddy routes crawlers to the preview

**What to build:** The one Caddyfile (preview container and deployed rung alike) gains a curated crawler-UA matcher on `/join/*` — facebookexternalhit, Facebot, WhatsApp, Twitterbot, TelegramBot, LinkedInBot, Slackbot, Discordbot — reverse-proxying matched requests to ticket 03's preview route on the backend. Every other user agent keeps the static SPA exactly as today. Adding a missed platform later is a one-line change reviewable in git. Remember the standing rule: workflow-adjacent deploy config edits get credential-change scrutiny.

**Blocked by:** 03 — the preview route being proxied to.

**Status:** in-progress — the Caddyfile is written and its routing proven; the container-level ACs need a rebuilt preview image and stay open for the story gate.

**Proven so far (2026-08-23), against a throwaway Caddy on the compose network rather than the preview image:** `caddy validate` accepts the config, and with a crawler UA the **backend's own log recorded `GET /v1/join/<token>/preview`** — the token captured and the path rewritten. That log line is the discriminating evidence, because all three UA/path combinations answer **404** against a backend that predates the route: the two 404s differ only by `content_type` (backend JSON vs Caddy's bare 404), which is exactly the indistinguishable-outcomes trap this repo keeps paying for. A crawler UA on `/v1/health` through the proxy was **not** reachable, so the matcher is confirmed path-scoped.

**Still open, and each needs the rebuilt image** (`LARGATA_API_UPSTREAM` must be set and the container joined to the compose network — recorded in CLAUDE.md's recipe):

- [x] The Caddyfile matches the curated UA list on `/join/*` and rewrites to the preview route — proven by the backend log above
- [x] A crawler UA on a non-`/join` path is not proxied (matcher is path-scoped)
- [ ] `curl -A "facebookexternalhit/1.1" http://localhost:8081/join/<token>` against the **rebuilt preview container** returns that trip's tags
- [ ] The same URL with a browser UA returns the SPA shell (`<div id="root">`-style export, no per-trip tags)
- [ ] The generic sitewide og tags injected at export time are untouched for non-crawler and non-join traffic
- [ ] CI's clean-checkout compose build passes with the new Caddyfile
- [ ] Demoable: the two curl commands above, side by side
