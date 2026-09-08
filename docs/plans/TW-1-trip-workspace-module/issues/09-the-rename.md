# 09: The rename

**What to build:** the moved types take the names the founder's model calls for, in a commit of its own after the relocation so the move commits stay pure moves and this one is read as a rename and nothing else. The record becomes Trip; the service becomes the trip service, the facade of that name having retired in ticket 08; the controller becomes the trip controller, its destruction-only namesake having been renamed in ticket 01; the detail response becomes the trip response, the content story's dark record of that name having retired at the grammar story; the state enumeration is absorbed by the trip lifecycle already in the api — same three names, same wire names, storage spelling unchanged and pinned by a test that would fail if it moved.

What does not rename, deliberately and on the record: the table, every path under the old root, the client's hooks and query keys, and anything in the old package. The client's repository was already renamed at the grammar story, so the client takes no change here at all.

**Blocked by:** 08 (The facade retires).

**Status:** done

- [x] The five renames above are applied, and no type in the trip module carries the old noun in its name except where the old package's staying half still names it through the legacy exemption
- [x] The lifecycle's wire names and the state column's storage spelling are unchanged, each pinned by a test that fails if it moves
- [x] The itinerary table, every old-root path, and every client file are untouched — checked by a search, not assumed
- [x] The rename is one commit, separate from every move commit, so `git log` reads relocation then rename
- [x] The assertion-diff script reports zero differences across the renamed-symbol edits in the test tree
- [x] Every integration test passes with no edited assertion; both Playwright lanes untouched

## Comments

**2026-09-08 — built.** The moved types take the Trip names, in a commit of its own: **72 files rewritten, 20 types renamed**, and nothing else touched.

*The five the spec names, plus what they dragged with them:* `Itinerary` → **`Trip`** · `ItineraryService` → **`TripService`** (the facade of that name having retired at ticket 08) · `ItineraryController` → **`TripController`** (its destruction-only namesake renamed at ticket 01) · `ItineraryResponse` → **`TripResponse`** · `ItineraryState` **absorbed by `TripLifecycle`** — the record slice's copy is deleted and the api's enum gained its `next()`/`previous()`, so the module has one lifecycle type rather than two with the same three constants. Also renamed, because leaving them would have been the rename half-done: `ItineraryRepository`, `ItineraryFields`, `ItineraryCoverService`, `ItineraryLifecycleController`, `CreateItineraryRequest`, `UpdateItineraryRequest`, `ItineraryPlan` → `TripPlanTree` (distinct from `TripPlan`, the api's wire record), and eleven test classes.

*What deliberately did NOT rename, and the keep-list that made it safe.* A blanket `\bItinerary\b` sweep would have taken `ItineraryNotFoundException` (`common`'s), `ItineraryObject*` (publication's), `PublishedItinerary*` and the old package's six `web/*IT` classes with it. The rename script **parks those seventeen names before renaming and restores them after**, so the sweep cannot reach them. Checked afterwards, not assumed: the `itinerary` table (`@Table(name = "itinerary")`), every `/v1/itineraries` mapping, and the whole `mobile/` tree are byte-identical — `git status mobile/` is empty.

*The lifecycle's contract is pinned by tests that would fail if it moved*, and both pass **unedited**: `TripLifecycleTest` asserts `wireName()` is `upcoming`/`ongoing`/`completed` **and** `name()` is `UPCOMING`/…, and `TripLifecycleStorageIT` reads the `state` column back from Postgres and asserts the stored spelling. The `@Enumerated(STRING)` contract CLAUDE.md warns about is exactly what those two hold.

**The assertion-diff script needed two real fixes, and the second was hiding a lost test.**

1. **The renamed symbols had to be declared.** Seam 1 permits package, import and renamed-symbol edits, so the script now normalises the ticket-09 renames the way it already normalised ticket 02's and 03's. Before that it reported 28 changes; the differences were extracted mechanically rather than eyeballed — every one reduced to the single pair `Itinerary -> Trip`, with identical line shape either side.
2. **A file that is BOTH moved and renamed defeats git's similarity detector**, so `itinerary/ItineraryStateTest.java` → `trip/record/TripLifecycleTest.java` came through as a delete plus an add, and the script reported *"DELETED — a test file that existed at the branch point is gone"*. The tempting reading is "a file was removed, note it and move on"; the true one is that **the comparison had silently stopped happening for that file**. `RENAMED_FILES` now declares the pair, and the fix was verified the only way that means anything: sabotaging a `wireName()` assertion inside the renamed file, watching the script report it, and restoring. Rename-chain following (a file moved by ticket 05 and renamed by ticket 09) was added at the same time.

*Verified:* clean build, **unit suite 430/430** (which is what catches the source-reading guards), assertion-diff **0 across 53 files** with its sabotage red, table/paths/client checked by search rather than assumed.
