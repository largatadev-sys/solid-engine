# 04: Workspace moves; the exemption, the two windows and the script are born

**What to build:** the first physical move, and the apparatus every later move runs behind. Workspace is the one slice that can move alone: after ticket 03 its only outbound reference into another module is the trip api's own membership-arrived event, and its only inbound callers are the old package and membership, both of which are about to follow. Its eleven files become the trip module's workspace slice, the two row-backed resolvers that implement the authorization seams moving with it, and its seven integration tests take package and import edits only.

Three things are born with it. The trip guard gains its **permanent legacy exemption**: the old package alone is named as a permitted consumer of trip internals, with a sabotage check that the predicate selects more than thirty classes and a message naming the decommissioning story as its dissolution — the content half reaches in today and is deleted at that story, not rewritten here. Both guards gain one **named, branch-local window** each: the regex guard's lets a moved trip file name an unmoved old-world class, the allowlist guard's lets an unmoved satellite depend on a moved trip internal; each is sabotage-checked while it lives and is deleted by ticket 07. And the **assertion-diff script** lands: a short script that takes each changed test file's assertion lines before and after the branch's changes and fails on any difference. It runs here first and is the headline of every move ticket after.

**Blocked by:** 03 (The three interfaces, implemented in place, and eight consumers cut over).

**Status:** ready-for-agent

- [x] The workspace package no longer exists; its files live in the trip module's workspace slice; the seven workspace integration tests pass with package and import edits only
- [x] The legacy exemption names the old package alone, selects more than thirty classes, and carries a message naming the decommissioning story
- [x] Each guard has exactly one window, named as such, and each is sabotage-checked: emptying it turns the guard red on the breach it is holding open — recorded in this ticket's comments with the failure line read
- [x] The assertion-diff script exists, is invoked by one documented command, reports zero differences for this ticket's test edits, and fails when an assertion is deliberately changed — recorded in this ticket's comments
- [x] Hibernate's schema validation passes at the first context boot, proving no table moved
- [x] Every integration test passes with no edited assertion

## Comments

**2026-09-08 — built.** Workspace's ten main files and seven integration tests are now the trip module's `workspace` slice, and the three pieces of apparatus every later move runs behind are born with it. Ten main files, not the ticket's eleven: `MembershipView` went into `trip/api` at ticket 03, because `MembershipApi.membersOf` hands it out.

**The legacy exemption** names `com.largata.itinerary..` and nothing else, and its sabotage check asserts the predicate selects **more than thirty** classes with a message naming CM-5 as its dissolution. It is a *package* predicate, so it passes CM-4's `noGuardAnywhereNamesAClassAsAnExemption` meta-test, which forbids the `simpleName(...)` construct — the by-name exemption that guard exists to prevent is exactly what this is not.

**Two windows, one per guard, each sabotage-checked, with the failure line read:**

- *ArchUnit window* (`THE_MIGRATION_WINDOW` = `com.largata.membership..`). Repointed at a package that selects nothing → **2 failures**. The breach it holds open, verbatim: `Constructor <com.largata.membership.MembershipService.<init>(com.largata.trip.workspace.WorkspaceService, …)> has parameter of type <com.largata.trip.workspace.WorkspaceService>`, plus `Method <…MembershipService.archive(…)> calls method <com.largata.trip.workspace.WorkspaceService.archive(java.util.UUID)>`. The second failure is the window's own emptiness assertion.
- *Regex-guard window* (a moved file under `trip/workspace/`). Repointed at `trip/nowhere` **and** a breach planted (`import com.largata.itinerary.Itinerary;` into `MembershipRepository`) → **2 failures**: `Expecting empty but was: ["src\main\java\com\largata\trip\workspace\MembershipRepository.java: import com.largata.itinerary.Itinerary;"]`, and the window's own `a window selecting no file has already outlived its purpose and must go`.

Both restored; all three guards green, **17/17**.

**The assertion-diff script** is `backend/scripts/assertion-diff.js`, run as `node backend/scripts/assertion-diff.js` (optional argument: the base, default this branch's point `e249976d`). Output now:

```
  test files changed on this branch: 12
  pre-existing files compared:       12
  new files (nothing to compare):    0
  PRE-EXISTING ASSERTIONS CHANGED:   0
```

Sabotage-checked: changing `.isEqualTo("PENDING")` to `.isEqualTo("SABOTAGED")` in `OwnershipOfferStorageIT` makes it report **1** and exit **1**, printing the was/now pair. Two design decisions worth stating, because each was a bug first:

1. **It reads the WORKING TREE, not `HEAD`.** The first version compared `BASE...HEAD` and reported a clean zero against a tree with a deliberately sabotaged assertion sitting uncommitted in it — a check with no failure mode at the moment you most want one. It now reads files from disk.
2. **It normalises the renamed symbols seam 1 permits** (`TripsTopic.` → `TripEventTypes.`, `admitMember(` → `admit(`, and the two `itineraryIds*` renames) and **excludes the guard files themselves**, which are this branch's apparatus rather than pre-existing behaviour tests — the windows and the exemption are asserted *into* existence here, so counting their churn would make the headline permanently non-zero and therefore unreadable.

**The meta-test's dismantled list shrank to `itinerary, membership`** — it failed the moment the directory disappeared, which is the meta-test doing its job rather than a breakage.

*Verified:* trip + membership + formation + poll ITs **186/186**, guards **17/17**, assertion-diff **0**. Hibernate's `ddl-auto: validate` (application.yml:15) passed at every context boot in that run — no table moved. One near-miss worth recording: a blanket `sed` over `com.largata.workspace.` rewrote `NewWorldBoundaryTest`'s *negative test case* — the line asserting the regex fires on an old-world import — which would have quietly weakened the guard. Restored; the assertion-diff script would have caught it if it had not been a guard file, which is an argument for reading the guards by hand at ticket 10.
