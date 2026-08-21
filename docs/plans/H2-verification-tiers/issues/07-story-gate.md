# 07 — The story gate

**What to build:** Nothing new — the closing pass. The decision goes on the record, the upper rungs get protected now that the promotion has cleared, and the number this story exists to move is measured.

**Blocked by:** 01, 02, 03, 04, 05, 06.

**Status:** needs-triage

- [x] **ADR-031** minted with the spec (H1's precedent — the ADR lands with the spec, not at the gate), in `docs/design/adr-log.md` where ADR-018+ actually live, *not* `04-architecture.md`, which stops at ADR-017 despite CLAUDE.md's index pointing there. Confirm at the gate that its Consequences and Invalidating condition still match what shipped
- [ ] **`preprod` and `main` protected — required checks, no required PR** — and **only after** the `dev → preprod` promotion has landed. That promotion is 112 commits on the `git read-tree --reset -u dev` mechanic and has not run since Epic 1; a PR merge there has no true fast-forward and would mint a different SHA, destroying `git rev-parse main preprod` (decision 9)
- [ ] **Wall-clock measured and recorded**, both ends, on a quiet machine with no second agent: Tier 1 on a real story-sized change, and the CI PR path end to end. Against the spec's ~30-minute baseline. **This number is what the story is judged on**
- [ ] Epic map, amending existing lines rather than duplicating them:
  - the **P8 duplication** line gains this story's economics (CI already runs the ITs, so the `api` project's cost moved from the founder's evening to minutes) and its **trigger re-words** to *the first time the Playwright job's minutes become a line item you notice*
  - the **concurrent-test-run isolation** line records that its cheapest-interim half landed at CLAUDE.md:81 and the mechanism half is still open
  - a **new line** for `@Tag("migration")`, cut from this story, with its trigger
  - a **new line** for **no cleanup between ITs**, carrying the evidence: `f87573d` fixed the fixture, nothing truncates between the 108 classes, and the next order-dependent flake is not prevented
  - a **new line** for the **22 source-text Jest suites** and the change-detection blind spot they create
  - a **new line** for the **doc drift**: CLAUDE.md's index points at `04-architecture.md` for ADRs; 018+ live in `adr-log.md`, whose own footer still claims to be assembled rather than authored
- [ ] BUILD_STATUS: the H2 row flips in the last commit on the feature branch
- [ ] Propose the promotion; never execute it
