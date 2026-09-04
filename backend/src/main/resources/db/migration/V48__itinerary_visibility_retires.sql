-- V48 — the itinerary's visibility axis retires (S4.39 ticket 05, ADR-034).
--
-- ADR-019 gave the itinerary three axes; ADR-034 takes one back. Public/private is now a property
-- of the PROFILE (V46), and `published` is the itinerary's whole exposure: published means readable
-- by every signed-in traveler, full stop. "Published but private" no longer exists as a state a
-- traveler can be in, which is what this migration has to make true of the rows as well as the code.
--
-- THIS ONE REWRITES ROWS, so unlike V46 and V47 it owes a stepping IT — and has one
-- (ItineraryVisibilityRetirementIT, in the WorkspaceBackfillIT mould, sabotage-checked). The V5
-- lesson binds exactly here: every rung this repo owns runs against an empty database, so a
-- backfill executes against zero rows and reports success whether it is right, backwards or a typo.
--
-- WHAT HAPPENS TO A PUBLISHED-AND-PRIVATE ROW, and why it is the only defensible answer (founder's
-- ruling on a stop rule — publish semantics plus a data migration, decision 16). Those rows are
-- published to a narrowed audience. Dropping the column without touching them would silently WIDEN
-- that audience to everyone: content the owner deliberately restricted becomes world-readable by
-- our act, with no notification and no undo. So they are UNPUBLISHED instead. Nothing becomes
-- visible that was not; the owner republishes with one tap if they want the trip in Discover, and
-- that tap is theirs rather than ours.
--
-- The unpublish must be indistinguishable from the one the owner performs, or a migrated row
-- becomes a second kind of unpublished that some later query has to know about. Itinerary.unpublish()
-- writes exactly one field — `published = false` — and deliberately leaves `published_at` standing
-- (it records when the trip was LAST published, which stays true) and leaves `state` where it is
-- (the lifecycle is a separate axis; unpublishing is not a rewind). This statement does the same,
-- and the stepping IT asserts the untouched columns as carefully as the touched one.
--
-- Archived rows are handled identically and need no branch: archive already dominates every read
-- (the strangers surface and PublishedVisibility both exclude archived trips before asking anything
-- else), so an archived private-published row is invisible either way. Unpublishing it keeps the
-- one rule simple rather than minting an exception that no reader would predict.
DO $$
DECLARE unpublished CONSTANT BIGINT :=
    (SELECT count(*) FROM itinerary WHERE published AND visibility = 'PRIVATE');
BEGIN
    UPDATE itinerary SET published = false WHERE published AND visibility = 'PRIVATE';
    RAISE NOTICE 'V48 unpublished % itinerary row(s) that were published to a private audience',
        unpublished;
END $$;

-- The column goes, and with it the last place the word "private" means something about a trip.
-- Every itinerary response still carries a `visibility` field — a constant "public" now — because
-- keeping a field is never a break and old app versions live for weeks (ADR-008). The field is a
-- wire compatibility shim with no storage behind it, which is exactly what it should be.
ALTER TABLE itinerary DROP COLUMN visibility;
