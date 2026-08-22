# 06 — Story gate

**What to build:** Nothing new — the story's closing verification, at the layers that ship, per the spec's testing decisions.

**Blocked by:** 02, 04, 05 — everything.

**Status:** closed for the `dev` merge — the deployed-dev unfurl is the one item left, and it is *sequenced after* this merge rather than blocking it (the code has to be on `dev` to be testable there).

- [x] Full backend `mvn -B verify` green in CI; read the `Tests run:` counts, not the conclusion alone — **990 ITs, 0 failures** on `6e4b3ef`
- [x] Full `npx jest` run locally before the final push (new files under `src/` were added — the `--changedSince` blind spot applies), `tsc --noEmit`, and `npx playwright test --list` still parses every spec — 4,571 tests / 132 suites; 714 specs across 36 files parse
- [x] Human fidelity pass: the rendered variants screenshotted and reviewed against the design — **founder ruling 2026-08-23: *"so far the results for the card is okay"***. Evidence kept in `../verification/`. One platform-forced deviation stands as specced (bundled Noto Sans for the body roles, because a server has no system font), and one fidelity defect was found and fixed at the second review (the decorative circle's 120px sign flip)
- [x] ~~Founder drops the original `Invite Meta Card.dc.html` + `support.js` into `../mock/`~~ — **struck by founder ruling, 2026-08-23**: *"leave it. we already had one earlier, and so far the results for the card is okay."* The transcribed README stays the archived baseline. **The known cost, recorded rather than hidden:** exact-value questions are answered from prose rather than from the canvas, and that is precisely how the circle's `right: -60px` was misread as an inset — so a future fidelity question on this card is a founder question, not a repo lookup. `CardArtTest` now pins every number the mock's token list gives, which is the cheapest available substitute
- [x] A misclassified-human check: opening the preview URL in a real browser shows the branded body with a working "Open this invite" link — `../verification/E-misclassified-human.png`
- [x] BUILD_STATUS row flips in the last commit on the feature branch; anything raised along the way is captured in the epic map's backlog (two lines added: crawler-UA list maintenance, and the card's fixed API origin)
- [x] PR opened `feature/S4.29-invite-meta-card → dev`
- [ ] **Post-merge, on deployed dev:** Facebook Sharing Debugger shows the per-trip card; a real Messenger or WhatsApp paste unfurls it; after a title edit, a **re-shared** (bumped) URL unfurls fresh while the previously posted link keeps its old card — founder runs the FB-authenticated half. Everything this depends on that is *ours* is proven locally (see `../verification/`); what is left is a third party's cache, which no local rung can stand in for
