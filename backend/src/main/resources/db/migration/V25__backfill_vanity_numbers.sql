-- V25 — every traveler who predates S4.14 gets a truthful vanity number (S4.14 ticket 03).
--
-- V24 added the columns nullable, so between the two migrations a traveler renders no number and
-- nothing breaks. This file closes that window for the rows that already exist. New sign-ups are not
-- its business: VanityNumberAllocator claims for them inside the provisioning transaction.
--
-- INVISIBLE TO EVERY TEST SURFACE THIS REPO OWNS, which is the whole reason VanityBackfillIT exists.
-- The local stack is fresh-DB-every-redeploy, Testcontainers boots empty schemas, CI likewise: on all
-- of them this migration runs against ZERO travelers and "passes" as a no-op, green whether the SQL
-- is right, subtly wrong, or a typo. The only database holding the rows it targets is a deployed
-- rung. VanityBackfillIT manufactures the legacy shape in its own container and actually exercises
-- it; the post-merge check on `dev` is what proves it where it ships. (S1.1's V5 lesson, restated
-- because the trap is identical and cost this repo real time the first time.)

-- ---------------------------------------------------------------------------------------------
-- 1. The month-01 pool, generated HERE rather than left to the allocator.
--
-- This is the single-allocation-path decision made concrete. If the backfill assigned numbers
-- directly and left pool generation to the first live sign-up, the generator would mint 0000-9999
-- for cohort 1 INCLUDING the numbers this migration had already handed out — and the first draw
-- landing on one of them would violate traveler_vanity_idx and fail a sign-up. Generating the pool
-- first, and claiming from it below, means there is exactly one place a number is ever issued.
--
-- ON CONFLICT DO NOTHING so a re-run is a no-op: the migration is idempotent by construction, which
-- matters on a rung where a partial earlier run may have left rows behind.
INSERT INTO vanity_pool (cohort, pool_number, draw_order)
SELECT 1, n, row_number() OVER (ORDER BY random()) - 1
FROM generate_series(0, 9999) AS n
ON CONFLICT (cohort, pool_number) DO NOTHING;

-- ---------------------------------------------------------------------------------------------
-- 2. Every existing traveler draws from that pool.
--
-- Cohort 1 for all of them, and it is not an approximation: cohort 1 IS the entire beta period by
-- decision, and every row that exists today was created before launch. Deriving from created_at
-- would produce the same answer while implying an arithmetic this migration does not need — the
-- launch date does not exist yet, so there is nothing to count months from.
--
-- The pairing is by ROW NUMBER on both sides: travelers ordered by created_at (so the earliest
-- sign-up takes the earliest draw, which is meaningless to the traveler but keeps the assignment
-- deterministic and reviewable), pool rows ordered by draw_order (the shuffle). The number a
-- traveler ends up with is therefore random, which is the point — nothing about it reveals how many
-- travelers existed when the migration ran.
WITH unnumbered AS (
    SELECT id, row_number() OVER (ORDER BY created_at, id) - 1 AS seat
    FROM traveler
    WHERE vanity_cohort IS NULL
),
draws AS (
    SELECT pool_number, row_number() OVER (ORDER BY draw_order) - 1 AS seat
    FROM vanity_pool
    WHERE cohort = 1 AND claimed_at IS NULL
)
UPDATE traveler t
SET vanity_cohort = 1, vanity_pool_number = draws.pool_number
FROM unnumbered, draws
WHERE t.id = unnumbered.id AND unnumbered.seat = draws.seat;

-- The pool rows just handed out are marked claimed, exactly as a live claim marks them. Without
-- this the numbers would sit in the pool as unclaimed and be issued a SECOND time to the next
-- sign-ups — the collision this file's structure exists to prevent, arriving through the back door.
UPDATE vanity_pool p
SET claimed_at = now()
FROM traveler t
WHERE p.cohort = 1
  AND p.claimed_at IS NULL
  AND t.vanity_cohort = 1
  AND t.vanity_pool_number = p.pool_number;

-- ---------------------------------------------------------------------------------------------
-- 3. The founders take the literal 0.
--
-- FOUNDER STATUS IS DATA, NOT AUTHORITY. There is no founder column, no role, no flag, and no admin
-- surface anywhere in the system — the (0, 0) rows below ARE the record, written once. A runtime
-- founder concept would be an authority mechanism serving a cosmetic badge, and "who may grant
-- founder status" is a question this product has no reason to answer (the influencer-program backlog
-- line is where a grantable status would live if one is ever wanted).
--
-- Identified by traveler UUID, never by email: emails are PII and PII never enters a committed
-- artifact (P3 extended from logs to commits). The UUIDs below were resolved by a one-off query
-- against the named deployed database — `railway` on the deployed dev rung, a name nothing in this
-- repo would let you guess — per the S1.1 rule that any query whose answer you intend to act on must
-- name the database it belongs to.
--
-- PER-ENVIRONMENT BY NATURE, and this is correct rather than a defect: a traveler UUID is minted per
-- database, so these literals match rows on deployed dev and nowhere else. On a fresh local DB, in
-- Testcontainers and in CI they match zero rows, the UPDATE no-ops, and founders provision there as
-- ordinary beta travelers. Production will mint its own UUIDs when the founders first sign in, so
-- prod needs its own three-line grant at the prod-standup story — deliberately not attempted here.
--
-- The numbers the founders held from step 2 are NOT returned to the pool. Never recycled means never
-- recycled: those draws stay claimed and simply die unused, which costs a handful of numbers out of
-- ten thousand and keeps the invariant absolute.
--
-- DELIBERATELY EMPTY AT S4.14, by founder decision on 2026-08-08: the UUID resolution needs a query
-- against the deployed rung and the founders' handle choices were not settled, so the grant ships as
-- its own follow-up migration rather than holding the rest of the story. Founders therefore hold
-- ordinary beta numbers until it lands — visibly wrong to exactly four people, and reversible by an
-- UPDATE, which is why it was safe to defer. VanityBackfillIT plants a founder-shaped row and proves
-- the mechanism below works; what is missing is only the data.
--
-- When that migration is written: resolve each founder's email to a traveler UUID against the named
-- deployed database (`railway` on dev - the S1.1 rule: name the database in any query whose answer
-- you intend to act on), carry the UUIDs as literals, and never the emails. Prod mints its own UUIDs
-- and needs its own grant at the prod-standup story.
UPDATE traveler
SET vanity_cohort = 0, vanity_pool_number = 0
WHERE id IN (SELECT id FROM traveler WHERE false);

-- The founders' short handles travel with that same follow-up, for the same reason and by the same
-- mechanism: a 2-character handle is below Handle.MIN_LENGTH and cannot be claimed through the app,
-- so it is written as DATA rather than unlocked in code.
--
-- Validation stays 3+ for everyone, permanently. A founder-conditional minimum - whether an if, a
-- config key, or anything else the validator consults - is an improvised entitlement check, which
-- the standing rule forbids, and it would resurrect the runtime founder concept this design exists
-- to avoid. The capability is recorded as this story's candidate-capability note ("short handle"),
-- so it becomes can(traveler, capability) when the entitlement seam ships at register #14.
--
-- What makes a planted short handle survivable is the unchanged-handle no-op in
-- TravelerProfileService: without it, a founder's own profile save fails on a handle they never
-- edited. That fix ships at S4.14 and is proven by ShortHandleSurvivesProfileSaveIT against a
-- genuinely planted 2-character handle, so the mechanism is ready and only the picks are missing.
