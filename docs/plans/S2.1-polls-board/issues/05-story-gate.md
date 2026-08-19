# 05 — Story gate: the full sweep and the promotion proposal

**What to build:** nothing — prove it. The pre-promotion stage of the scale-the-run rule, once tickets 01–04 are closed.

**Blocked by:** 01, 02, 03, 04.

**Status:** ready-for-agent

- [ ] Full backend ITs: `mvn -o test-compile failsafe:integration-test` — **read the `Tests run:` counts, never the exit code**; count must grow from the S4.19-era 545+ baseline by this story's new ITs.
- [ ] Full mobile suite: Jest counts read from the summary; `tsc --noEmit` clean.
- [ ] `npm run smoke` — the whole Playwright suite, both projects, one exit code; wipe the driver profile state first where the suite's fixtures don't (fresh contexts are H1-standard, but the local DB is not — `docker compose down && up -d` before evaluating anything recency-ordered).
- [ ] Device pass per ticket 04's notes on the dev build.
- [ ] BUILD_STATUS: S2.1 row flips ⬜ → ✅ **in the last commit on this branch** (status + spec link, nothing else).
- [ ] Regression checklist: read it; a bug that escaped to a human during this story adds its line.
- [ ] Propose the squash-merge `feature/S2.1-polls-board → dev` — propose-first, never executed without approval.
