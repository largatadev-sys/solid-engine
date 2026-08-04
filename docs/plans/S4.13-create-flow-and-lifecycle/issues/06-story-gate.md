# 06 — Story gate

**What to build:** nothing new — the proof that S4.13 is done, on the rungs that ship.

**Blocked by:** 02 · 05 (and transitively all).

**Status:** in-progress — two ACs belong to the promotion, not the branch

- [x] **API smoke** against the full local stack (fresh DB): the whole ladder walked and refused per spec AC 1–6; the booking card round-trip; the migration applied clean. *(`down -v` then V1→V22 clean; `smoke-lifecycle.js` 31/31, `smoke-publish.js` 44/44, `smoke-create-flow.js` 9/9.)*
- [ ] **Emulator walk**: create → details → days → activity (with booking card) → preview → Finish Planning → workspace at Upcoming → Start trip → Mark completed → publish → the re-homed success chrome; the Trips screen showing all four sections; the four-tab bar; greyed Add a Past Trip and media tiles; screenshots for the record, with pool tags stated per role. *(Unblocked — this story is JS-only on the mobile side, so a dev build takes it from Metro with no Gradle run; the S4.12 JDK gotcha does not bite.)*
- [x] **Web preview** via the rebuilt container (true build path, true server): the same walk driven headless, `window.alert` intercepted, section counts checked through the API rather than eyeballed (the S4.11 discipline). *(`drive-publish.js` 36/36, `drive-create-flow.js` 27/27, screenshots opened per regression line 12.)*
- [x] Backend unit + IT suites green; mobile suite green; `tsc` clean. *(122 + 473 + 1633.)*
- [ ] Post-merge check on deployed dev with a discriminating probe designed **before** the deploy, database named (the S1.1 rule) — including the `active → ongoing` remap proven on the one database that has rows to lose. *(Belongs to the promotion — dev is the only database holding a non-DRAFT row.)*
- [x] `REGRESSION_CHECKLIST.md` reviewed; any human-caught escape adds its line. *(Line 16 — the sabotage-invocation trap.)*
- [x] `BUILD_STATUS.md` row updated — status + spec link, nothing else — in the last commit on the feature branch.
- [x] Glossary/ADR cross-check: ADR-020 and the 02-domain-model updates match what shipped; drift appends to the spec's Comments, never rewrites the body. *(Nine comments appended.)*
