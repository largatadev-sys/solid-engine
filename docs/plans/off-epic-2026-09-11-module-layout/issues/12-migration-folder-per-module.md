# 12: a migration folder per module

**What to build:** the cheap half of the FK-drop line (ADR-039 decision 6): the 56 files under `backend/src/main/resources/db/migration/` move into `db/migration/<module>/`, version numbers still global, one Flyway bean, `spring.flyway.locations` unchanged. Flyway records name and checksum, not path, so the existing files move without a repair; and it scans a `classpath:` location recursively, which the migration-stepping ITs rely on through their `.locations("classpath:db/migration")`. No SQL changes. This is not a stop-rule item — nothing about the schema moves — but it is a migration-adjacent change and is its own PR so the diff is nothing but renames.

**The assignment rule.** A migration lives with the module that owns the table it creates. One that only alters lives with the owner of the altered table. One that writes across two modules' tables (`V5__backfill_workspaces`, `V54__entries_become_postcards`) lives with the module ADR-038 records as owning that transaction, and the commit message says which and why. `traveler`, `vanity_pool`, `follow` and `follow_request` are `identity`'s; `photo` is `media`'s; `edit_lease`, `workspace`, `membership`, `ownership_offer`, `ownership_transfer`, `day`, `activity`, `activity_history`, `fork_relationship` and the trip table are `trip`'s; `itinerary_object` is `itinerary`'s; `diary_entry` is `postcard`'s (the legacy table it still owns).

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] Every file under `db/migration/` sits in a module folder; the root holds none
- [ ] `mvn -o test-compile` before any run — an edited resource never reaches `target/classes` without it (S4.13), and a moved one is an edited one
- [ ] The migration-stepping ITs pass unedited: `DiarySteppingIT`, `DiaryDaySteppingIT`, `ItineraryObjectSteppingIT`, `EntryBackfillSteppingIT`, `VanityBackfillIT`, `FounderVanityGrantIT` — they are the proof that recursive scanning holds for a test-configured Flyway as well as for Boot's
- [ ] `docker compose up -d --build` boots against a fresh database and `flyway_schema_history` shows 56 rows applied — the CI clean-checkout job does this on the push; read it rather than assuming
- [ ] The epic map's FK-drop line gains a *cheap half built* note in the same PR

## Comments
