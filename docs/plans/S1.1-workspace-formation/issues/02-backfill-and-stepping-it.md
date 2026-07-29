# 02 — Backfill migration + the migration-stepping IT

**What to build:** every pre-E1 itinerary gains a workspace + owner membership via a versioned Flyway data migration — and the migration is proven against the legacy data shape *before* it ever meets dev's real rows, because no existing test surface can do that (spec §The backfill's testing trap: fresh-DB local stack and empty Testcontainers schemas both run it as a no-op).

1. **The migration:** `INSERT … SELECT` from `itinerary` for every itinerary without a workspace (`WHERE NOT EXISTS` — correct against dev's legacy rows *and* a safe no-op on fresh DBs), then owner memberships from `itinerary.owner_id`. **Timestamps inherited:** workspace `created_at` and owner `joined_at` = the itinerary's `created_at` — history reads as if atomic formation had always been true; migration-time stamps would fabricate an "everyone joined on migration day" artifact.
2. **The migration-stepping IT (this ticket's core deliverable):** boot a container with Flyway targeted to the version *before* the backfill · insert legacy-shaped itineraries via SQL (itineraries with no workspace rows) · apply the backfill · assert every itinerary gained a workspace + owner membership with inherited timestamps, and that pre-existing workspaces (ticket 01's formation) were left alone (AC 5).
3. **Ordering guarantee, stated in the migration's comment:** Flyway completes this before the app serves a request, which is what lets ticket 03 delete the owner resolver with no fallback — a reader who wonders why there is no runtime safety net is pointed at the spec and ADR-011.

**Blocked by:** 01 (the tables it populates).

**Status:** done (2026-07-17) — stepping IT green, and verified by sabotage

- [x] V5 — `WHERE NOT EXISTS` on both inserts, timestamps inherited from the itinerary
- [x] **Ids are UUIDv7 assembled from the itinerary's instant**, not `gen_random_uuid()` (which mints v4s). Every other id here is v7 and V3 records why that is load-bearing — the list paginates on `ORDER BY id DESC` *because* v7 sorts by creation time. A v4 would work today and leave a silent inconsistency in data, which outlives code.
- [x] `WorkspaceBackfillIT` (6) — Flyway to V4, legacy rows seeded via raw SQL, V5 applied; rows, owners and inherited timestamps asserted. **Its own container**, not `PostgresTestBase`'s singleton: that one is shared by the whole run and fully migrated before this class loads, and stepping it would corrupt every other test's schema (the recorded S0.1 gotcha).
- [x] Pre-existing workspaces left alone (the dev-rung case: an itinerary formed between deploys)
- [x] Re-running the migration's own SQL (read from the classpath, never paraphrased) changes nothing
- [x] Fresh-DB no-op confirmed (full suite green on empty schemas)
- [x] **The test earns its keep — proven, not assumed:** V5's timestamps sabotaged to `now()` → `backfilledTimestampsAreInheritedFromTheItineraryNotTheMigration` fails with the right diagnosis (*expected 2026-03-01, but was 2026-07-17*); restored → green. A migration test that passes against a no-op is worse than none.
