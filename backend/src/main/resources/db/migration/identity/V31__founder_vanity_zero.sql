-- V31 — the founders take the literal 0, the grant V25 deliberately shipped empty.
--
-- V25 carried this UPDATE with a `WHERE false` predicate and a written obligation: the UUID
-- resolution needed a query against a deployed rung and the founders' handle choices were unsettled,
-- so the grant was deferred to its own migration rather than holding the rest of S4.14. This is that
-- migration. Founders have held ordinary beta numbers since 2026-08-08; after this they render `#0`
-- while everyone else renders `#nnxxxx`, which is the whole point of the badge.
--
-- FOUNDER STATUS IS DATA, NOT AUTHORITY — V25's decision, unchanged and worth restating because this
-- file is where someone will look for a founder concept. There is no founder column, no role, no
-- flag and no admin surface: the four (0, 0) rows below ARE the record. A late founder is a new
-- three-line migration, not a feature.

-- ---------------------------------------------------------------------------------------------
-- KEYED ON firebase_uid, WHICH DEVIATES FROM V25's WRITTEN INSTRUCTION — founder decision,
-- 2026-08-14, taken on the record.
--
-- V25's forward-instruction said to carry traveler UUIDs as literals. Both identifiers were resolved
-- against the named deployed database (`railway` on the deployed dev rung — the S1.1 rule: name the
-- database in any query whose answer you intend to act on), so this is a choice rather than a
-- constraint. firebase_uid wins on one property that matters:
--
--   A traveler UUID is minted PER DATABASE. `dev` is reseeded at the developer's discretion, and
--   after a reseed a UUID-keyed grant is unrecoverable from this file alone — it needs a fresh query
--   against a database whose rows did not exist when the migration was written. A firebase_uid is
--   minted per FIREBASE PROJECT, so the literals below stay true for every database that authenticates
--   against `largata-dev`, and re-applying the grant is a copy-paste of this UPDATE.
--
-- Emails are still absent, which was V25's actual constraint: emails are PII and PII never enters a
-- committed artifact (P3 extended from logs to commits). A firebase_uid is an opaque per-account
-- identifier, the same category of thing as the traveler UUID V25 was happy to commit.
--
-- V25 ITSELF IS NOT AMENDED, and cannot be: Flyway checksums the whole file including its comments,
-- and V25 has applied on the deployed dev rung. Editing even a comment would fail validation on the
-- next deploy of every rung that ran it. Its instruction therefore stands in the tree describing a
-- route this file did not take — this header is the correction, and the off-epic ledger carries it too.

-- ---------------------------------------------------------------------------------------------
-- THE RESEED CAVEAT, which no keying fixes and which is recorded rather than solved.
--
-- On a fresh database Flyway runs V1..V31 at boot, BEFORE any founder has signed in. This UPDATE
-- matches zero rows, the founders provision later as ordinary cohort-1 travelers, and the grant is
-- silently absent. That is not a defect in the keying — it is a property of doing a data grant in a
-- versioned migration, and it would be equally true of traveler UUIDs.
--
-- Solving it properly would mean a runtime founder concept consulted at provisioning time, which is
-- exactly the mechanism V25 refused and for good reason: an authority mechanism serving a cosmetic
-- badge. So the answer is operational, not architectural — after a dev reseed, re-run this UPDATE by
-- hand against `railway`. The uids are right here, which is why they are keyed this way.
--
-- PROD MINTS ITS OWN and needs its own grant at the prod-standup story: `largata-prod` is a different
-- Firebase project, so these uids match zero rows there, forever. Deliberately not attempted here.

-- ---------------------------------------------------------------------------------------------
-- The grant. Idempotent by construction — re-running sets the same two values on the same four rows.
--
-- The cohort-1 numbers these four held until now (4749, 5362, 2250, 5314) are NOT returned to the
-- pool. Never recycled means never recycled (V25's rule): those draws stay claimed and die unused,
-- costing four numbers out of ten thousand and keeping the invariant absolute. No UPDATE on
-- vanity_pool belongs in this file.
--
-- traveler_vanity_idx is PARTIAL on vanity_cohort > 0, so all four rows sharing (0, 0) is legal by
-- design rather than by exemption — founder exclusivity is a consequence of the arithmetic, since
-- allocation starts at cohort 1 and can never reach 0.
UPDATE traveler
SET vanity_cohort = 0, vanity_pool_number = 0
WHERE firebase_uid IN (
    'b1vqxxeCxsPMtDzLq0Q0DbBK3tN2',
    'FNJoED1l3bdtyfnEzIqFPKhNXp32',
    'MsZFP3WkDfWBe51RjFKd1ArY7bV2',
    'doYQwfMHC7dvUzybbcD5ps0MvdO2'
);
