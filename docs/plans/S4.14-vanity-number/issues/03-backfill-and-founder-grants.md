# 03 — Backfill + founder grants

**What to build:** every traveler who existed before this story holds a truthful vanity number, and the founders hold `(0, 0)` plus their chosen 2-character handles — all as one data migration, with the migration-stepping test rig this repo requires for any backfill (on every other test surface a backfill runs against zero rows and "passes" as a no-op).

**Blocked by:** 01 (schema and claim mechanism), 02 (the handles this plants must not brick the founders' profile editing).

**Status:** ready-for-agent

- [ ] **Owner inputs collected first, never committed:** founder emails resolved to traveler UUIDs by a one-off query that names the deployed dev database (the S1.1 rule); each founder's chosen 2-character handle (lowercase shape, not on the reserved list). Only the UUIDs enter the migration.
- [ ] The backfill migration generates month-`01`'s pool itself and claims from it for every existing traveler without a number (cohort derived from each row's creation timestamp), then grants `(0, 0)` and the chosen handle to each founder-UUID literal. One allocation path — backfilled numbers can never collide with live claims.
- [ ] Migration-stepping integration test, own container (never the shared singleton): stepped to the prior version, legacy travelers seeded by raw SQL *including rows bearing the founder-UUID literals*, stepped to head — cohorts truthful, founders `(0, 0)` with their short handles, every backfilled number absent from the remaining pool.
- [ ] The sabotage check is run with the resource-recompiling invocation and confirmed to **fail** before it is confirmed to pass.
- [ ] On a database where the founder UUIDs match nothing (every fresh local DB, CI), the founder grant no-ops silently and the migration still succeeds — asserted.
- [ ] A founder row with the planted short handle is invitable by that handle (the lookup path only normalizes — asserted end-to-end).
- [ ] Local rehearsal per the S1.1 pattern: plant a legacy traveler in the running local stack, apply the migration by hand, observe the number and handle land.
