# 13: The second gate — the deletion proven, the story closed

**What to build:** the second PR, and the story's close. The assertion-line diff script from TW-1's gate runs over every test moved in tickets 05 to 10 and its output is the gate's headline. The full suites run with their counts read. The `dev` walk from ticket 08 is repeated as a smoke against the deleted world. BUILD_STATUS's row goes to built with the spec link and nothing else; the epic map's CM-5 line is annotated built with the measured counts; the courtesy-end line's clock starts. The PR is opened as the proposal and squash-merged on the founder's word.

**Blocked by:** 12 (The guards dissolve and Modulith arrives).

**Status:** ready-for-agent

- [x] The assertion-line diff over every moved test is run and its output recorded here; any difference is explained
- [x] Backend unit and integration suites, mobile typecheck and Jest, and Playwright on both lanes are green with their counts read from the logs and recorded here
- [~] The `dev` walk from ticket 08 is repeated and recorded with tags — the mechanical half is run and green (11/11, `scripts/walk-cm5.js`, t1 author / t3 stranger, local stack); the founder's eyes on the rendered screens is the residue
- [ ] BUILD_STATUS's CM-5 row reads built with the spec link only; the epic map's CM-5 line is annotated built with the counts; the legacy-link courtesy line's trigger date is written
- [ ] The PR carries the story's measured counts and is squash-merged on the founder's word

## The assertion-line diff — the gate's headline

`node backend/scripts/assertion-diff.js`, base `6e608417` (the merge-base with `origin/dev`).

    test files changed on this branch: 95
    pre-existing files compared:       84
    new files (nothing to compare):     6
    PRE-EXISTING ASSERTIONS CHANGED:   22

Twenty-two, in three shapes. **The three DECREASES are the ones worth reading**, because a count going down is an assertion that stopped being made.

**1. `LifecycleRespectsEditingSessionIT` 5 → 4 — an invariant was genuinely lost, and this diff is how it should have been caught.** It dropped the `publish` case from its lifecycle table and deleted `theSessionGuardDoesNotSwallowThePublishedRefusal`, which asserted `reopen` throws on a published trip. `TripService.publish` no longer exists — publish is the itinerary module's act — so the test could not compile as written. But the invariant it carried was not moved anywhere, and `Trip.requireUnpublished` reads a column CM-5 stopped writing, so **reopen was unfenced on a published trip from ticket 01 until a Playwright walk found it hours later**. Now restored as `PublishedMeansALiveItineraryIT.aLiveItineraryPinsTheTripsLifecycleSoReopenIsRefused`, which asserts all four transitions and is sabotage-checked. Had this script been run at ticket 11 rather than at the gate, the gap would have been one line of output instead of a browser test.

**2. `ItineraryLifecycleIT` 98 → 96 — retired with its endpoint.** `finishPlanningStaysMappedAndRefusesForeverInEveryState` asserted that ADR-029's retired `finish-planning` route stayed mapped and refused. Ticket 11 sunset the old root, so the route is gone and the assertion has nothing left to make.

**3. `ItineraryContractIT` 81 → 77 — the fence ADR-034 forbids.** `aPrivateOwnersPublishedItineraryAnswersAStrangerByTheProfileFenceAndAFollowerInFull` pinned CM-1's Profile Visibility fence on the object read. ADR-034 decision 2 says Profile Visibility never governs an Itinerary, and the grilling ruled the fence comes off here. Replaced by its opposite: `ItineraryPageIT.aStrangerReadsAPrivateOwnersItinerary_becauseAPublishedItineraryIsPublic`.

**Ten increases** (`DiscoveryFiltersIT` +2, `DiscoveryIT` +1, `PostcardFeedIT` +1, `JoinCardIT` +1, `ProfileShowcaseIT` +3, `PublicProfileIT` +1, `ForkAnalyticsIT` +2, `ForkContractIT` +3, `ForkProvenanceIT` +2, `PublishFreezesMembershipIT` +2) are assertions ADDED as each surface moved onto the Itinerary — the object's id, its provenance, its fence. Coverage grew.

**Four line-level edits**, both guards this branch owns: `AudienceFenceCoverageTest` (its optional-membership registry emptied when ticket 11 closed the last such door, so it now proves the PATTERN against an inline fixture) and `DiscoveryScopeIsDefinedOnceTest` (repointed from `TripRepository`'s predicate, which has had zero callers since the readers moved, to the live `ItineraryDiscoveryRepository`, and now asserting TWO scopes because the owner's showcase is a different fence from the strangers surface).

**Five files deleted.** `PublishMetadataIT` and `PublishedProjectionIT` went with the projection root; `TripGrammarTwinIT` and `TripGrammarEquivalenceIT` retired having done their job, as the spec planned; `ForkRollbackIT` was deleted with no replacement and that was an error — restored as `ItineraryForkRollbackIT`, which fails the provenance write and asserts the trip, workspace, membership and plan all roll back, sabotage-checked by removing `@Transactional`.

## The suites, read from the logs

Run `34421968717`, `workflow_dispatch` on the branch head — dispatch rather than push, because **Playwright only runs on `workflow_dispatch` or `pull_request`, never on a plain push**, so every push run this story read was skipping it silently.

