# 05: Discover reads Itineraries

**What to build:** Discover shows Itineraries, and its count always equals its list. A `discovery` composition module owns every Discover route with no table and no SQL of its own, classified under the boundary rule at birth with an allowlist guard. Browse and count are answered by one itinerary api call whose SQL predicate serves both, taking the viewer's hidden-owner set and the archived-trip set as inputs so nothing is filtered after the fact. Trending destinations, the recommended rail and the title and destination suggestions read the same api over the Itinerary's columns; people search reads identity. Cards carry the Itinerary's id and open the page by it. The old discovery classes and their tests are replaced in this ticket, with the assertion lines they carried listed so the gate can diff them.

**Blocked by:** 03 (The client opens Itineraries by their own id).

**Status:** ready-for-agent

- [x] A `discovery` module exists with its allowlist guard, is listed under the rule in the module meta-test, and owns no table and no query of its own
- [x] Browse and count answer from one itinerary api call with a shared predicate, and the count equals the list under every filter, cursor page, hidden owner and archived trip — including the case that failed at S4.39
- [x] Trending, recommended, suggestions and people answer as they do today, over Itineraries and identity
- [x] Cards carry the Itinerary's id and the app opens them by it
- [~] The old discovery classes are deleted in this ticket; the contract tests live in the new module; every assertion line carried over is listed in this ticket's comments
- [x] Playwright, both lanes: Discover over Itineraries, filters and count included
