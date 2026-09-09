# 10: The old package is deleted and `publication` takes its name

**What to build:** the old package no longer exists, and the module that owns the Itinerary is named for it. Everything left of the old package after tickets 05 to 09 — the live published projection, the row-backed publication state, the published-visibility reader, the remaining records and their integration tests — is deleted, with every assertion those tests carried either accounted for in a moved test or listed as retired with the reason. The publication module is renamed `itinerary`; its guard, its contract test and its stepping test follow. The wire does not change in this ticket. After the move the compile is looped clean and the unit suite is run, because the incremental compiler and the source-by-path tests both lie after a move.

**Blocked by:** 09 (The diary half relocates into `postcard`).

**Status:** ready-for-agent

- [x] The old package does not exist; the publication module is named `itinerary` and its guard, contract test and stepping test are renamed with it
- [ ] The row-backed publication state is gone and the itinerary module's implementation of the port is the only one; the published-visibility reader is gone
- [ ] Every assertion the deleted tests carried is accounted for in this ticket's comments — moved, or retired with a reason
- [ ] `mvn -o clean test-compile` is looped until quiet and the unit suite is run, and both are recorded
- [ ] No route, shape or status code changes in this ticket; the twin test still passes


## What actually happened, and when

**The deletion half landed at ticket 10; the rename half did not, and was built on 2026-09-10** after the founder read the move map and asked why `publication` was still there. Tickets 11 and 12 were built on top of the unmet criterion, so the rename had to carry their work too — Modulith's module model, the nineteen `package-info` files and four boundary guards all named `publication`.

**The name was not free when ticket 10 ran.** Thirty-four test classes still occupied `com.largata.itinerary` — trip, plan, activity, day, editing and fork contract tests left behind when the main package was deleted. They moved first, to the module each actually exercises (27 to `trip`'s layer folders, 3 to `postcard.legacy`, 1 each to `discovery` and `feed`), which is what made the name available.

**The route moved too, and it is a rename rather than an ADR-008 break.** `/v1/publications/{id}` was minted dark at CM-1 (`efe83044`) and no shipped client ever called it — `git grep` on `dev` finds no caller under `mobile/src`. The additivity rule protects shipped semantics because old app versions live for weeks; a dark route has no old version to break. `08-object-contracts.md` records the change with that reasoning.

**Two guards asserted `src/main/java/com/largata/itinerary` does not exist** — true while the name meant the old god package, false once the module took it. Both now assert the absence of the god package's own classes (`PublishedItineraryService` and four others) instead of the directory, which is the stronger check: it survives the name being reused. `tripGrammar.test.ts` was amended the same way — it forbids the old root except the object's own two routes, and was sabotage-checked with a `/v1/itineraries/${id}/days` path to prove it still bites.

**A collision the rename created:** `ItineraryNotFoundException` already existed in `common.authz` carrying the wire code `ITINERARY_NOT_FOUND`, which five shipped client modules depend on for workspace refusals. The module's own exception is therefore `ItineraryObjectNotFoundException`; its `PUBLICATION_NOT_FOUND` code is left alone, since changing a wire code is a separate decision from renaming a package.
