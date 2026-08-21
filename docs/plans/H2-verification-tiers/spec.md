# H2 — Verification tiers: the gate leaves the foreground

**Status:** needs-triage — the spec is written; the owner reviews before any ticket flips `ready-for-agent`.
**Raised:** 2026-08-21 (founder) — *"every feature takes too much time on test suites, especially running those suites that are not even affected or touched by the feature… we can actually say full regression now"*, the same day the S4.10 review pass parked the duplication finding underneath it.
**ADR:** ADR-031 (minted with this spec) — what counts as *verified*, and which rung answers for it.
**Candidate-capability note:** none — this story ships no traveler-facing act; verification tooling is not a capability surface.

## Problem Statement

A full local pass costs **~30 minutes**, measured on this workstation on 2026-08-21 against `feature/S4.10-in-trip-chat` at `5d3d69b`:

| Rung | Measured |
|---|---|
| Backend ITs — 108 classes, 882 tests | **13 m 56 s** |
| `npm run smoke` — 605 tests, both Playwright projects | **9 m 30 s** (WS-1's record; H1 measured 8 m 12 s) |
| Playwright `api` alone — 307 tests | 2 m 26 s |
| Jest — 119 suites, 4,206 tests | 51 s |
| `tsc --noEmit` | 47 s |
| Preview container rebuild | 4–6 min |

The standing rule already forbids paying this per edit — CLAUDE.md's *"scale the run to the stage of the work"* and the `implement` skill's *"single test files regularly, the full suite once at the end."* The rule is not the problem. **Four things make it impractical to obey, and each is independently fixable.**

**1 · More than half the local cost is already bought.** `.github/workflows/ci.yml` fires on `push:` — **every branch, no filter** — and is on the pushed feature branch today. Its three jobs run `mvn -B verify` (Surefire *and* Failsafe: the whole 882-test IT suite, on Docker, with no Ryuk workaround and no Windows named-pipe wedge), `npm run typecheck` + `npm test`, and `docker compose up --build` from a clean checkout. Against the standing habit of pushing the feature branch after every commit, the local backend-plus-Jest-plus-typecheck run — **15 m 34 s of the 30** — is a second payment for an answer already in hand. It persisted invisibly because **`gh` is not installed**, so CI's answer cannot be read from the terminal: the duplication was never a decision, only an unreadable receipt.

**2 · The backend has no cheap scope written down anywhere.** Jest ships `--changedSince`; Playwright takes a file path; Maven takes `-Dit.test=`. Every recorded invocation across `docs/plans/` is the unscoped one. The package tree already draws the boundary — S4.10 can break **8 of 108** IT classes (`com.largata.chat`, `com.largata.ws`) — and nobody has written it as a command. When the only written command is the whole suite, the whole suite is what runs.

**3 · The gate can go green without running, and it did, twice, today.** A full backend run finished `Tests run: 867, Failures: 0, Errors: 794` under **`BUILD SUCCESS`** — the singleton Postgres timed out at startup and 794 tests died on `NoClassDefFoundError` while Maven exited zero. The clean re-run then reported one genuine error under `BUILD SUCCESS` as well. Failsafe's `integration-test` goal **never fails a build by design**; `failsafe:verify` — the goal that reads the summary and does — has never been in this repo's command. CLAUDE.md carries this as *"read the counts, never the exit code"*, which is a documented workaround standing where a one-word fix exists. This is the indistinguishable-outcomes trap for the fifth time, and the first time it has fired inside a session convened to look at it.

**4 · Even a scoped run is dominated by fixed cost.** Two chat IT classes — 19 tests — took **3 m 20 s**, while the same two classes account for **38 s** inside the full run. The rest is `test-compile`, a Postgres container starting, Spring contexts booting, and a **30-second tail** where Surefire waits on a JVM that has already called `System.exit(0)` while Testcontainers' shutdown hooks stop the containers Ryuk is not there to reap. Eleven ITs stand up their *own* container and replay Flyway from V1 — `HealthUnavailableIT` alone is 103 s for four tests. And `tsc` has no incremental cache, so it pays 47 s every time.

Two further findings sit underneath and are **deliberately not this story's work** (see Out of Scope): the Playwright `api` project duplicating the backend ITs concern-for-concern (P8, parked at the S4.10 review with its own trigger), and the absence of any cleanup between ITs — the clean run's single error was `InviteByHandleIT` failing on `duplicate key (lower(handle))=(aa)`, a test that cannot fail alone and only fails after something earlier in the run claimed the handle.

## Solution

Three named tiers, and the equipment to obey them. **No test is deleted, no coverage is removed, and nothing moves into CI that is not already there.** The story is about *where the cost is paid*, not about paying less of it.

- **Tier 1 — iterating. Local, scoped, under two minutes.** Incremental `tsc`, `jest --changedSince`, the story's own IT classes named by package pattern, the story's own Playwright specs by path.
- **Tier 2 — every push. CI, unattended, already running.** The full backend ITs, the full Jest suite, the typecheck, the composed stack. Nothing to build except the ability to **read the result** — which is ticket 01, and which everything else rests on.
- **Tier 3 — end of day, and before any promotion. Local.** Only the rungs CI cannot reach: both Playwright projects against a live stack with pool credentials, the preview container, and the device walk when a story owes one. **~10 minutes, not 30**, because the backend suite is not in it.

The pre-promotion gate is unchanged in substance: the whole stack is still proven once before `feature → dev`. What changes is that most of it was proven on every push already, and the promoter reads that rather than re-running it.

## User Stories

1. As the founder, I want a story's iterate loop to cost under two minutes, so that I stop abandoning verification for time — the same failure mode H1 was fired to fix on the web rung.
2. As the founder, I want CI's result readable from the terminal, so that "the backend suite is green" is a **check** rather than a belief; without it, Tier 2 is the indistinguishable-outcomes trap wearing a green tick.
3. As the verifying agent, I want the backend IT suite scopable by a written command, so that a chat change runs 8 classes rather than 108 and I do not have to re-derive the mapping from the package tree every time.
4. As the verifying agent, I want a red integration run to produce a **red exit code**, so that a hung container, a saturated Docker daemon or a genuine failure cannot be reported as success — and so that the counts-not-exit-code rule can retire rather than be repeated.
5. As the founder, I want the end-of-day sweep to be one command covering exactly what CI cannot, so that the sweep is a habit rather than a decision.
6. As the verifying agent, I want the eleven own-container migration ITs excluded from the iterate loop and kept in the gate, so that the slowest and least-feature-relevant classes stop taxing every scoped run.
7. As the verifying agent, I want `tsc` to keep an incremental cache, so that the typecheck I am told to run "regularly" costs seconds rather than 47 of them.
8. As the verifying agent, I want to know whether `LARGATA_LANE=metro` actually works, so that the iterate loop stops paying a 4–6 minute preview-container rebuild to look at a change Metro is already serving live.
9. As a future story's author, I want the tiers stated where I will read them — CLAUDE.md and the `implement` skill — so that the next session inherits the cadence rather than rediscovering the cost.
10. As the owner, I want the pre-promotion gate explicitly unchanged, so that a faster iterate loop is not quietly traded for a weaker gate: a squash-merge is still where everything must have been seen together.
11. As the verifying agent, I want the scope map to name what it does **not** cover — shared helpers, design tokens, repository methods, deleted exports — so that scoping stays safe for feature-local work and never silently narrows a cross-cutting change.
12. As the founder, I want the new wall-clock measured and recorded against the 30-minute baseline, so that this story is judged on the number it exists to move rather than on the plausibility of its plan.
13. As the verifying agent, I want the `-Dit.test` package-pattern syntax proven on this project before it is written into CLAUDE.md, so that the repo does not gain a recommended command nobody has run.
14. As the owner, I want ADR-031 on the record, so that "CI answers for the backend suite" is a decision with rationale and a named failure mode, not a habit that formed because someone stopped running it locally.

## Implementation Decisions

1. **Ticket 01 is CI readability, and it blocks everything else.** Until CI's answer can be read, Tier 2 is faith. Preferred mechanism is `gh` on the PATH (`gh run list --branch <b>`, `gh run watch`); the acceptable alternative is GitHub's own workflow-failure email or a repo notification the founder actually reads. The choice is the ticket's to make; the requirement is that a **failed CI run produces a signal without anyone going looking for it.**
2. **`failsafe:verify` joins the command everywhere it is written.** `mvn -o test-compile failsafe:integration-test failsafe:verify`. The counts-not-exit-code gotcha in CLAUDE.md is **rewritten rather than deleted** — it keeps the history of why it existed, and gains the fix, because the trap is real for anyone who runs the bare goal. The story must demonstrate the red direction, not assume it (see Testing Decisions).
3. **The scope map is a table in CLAUDE.md, one row per backend module**, mapping package to `-Dit.test='com.largata.<module>.**.*IT'`. It rots only when a module is added, which is rare and visible. Counts recorded beside each row so the reader can see what a scope is worth: `itinerary` 49 · `identity` 15 · `membership` 10 · `workspace` 7 · `ws` 6 · `invitation` 6 · `common` 5 · `poll` 3 · `chat` 2 · `verification` 2 · `health` 2 · `media` 1.
4. **The map carries its own limit.** `common` (5) is cross-cutting — the error envelope, the unauthenticated contract, CORS posture — so it rides along with anything touching the web layer. And CLAUDE.md's existing shared-code exception is restated on the map itself: a change to a shared helper, a design token, a repository method, or any deleted export earns the broad sweep regardless of which package it sits in.
5. **The eleven own-container ITs get `@Tag("migration")`** and are excluded from Tier 1 via `-DexcludedGroups=migration`. They stay in Tier 2 and the gate unconditionally. They are named rather than pattern-matched, because "starts its own container" is not derivable from a class name: `HealthUnavailableIT`, `FounderVanityGrantIT`, `VanityBackfillIT`, `DestinationAndCurrencyBackfillIT`, `DiaryPublicBackfillIT`, `ItineraryAxesBackfillIT`, `ItineraryLifecycleRenameIT`, `ItineraryPublishedAtBackfillIT`, `ItineraryThreeStateRemapIT`, `WorkspaceBackfillIT`, `WorkspaceStateBackfillIT`.
6. **`"incremental": true` in `mobile/tsconfig.json`**, with `*.tsbuildinfo` gitignored. Cheapest item in the story and the one the iterate loop touches most often.
7. **The Metro lane is answered, not assumed.** One clean run on an idle machine decides it. If it works, it is written into the loop; if it needs a bundle warm-up or a longer `navigationTimeout`, that lands here; if it does not work, the finding is recorded and the lane is either fixed or removed rather than left as a documented option nobody can use. A documented lane that fails is worse than none — it is the third time this repo has carried an unusable recommendation (`$TMPDIR`, the hardcoded Maven path, the JDK path).
8. **The end-of-day sweep is one script**, and it covers exactly Tier 3: both Playwright projects against the live stack, having rebuilt the preview container, with the summary readable at a glance. It does **not** run the backend ITs, Jest or the typecheck — CI owns those, and duplicating them here would rebuild the problem the story is closing.
9. **Playwright stays local — founder call, 2026-08-21.** Moving it to CI would need the pool password and email base in GitHub secrets and would put CI runs in contention with local runs for the same `t1`–`t5` accounts. Recorded as a decision with its cost, not left implied. The backlog keeps the option with a trigger.
10. **One suite at a time per stack** is stated as a rule in CLAUDE.md, discharging the cheapest-interim half of the concurrent-test-run line parked at the S4.10 review. It is the same shape as the existing *"one Maven run at a time, per module"*, and it is a rule rather than a mechanism deliberately — the real isolation answers (per-run traveler namespace, per-run database, a lock file) are that line's work, not this story's.
11. **The tiers are written in two places and only two:** CLAUDE.md's verification section (the durable rule) and the `implement` skill (the place an agent reads at the moment it matters). Story-gate tickets keep citing the gate, not the tiers, so the gate stays the single source of what a promotion owes.

## Testing Decisions

- **This story changes how things are proven, so its own proof is that each mechanism has a demonstrated failure mode.** Every item below is red-capable or it does not land.
- **`failsafe:verify` is demonstrated in the red direction.** Sabotage one assertion in one IT, run the scoped command, and record a **non-zero exit**. Restore, re-run, record zero. A verify goal nobody has watched fail is exactly the check this repo keeps being burned by. Note the S4.13 trap applies: `test-compile` must be in the goal list or the sabotage runs against the last build.
- **The `-Dit.test` pattern is proven before it is documented.** Run `-Dit.test='com.largata.chat.**.*IT,com.largata.ws.**.*IT'` and confirm it selects **exactly 8 classes** — and confirm the negative direction too, that a pattern matching nothing fails rather than passing vacuously.
- **`@Tag("migration")` exclusion is proven both ways:** the scoped run's class count drops by the expected eleven, and an unexcluded run still contains them. A tag that silently matches nothing would quietly delete coverage from the gate.
- **CI readability is proven by a red run.** Push a knowingly-failing commit to a throwaway branch and confirm the signal arrives without anyone going looking. A notification path nobody has seen fire is not a notification path.
- **Wall-clock is measured and recorded at close** — Tier 1 on a real story-sized change, Tier 3 whole — against the 30-minute baseline in the Problem Statement. That number is what the story is judged on.
- **No product assertion changes.** If any of this surfaces a product defect, it becomes an epic-map line or its own story; changing the harness and the app together destroys the ability to tell which one broke.

## Out of Scope

- **Trimming the Playwright `api` project's duplication with the backend ITs.** Parked at the S4.10 review pass (2026-08-21) with the P8 analysis, both candidate shapes, and its own trigger — *the next promotion gate, or the first time the full pass exceeds an hour*. It touches every surface and revisits H1's recorded founder reversal (ADR-026). H2 sharpens the economics on that line — CI already runs the ITs, so the duplication is paid twice on the machine and a third time in CI — but does not resolve it.
- **Moving the Playwright suite into CI.** Founder call, 2026-08-21: local, end of day. Kept on the backlog with a trigger.
- **Concurrency isolation between parallel agents.** Its own parked line. H2 states the one-suite-at-a-time rule and nothing more.
- **Cleanup between ITs.** The `InviteByHandleIT` handle collision is a real order-dependent flake and it is a fixture problem, not a cadence problem. Epic-map line, with the run's evidence attached.
- **Reducing test volume.** There is more test code than product code — 55,178 lines against 47,540, with the backend at 1.87 : 1 against a stated *MVP grade* dial. That is a conversation about the dial, not a tooling change, and it is not decidable inside a story about cadence.
- **ESLint for `mobile/`.** Separate parked line from the same review pass.
- **Any product code change**, and any change to what the suites assert.
- **Failsafe parallelism.** H1 measured this box's ceiling on the web rung (2 workers; 5 was *slower* and produced starvation failures on 4 cores). The backend would hit the same wall against the same Docker daemon. Not attempted.

## Further Notes

- The measured inventory behind the Problem Statement — per-suite timings, the 108-class breakdown, the source-text-test finding, and the three-tier proposal — is the working document this story came from; its numbers are reproduced above so the spec stands alone.
- **22 of 119 Jest suites assert on source text** via `readFileSync` + regex, which is the deliberate consequence of `jest.config.js`'s stated *"no component-snapshot theatre"*. It has an unpriced cost: `jest --findRelatedTests src/chat/*` returns 8 suites and **misses `chatTab.test.ts`**, the one written for that story. `--changedSince` catches it only while the test file is itself in the diff. This is why decision 6's loop uses `--changedSince` rather than `--findRelatedTests`, and why the trade-off belongs on the epic map rather than being quietly "fixed" here — removing those tests means admitting a rendering layer, which reopens a decision the config took on purpose.
- The 30-second Surefire shutdown tail is a consequence of `TESTCONTAINERS_RYUK_DISABLED=true`, which is itself the documented fix for the Windows hijacked-connection hang. It is named here so the next reader does not diagnose it as a leak; reducing it means revisiting the Ryuk decision, which is not this story's work.
- Numbers in the Problem Statement were taken while another agent was active on the same repo and the working tree moved mid-measurement (`dev` at `f816edf`, feature branch advanced to `a820aca`). The 13 m 56 s backend figure is from a clean run on a quiet machine after clearing thirteen stale Testcontainers; the 21 m 16 s figure it replaced was the run that reported `BUILD SUCCESS` having executed almost nothing.
