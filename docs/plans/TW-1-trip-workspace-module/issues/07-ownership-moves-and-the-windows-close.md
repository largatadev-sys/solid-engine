# 07: Ownership moves, and the windows close

**What to build:** the last unmoved package relocates, and the apparatus that let the move happen in pieces is torn down in the same ticket, so a branch-local window cannot outlive the branch. Membership's eight files — the ownership offer and transfer, their repositories and statuses, the membership service, its refusals and the membership-ended event's old home — become the trip module's ownership slice, and the controller ticket 01 cut for the membership and ownership routes travels with them. Membership's eleven integration tests take package and import edits only.

With nothing left outside the module that the windows were holding open, both are **deleted**, and a test is added that asserts no window predicate remains in either guard — so reintroducing one is a red build, not a quiet convenience. The old-world regex shrinks: workspace and membership leave it, because those packages no longer exist. The meta-test from the boundaries story pins every module's classification against the real directory listing, so its being-dismantled list shrinks to the old package alone, or it fails — which is the meta-test doing its job.

**Blocked by:** 06 (Plan, editing and history move).

**Status:** ready-for-agent

- [x] The membership package no longer exists; its files and the ownership controller live in the trip module's ownership slice; membership's eleven integration tests pass with package and import edits only
- [x] No window predicate exists in either guard, asserted by a test; sabotage recorded in this ticket's comments — a reintroduced window fails that test, with the failure line read
- [x] The old-world regex no longer names workspace or membership, and its positive and negative cases are updated to match — **with a divergence recorded below**: it also gained a counted four-type exemption, because four trip files still name the content half and that is the shape of the tree until CM-5, not migration state.
- [x] The meta-test's being-dismantled list names the old package alone, and every module in the tree is still classified
- [x] The legacy exemption still stands, still counts more than thirty classes, and is the only exemption in the trip guard
- [x] The assertion-diff script reports zero differences; every integration test passes with no edited assertion

## Comments

**2026-09-08 — built.** Membership's eight main files, the three-file `web/` ticket 01 cut, and eleven integration tests are now the trip module's `ownership` slice. `com.largata.membership` no longer exists.

**Both windows are deleted, and a test forbids their return.** `TripModuleBoundaryTest.noMigrationWindowSurvivesInEitherGuard` reads both guard files and fails on any line naming `MIGRATION_WINDOW` or `SLICES_IN_FLIGHT`. Sabotage-checked by reintroducing one; the failure line, verbatim:

```
[the two branch-local windows let the move happen in pieces and were DELETED with the last one at
 ticket 07. Reintroducing one is a red build, not a quiet convenience — which is the whole of what
 branch-local means]
Expecting empty but was: ["src\test\java\com\largata\support\NewWorldBoundaryTest.java:
  private static final java.util.function.Predicate<Path> THE_MIGRATION_WINDOW = f -> false;"]
```

The test throws rather than passing vacuously if either guard file is missing, so deleting a guard cannot silence it.

**Divergence from the ticket, and it is a real one: the regex guard did not simply lose its window — it gained a counted exemption in its place.** The ticket assumed nothing under `trip/` would name the old world once the move finished. Four files still do, and they are not migration state:

- `fork/ForkService` → `itinerary.PublishedVisibility`
- `record/ItineraryRepository` → `itinerary.TrendingDestinationRow`
- `record/ItineraryLifecycleController` → `itinerary.api.PublishRequest`
- `record/ItineraryService` → `itinerary.api.ShowcaseItineraryResponse`

Every one reaches into the **content half**, which this story deliberately leaves standing until CM-5 — so a window (branch-local, deleted at ticket 07) is the wrong shape and would have to be re-opened on the next branch. They are now `THE_CONTENT_HALF_TW1_LEFT_STANDING`: four named types, **asserted to be exactly four**, with CM-5 as the dissolution trigger — the same shape as the ArchUnit guard's legacy exemption, and a fifth reach is a red build. Naming it a window would have been the convenient lie the no-window test exists to prevent.

**The old-world regex lost `workspace` and `membership`**, and its test cases now assert the *absence* of those two by both halves: the regex no longer fires on them, **and** `src/main/java/com/largata/{workspace,membership}` do not exist — so the two facts cannot drift apart. `theRuleWouldFireOnABadImport` swapped its retired `workspace` positive case for `invitation`, which is still a real old-world package.

**The meta-test's dismantled list is down to `itinerary` alone**, as the ticket asked.

**The trip guard is in its final form**: the allowlist, the legacy exemption as its one named consumer, a **slice list** asserted to name real packages holding real code (`record, plan, editing, history, cover, dump, fork, workspace, ownership, validation` — ten, the spec's nine plus `validation`), and the vacuity checks. `theBoundaryTestSeesTheModuleItGuards` was raised from `> 8` to `> 100`, since a module of 120 files passing a rule written for nine would be a rule that had stopped watching.

*Verified:* guards **19/19**, no-window sabotage red then green, assertion-diff **0 across 51 files**, full suite green (below).
