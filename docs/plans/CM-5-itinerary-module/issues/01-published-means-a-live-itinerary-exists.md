# 01: Published means a live Itinerary exists

**What to build:** the trip's "published" state stops being a flag anyone writes and becomes a fact read from the Itinerary. The publication-state port that the write fence, chat, invitations and join links already consult is implemented by the itinerary module: true when an unretired Itinerary exists for the trip. A second read on the same port gives the live Itinerary's id and its `publishedAt`, and the trip record answers `published`, `publishedAt` and a new nullable `itineraryId` from it. The trip api's flag writes go, and the itinerary module stops flipping the flag when it mints or retires. The app's publish and unpublish call the itinerary module's routes and refetch the trip rather than writing the response into the cache — the shape CM-3 built and then deferred — and every end-to-end spec, the seed helper, the scripts and the seeders that publish or unpublish move to those routes with it. From this ticket on a traveler who publishes gets an Itinerary and a fenced workspace; a trip that carries only the old flag reads as unpublished and editable.

Before any change here, the two small PRs ADR-039 put ahead of the story — the cycle rule with the request-principal move, and the seven owed boundary guards — are merged and `dev` is merged into this branch.

**Blocked by:** None (can start immediately, once the two small PRs ahead of the story are on `dev`).

**Status:** ready-for-agent

- [ ] The two small PRs ahead of the story are merged and `dev` is merged into the branch before the first change of this ticket
- [ ] A trip whose Itinerary is live refuses plan edits, invitations, removals and join requests exactly as today, and retiring or hard-deleting the Itinerary lifts every one of those refusals — proven at the HTTP seam
- [ ] The trip record answers `published`, `publishedAt` and `itineraryId` from the Itinerary; a trip with no live Itinerary answers false, null, null; the field is additive on the new root
- [ ] A trip carrying the old flag with no Itinerary, seeded by raw SQL, reads as unpublished and editable
- [ ] Nothing writes the trip's `published` or `published_at` columns any more, pinned structurally in the mould of the old-entry-table read-only test
- [ ] Publishing while another member holds the editing session still refuses with the holder named; unpublishing a trip with no live Itinerary still answers success
- [ ] The app's publish and unpublish call the itinerary module's routes and refetch the trip; the client's trip-grammar guard asserts both, and the four places that branch on a missing trip are unchanged
- [ ] Every end-to-end spec, the seed helper, the scripts and the seeders publish and unpublish through the new routes; the Playwright list total is read, never the tick
- [ ] The trip module imports nothing from the itinerary module; the cycle rule stays green

## Comments

**2026-09-09 — the backend half is built and CI-green (1375 ITs + 473 unit, 0 failures, 15 quarantined).** The two pre-work PRs merged (#59, #60) and `dev` was merged into the branch first, so the first AC is met.

*What landed.* `ItineraryBackedPublicationState` replaces `RowBackedPublicationState` inside the module that owns the object; the port gains `liveFor` and `liveAmong`. `TripPlanTree` carries the publication fact so all sixteen `TripResponse` sites answer `published`, `publishedAt` and the new `itineraryId` without a parameter threaded through each, and the list endpoint takes one batch read rather than a lookup per row. The three flag writes are gone and `TripApi.markPublished`/`markUnpublished` have no caller left.

*Four readers moved onto the port because they gated on the now-dead flag and would otherwise have gone silently wrong* — the trip's media audience (which ticket 02 needs), `JoinService.isClosed`, and `PublishedVisibility`, which fork consults. That last is old-world code the second PR deletes; it is pointed at the port so the old fork route keeps answering until ticket 11 sunsets it.

*The cutover was larger than the ticket implied, and the founder ruled it at the time.* Publishing through the old root mints no Itinerary, so every test that did so correctly stopped seeing a freeze: 12 locally, then **54 more that only CI could see**. Nine of ten old-package classes needed a route rather than a repair — their publish calls funnel through a shared `act`/`walk`/`audienceOf` helper — so one edit each moved them onto the trip grammar with every assertion untouched.

**`ItineraryPublicationIT` is quarantined, not repaired** (15 tests, `@Disabled` with the reason, ledger row in BUILD_STATUS). It pins the OLD root's publish contract — its own response shape, its `audience` parameter, its 200 on unpublish — which is not the trip grammar's. Rerouting it was tried and reverted: it turned one route failure into eleven assertion failures, which is the tell that the file documents a different contract rather than a different path. Ticket 11 deletes it with the route; **if ticket 11 slips out of the story, that ledger row outlives it and the class must be deleted on its own.**

*Three of the new test's six assertions were wrong before they were right*, each time because the test had assumed a contract rather than read one: unpublish answers **204**, a title-only trip PATCH is a **400** because `destination` is `@NotBlank` (so it never reached the fence), and `ItineraryPublishedException` maps to **409**, not 403. Read the error body, not the status code.

**Still open on this ticket: the client half.** The app's publish and unpublish still call the old routes, the mutations still write the response into the trip's cache rather than refetching, and the end-to-end specs, seed helper, scripts and seeders have not moved. The trip-grammar guard has not been updated. Everything above is backend-only.
