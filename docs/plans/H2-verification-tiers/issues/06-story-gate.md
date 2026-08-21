# 06 — The story gate: the tiers land where they will be read, and the number is measured

**What to build:** Nothing new — the closing pass. The cadence is written into the two places an agent actually reads it, ADR-031 goes on the record, the new wall-clock is measured against the 30-minute baseline this story was fired to move, and the record is put straight.

**Blocked by:** 01, 02, 03, 04, 05.

**Status:** needs-triage

- [ ] The three tiers are stated in **CLAUDE.md's verification section** (the durable rule) and in the **`implement` skill** (the place read at the moment it matters) — and nowhere else. Story-gate tickets keep citing the gate rather than the tiers, so the gate stays the single source of what a promotion owes
- [ ] **The pre-promotion gate is restated unchanged**, explicitly, in the same edit. A faster iterate loop must not be quietly traded for a weaker gate: a squash-merge is still where everything has to have been seen together. If a reader can come away thinking end-of-day replaces the gate, the wording has failed
- [ ] **ADR-031** records what counts as *verified* and which rung answers for it: CI owns the backend ITs, Jest and the typecheck; the local machine owns the Playwright suite, the preview container and the device rung; and the named failure mode is *CI goes unread*, which is why ticket 01 blocks the story rather than trailing it
- [ ] **Wall-clock measured and recorded**, both ends, on this workstation, with the machine stated: Tier 1 on a real story-sized change, and Tier 3 whole. Against the baseline in the spec — backend ITs 13 m 56 s, `npm run smoke` 9 m 30 s, Jest 51 s, `tsc` 47 s, preview rebuild 4–6 min, ~30 min total. **This number is what the story is judged on**, so it is measured on a quiet machine with no second agent and no competing run
- [ ] Epic map: the **S4.10 review pass** lines are updated rather than duplicated —
  - the **Playwright/backend-IT duplication (P8)** line gains this story's economics: CI already runs the ITs on every push, so the duplicated concern is now paid twice on the machine and a third time in CI. Its trigger stays as parked (*the next promotion gate, or the first full pass over an hour*); H2 does not resolve it
  - the **concurrent-test-run isolation** line records that its cheapest-interim half — one suite at a time per stack — landed here as a rule, and that the mechanism half is still open
  - a **new line** for the absence of cleanup between ITs, carrying the evidence: the clean 882-test run's one error was `InviteByHandleIT` failing on `duplicate key (lower(handle))=(aa)`, a test that cannot fail alone. Trigger: the next order-dependent flake, or any red that does not reproduce scoped
  - a **new line** for the 22 source-text Jest suites: they are the deliberate consequence of `jest.config.js`'s *"no component-snapshot theatre"*, and their unpriced cost is that change detection under-selects. Removing them means admitting a rendering layer — a decision, not a cleanup. Trigger: the next time a behaviour-neutral refactor goes red, or the next surface that needs a JSX-level assertion
- [ ] BUILD_STATUS: the H2 row lands — **status + spec link, nothing else** — in the last commit on the feature branch, before any merge proposal
- [ ] Regression checklist: a line for the trap this story removes, or an explicit note that ticket 02's `failsafe:verify` retires the need for one
- [ ] Propose the promotion; never execute it

## Comments

*(none yet)*
