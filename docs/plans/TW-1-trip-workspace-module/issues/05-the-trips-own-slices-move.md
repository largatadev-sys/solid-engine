# 05: The trip's own slices move — trip, cover, dump, fork, validation

**What to build:** the root of the module and the four slices that hang directly off it relocate, behind the windows ticket 04 opened. The trip slice takes the record, its repository, its service, its lifecycle, its categories and visibility, its teaser, the share-card version, the media audience, the two DTOs and their response, and the two controllers carrying both roots. The cover slice takes the cover service and its audience. The dump slice takes the photo dump's service, audience, exceptions, entry response and controller. The fork slice takes the relationship, its repository and the fork service, plus the forked-from response. The validation slice takes the seven DTO validators the boundaries story measured as trip-only, so the shared kernel is not widened. Roughly forty main files, each landing under a folder that says what it is about with its layer as the filename suffix; visibility widens only where a slice line is crossed, and the guard is what seals it.

Nothing a traveler reaches changes. Every route keeps both roots and every path string is untouched.

**Blocked by:** 01 (The three controller edges are cut before anything moves), 04 (Workspace moves; the exemption, the two windows and the script are born).

**Status:** ready-for-agent

- [x] The five slices exist under the trip module and hold the files named above; none of those files remains in the old package
- [x] Every controller that moved carries both roots, and the twin and equivalence tests pass unedited
- [x] The assertion-diff script reports zero differences across every test file this ticket touched
- [x] Both windows are still present, still named, and still sabotage-checked; no third exemption has appeared
- [x] No file under the trip module names the content half of the old package outside the window predicate
- [x] Every integration test passes with no edited assertion; both Playwright lanes untouched

## Comments

**2026-09-08 — built.** The root of the module and four slices hanging off it are relocated, behind the windows ticket 04 opened. On disk now: `record` 22 · `validation` 7 · `dump` 5 · `fork` 4 · `cover` 2, beside ticket 04's `workspace` 10 and the `api` 15. Ninety-six files remain in the old package — its content half, staying until CM-5.

**The root slice is `com.largata.trip.trip`, as the spec's slice list says.** This was asked at build and first answered `record`, on the argument that `com.largata.trip.trip` stutters in every import; the founder **reversed it on 2026-09-08** — *"we may need to make record > trip, so we will stick to the grammar"* — and that is the better call. The slice list is the module's map and the spec is where it is written; a slice named for the spec is one a reader can find, while a slice named for a reviewer's ear is one they have to be told about. The stutter is the cost of the module and the slice sharing a noun, which is exactly what the grammar means. `com.largata.trip.trip.Trip` reads as *the trip module's trip slice's Trip*, and `trip:25` on disk matches the spec's measured 25 exactly.

The design's older `internal/` marker was **not** restored — the spec dropped it and ticket 04's allowlist guard already seals `trip..`, so it would buy nothing and re-nest all nine slices.

**Visibility widened only where a slice line is crossed**, exactly as the spec priced it — six types (`ItineraryRepository`, `TripMediaAudience`, `HasDateRange`, and the old package's `ActivityRepository`, `DayRepository`, `TrendingDestinationRow`) and eleven members (`Itinerary.forkedFrom`, `Day.copiedInto`/`id`, `Activity.copiedInto`, `DayResponse.annotated`, `TripMediaAudience.admits`/`admitsToTheWorkspace`, and four exception constructors). Each was named by the compiler rather than guessed; the guard is what replaces the seal.

**Thirteen test classes moved with their subjects** — eleven to `trip/record`, two to `trip/fork`. They were failing on package-private access to types that had moved, and widening production visibility *for a test* would have been the wrong repair: the test belongs with the code it tests.

**The regex-guard window widened from one slice to six** (`SLICES_IN_FLIGHT`), which is what it is for: `ForkService` names `DayRepository`, `DayService`, `PublishedVisibility` and `ItineraryPlan`, and `ItineraryCoverService` names `EditLeaseService`, `ActivityHistoryService`, `HistoryAct` and `LeaseSubject` — all unmoved until ticket 06. Ticket 07 deletes the window when the list would be empty.

*Verified:* **full backend suite 1369, 1 failure, then green.** The one failure was `ItineraryAnalyticsIT.theOperationalLogLineNamesTheTripByIdAndLeaksNothingTheTravelerWrote` — a logger attached **by name string** (`LoggerFactory.getLogger("com.largata.itinerary.ItineraryService")`), so the moved class logged under a name nothing was listening to and the appender saw zero lines. A renamed-symbol edit, invisible to the assertion-diff script because a logger lookup is not an assertion; 8/8 after. Guards **17/17**. Assertion-diff **0 across 35 files**.

*Two traps, both the same shape and both already in CLAUDE.md in other clothes.* **`mvn -o test-compile` reported BUILD SUCCESS on a tree with 36 visibility errors in it** — incremental compilation kept stale classes and never recompiled the callers. Only `mvn -o clean test-compile` told the truth, and it had to be run in a loop: each clean pass surfaced a layer the previous one had hidden (imports → type visibility → member visibility → misplaced tests). **After a move, only a clean build's result means anything.** And a blanket `sed` over `com.largata.itinerary.` rewrote `NewWorldBoundaryTest`'s *positive* test case — the line proving the old-world regex fires — turning the guard's own proof into a tautology. Caught because the guard then failed; the general rule is that a guard's test-case strings are data about the *old* world and must be excluded from any sweep that renames it.
