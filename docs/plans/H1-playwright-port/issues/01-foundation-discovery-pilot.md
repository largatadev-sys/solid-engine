# 01 — Foundation + the discovery pilot (parity proof)

**What to build:** The Playwright suite exists and its first spec proves harness parity. `@playwright/test` (TypeScript, Chromium) configured with the two projects — `api` (request-context) and `web` (phone viewport, `hasTouch`) — the two-lane `baseURL` (preview container by default, Metro via environment switch), line + JSON reporters, traces and screenshots retained on failure, artifacts gitignored. The per-module identity map and the self-seeding fixture (reusing the existing pool client) are the shared plumbing every later spec follows. The discovery walk — the only living walk with a green measured baseline — is ported first so a red spec can be attributed to the harness or the product with confidence.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `npx playwright test` runs both projects; the `web` project uses a phone viewport with touch enabled
- [ ] The same specs run against the preview container (default) and Metro (env switch) with no spec change
- [ ] Line + JSON reporters; traces + screenshots retained on failure; artifact directory gitignored
- [ ] The identity map module records per-spec-file tag assignments; discovery's tags are its first entry
- [ ] The seeding fixture creates the spec's own trip through the API; a spec whose seeding fails reports **skipped**, loudly — proven once by pointing a spec at a dead backend
- [ ] The ported discovery spec is green with coverage parity against the CDP walk's 34 assertions, on the same stack, before the original is touched
- [ ] Exit-code honesty proven once: a deliberately-wrong assertion makes the suite exit non-zero (the sabotage is then removed)
- [ ] `drive-discovery.js` is deleted
- [ ] A `smoke:web` filter runs the web project alone
