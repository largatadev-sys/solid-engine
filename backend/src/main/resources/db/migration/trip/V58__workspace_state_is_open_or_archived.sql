-- V58 — the two facts that close a trip stop being stored twice (TW-2 ticket 01, ADR-040).
--
-- TWO INDEPENDENT DEAD COPIES RETIRE HERE, and they are in one migration because they are one
-- decision: a fact belongs to exactly one owner, and a stored copy of somebody else's fact is a
-- second truth waiting to disagree.
--
-- (1) THE WORKSPACE'S `COMPLETED` STATE. The workspace owns one fact — is the room open — and
-- COMPLETED is not that fact: it is a stored copy of the ITINERARY's lifecycle, written as a side
-- effect of the lifecycle transitions (complete wrote COMPLETED, reopen wrote ACTIVE). Keeping it
-- forced unarchive to be TOLD what to restore, which is the tell: a value you have to be handed
-- from elsewhere was never yours. The wire keeps all three values — `archived`, `completed`,
-- `active` — as a PROJECTION computed where the response already holds both facts, so nothing a
-- client reads moves (ADR-008 additivity is untouched; no field changes type or disappears).
--
-- The rewrite is COMPLETED -> ACTIVE, and it loses nothing: a completed trip's room is open, which
-- is exactly what ACTIVE now means, and the lifecycle it was copying is still on the itinerary row
-- where it always was. An ARCHIVED row is left alone — that IS the workspace's own fact.
--
-- (2) THE ITINERARY'S `published` AND `published_at`. CM-5 made publication mean "an unretired
-- ItineraryObject exists", and since then these two columns have been dead: nothing writes them,
-- and a guard (NothingWritesTheDeadPublicationFlagTest) existed only to keep them that way. A dead
-- column that every reader can still see is a trap with a countdown on it — the next reader to
-- reach for the obvious-looking field gets `false` for every published trip in the system and
-- nothing anywhere goes red. The guard retires with the columns it guarded.
--
-- DESTRUCTIVE BY DESIGN, WITH THE FOUNDER'S YES ON THE RECORD (grilling Q4 and Q5) — the shape
-- accepted at S4.25 for `destinations`. Nothing here can be reversed by a later migration: the
-- COMPLETED rows cannot be told apart from ACTIVE afterwards (they need not be — the lifecycle
-- says it), and the two dropped columns held no truth to lose.
--
-- THIS ONE REWRITES ROWS, so it owes a stepping IT and has one (WorkspaceStateOpenOrArchivedIT, in
-- the WorkspaceStateBackfillIT and ItineraryVisibilityRetirementIT mould, sabotage-checked). The V5
-- lesson binds exactly here: every rung this repo owns runs against an empty database, so a
-- backfill executes against zero rows and reports success whether it is right, backwards or a typo.
DO $$
DECLARE opened CONSTANT BIGINT := (SELECT count(*) FROM workspace WHERE state = 'COMPLETED');
BEGIN
    UPDATE workspace SET state = 'ACTIVE' WHERE state = 'COMPLETED';
    RAISE NOTICE 'V58 reopened % workspace row(s) that were storing the itinerary lifecycle', opened;
END $$;

-- The CHECK is what stops the third value coming back. `state` is written by Hibernate through
-- @Enumerated(STRING), so the spelling here is a contract with the enum's NAME — the V4 lesson: a
-- lower-case predicate would match nothing, create successfully, and enforce nothing at all.
ALTER TABLE workspace
    ADD CONSTRAINT workspace_state_is_open_or_archived CHECK (state IN ('ACTIVE', 'ARCHIVED'));

-- The trip stops carrying a publication flag. `itinerary_object` is the one truth (CM-5), and the
-- publication port is how everything asks.
--
-- V32's partial index is predicated on `published = true` and would be dropped implicitly by the
-- column drop. It goes FIRST and by name, because an index that serves nothing is worth retiring
-- deliberately rather than as a side effect nobody reads in a diff — and because the stepping IT
-- asserts its absence, which needs it to be a statement somebody chose to write.
DROP INDEX IF EXISTS idx_itinerary_discovery;

ALTER TABLE itinerary DROP COLUMN published;
ALTER TABLE itinerary DROP COLUMN published_at;
