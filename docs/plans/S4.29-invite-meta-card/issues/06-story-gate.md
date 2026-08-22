# 06 — Story gate

**What to build:** Nothing new — the story's closing verification, at the layers that ship, per the spec's testing decisions.

**Blocked by:** 02, 04, 05 — everything.

**Status:** ready-for-agent

- [ ] Full backend `mvn -B verify` green in CI; read the `Tests run:` counts, not the conclusion alone
- [ ] Full `npx jest` run locally before the final push (new files under `src/` were added — the `--changedSince` blind spot applies), `tsc --noEmit`, and `npx playwright test --list` still parses every spec
- [ ] Human fidelity pass: the three rendered variants screenshotted beside the archived mock frames; deviations only where the platform forces them, each named (the standing mock-fidelity rule)
- [ ] Founder drops the original `Invite Meta Card.dc.html` + `support.js` into `../mock/` to complete the design baseline (blocked on founder, not on code)
- [ ] Closing AC on deployed dev: Facebook Sharing Debugger shows the per-trip card; a real Messenger or WhatsApp paste unfurls it; after a title edit, a **re-shared** (bumped) URL unfurls fresh while the previously posted link keeps its old card — founder runs the FB-authenticated half
- [ ] A misclassified-human check: opening the preview URL in a real browser shows the branded body with a working "Open this invite" link
- [ ] BUILD_STATUS row flips in the last commit on the feature branch; anything raised along the way is captured in the epic map's backlog
- [ ] PR opened `feature/S4.29-invite-meta-card → dev` (the proposal; never merged unasked)
