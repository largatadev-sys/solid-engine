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
