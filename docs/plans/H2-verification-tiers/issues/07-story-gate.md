# 07 — The story gate

**What to build:** Nothing new — the closing pass. The decision goes on the record, the upper rungs get protected now that the promotion has cleared, and the number this story exists to move is measured.

**Blocked by:** 01, 02, 03, 04, 05, 06.

**Status:** ready-for-agent

- [x] **ADR-031** minted with the spec (H1's precedent — the ADR lands with the spec, not at the gate), in `docs/design/adr-log.md` where ADR-018+ actually live, *not* `04-architecture.md`, which stops at ADR-017 despite CLAUDE.md's index pointing there. Confirm at the gate that its Consequences and Invalidating condition still match what shipped
- [ ] **DEFERRED OUT OF H2 — do not do this** *(founder, 2026-08-22: "we are not promoting to preprod and main yet")*. **`preprod` and `main` protected — required checks, no required PR.** This is not queued work waiting for a slot; it is parked until a `dev → preprod` promotion is actually on the table, and that decision is the founder's alone. H2 closes with `dev` protected and the upper two rungs untouched, which is a coherent end state: `dev` is where every branch merges and therefore where the gate earns its keep. **When it does happen, the constraint below is the one that matters** — and **only after** the `dev → preprod` promotion has landed. That promotion is 112 commits on the `git read-tree --reset -u dev` mechanic and has not run since Epic 1; a PR merge there has no true fast-forward and would mint a different SHA, destroying `git rev-parse main preprod` (decision 9)
- [x] **Wall-clock measured on a quiet machine, both ends — the number this story is judged on.**

  | | Before H2 | After |
  |---|---|---|
  | **Iterating** (per change) | up to ~30 min if the full pass was run | **~21 s** — `tsc` warm 14.3s + `jest --changedSince=dev` 6.9s |
  | **Every push** | nothing readable | **~3 min in CI**, ~6 billed min, unattended |
  | **Merge gate** | ~30 min local, manual | **~9.5 min in CI**, blocking, unattended |
  | **On the founder's machine** | backend ITs 13m56s · Jest 51s · tsc 47s · smoke 9m30s · preview rebuild 4–6 min | **nothing automated** |

  **The honest framing: the 30 minutes did not get faster, it moved.** Every suite still runs, in full, on every push — the machine running them changed, and CI does it ~5× faster than this box. What the founder actually gets back is the *foreground*: the loop is 21 seconds, and the remaining local work is the device walk and their own eye, which no runner does.

  **One caveat that keeps the number honest:** Tier 1's 21s is for a mobile-only change. A backend change adds a scoped `-Dit.test=` run — measured at **3m20s for two IT classes**, most of it fixed startup — which is why the scope map is documented as a debugging convenience rather than a routine step.
- [x] Epic map, amended rather than duplicated — the P8 trigger re-worded, the concurrency line's discharged half recorded, and four new lines under a dated `### H2 verification tiers 2026-08-22` block:
  - the **P8 duplication** line gains this story's economics (CI already runs the ITs, so the `api` project's cost moved from the founder's evening to minutes) and its **trigger re-words** to *the first time the Playwright job's minutes become a line item you notice*
  - the **concurrent-test-run isolation** line records that its cheapest-interim half landed at CLAUDE.md:81 and the mechanism half is still open
  - a **new line** for `@Tag("migration")`, cut from this story, with its trigger
  - a **new line** for **no cleanup between ITs**, carrying the evidence: `f87573d` fixed the fixture, nothing truncates between the 108 classes, and the next order-dependent flake is not prevented
  - a **new line** for the **22 source-text Jest suites** and the change-detection blind spot they create
  - a **new line** for the **doc drift**: CLAUDE.md's index points at `04-architecture.md` for ADRs; 018+ live in `adr-log.md`, whose own footer still claims to be assembled rather than authored
- [x] BUILD_STATUS: the H2 row flipped on the feature branch, before the merge proposal
- [ ] **Propose the `feature → dev` merge only** (PR #5). **No promotion beyond `dev` is proposed by this story** — the founder ruled on 2026-08-22 that `preprod` and `main` are not in play, so H2 ends at `dev`. Never execute any merge unasked
