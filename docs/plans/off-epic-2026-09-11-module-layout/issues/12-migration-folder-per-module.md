# 12: a migration folder per module

**What to build:** the schema reads by module the way the code does. The 56 migrations move into a folder per module under the migration root, version numbers still global, one Flyway bean, the configured locations unchanged — Flyway records name and checksum rather than path, so the files move without a repair, and it scans a classpath location recursively, which the six migration-stepping ITs rely on. No SQL changes; the diff is nothing but renames. This is the cheap half of ADR-039 decision 6; the foreign keys are the FK-drop story and are not touched.

**The assignment rule.** A migration lives with the module that owns the table it creates. One that only alters lives with the owner of the altered table. One that writes across two modules' tables — the workspace backfill, the entries-become-postcards move — lives with the module ADR-038 records as owning that transaction, and the commit message says which and why. The traveler, vanity pool, follow and follow-request tables are `identity`'s; photo is `media`'s; the workspace, membership, edit lease, ownership offer and transfer, day, activity, activity history and fork tables and the trip table are `trip`'s; the itinerary object is `itinerary`'s; the legacy diary-entry table is `postcard`'s; chat, poll, invitation, join, report and verification own their own.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Every migration sits in a module folder and the migration root holds none; moves by `git mv`
- [ ] `mvn -o test-compile` before any run — an edited resource never reaches the build output without it, and a moved one is an edited one
- [ ] The six migration-stepping ITs pass unedited: they are the proof that recursive scanning holds for a test-configured Flyway as well as for Boot's
- [ ] CI's clean-checkout `docker compose up` boots against a fresh database and the schema history shows 56 rows applied — read from the run, not assumed
- [ ] The epic map's FK-drop line gains a *cheap half built* note in the same PR
- [ ] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments
