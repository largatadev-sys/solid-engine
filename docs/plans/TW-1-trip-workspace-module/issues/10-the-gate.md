# 10: The gate

**What to build:** the story proven the way a move is proven — by what did not move. The trip guard takes its final form: an allowlist whose front door is the api and the refusals, the legacy exemption as its one named consumer, a slice list asserted to name real packages, the sabotage checks its siblings carry, and the meta-test from the boundaries story green with the trip module classified as under the rule. The assertion-diff script's output is the headline: across roughly sixty-five test files that took package, import and renamed-symbol edits, the number of pre-existing assertions that changed is stated, and it must be **zero**. The full suite runs in CI with its counts read from the log rather than the exit code, and Hibernate's schema validation at the first context boot is cited as the proof that no table moved.

What no test reaches is closed by hand on the LAN rung, with the first pool traveler as owner and the second as member: the same workspace walk the grammar story closed — create, plan, hold an editing session from two phones, save, archive, unarchive — read against a backend whose log lines now come from the trip module. The record closes: the module-conventions decision's consequences line notes the trip module converged; the epic map's line records built, with anything the build changed against the spec; the design record's status line closes; anything surfaced that outlives the story is a backlog line in the epic map; the tracker row goes done with status and spec link only, in the last commit on the branch. The pull request is opened as the proposal and never merged unasked.

**Blocked by:** 09 (The rename).

**Status:** ready-for-agent

- [ ] The trip guard is in its final form with the legacy exemption as its only named consumer, and the meta-test passes with the trip module under the rule and the old package alone on the dismantled list
- [ ] The assertion-diff script's output is in the pull request, with the count of pre-existing assertions changed stated as zero, and the backend unit and integration counts read from the CI log
- [ ] Hibernate's schema validation passed at the first boot and is cited; no migration shipped, no path changed, no client file changed — checked, not assumed
- [ ] The LAN walk is recorded with which tag played which role, and the backend log lines it produced name the trip module
- [ ] The epic map's line records built with every divergence from the spec; the design record's status line is closed; the tracker row carries status and spec link only, in the last commit
- [ ] The pull request is open against the shared branch with no agent attribution in its body, and has not been merged

## Comments

**2026-09-08 — the gate.** The story proven by what did not move.

**The headline: `PRE-EXISTING ASSERTIONS CHANGED: 0`**, across **53** test files that took package, import and renamed-symbol edits. Run as `node backend/scripts/assertion-diff.js`. The number is only worth reading because the script was made to fail three ways it originally did not: it reads the **working tree** (the first version reported a clean zero against a tree holding a deliberately sabotaged assertion); it **normalises exactly the renames seams 1 permits** and nothing else, so an unlisted change is a real one; and it **follows a rename chain**, because a file both moved and renamed defeats git's similarity detector and was silently dropped from the comparison until `RENAMED_FILES` declared it. Each fix was proven by sabotage, not by reading.

**CI, read from the log rather than the conclusion: `Tests run: 1369, Failures: 0, Errors: 0, Skipped: 0`** on the integration suite, plus **432** unit tests locally (`mvn -o surefire:test`). Hibernate's `ddl-auto: validate` (`application.yml:15`) passed at every context boot in that run, which is the proof that no table moved — no migration shipped, V55 is still head.

**What CI caught that the local loop did not, twice, and both were real:**

1. `DiscoveryScopeIsDefinedOnceTest` reads `ItineraryRepository.java` **by path**, and only surefire runs it — every local run to that point had been `-Dit.test=…`, which is failsafe only. **The unit suite is now part of the loop**; eight tests in this tree read source files by path and none of them is an IT.
2. `PublicationContractIT` went `204 → 404`: the facade's `markUnpublished` was `UPDATE … WHERE id = ?`, a **no-op against a deleted trip**, and the repository translation `orElseThrow` was the obvious replacement and the wrong one — CM-1's canon is that the recorded owner hard-deletes an orphaned object. **When replacing raw SQL with a repository call, the question is what the statement did on the rows it did NOT match.**

**The final state.** `com.largata.trip` holds **138 files in thirteen packages** — `plan` 36 · `trip` 25 · `api` 15 · `editing` 15 · `ownership` 11 · `workspace` 10 · `validation` 7 · `dump` 5 · `fork` 4 · `history` 4 · `cover` 2 · `destruction` 2 · `exception` 2 — plus 48 test classes. The root slice is `trip`, matching the spec's slice list and its measured count of 25 exactly. The old package is down from **137 files to 42**, its content half, standing until CM-5. `com.largata.workspace` and `com.largata.membership` no longer exist.

**The guards, in final form.** `TripModuleBoundaryTest` — allowlist over `api..` + `exception..`, the legacy exemption naming `com.largata.itinerary..` alone and asserted to select >30 classes with CM-5 named, a slice list asserted to name real packages, the vacuity checks, and `noMigrationWindowSurvivesInEitherGuard` reading both guard files and failing on any window predicate. `TripRawSqlWaiverTest` — ADR-038's deferred source-text guard: raw SQL nowhere under `trip/` but the destruction service, and its foreign tables exactly the waivered five. `ModuleGuardMetaTest` green with `trip` under the rule and **`itinerary` alone on the dismantled list**. Every sabotage recorded in its ticket with the failure line read.

**What the code review changed, and it found a defect worth the whole exercise.** Archiving had moved to AFTER_COMMIT with the failure swallowed into a WARN, so an archive could commit while the voiding failed — an archived trip still holding PENDING invitations, which is the state user story 4 exists to prevent and the exact trade the spec **refused** for admission on the same reasoning. I shipped it disclosed but unargued. It is now `BEFORE_COMMIT` with `voidPendingInvitations` back on `MANDATORY`, so the cycle stays broken *and* the two writes are one act; `ArchiveVoidsInvitationsAtomicallyTest` pins both halves and is sabotage-checked. Also fixed: a duplicate import, the slice map omitting two live packages (the exact failure its own message describes), the destruction controller rejoining its service so the slice is a feature again, ten fields named `itineraries` on a `TripRepository`, and `TripPlan.withDays` replacing fourteen lines of field-copying.

**Divergences from the spec, each recorded in its ticket and none silent:** the root slice was built as `com.largata.trip.record` and **reverted to `trip` at the founder's ruling** — *"stick to the grammar"* — so this is no longer a divergence at all: the module matches the spec's slice list, `trip:25` against its measured 25 · `MembershipArrived` has two publishers, because the owner arrives through `formAround` and never passes through `admit` · postcard and publication took their `PlanApi` field at ticket 03 rather than 08, because the interface split is what made their calls stop typechecking · the regex guard gained a **counted content-half exemption** where the ticket expected none, because those reaches are the shape of the tree until CM-5 rather than migration state — first written as four types and **corrected to two on 2026-09-08**, when the founder asked why the other two had not simply moved and the answer was that they should have (ticket 07 carries the measurement) · tickets 06–08 landed in one commit because their moves interleave, while ticket 09's rename is isolated as its AC requires.

**Not closed: the LAN walk.** Ticket 10 asks for the CM-3 workspace walk re-run against a backend whose log lines come from `com.largata.trip`. It has not been run — it needs the local full stack and a founder decision about spending that time, and every automated rung this story owns is green. Recorded as owed rather than ticked.

**2026-09-08 — a second code review, against the founder's fourteen-line checklist, and what it caught.** Five real defects, four of them in code the earlier review had already passed over. Worth listing because three are the same shape: **a check that cannot fail.**

1. **An N+1 shipped inside a "nothing observable moved" branch.** `PlanReadService.daysOf` called `activitiesOf(day.id())` per day. The facade it replaced ran **two** queries — one joined activity fetch grouped in memory, one day fetch — so a 14-day trip went from 2 queries to 15. No test could see it: every assertion is about the plan's *content*, which was identical. Restored to the facade's shape with `ActivityRepository.allUnder` plus an in-memory `groupingBy`. **The lesson is the same one `markUnpublished` taught and I did not generalise: when replacing SQL with repositories, the query COUNT is part of what the statement did.**

2. **`\s` in a Java string literal is a space, not the whitespace class** (JLS 3.10.7, Java 15+). `TripRawSqlWaiverTest`'s table-scanning pattern compiled to `" +"` — literal spaces only — so **a statement wrapping after `FROM` escaped the scan the narrowed ADR-035 waiver rests on**. Verified by compiling the literal and reading the char code: 32. Now `\s+`, and sabotage-checked with a deliberately wrapped `DELETE FROM\n membership`, which the guard now catches.

3. **The assertion-diff script's `RENAMED_FILES` entry pointed at `trip/record/`** — a path ticket 09's own rename had made stale. The file it was written to protect was therefore counted as *new* and silently skipped, while the headline still read `0`. Fixed to `trip/trip/` and proven by sabotaging a `wireName()` assertion inside that file and watching it get reported.

4. **The script's base was a hardcoded branch SHA.** Right for exactly one branch, silently wrong on the next — the same failure mode it exists to prevent. Now derived: `merge-base` with `origin/dev`, overridable by argument or `ASSERTION_DIFF_BASE`, and it **throws** rather than guessing if no merge-base exists. Deriving it immediately exposed that local `dev` was two merged PRs stale, which is why `origin/dev` and not `dev`.

