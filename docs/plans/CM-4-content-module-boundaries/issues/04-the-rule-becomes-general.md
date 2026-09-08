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
