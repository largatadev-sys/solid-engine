# 02: The Itinerary read becomes the page

**What to build:** the Itinerary read answers everything the published page renders, for everyone ADR-034 admits. At mint the snapshot gains the pin and every activity's photo ids, and the Itinerary's table gains four columns Discover will filter on — title, destination, duration in days, cover URL — written at mint and refresh and indexed, by an additive migration. The read on the Itinerary's id widens additively with the creator card, the fork count, the provenance, the estimated cost, the pin and typed days with their activities and photo ids, beside the raw plan document. A by-trip read answers the trip's live Itinerary in the same shape. The preview route moves into the itinerary module and answers that shape too. The visibility fence CM-1 put on the read comes off: every signed-in traveler reads any Itinerary, masked as not-found for non-owners while the trip is archived. Republish refreshes the snapshot, the four columns and `publishedAt` under the same id. The trip's media audience consults the port instead of the flag, so a live Itinerary's photos load for everyone who may read it.

**Blocked by:** 01 (Published means a live Itinerary exists).

**Status:** ready-for-agent

- [ ] Reading an Itinerary by its id answers the widened shape — creator, fork count, provenance, estimated cost, pin, typed days with activities and photo ids — and the raw plan document is still present
- [ ] A stranger reads a private owner's Itinerary and loads its photos, a test that fails on the tree as it stands; the same stranger is still refused that owner's postcards
- [ ] A non-owner reading the Itinerary of an archived trip gets not-found; the owner still reads it; unarchiving restores it for everyone
- [ ] The by-trip read answers the trip's live Itinerary in the page's shape and not-found when there is none
- [ ] Preview answers the page's shape from the itinerary module, on the trip's grammar, and the old package no longer serves it
- [ ] Republish keeps the Itinerary's id and refreshes the snapshot, the four columns and `publishedAt`; the trending and ordering reads use the refreshed instant
- [ ] The migration is additive only; the four columns are filled at mint and refresh; the Itineraries already on `dev` keep null columns and render without pin and photos until republished
- [ ] The page's contract tests live in the itinerary module, and every assertion line carried over from the old projection's tests is listed in this ticket's comments
