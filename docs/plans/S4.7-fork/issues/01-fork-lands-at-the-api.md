# 01 — Fork lands at the API

**What to build:** a traveler (any client) forks a published itinerary with one call and owns the result: the fork action endpoint performs the whole act in a single transaction — plan-only copy of the itinerary aggregate, workspace formed with the forker as sole owner, Fork Relationship row written — and answers 201 with the created itinerary. Everything a fork must and must not carry is decided here, server-side; no later ticket touches copy semantics.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Forking a published, visible itinerary returns 201 with the created itinerary: born `draft`, unpublished, visibility at the newborn default, forker as sole owner with an owner membership (the atomic-formation pattern)
- [x] The copy set crosses field-by-field: title **verbatim**, destination, description, standouts, best time of year, Trip Currency; every day's ordinal position and title in order; every activity's sort order, title, time-of-day, cost amount + currency, place, description, Creator Tips, external URL, booking purpose/provider/price
- [x] The exclusions are asserted, not assumed: no start/end dates, no cover, no photos on any activity, no members beyond the forker, no activity-history rows, no publish/start/complete stamps, fresh plan version, last-edited attribution = the forker at fork time
- [x] The `fork_relationship` table arrives by additive migration and the act writes one row: source itinerary id, forked itinerary id, forked-at — one hop, no update/delete path
- [x] The source must pass the audience fence: unpublished, archived, and not-visible sources refuse with the fence's own 404, and the ITs assert the refusal **code**, not the status alone
- [x] Atomicity by forced failure: when any step fails, nothing exists — no itinerary, no workspace, no membership, no relationship row (the S1.1 rollback AC pattern)
- [x] The same traveler forking the same source twice gets two independent copies and two relationship rows; no server dedupe
- [x] `itinerary_forked` fires after commit (register #2 default); no event on a refusal
- [x] Both fence-coverage scans see the new handler; the full backend IT suite is green with counts read from the summary, never the exit code

## Comments
