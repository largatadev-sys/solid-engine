# 10: The old package is deleted and `publication` takes its name

**What to build:** the old package no longer exists, and the module that owns the Itinerary is named for it. Everything left of the old package after tickets 05 to 09 — the live published projection, the row-backed publication state, the published-visibility reader, the remaining records and their integration tests — is deleted, with every assertion those tests carried either accounted for in a moved test or listed as retired with the reason. The publication module is renamed `itinerary`; its guard, its contract test and its stepping test follow. The wire does not change in this ticket. After the move the compile is looped clean and the unit suite is run, because the incremental compiler and the source-by-path tests both lie after a move.

**Blocked by:** 09 (The diary half relocates into `postcard`).

**Status:** ready-for-agent

- [ ] The old package does not exist; the publication module is named `itinerary` and its guard, contract test and stepping test are renamed with it
- [ ] The row-backed publication state is gone and the itinerary module's implementation of the port is the only one; the published-visibility reader is gone
- [ ] Every assertion the deleted tests carried is accounted for in this ticket's comments — moved, or retired with a reason
- [ ] `mvn -o clean test-compile` is looped until quiet and the unit suite is run, and both are recorded
- [ ] No route, shape or status code changes in this ticket; the twin test still passes