5. **A vacuous parse with a wrongly-named refusal.** `TripLifecycle.parse(trip.state().name()).orElseThrow(TripNotFoundException::new)` was meaningful in the facade, which parsed a **String** out of a `ResultSet`. After the move `trip.state()` already returns a `TripLifecycle`, so it round-trips an enum through its own name — an identity that cannot fail, guarding a refusal that named the wrong condition. Both sites now read `trip.state()`.

*Also applied:* `TripDestructionService` is package-private (only its own package names it); `MembershipEnded.itineraryId` and `TripTeaser.itineraryId` take the Trip noun, which ticket 09 had missed and which is safe because neither record reaches the wire.

*Recorded, not applied:* **ADR-038 rule 5 lists four exceptions to "no transaction writes across a module line", and archive→invitation is now a fifth** — the decision is argued in ticket 02 and above, but the ADR has not been amended, and rule 5 says the exceptions live there *"and nowhere else"*. That amendment is owed.

*A hazard worth naming for whoever runs the next review:* the spec reviewer read the tree **during a sabotage window** and reported the deliberately corrupted `ForeignWorkspaceRows` as blocking working-tree corruption. It was restored seconds later and `git status` was clean — but a review agent and a sabotage check must not share a tree, because the reviewer cannot tell a probe from a defect.

*Verified after all five:* unit suite **433/433**, trip + ws + join + invitation + publication ITs **505/505**, assertion-diff **0 across 53 files** against a derived base, guard sabotages red then green.

**2026-09-08 — the review's remainder, and an unused-import sweep.**

*Two fixes the earlier pass left undone.* `PlanRows.activityIdsUnder` and `WorkspaceRows.idOf` were `readOnly = true` with no propagation while every write sibling carried `MANDATORY` — so either would have silently opened its own transaction if ever called outside destruction's. Both are now `MANDATORY, readOnly = true`. (An earlier `sed` for this had not applied; the audit is what caught it, not memory.)

*And **ADR-038 rule 5 is amended**, which was the one thing recorded as owed.* Rule 5 says its exceptions live in the ADR *"and nowhere else"*, and archive→invitation had been argued only in the tickets. It is now the **fifth**, with the reasoning that matters: the reaction was first written AFTER_COMMIT with its failure logged, which is ADR-030's transport and which silently ended the act's atomicity — an archived trip still recruiting is the state user story 4 exists to prevent, and the same trade the rule already refused for admission. `BEFORE_COMMIT` + `MANDATORY` keeps the cycle broken and the act whole, and the propagation is what makes it hard to lose. Trigger: the FK-drop story, same as destruction.

*Unused imports, swept across all 802 Java files at the founder's ask:* **25 found, and zero introduced or orphaned by this branch** — every one predates the merge-base, checked by resolving each file through its rename chain and diffing the import line against the base. Fourteen are `java.util.List` in test classes, the rest scattered across `common`, `itinerary`, `chat` and `ws`. They are **left alone deliberately**: they are pre-existing dead lines in files this story only moved, and deleting them would add unrelated churn to a PR whose whole claim is that nothing observable moved. Worth a tidy-up commit of its own, or a backlog line — recorded here so the sweep does not have to be repeated to learn the same thing.

**2026-09-08 — the slices take layer folders, at the founder's push.** *"there are internal modules here that has a lot of classes. i understand that suffixes will suffice on the readability, but separation also contributes a lot so it is easy for me where to look at."*

This is **not a departure from ADR-038 — it is rule 2 at a third size.** The rule folds by layer while every layer folder stays scannable and folds into slices when one outgrows that; trip folded module→slices when the module outgrew scanning, and `plan` at 37 files had outgrown its own slice the same way. **101 files moved**, and the vocabulary is diary's exactly — `adapter · controller · dto · entity · exception · repository · service` — so `plan/service/` and `diary/service/` mean the same thing to a reader.

| slice | before | after |
|---|---|---|
| `plan` | 37 flat | adapter 1 · controller 3 · dto 8 · entity 6 · exception 7 · repository 2 · service 10 |
| `trip` | 26 flat | adapter 1 · controller 2 · dto 4 · entity 6 · exception 7 · repository 1 · service 5 |
| `editing` | 15 flat | adapter 1 · controller 1 · dto 3 · entity 4 · exception 2 · repository 1 · service 3 |
| `ownership` | 12 flat | controller 1 · dto 2 · entity 3 · exception 1 · repository 2 · service 3 |
| `workspace` | 11 flat | adapter 2 · entity 4 · repository 2 · service 3 |

The largest folder in the module is now **10**. **`api` stays flat at 15, deliberately** — it *is* the front door, and folding it would mean answering "which layer is the api?"; the other seven slices are already under the threshold.

