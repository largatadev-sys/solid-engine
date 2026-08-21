# H2 — Verification tiers: CI answers for the suites, the machine answers for the eye

**Status:** needs-triage — grilled 2026-08-21 (grill-with-docs, five rounds, 22 questions); the owner reviews before any ticket flips `ready-for-agent`.
**Raised:** 2026-08-21 (founder) — *"every feature takes too much time on test suites, especially running those suites that are not even affected or touched by the feature… we can actually say full regression now."*
**ADR:** ADR-031 — minted with this spec, in `docs/design/adr-log.md` (where ADR-018+ actually live; `04-architecture.md` stops at ADR-017 despite CLAUDE.md's index).
**Candidate-capability note:** none — this story ships no traveler-facing act; verification tooling is not a capability surface.

## Problem Statement

A full local pass costs **~30 minutes**, measured on this workstation against `feature/S4.10-in-trip-chat` at `5d3d69b`: backend ITs **13 m 56 s** (108 classes, 882 tests) · `npm run smoke` **9 m 30 s** (605 tests) · Jest **51 s** (4,206 tests) · `tsc --noEmit` **47 s** · preview container rebuild 4–6 min.

The standing rule already forbids paying that per edit. The rule is not the problem. **Four things made it impractical to obey, and the fourth is the one nobody had seen.**

**1 · The mechanism is one line.** `.claude/skills/implement/SKILL.md:11` says *"the full test suite once at the end"* — and `implement` is invoked **per ticket**, so a six-ticket story is six full passes. Then the founder's own verify-and-modify loop — eyeballing motion, fidelity, whether a component landed — has **no skill governing it at all**, so an agent falls back on the most conservative thing it knows.

**2 · CI was already doing the expensive half, faster, and nobody could read it.** `.github/workflows/ci.yml` fires on `push:` — **every branch, no filter** — running `mvn -B verify` (Surefire **and** Failsafe: 214 unit + 882 ITs), `npm run typecheck` + `npm test`, and `docker compose up --build`. **In 2 m 46 s**, five times faster than the same suite locally, on a *smaller* machine (`ubuntu-24.04` standard runner, no more cores than this box). The gap is not CPU — it is Docker Desktop's WSL2 boundary, the two Windows-only workarounds it forces (`TESTCONTAINERS_RYUK_DISABLED`, `DOCKER_CONFIG`), the 30-second shutdown tail Ryuk-disabled buys, and 15 Postgres containers paying a VM tax 15 times. Total CI cost: **~6 billed minutes per push** against a 2,000-minute allowance — roughly 330 pushes a month of headroom.

**3 · `mvn verify` already exits honestly, and the local command does not.** Failsafe's `integration-test` goal never fails a build by design; `failsafe:verify` — the goal that reads the summary and does — is in the lifecycle CI runs and absent from every invocation this repo has written down. Measured the same day: a local run reported `Tests run: 867, Failures: 0, Errors: 794` under **`BUILD SUCCESS`** after the singleton Postgres timed out.

**4 · `dev` had been red on every push since 05:41 that morning, and it took installing `gh` to find out.** One cause, thirteen times: `5d3d69b` gave `InviteByHandleIT` a `plantFounderHandle` that copied `ShortHandleSurvivesProfileSaveIT`'s generator verbatim — same alphabet, same static counter, both starting at `aa` — against a shared database no IT cleans up. **The order-dependence is why it read as nonsense**: the same collision killed `InviteByHandleIT` locally and `ShortHandleSurvivesProfileSaveIT` in CI, so the failing test named the loser, never the cause. Fixed off-epic (`f87573d`, PR #1) before this spec was written. *A prior agent memory asserting "`gh` is deliberately absent — do not treat an unread Actions tab as a blocker" is plausibly why nobody looked; it has been corrected.*

## Solution

Three tiers, and the equipment to obey them. **No test is deleted and no coverage is removed** — the story is about where the cost is paid and what enforces it.

- **Tier 1 — iterating. Local, scoped, seconds.** Incremental `tsc`, `jest --changedSince`, look at the change on Metro. No suite runs.
- **Tier 2 — every push. CI, unattended, already running.** Backend ITs, Jest, typecheck, composed stack. Split into path-filtered workflows behind an always-runs aggregator.
- **Tier 3 — the merge gate.** A PR to `dev`, **blocked until the aggregator is green**, with the Playwright suite moved into CI as one of its checks. What stays on the founder's machine is the part only a human does: the device walk, motion fidelity, the real-photo class of defect.

The pre-promotion gate is not weakened — it is enforced for the first time. `dev` gains branch protection; `preprod` and `main` gain required checks **without** required PRs, because GitHub's PR merge has no true fast-forward and requiring one would mint a different SHA, destroying the `git rev-parse main preprod` property the pipeline exists for.

## User Stories

1. As the founder, I want the verify-and-modify loop to run no suites at all, so that changing a bubble's animation costs seconds — that loop is where the complaint came from and no skill governs it today.
2. As the founder, I want a red CI run to be **impossible to miss at the moment it matters**, so that `dev` cannot sit red for thirteen pushes again.
3. As the owner, I want CI green to be a **precondition GitHub enforces**, not a habit — today's evidence is unkind to habits.
4. As the verifying agent, I want `implement` to name CI as the owner of the full suite, so that the next agent does not reinvent the local run out of caution; silence reads as *be thorough*.
5. As the founder, I want the Playwright suite to run in CI on a PR to `dev`, so that nothing automated runs on my machine and my own time goes to what a machine cannot do.
6. As the verifying agent, I want the Playwright job to build the **preview container** rather than a dev server, so that the rung proves the artifact that ships — the reason the container exists at all (S0.5's `Cache-Control` bug).
7. As the owner, I want `preprod` and `main` protected **without** required PRs, so that the fast-forward promotion survives.
8. As the verifying agent, I want a tight local backend loop available for debugging (`-Dit.test=`), documented as a convenience rather than a per-story ritual, since CI answers all 882 in under three minutes.
9. As the verifying agent, I want `tsc` incremental, because it is the command the iterate loop runs most and it currently costs 47 seconds every time.
10. As the owner, I want the Metro lane **verified or removed**, because an unverified documented option is an active trap and this repo has three precedents of exactly that.
11. As the owner, I want CLAUDE.md's contradicting lines **amended rather than accompanied**, so that two rules are never in force at once.
12. As the owner, I want ADR-031 on the record, so that "nobody runs the backend suite locally" is a decision with a named failure mode rather than a habit that formed by neglect.

## Implementation Decisions

*Numbered as settled at the grilling; the round is noted where it helps.*

1. **Playwright moves to CI** (R2 Q1). No data contention: the job brings up its own compose stack, so specs seed into a database nobody else sees. What is shared is only the Firebase pool accounts, and the specs merely sign in — `profileFor()` PATCHes `/v1/me`, which writes to the job's own database. **t1–t5 are sufficient; verifying t6–t10 is unnecessary.** This holds only while CI points at its own stack; pointing it at deployed dev inverts every line of it.
2. **Trigger: `pull_request` targeting `dev`, plus `workflow_dispatch`** (R2 Q7). Not every push — that multiplies minutes for no extra signal. Not nightly — an unattended red at 3am that nobody triages is the "suite that can lie" problem restated.
3. **The preview container is built in-job** (R2 Q10), never a dev server. `expo export` + a static server hid a real `Cache-Control` bug at S0.5; a CI web run that skips the true build path proves something else.
4. **Secrets** (R2 Q6): `LARGATA_TEST_POOL_PASSWORD`, `LARGATA_TEST_POOL_EMAIL_BASE`, and the five `EXPO_PUBLIC_*` build args, set via `gh secret set` from the gitignored `mobile/.env` without printing. They never enter a file or a commit — the workflow references names, never values. **Consequence to carry: a workflow file can now read them, so workflow edits become sensitive.**
5. **`workers=2`, `retries=1` in CI** (R2 Q13), via the existing `LARGATA_WORKERS` / `LARGATA_RETRIES` env knobs — no config change. H1 measured 2 as this box's ceiling at 4 cores with starvation above it; these specs are I/O-bound, so 2 should hold at 2. **This is a guess and the first run is the measurement** — record it the way H1 did.
6. **Playwright is a required check** (R3 Q12), not advisory. Advisory is discipline wearing a badge. The 15–25 minute wait lands where a human already pauses, since promotions are propose-first.
7. **Path-filtered workflows behind an always-runs aggregator** (founder, pre-grilling). Three files, each with its own `paths:`, plus one `ci` job that always runs, depends on the others, and passes only if none **failed or was cancelled** — a `skipped` path-filtered job must count as pass. Without the aggregator a required check that never ran reads as *pending forever* and blocks the PR.
8. **`stack` survives alongside Playwright's compose** (R4 Q19). 90 seconds on every push buys the bisect you otherwise do by hand — the same localisation argument that makes per-push worth it at all.
9. **Protection differs by rung** (R2 Q11, R3 Q14, R5 Q22). `dev`: required checks **plus** required PR, administrators **included** — an exemption recreates the gap being closed. `preprod`/`main`: required checks **only**. Sequencing: protect `dev` first and **leave the upper two until after the `dev → preprod` promotion**, which is 112 commits, uses the `git read-tree --reset -u dev` mechanic, and has not run since Epic 1 — adding a new gate to a fragile rarely-exercised procedure on its first run in months invites a confusing failure at the worst moment.
10. **Direct commits to `dev` end** (R3 Q14). CLAUDE.md:39 already forbids them (*"which this workflow doesn't allow"*) and the five `dev` commits before PR #1 were all direct pushes. Protection enforces the existing rule rather than inventing one. **Turn it on at a quiet moment and tell the other agent** — switching it on mid-session breaks them with a confusing rejection.
11. **`implement` line 11 becomes "the ticket's own tests; the full suite is CI's, on push"** (R1 Q4). Naming CI explicitly is what stops the next agent reinventing the local run. **Lands in both `.claude/skills/` and `.agents/skills/`** — they are byte-identical mirrors, both tracked, and editing one silently diverges them.
12. **The scope map is one line by example** (R1 Q5), not a twelve-row table: `-Dit.test='com.largata.<module>.**.*IT'`, framed for a tight local debugging loop. **The `**` wildcard form is unverified** — comma-separated fully-qualified names are proven (22 ITs, one run); verify the wildcard before writing it down, and confirm a pattern matching nothing *fails* rather than passing vacuously.
13. **The Metro lane is verified once, then kept or removed** (R4 Q17). One clean run on an idle machine. Not an optimisation — removing a trap; the only prior attempt failed 7/7 under CPU contention, which is not a verdict.
14. **CLAUDE.md's conflicts are amended, never accompanied** (R4 Q18). Line **103** — *"Before proposing a promotion — the whole stack, once…"* — is rewritten in place to demand **CI green on the branch's HEAD, read not re-run, plus the device walk**; deleting it leaves a hole the next agent fills with caution. The **two** copies of *"read the counts, never the exit code"* are **narrowed** to the bare `failsafe:integration-test` goal, since `mvn verify` has always been honest. *"One test suite at a time, per stack"* is **already at line 81** — do not add it again.
15. **A red reaches the founder through the GitHub Actions VS Code extension** (R4 Q20). **Email is explicitly not a signal — the founder does not read it.** Nothing custom is built: protection is the real answer, because a red then blocks the merge button. Pre-PR feature-branch reds are informational and passive visibility is proportionate.
16. **`tsc` incremental stays** (R5 Q21) — `"incremental": true` plus `*.tsbuildinfo` gitignored. Unlike the migration tags, its justification did not move: CI running the typecheck does not make the local one cheaper.

## Testing Decisions

- **Every mechanism here is proven in the direction that matters — the red one.** A gate nobody has watched fail is the trap this story exists to remove.
- **Branch protection is proven by a refusal:** push a knowingly-red commit and confirm the merge is blocked, then confirm a green one is not.
- **The aggregator is proven against a skip:** a mobile-only PR must leave the backend job skipped and still merge. That is the pending-forever trap, and it is the aggregator's whole reason to exist.
- **The `-Dit.test` wildcard is proven both ways** before it is documented: it selects exactly the expected classes (read the `Running com.…` lines, not the summary), and a pattern matching nothing fails rather than passing.
- **Playwright-in-CI is proven by a deliberate red** — one sabotaged assertion must block a PR — and its wall-clock and worker count are **measured and recorded**, not asserted.
- **Wall-clock recorded at close** against the ~30-minute baseline above: Tier 1 on a real story-sized change, and the CI PR path end to end.
- **No product assertion changes.** If any of this surfaces a product defect it becomes an epic-map line or its own story.

## Out of Scope

- **Trimming the Playwright `api` project's duplication with the backend ITs** — the P8 line parked at the S4.10 review. Moving to CI *changes the argument*: it stops costing the founder's evening and starts costing minutes, which **weakens** the urgency. Trigger re-worded (R2 Q9) from *"the first full pass over an hour"* to **the first time the Playwright job's minutes become a line item you notice** — wall-clock stops being the threshold once nobody is waiting.
- **`@Tag("migration")` on the eleven own-container ITs** — **cut from this story** (R3 Q16). It was justified by making a local scoped run cheap, and that loop is no longer routine; in CI those classes are cheap. Parked with a trigger: *if the tight local backend loop becomes a habit and the migration ITs are the tax you notice.*
- **Cleanup between ITs.** The handle collision was fixed at the fixture, but nothing truncates between the 108 classes and the next order-dependent flake is not prevented. Epic-map line.
- **Reducing test volume.** 55,178 lines of test against 47,540 of source, with the backend at 1.87 : 1 against a stated *MVP grade* dial. Investigated at the grilling and found **mostly structural, not bloat**: 63 of 108 ITs are storage/domain and the product's core value is fences, which are facts about relationships between rows and have no honest cheaper layer. The ~10% that could move down are caps and boundaries living in service methods rather than value types — a design observation, done when the file is already open.
- **The 22 source-text Jest suites** (`readFileSync` + regex) — the deliberate consequence of `jest.config.js`'s *"no component-snapshot theatre"*. Their unpriced cost is that `--findRelatedTests src/chat/*` returns 8 suites and **misses `chatTab.test.ts`**, which is why decision 12's loop uses `--changedSince`. Removing them means admitting a rendering layer — a decision, not a cleanup. Epic-map line.
- **Failsafe parallelism**, **moving the seeders**, **pool expansion**, and **any product code change.**

## Further Notes

- **A doc-drift finding, not fixed here:** CLAUDE.md's context index points at `docs/design/04-architecture.md` for ADRs, but that file stops at **ADR-017** and every ADR from 018 lives in `docs/design/adr-log.md` — whose own footer still claims *"Nothing here is authored — it is assembled"* from Artifacts 04/05. Two statements that are no longer true. ADR-031 goes where the others actually are.
- The device rung is untouched. The emulator walk and the founder's release-signed sideload pass remain exactly as they are; this story only stops asking the founder's machine to run things a runner already ran.
- Numbers were taken while another agent worked the same checkout and the tree moved mid-measurement. The 13 m 56 s backend figure is from a clean run after clearing thirteen stale Testcontainers; the 21 m 16 s it replaced is the run that reported `BUILD SUCCESS` having executed almost nothing.

## Comments

**2026-08-21 — the first draft of this spec was wrong in its centrepiece, and the corrections are the story's best evidence for its own thesis.** Recorded rather than quietly overwritten, per the tracker's rule that intent changes are noted rather than erased. The draft was written from analysis alone; the grilling and the facts it forced corrected it four times:

1. **The backend scope map was the centrepiece.** It assumed a local `-Dit.test=` map would take a ~14-minute check to ~5. Then CI turned out to run all 882 in **2 m 46 s** — so the map demoted to a one-line debugging convenience (decision 12) and the story's centre moved to enforcement.
2. **It proposed adding `failsafe:verify` as a fix.** `mvn verify` — what CI runs — has always included it. The real defect was narrower: the *locally documented* command omits it. The gotchas get narrowed, not rewritten wholesale (decision 14).
3. **It assumed CI would be slower than local, and estimated 35–40 billed minutes a push.** Both wrong: CI is **5× faster** on a runner with no more cores, and costs **~6 minutes** — off by a factor of six. The whole cost argument inverted.
4. **It parked the "no cleanup between ITs" finding as low-priority.** That finding was the live defect breaking `dev` on every push, discovered only once `gh` was installed. Fixed off-epic at `f87573d`.

The draft also proposed `@Tag("migration")`, cut here (R3 Q16) once its justification moved. **The pattern across all five: every error was a confident claim about a system nobody had measured** — which is the same failure the tiers are designed to stop making about test results.
