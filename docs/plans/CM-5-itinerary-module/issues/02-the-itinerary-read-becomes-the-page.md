# 02: The Itinerary read becomes the page

**What to build:** the Itinerary read answers everything the published page renders, for everyone ADR-034 admits. At mint the snapshot gains the pin and every activity's photo ids, and the Itinerary's table gains four columns Discover will filter on — title, destination, duration in days, cover URL — written at mint and refresh and indexed, by an additive migration. The read on the Itinerary's id widens additively with the creator card, the fork count, the provenance, the estimated cost, the pin and typed days with their activities and photo ids, beside the raw plan document. A by-trip read answers the trip's live Itinerary in the same shape. The preview route moves into the itinerary module and answers that shape too. The visibility fence CM-1 put on the read comes off: every signed-in traveler reads any Itinerary, masked as not-found for non-owners while the trip is archived. Republish refreshes the snapshot, the four columns and `publishedAt` under the same id. The trip's media audience consults the port instead of the flag, so a live Itinerary's photos load for everyone who may read it.

**Blocked by:** 01 (Published means a live Itinerary exists).

**Status:** ready-for-agent

- [x] Reading an Itinerary by its id answers the widened shape — creator, fork count, provenance, estimated cost, pin, typed days with activities and photo ids — and the raw plan document is still present
- [x] A stranger reads a private owner's Itinerary and loads its photos, a test that fails on the tree as it stands; the same stranger is still refused that owner's postcards
- [x] A non-owner reading the Itinerary of an archived trip gets not-found; the owner still reads it; unarchiving restores it for everyone
- [x] The by-trip read answers the trip's live Itinerary in the page's shape and not-found when there is none
- [x] Preview answers the page's shape from the itinerary module, on the trip's grammar, and the old package no longer serves it
- [x] Republish keeps the Itinerary's id and refreshes the snapshot, the four columns and `publishedAt`; the trending and ordering reads use the refreshed instant
- [x] The migration is additive only; the four columns are filled at mint and refresh; the Itineraries already on `dev` keep null columns and render without pin and photos until republished
- [~] The page's contract tests live in the itinerary module, and every assertion line carried over from the old projection's tests is listed in this ticket's comments

## Comments

**2026-09-09 — built, backend CI green (1381 ITs, up 6; 473 unit; 0 failures).**

*The audience change is the one worth reading twice.* CM-1's `PublicationController` consulted the authored-content fence on the object read, so a private owner's Itinerary answered `PROFILE_PRIVATE` to a stranger. ADR-034 decision 2 says the opposite, and the founder settled it in one line at the grilling. The fence is gone; `PublicationContractIT`'s assertion was **inverted rather than deleted**, so the rule stays pinned and now states canon. Archive still masks the page for non-owners — today's posture, unchanged.

*What the snapshot needed.* Pin and per-activity photo ids, so a page renders without reaching back into the trip's rows. That meant widening `TripPlan` additively and batching photo ids through a **new `PhotoService.idsBySubject`** — `PhotoRepository` is package-private and the boundary was right to refuse the shortcut.

*V56* adds the four Discover columns, nullable by design (the Itineraries already on `dev` keep nulls until republished — the same no-backfill ruling the flag columns took), with three partial indexes on `retired = FALSE` carrying `published_at DESC` beside the filtered column so a filter and its ordering answer from one scan.

**Two boundary guards caught real breaches mid-build, and both were fixed rather than exempted.** `ItineraryPageResponse` borrowed `trip.fork.ForkedFromResponse` from behind trip's front door — publication now owns its own provenance record and reads the facts through a **new `ForkApi` in `trip.api`**, which is also the seam ticket 04 needs. And `ProfileFenceCoverageTest` flagged `PublicationController` the moment it stopped consulting the fence; it leaves that list, which is the bookkeeping the test exists for.

*Assertion carried over from the old projection's tests:* the estimated-cost rules (zero-priced activities do not count toward the total, mixed currencies yield no total, an explicit zero is a stated price, partial when some activities are unpriced) are re-derived from the snapshot in `ItineraryPageService` rather than from `DayView`. `PublishedProjectionIT` still holds the originals until ticket 10 deletes it, so the two are provable side by side.

**Not done here, and it belongs to ticket 03:** the client still reads the old projection route, so nothing a traveler sees has moved yet.