**The cost is the documented one.** A layer split forces types public across layer lines — 06b §11 already records it: *"`@Service` classes are public today only because the layer split at CM-2 cost them their seal; the boundary guards are what replaced it."* Same trade here: ~50 members and a dozen types widened, with the ArchUnit allowlist still sealing the module from outside, which is what makes the widening affordable.

**A latent defect the flat packages had been hiding.** There are two `NotTripOwnerException` types — one in `trip/trip/exception`, one nested in `MembershipExceptions` — and the layer split turned that into a hard `reference to NotTripOwnerException is ambiguous`. The first code review flagged it as a Mysterious Name trap and it was right; resolved by import here, but **consolidating the two is worth doing before CM-5 rather than at it.**

**Two of my own tools bit, and both are the same lesson.** A plain string-replace turned `plan.ActivityRepository` into `plan.entity.ActivityRepository`, because `Activity` is a prefix of `ActivityRepository` — 118 ghost imports, and the same bug corrupted a logger name inside a *string literal*, which no import fix would ever have reached. And the member-widener injected `public` into a **call site** rather than a declaration, then re-injected it every pass so the build never converged. The replacement only touches declarations at exactly four spaces of indent, which no call site ever is. **Both were caught by clean compiles, not by reading** — and a sweep now proves every string-literal FQN under `com.largata.trip` resolves, since the compiler cannot check those.

*Verified:* clean build · unit suite **433/433** · full ITs **1369, one failure, then green** — `TripAnalyticsIT` attaches its appender to a logger **by name string**, which the prefix bug had mangled; 8/8 after · assertion-diff **0 across 53 files**, so 101 files moved without touching one assertion.

**2026-09-08 — the walk, on the rung this session can actually reach, and what it proved.**

**The half that ran.** The stack was rebuilt on TW-1's code (`docker compose up -d --build`; it had been serving a 22-hour-old pre-TW-1 image, so reading its log before that would have proved nothing), then the workspace walk ran as the five Playwright specs that carry it — `create-flow`, `buffered-plan`, `lifecycle`, `archive-posture`, `ownership-transfer`: **86 passed**, `t1 = owner, t2 = member` from the verified pool.

**The first run reported `86 skipped`, and that is the H1 gate working rather than a pass.** Shell state does not survive between tool calls, so `mobile/.env` had not been exported into the Playwright process and `requireStack` skipped every spec with *"pool environment absent"*. A suite that reports 86 skipped and exits **0** is indistinguishable from 86 green to anything reading the exit code — which is exactly the check-with-no-failure-mode this repo keeps paying for, closed here by the gate naming its reason. Re-run with the env in the same command: 86 passed in 9.8s.

**What the walk was for, and it answers cleanly.** Every logger that fired during it, at its layered address:

```
com.largata.trip.trip.service.TripService          Trip archived · Ownership …
com.largata.trip.plan.service.PlanSaveService      Plan saved: itineraryId=… days=4
com.largata.trip.plan.service.DayService           Days seeded · Day appended
com.largata.trip.plan.service.ActivityService      Activity created: dayId=…
com.largata.trip.editing.service.EditLeaseService  Edit lease acquired · released
com.largata.trip.ownership.service.MembershipService  Ownership offered · accepted · revoked
com.largata.trip.workspace.service.WorkspaceService
```

Before this story every one of those read `com.largata.itinerary.*`. Each line carries **ids only** — no title, no destination, no traveler name — so P3 holds through the move.

**The half that did NOT run, stated rather than implied.** Ticket 10 asks for the walk *"from two phones"*. That did not happen: the emulator rung is blocked by the recorded Gradle fault (four stories now), and a real device is the founder's. **Still unproven by anything in this story: native 1:1 gesture handling, keyboard avoidance, hardware back, Reduce Motion, and safe-area insets.** TW-1 changed no client file, so the risk is low — but low is not zero, and this is recorded as *not done* rather than folded into the 86.

**And the three follow-ups the founder queued, all done here.** (1) The duplicate owner refusal is consolidated: three variants inside the trip module — `trip/exception/NotTheTripOwnerException`, `trip/trip/exception/NotTripOwnerException`, and `MembershipExceptions.NotTripOwnerException` — became **one**, the published one at the module root, carrying all five named factories. All three were `ForbiddenException("NOT_PERMITTED", …)`, so the wire is untouched; `join` keeps its own, being a different module. (2) The event-loss gap is an epic-map backlog line, **ranked**: `MembershipEnded` is the one that matters, because a departed member keeps a live subscription; `TripArchived` is not exposed at all, being BEFORE_COMMIT. (3) All **25** pre-existing unused imports are gone — a sweep now reports zero across 801 files.