| Lane | Count |
|---|---|
| Backend unit (surefire) | **496** passed, 0 failed |
| Backend integration (failsafe, real Postgres) | **1341** passed, 0 failed, **15 quarantined** |
| Mobile typecheck | clean |
| Mobile Jest | **6870** passed, 203 suites |
| Playwright, api + web | **859** passed, 0 failed, 1 skipped |

The 15 quarantined ITs and the 1 skipped Playwright test predate this story and carry their own ledger rows.

**Playwright's arc through this story is the record worth keeping: 12 failed → 5 → 2 → 1 → 1 → 0.** Every one of those was a real finding rather than a fixture to nudge — two defects a traveler would have met (publish 404'ing on every publish; the trip's dates on the public page), three regressions where an act moved modules and the guard around it stayed behind (`reopen`, then publish and unpublish losing the archive fence), one race in a spec that shared a follow edge across eleven parallel tests, and the rest cutover debt in assertions still naming the old world.

**The green did not come free of a workflow fix, and that is worth recording.** Two runs reported failure having executed zero tests: `playwright install --with-deps` runs `apt-get update` across every repo the runner image ships, including Google's Chrome repo, which was serving a mismatched index. Playwright's chromium comes from its own CDN and that repo is nothing to us, so the source is now dropped before the install. An outage in a dependency this project never had was presenting as a red build on an innocent branch.


## The walk — what is closed and what is not

`node mobile/scripts/walk-cm5.js` against a local stack built from this branch: **11 of 11**, t1 as author and t3 as stranger. It closes every step of `walk.md` whose answer is a status code, an id or a substring — including the three findings this story is most likely to regress on: archive fencing publish and unpublish, reopen refused on a published trip, and the trip's dates reaching the page nowhere.

**It found nothing new, and its first run lied.** Two checks failed against a stack that had come up twelve minutes before the archive-fence commit — a stale container reporting a fixed regression as a live one, which is indistinguishable in the output from the real thing. Rebuilt and re-run: 11/11.

**What the script cannot close, and what is therefore still the founder's:** whether the screens read correctly to a person. CM-5 adds no new screens — it changes what existing ones point at — so that residue is small, and CI's Playwright web lane already drives those surfaces through the true preview build path (859 passed). The honest statement is that the *contract* is walked and the *look* is not.

## Every ticket's acceptance criteria, rechecked against the tree

All 77 were re-read at the gate and marked, because they had been left **entirely unticked** — thirteen tickets, seventy-seven boxes, not one of them touched as the work landed. A box that was never ticked carries no information: it cannot tell a reader what shipped from what was skipped, which is the failure this section exists to end. Marks are `[x]` met, `[~]` met differently or superseded, `[ ]` genuinely open.

### Still open — five, and only two are work

**Ticket 09 AC2 — a real boundary leak, and the one worth fixing before this closes.** *"The legacy-entries port is no longer part of any module's public api."* `postcard.api.LegacyEntries` is still published and still read by **`feed` and `profile`**. Ticket 09 set out to close exactly this and did not. Roughly an hour, and it is the kind of thing that never gets done after a merge.

**Ticket 03 AC6 — a minute's work that a date depends on.** *"The courtesy fallback has a test that names its epic-map end in the test's title."* `itineraryAddress.test.ts` has three titles and none names the courtesy or its date. That title is the only thread tying the trip-id fallback to its **2026-10-10** removal; without it the fallback outlives its deadline silently.

**Ticket 12 AC1 and AC8 — open by the ticket's own admission, not by oversight.** The trip module's legacy exemption still names `postcard.legacy`, and `chat.api` / `verification.api` still map from internal types in static factories. Ticket 12's own preamble says *"until then the first AC below cannot honestly pass"*, and each guard asserts the breach **still fails**, so the day someone fixes the module its guard goes red and the real rule replaces the placeholder. Owned by the epic-map line that cuts the five old Trip Diary screens over.

**Ticket 12 AC4 — genuinely half-done.** *"Trip's internals are package-private wherever the layout allows."* The slices still carry 71 public types: `plan` 32, `editing` 11, `ownership` 9, `workspace` 8, `fork` 4, `validation` 4, `dump` 2, `cover` 1. Only `destruction` is fully sealed. The boundary guards hold regardless — they forbid the *package*, not the modifier — so this is hygiene rather than a hole, but it was asked for and is not done.

**Ticket 08 AC3 and AC4** are the founder's `dev` walk and TW-1's owed device walk. AC3 is superseded in substance by the local-stack walk recorded above; the device walk remains blocked by the recorded Gradle fault.

### Marked `[~]` — met differently, and why

The **assertion-line "listed in this ticket's comments"** criteria on 02, 05, 06, 07, 09 and 10 were never satisfied per ticket. They are satisfied **story-wide** by the assertion-line diff in this ticket, which compares 84 pre-existing test files rather than the handful each ticket touched — a stronger check than the one asked for, arriving in one place instead of six.

**Ticket 04 AC5** (*"the old fork route still answers until…"*) and **Ticket 10 AC5** / **Ticket 11 AC1** are superseded by decisions taken in flight and recorded in those tickets' own amendments: the old fork route sunset at ticket 11, and the object's three routes took the old root's name.

**Ticket 12 AC5** — `verify()` is asserted to **throw**, not pass, naming the counted `postcard` exemption. Honest rather than met.

**Ticket 08 AC5** — the PR is open as the proposal; the merge is the founder's.
