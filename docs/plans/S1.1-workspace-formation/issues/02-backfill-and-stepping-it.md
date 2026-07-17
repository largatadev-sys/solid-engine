# 02 — Backfill migration + the migration-stepping IT

**What to build:** every pre-E1 itinerary gains a workspace + owner membership via a versioned Flyway data migration — and the migration is proven against the legacy data shape *before* it ever meets dev's real rows, because no existing test surface can do that (spec §The backfill's testing trap: fresh-DB local stack and empty Testcontainers schemas both run it as a no-op).

1. **The migration:** `INSERT … SELECT` from `itinerary` for every itinerary without a workspace (`WHERE NOT EXISTS` — correct against dev's legacy rows *and* a safe no-op on fresh DBs), then owner memberships from `itinerary.owner_id`. **Timestamps inherited:** workspace `created_at` and owner `joined_at` = the itinerary's `created_at` — history reads as if atomic formation had always been true; migration-time stamps would fabricate an "everyone joined on migration day" artifact.
2. **The migration-stepping IT (this ticket's core deliverable):** boot a container with Flyway targeted to the version *before* the backfill · insert legacy-shaped itineraries via SQL (itineraries with no workspace rows) · apply the backfill · assert every itinerary gained a workspace + owner membership with inherited timestamps, and that pre-existing workspaces (ticket 01's formation) were left alone (AC 5).
3. **Ordering guarantee, stated in the migration's comment:** Flyway completes this before the app serves a request, which is what lets ticket 03 delete the owner resolver with no fallback — a reader who wonders why there is no runtime safety net is pointed at the spec and ADR-011.

**Blocked by:** 01 (the tables it populates).

**Status:** ready-for-agent

- [ ] Backfill migration — `WHERE NOT EXISTS`, timestamps inherited from the itinerary
- [ ] Stepping IT: legacy rows seeded at V(n−1), applied at V(n), rows + timestamps asserted
- [ ] Stepping IT: ticket-01-formed workspaces untouched by the backfill
- [ ] Fresh-DB no-op confirmed (full suite green on empty schemas)
