-- V13 — the Trip Workspace's `state` column, and the backfill that makes it true for rows that
-- predate it (S1.9, Artifact 02's workspace machine `active → completed → archived`).
--
-- THE COLUMN THAT DEFERRED THREE TIMES. Register #12 pointed it at "the first story that reads a
-- state value" and named S1.2; S1.2 deferred to S1.7; S1.7 turned out to read only *itinerary*
-- state and deferred again, to the archive story. This is that story: S1.9's write fence reads
-- `ARCHIVED` and the trip list filters on it, so the column finally has readers and ships. The
-- discipline was right each time — until `archived` existed, workspace state was fully derivable
-- from the itinerary's (the relationship is 1:1) and storing it would have duplicated a fact.
--
-- NO DEFAULT, deliberately, and this is the migration that pays V3's lesson forward. V3 wrote
-- `state TEXT DEFAULT 'draft'` on `itinerary`; Hibernate always supplied the value, so the default
-- never once applied — but its lower-case spelling sat in the schema as a trap for "the next
-- migration that copies it" (the CLAUDE.md gotcha), and at S1.1 it nearly produced a partial index
-- on `WHERE role = 'owner'` matching zero rows forever. V12 dropped it. This column is born without
-- one: every INSERT path supplies the value (formAround, and the backfill below), so a default
-- would be dead weight carrying a spelling trap.
--
-- THE SPELLING IS THE ENUM'S NAME. `@Enumerated(STRING)` writes `ACTIVE`, not `active` — a silent
-- contract between Hibernate and any SQL that names these values. Asserted in WorkspaceStorageIT so
-- a later migration cannot quietly reintroduce the lower-case form.

ALTER TABLE workspace
    ADD COLUMN state TEXT;

-- ---------------------------------------------------------------------------------------------
-- The backfill.
--
-- INVISIBLE TO EVERY TEST SURFACE THIS REPO OWNS, which is exactly why it has a dedicated test.
-- The local stack is fresh-DB-every-redeploy, Testcontainers boots empty schemas, CI likewise: on
-- all of them this UPDATE touches zero rows and reports success whether the mapping is right,
-- subtly wrong, or a typo. The only database holding rows it targets is a deployed rung — and
-- deployed `dev` has completed trips from S1.7's verification right now. `WorkspaceStateBackfillIT`
-- manufactures the legacy shape on its own container and asserts the mapping; the post-merge probe
-- proves it where it ships. (Same family as S0.2's getTokens(): green everywhere except the one
-- environment that matters. The rule is CLAUDE.md's, learned at S1.1 on the first data migration
-- this repo ever wrote.)
--
-- THE MAPPING IS DERIVATION, NOT INVENTION. Until this migration, workspace state *was* the
-- itinerary's state — 1:1, S1.7's recorded reasoning for deferring the column. So the honest
-- initial value for every existing row is the one that derivation would have produced:
--   * itinerary `COMPLETED` → workspace `COMPLETED` (canon's "mirrors the itinerary completing")
--   * anything else         → workspace `ACTIVE`
-- No row can be `ARCHIVED`: archive has never existed, so nothing has ever been archived. A
-- migration that could produce one would be inventing history.
--
-- `PUBLISHED` is deliberately absent from the mapping and would fall to ACTIVE — correctly. The
-- state does not exist yet (S4.1 owns it), and when it arrives the publish story decides what a
-- published trip's workspace is; guessing here would be canon by side effect.
UPDATE workspace w
SET state = CASE
        WHEN i.state = 'COMPLETED' THEN 'COMPLETED'
        ELSE 'ACTIVE'
    END
FROM itinerary i
WHERE i.id = w.itinerary_id;

-- A workspace whose itinerary vanished cannot exist (S1.1's atomic formation; nothing deletes
-- itineraries — S1.9 is archive, and permanent deletion is parked). The UPDATE above therefore
-- covers every row, and this line is what makes that a guarantee rather than an assumption: if some
-- row escaped the join, NOT NULL fails the migration loudly here rather than leaving a null state
-- the fence would later read as "not archived" — silently permitting writes on a frozen trip.
ALTER TABLE workspace
    ALTER COLUMN state SET NOT NULL;
