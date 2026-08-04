# 06 — Story gate

**What to build:** nothing new — the proof that S4.13 is done, on the rungs that ship.

**Blocked by:** 02 · 05 (and transitively all).

**Status:** ready-for-agent

- [ ] **API smoke** against the full local stack (fresh DB): the whole ladder walked and refused per spec AC 1–6; the booking card round-trip; the migration applied clean.
- [ ] **Emulator walk**: create → details → days → activity (with booking card) → preview → Finish Planning → workspace at Upcoming → Start trip → Mark completed → publish → the re-homed success chrome; the Trips screen showing all four sections; the four-tab bar; greyed Add a Past Trip and media tiles; screenshots for the record, with pool tags stated per role.
- [ ] **Web preview** via the rebuilt container (true build path, true server): the same walk driven headless, `window.alert` intercepted, section counts checked through the API rather than eyeballed (the S4.11 discipline).
- [ ] Backend unit + IT suites green; mobile suite green; `tsc` clean.
- [ ] Post-merge check on deployed dev with a discriminating probe designed **before** the deploy, database named (the S1.1 rule) — including the `active → ongoing` remap proven on the one database that has rows to lose.
- [ ] `REGRESSION_CHECKLIST.md` reviewed; any human-caught escape adds its line.
- [ ] `BUILD_STATUS.md` row updated — status + spec link, nothing else — in the last commit on the feature branch.
- [ ] Glossary/ADR cross-check: ADR-020 and the 02-domain-model updates match what shipped; drift appends to the spec's Comments, never rewrites the body.
