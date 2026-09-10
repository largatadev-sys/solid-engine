# 06: Home reads Itineraries

**What to build:** a postcard's trip link on Home opens the Itinerary. A `feed` composition module owns both feed routes — the Home page and the per-trip-by-author page — with no table and no SQL, classified under the rule at birth. It reads the postcard api's paged query by author set (today's adapter already answers it), identity's author cards and follow set, hides private authors inside the query, and resolves each card's trip link to the Itinerary's id through the publication api, null when the trip has no live Itinerary. The `all` and `following` scopes behave as today. The old feed classes and their tests are replaced in this ticket, with the assertion lines listed.

**Blocked by:** 03 (The client opens Itineraries by their own id).

**Status:** ready-for-agent

- [x] A `feed` module exists with its allowlist guard, is listed under the rule, and owns no table and no query of its own
- [x] The Home page and the per-trip-by-author page answer as today: `all` and `following` scopes, private authors hidden in the query, cursor paging unchanged
- [x] A card's trip link is the Itinerary's id when the trip has a live Itinerary and null otherwise; the app opens it by that id
- [~] The old feed classes are deleted in this ticket; the contract tests live in the new module; every assertion line carried over is listed in this ticket's comments
- [x] Playwright, both lanes: Home, both scopes, a trip link opening the Itinerary
