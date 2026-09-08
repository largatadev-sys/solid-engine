# 04: Fork acts on the Itinerary

**What to build:** forking copies the Itinerary the traveler is reading, not the plan its owner has since changed. Fork is served on the Itinerary's id by the itinerary module, which builds the new Trip from the snapshot through a creation port the trip module exposes — plan-only, as the glossary's Fork row says: no dates, cover, photos, members, history or social record, the forker its sole owner. The provenance row names the Itinerary from now on, and the page's fork count and provenance read by the Itinerary's id. Rows written before this story keep their trip ids and are left as they are. Availability is the Itinerary's audience: every signed-in traveler, not-found when the Itinerary is retired, absent, or masked by its trip's archive. The app forks through the new route and the suites move with it. The old fork route on the old root is untouched until the sunset.

**Blocked by:** 02 (The Itinerary read becomes the page), 03 (The client opens Itineraries by their own id).

**Status:** ready-for-agent

- [ ] Forking on the Itinerary's id creates a Trip from the snapshot with exactly the plan-only content the glossary's Fork row lists, born upcoming and unpublished, the forker its sole owner
- [ ] The provenance row names the Itinerary; the page's fork count and provenance answer by the Itinerary's id; rows written before this story are unchanged and their attribution resolves to nothing without an Itinerary
- [ ] A retired, absent, or archive-masked Itinerary answers not-found to a fork
- [ ] The trip module exposes a creation port and imports nothing from the itinerary module; the cycle rule stays green
- [ ] The app forks through the new route; the end-to-end suites fork through it; the old fork route still answers until the sunset
- [ ] Playwright, both lanes: fork what you read, then edit the source, and the fork is unchanged
