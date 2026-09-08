# 04: The rule becomes general, and the build asserts it

**What to build:** one test that makes "modules talk only through an api call or an event" a standing rule rather than a habit each story reapplies. It asserts three things at once. Every module in the guarded group has a guard. No guard anywhere names a class as an exemption — assertable for the first time, because the previous tickets remove the last two. And the two lists that carve out the rest are pinned by the test itself, so nothing drifts out of the rule quietly.

Those lists exist because the tree is not there yet, and the story is honest about it rather than silent. Four things are deliberately outside the rule and must not be asked for a guard: the shared kernel, the shared infrastructure and the transport, all already classified that way. Seven modules are owed and named — the four workspace-world modules that survive, plus the three small ones — and their trigger is the trip-module story's merge, because they reach into the old world today and a guard written now would need immediate exemptions, destroying the very property this test exists to assert. The god module's three packages are not on either list: they are being dismantled, and guarding something being deleted buys nothing.

The forward half is what the founder asked for and what the test delivers cheaply: a module added from here that publishes a contract and has no guard fails on its first build.

**Blocked by:** 02 (The two exemptions die), 03 (Diary's guard stops failing open).

**Status:** ready-for-agent

- [ ] The test names every guarded module and fails if one loses its guard
- [ ] The test fails if any guard names a class as an exemption
- [ ] The deliberately-outside list and the owed list are pinned by the test, so a module cannot move between groups without the test saying so, and the owed list can only shrink
- [ ] A new module publishing a contract with no guard fails this test, demonstrated rather than asserted
- [ ] Sabotage recorded in this ticket's comments with the failure lines read: a guard hidden from the scan fails it; a re-introduced exemption fails it; a module added to the owed list without a story named beside it fails it
- [ ] The test scans real files and would fail if it found none, so it cannot pass vacuously

## Comments

**Sabotage runs (2026-09-08).** Three, one per criterion, each run against the real tree and reverted.

**A guard hidden from the scan.** `PlaceModuleBoundaryTest.java` was moved out of the tree. Two tests failed, and the first names the module:

```
ModuleGuardMetaTest.everyModuleUnderTheRuleHasAGuard:56
  [place is under the api-only rule, so the build must assert its boundary rather than
   a reader having to audit it]
Expecting actual not to be empty
ModuleGuardMetaTest.theScanReachesRealFilesRatherThanPassingVacuously:125
```

The second failing alongside it is the point of the vacuity check: a scan that found nothing would otherwise satisfy the first test by finding nothing to demand.

**A re-introduced exemption.** `TripModuleBoundaryTest` was given back its `THE_ONE_NAMED_EXEMPTION` predicate:

```
ModuleGuardMetaTest.noGuardAnywhereNamesAClassAsAnExemption:72
  [an exemption is how a breach stays green - it names the exact class being reached and
   calls the boundary held. CM-4 removed the last two; this is what stops the pattern
   eroding one convenience at a time]
Expecting empty but was: [
  "src\test\java\com\largata\trip\TripModuleBoundaryTest.java: private static final
     DescribedPredicate<JavaClass> THE_ONE_NAMED_EXEMPTION =",
  "src\test\java\com\largata\trip\TripModuleBoundaryTest.java:
     resideInAPackage(TRIP + ".service").and(simpleName("TripService"));"]
```

**A new module publishing a contract, with no guard — the forward-binding half, demonstrated.** A `com.largata.souvenir` module was created containing nothing but `api/SouvenirApi.java`. It failed on its first build with no other change to the tree:

```
ModuleGuardMetaTest.everyModuleIsClassifiedAndNoneHasDriftedQuietly:91
  [a module added from here is classified deliberately or fails on its first build -
   which is the whole of what forward-binding means]
but the following elements were unexpected: ["souvenir"]
```

Note which test catches it, because it is the design decision worth recording: the trigger is **being a module at all**, not publishing an `api`. A module invented tomorrow must be classified — under the rule, deliberately outside it, owed with a story, or being dismantled — and there is no fourth option that stays quiet. Keying on the presence of an `api` package would have let a module with no `api` yet drift in unclassified and grow one later in silence.

**The owed list's story requirement** is asserted rather than sabotaged (`everyOwedModuleNamesTheStoryThatBringsItUnderTheRule`): the map's value is the trigger story, so an entry added without one does not compile, which is a stronger failure than a red test and needs no run to demonstrate.

**Amended in flight, and it matters for the shrink-only claim.** The owed-list test first asserted only that each entry named a story — a compile-time constant checked non-blank, which is close to a test with no failure mode. It now also asserts each owed module **has no guard yet**, which makes the list mechanically shrink-only: writing a guard for `chat` fails this test until `chat` is moved to the guarded list, so the two lists cannot disagree with the tree.
