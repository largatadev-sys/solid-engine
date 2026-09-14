# 01: Prefactor — the list's six facets become one batched `trip.api` call, and the per-row query dies

**What to build:** `GET /v1/trips` answers exactly what it answers today, from a fixed number of queries. Measured at the grilling, the list's controller fans out to six lookups — edit-lease state, day counts, ownership, member counts, the live publication, and the page itself — five of them batched over the page's ids and one, the workspace state, issued once per row inside the mapper. This ticket gives `trip.api` one call that answers every trip-owned facet for a list of ids in one shape, moves the per-row lookup inside it where it is batched with the others, and has the controller read that one call plus the publication-state port. Nothing on the wire moves: the response is byte-identical, the query parameters are untouched, and the point of doing this first is that ticket 02 becomes a move of one method rather than a rewrite of six. This is "make the change easy, then make the easy change" (spec decision 3).

**Blocked by:** None (can start immediately).

**Status:** done

- [x] `trip.api` exposes one call that returns, for a traveler and a list of trip ids, every facet the list renders that `trip` owns — the page, edit-lease state, day count, ownership, member count and workspace state — in a fixed number of queries regardless of page size
- [x] The list controller reads that call and the publication-state port, and nothing else
- [x] Every IT that reaches `GET /v1/trips` today passes **unedited** — zero changed assertion lines, proven by the assertion-line diff script rather than by reading
- [x] One plain IT in `trip` covers the new call: a page whose trips differ in lease state, ownership and workspace state comes back with each facet right
- [x] The workspace-state lookup no longer runs per row: the discriminating check is a query count over a page of thirty trips, read from the SQL log, not inferred from timing — **measured, and sabotage-checked on CI because Docker was unavailable locally.** `TripListFacetsIT.aPageOfThirtyTripsCostsTheSameNumberOfQueriesAsAPageOfOne` counts Hibernate's prepared statements for a page of one and a page of thirty and asserts they are equal. Restoring the per-row `stateOf(id)` loop (commit `b9cb9a8d`, reverted in the next) turned it red with **expected 7, but was 36** — the twenty-nine extra queries this ticket exists to remove, named as a number rather than a claim
- [x] Unit suite and the scoped `trip` ITs green locally; CI green on push

## Comments

*None yet.*
