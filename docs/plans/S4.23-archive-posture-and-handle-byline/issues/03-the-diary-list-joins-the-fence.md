# 03 — The diary list joins the fence

**What to build:** Spec decision 2 — the active bug. The diary-trips query stops grouping entries by traveler id alone and joins membership and workspace state, so `/v1/me/diary/trips` returns exactly the trips whose diary the caller can open: archived excluded unless the caller owns the trip, departed/removed trips excluded outright. The cursor is a keyset on entry id and must come through undisturbed — the filter lives in the query, never post-pagination. The read stays identity-scoped (no Membership, no proof — its authorization *is* this query; the spec's second asserted default). The enrichment pass and the page envelope are unchanged: same shape, fewer rows.

**Blocked by:** None — a repository-and-query change, disjoint from 01/02's seams.

**Status:** done

- [x] New IT beside the existing diary contract family, three arms: a non-owner member's archived trip is absent; the owner's archived trip is present; a departed member's trip is absent (spec AC 5).
- [x] The existing owner pin (*an archived trip's entries still appear in my diary*) passes unmodified.
- [x] Live-trip rows, ordering and the cursor envelope are unchanged — a paged walk over mixed live/archived/departed data pages cleanly with the standard shape (spec AC 5).
- [x] Sabotage before trusting: drop the archive predicate and confirm the member arm fails; drop the membership join and confirm the departed arm fails.
