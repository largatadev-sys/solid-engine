# 02 — Backend spine: `published_at` + the list and recommended endpoints

**Status:** ready-for-agent
**Blocked by:** None — can start immediately (parallel with 01).

**What to build:** The server side of Discovery's spine (spec decisions 1–3, 7). A signed-in traveler can ask for the browse feed and the Recommended rail and get exactly the strangers' surface: published + public + non-archived itineraries, newest-published first. `published_at` starts existing: written on every publish, bumped on republish, backfilled for the trips already published. Verified entirely at the HTTP integration-test seam — no mobile work in this ticket.

## Acceptance criteria

- [ ] An additive migration introduces `published_at`; the backfill sets it from the trip's completion stamp where present, else migration time; never-published rows stay null.
- [ ] The migration-stepping IT (own container, Flyway to n−1, legacy rows seeded via raw SQL: published-with-completion, published-without, unpublished) proves the backfill — and a sabotage run under the resource-copying invocation was demonstrated to fail before the final green (record it in Comments).
- [ ] Publishing sets `published_at`; republishing bumps it; unpublishing leaves it in place unread.
- [ ] The discovery list endpoint admits any signed-in traveler (anonymous → 401 in the standard envelope) and returns identical results for every viewer.
- [ ] Three exclusion proofs, each its own IT: a published + private trip, an unpublished trip, and an archived published trip are absent from both list and recommended.
- [ ] Ordering is newest-published first with the id tiebreaker; the cursor walks to exhaustion with no empty-page-with-a-cursor possible (scope filtering is in the query, never post-read).
- [ ] Page size defaults to 20, caps at 50, uses the established opaque-cursor shape.
- [ ] The recommended endpoint returns only published + public + non-archived itineraries that have a cover, distinct authors, at most 8, newest first.
- [ ] Full backend IT suite green, counts read from the summary, never the exit code.

## Comments
