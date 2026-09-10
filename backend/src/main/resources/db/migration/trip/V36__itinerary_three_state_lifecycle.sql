-- V36 — the lifecycle loses its first rung: every trip is born `upcoming` (S4.26, ADR-029).
--
-- THE LADDER, before and after:
--
--   V21:  draft → upcoming → ongoing → completed
--   V36:          upcoming → ongoing → completed
--
-- WHY `draft` DIES. V21 minted `upcoming` to hold "planning is finished", which gave the create
-- flow its terminal act — Finish Planning. S4.24 (edit-in-place) then drained the distinction of
-- its last mechanical meaning: editing the plan needs no state, so `draft` came to mean nothing a
-- traveler could act on and nothing the server gated. A ceremony that gates nothing is a step the
-- traveler pays for and the product does not use, so the state and its act retire together.
--
-- WHY THE REMAP IS INSEPARABLE FROM THE ENUM CHANGE. `ItineraryState` drops DRAFT in the same
-- commit. An unremapped row is then unreadable — Hibernate fails to deserialize `DRAFT` into an
-- enum that no longer declares it, and it fails at READ time, far from here, as a trip that
-- 500s rather than a migration that complained. The two move together or neither moves.
--
-- WHERE THE ROWS ARE. Deployed `dev` is the only database that has ever held rows this migration
-- can find: local runs a fresh DB every redeploy, Testcontainers boots empty, and CI likewise — so
-- against every rung this repo tests on, this file is a no-op that "passes" whether it is right,
-- subtly wrong, or a typo (the S1.1 lesson). `ItineraryThreeStateRemapIT` manufactures the pre-V36
-- shape on its own container and asserts the remap, and it was sabotaged once under
-- `mvn -o test-compile failsafe:integration-test` — the `test-compile` is not optional, because
-- failsafe alone never copies an edited .sql to target/classes and would silently step the LAST
-- build's file (the S4.13 lesson).

-- Assert the precondition rather than trusting it — V18/V20/V21's opening move, for their reason.
-- A value this migration cannot classify passes the UPDATE untouched and lands as a state the enum
-- can no longer parse: the read-time failure described above, with nothing naming a migration.
DO $$
DECLARE stray CONSTANT BIGINT :=
    (SELECT count(*) FROM itinerary WHERE state NOT IN ('DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED'));
BEGIN
    IF stray > 0 THEN
        RAISE EXCEPTION
            'V36 expected every itinerary to read DRAFT, UPCOMING, ONGOING or COMPLETED, found % that do not',
            stray;
    END IF;
END $$;

-- Upper-case because @Enumerated(STRING) writes the enum NAME. `ItineraryLifecycleStorageIT` pins
-- that spelling; V3's `DEFAULT 'draft'` was the lower-case trap, removed at V12.
--
-- A draft trip is one whose planning was never declared finished — which after this story is simply
-- how every trip starts. `upcoming` is the birth state, so a draft row lands where it would have
-- been created today. Nothing is lost: `started_at` and `completed_at` are already NULL on any row
-- reading DRAFT (the forward ladder is the only writer of either), so no stamp needs clearing.
UPDATE itinerary SET state = 'UPCOMING' WHERE state = 'DRAFT';

-- Nothing is added and nothing is dropped: the lifecycle has always been one TEXT column, and a
-- value the application no longer writes costs no schema. The column keeps no CHECK constraint to
-- narrow — the enum is the constraint, and it now declares three names.
