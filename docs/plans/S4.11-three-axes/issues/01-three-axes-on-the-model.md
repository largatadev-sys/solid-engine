# 01 — The three axes on the model

**Status:** done *(built ahead of ticketing — process slip, recorded rather than hidden)*

**What to build:** the model stops fusing three questions into one column. `state` (V12's dormant lifecycle) is reactivated as the trip's life; `published` is a new boolean carrying the discovery fact and the freeze; `visibility` survives with a narrowed meaning, holding only the audience. V20 is rewritten additively — it was never run outside throwaway local databases, so the intermediate `status` column is never created. Publishing requires `state = COMPLETED`, enforced on the aggregate's transition. While published the lifecycle is pinned. `reopen()` steps back exactly one state and clears the stamp it undoes (spec decisions 1, 2, 3, 6; ADR-019).

**Blocked by:** None.

- [x] V20 adds one column and drops nothing; `ItineraryAxesBackfillIT` steps Flyway 19→20 on its own container and asserts every arm
- [x] The backfill IT is **sabotage-verified** — the migration was broken deliberately and the test failed with the right diagnosis
- [x] A guard block refuses any `visibility` value the remap cannot classify, rather than passing it through silently
- [x] Publishing a `draft` or `active` trip → 409 `ITINERARY_NOT_COMPLETE`, naming the current state
- [x] A published trip refuses every lifecycle transition until unpublished; unpublish frees it and leaves `state` where it was
- [x] `reopen` steps back one state and refuses a second step from `draft`
- [x] The audience toggles `public ⇄ private` in either direction, published or not, touching neither other axis
- [x] `published + private` is readable by collaborators and masked (404) for a stranger; `complete + unpublished` has no page at all
- [x] The workspace mirror gains `markActive`, so `reopen` cannot leave V13's denormalized copy stale
- [x] `ItineraryState.PUBLISHED` — a stale fourth value from before publication was its own axis — is deleted
- [x] Wire carries `state` + `published` + `visibility`; `TripCategory` maps to the lifecycle; `/reopen` and `/audience` land additively
- [x] Backend green: 108 unit + 459 integration
