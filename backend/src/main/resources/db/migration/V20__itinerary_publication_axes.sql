-- V20 — publication splits into three independent axes (ADR-019, founder-ruled 2026-08-03).
--
-- THE MODEL, restated because the columns are meaningless without it. Three orthogonal facts,
-- each answering a different question about the same itinerary:
--
--   state       draft | active | complete   — where the trip is in its LIFE.
--                                             Traveler-driven; forward with a one-step undo.
--   published   false | true                — is it in the DISCOVERY FEED?
--                                             Also the freeze: a published plan cannot be edited.
--   visibility  public | private            — WHO MAY READ it. Independent of the feed.
--
-- All three move independently, with one constraint between them: publishing requires
-- state = 'COMPLETED'. That gate is enforced on the TRANSITION (Itinerary.publish), never as a
-- table constraint — see THE ONE INCONSISTENCY below for the rows that make this deliberate.
--
-- WHY THIS MIGRATION IS ADDITIVE, AND WHY THAT IS NOT A COINCIDENCE. Two of the three axes are
-- already in this table:
--   * `state` has held draft/active/completed since V12. Its UI came out at the E1 promotion gate
--     and the column stayed — attribution deferred is attribution destroyed (the S1.3 rule). That
--     call pays here: the lifecycle axis needs no migration at all, only its UI back.
--   * `visibility` survives with a NARROWED meaning. It held the binary published-or-not fact;
--     it now holds only the audience half, while the feed half moves to `published`.
-- So the three-axis shape costs exactly one new column. ADR-018's intermediate `status` column is
-- never created — it existed only in local databases, and rewriting this migration was free
-- precisely because nothing deployed had ever run it.
--
-- THE REMAP IS A NARROWING, NOT A GUESS. Before this migration `visibility` held two values and
-- both split without loss:
--   * 'PUBLISHED' → published = true,  visibility = 'PUBLIC'
--     It meant readable by every authenticated traveler — which is now two facts said separately:
--     it is in the feed, AND its audience is everyone.
--   * 'PRIVATE'   → published = false, visibility = 'PUBLIC'
--     It meant *not published*, which says nothing about audience. An unpublished trip's audience
--     defaults to public, so it reads as everyone WOULD see it if it were published — and today
--     nobody does, because `published` is false. Note the word `private` therefore CHANGES MEANING
--     across this migration: it stops meaning "not published" and starts meaning "restricted
--     audience". No row can already hold the new meaning, so none is misread.
--
-- THE ONE INCONSISTENCY, TOLERATED ON THE RECORD. Every row keeps the `state` it already has, and
-- every row has 'DRAFT' — nothing has ever been completed. So a currently-published itinerary
-- lands on published = true WITH state = 'DRAFT', a combination the new gate forbids. The
-- alternative is backfilling those rows to 'COMPLETED', which would assert a trip happened when
-- none did. The honest value wins over the legal one: the gate guards the transition, so these
-- rows are readable and unpublishable rather than broken, and they self-correct the first time
-- their traveler walks the lifecycle. Defensible only because the installed base is the founders'
-- own — the same standing ground every ADR-008 waiver in this story family rests on.
--
-- INVISIBLE TO EVERY TEST SURFACE THIS REPO OWNS — the local stack is fresh-DB-every-redeploy,
-- Testcontainers boots empty schemas, CI likewise, so on all of them these UPDATEs touch zero rows
-- and report success whether the remap is right, backwards, or a typo. `ItineraryAxesBackfillIT`
-- manufactures the pre-V20 shape on its own container and asserts every arm. Same discipline as
-- V5, V13 and the CLAUDE.md rule learned at S1.1 on the first data migration this repo wrote.

-- The remap below assumes `visibility` holds exactly the two values V18 left it with. A third
-- value would pass through both UPDATEs untouched and land as a legal-looking audience nobody
-- chose, so assert the precondition rather than trusting it — V18's own opening move, for V18's
-- reason: a migration that silently mis-remaps is the quietest kind of data loss.
DO $$
DECLARE stray CONSTANT BIGINT :=
    (SELECT count(*) FROM itinerary WHERE visibility NOT IN ('PRIVATE', 'PUBLISHED'));
BEGIN
    IF stray > 0 THEN
        RAISE EXCEPTION
            'V20 expected every itinerary to read PRIVATE or PUBLISHED, found % that do not', stray;
    END IF;
END $$;

ALTER TABLE itinerary ADD COLUMN published BOOLEAN;

UPDATE itinerary SET published = (visibility = 'PUBLISHED');

-- NOT NULL after the backfill and with NO default, which is V13's shape for V13's reason: every
-- INSERT path supplies the value (Hibernate always writes the field), so a default would be dead
-- weight carrying a trap for the next migration that copies it — exactly what V3's
-- DEFAULT 'private' became, and what V18 had to remove.
ALTER TABLE itinerary ALTER COLUMN published SET NOT NULL;

-- The narrowing, and EVERY row moves — this column is being re-pointed at a different question, so
-- no old value survives unexamined. 'PUBLISHED' was never an audience; it was the feed fact wearing
-- the audience's column, and its audience was everyone, so it becomes 'PUBLIC'. The old 'PRIVATE'
-- ALSO becomes 'PUBLIC', which reads wrong until you say the two meanings out loud: it meant *not
-- published*, a fact that has just moved to `published = false`, and it said NOTHING about audience.
-- Leaving those rows on 'PRIVATE' would silently invent a restriction the traveler never chose —
-- the loudest possible bug and the quietest possible symptom, since a too-narrow audience shows up
-- as an empty screen rather than an error. Upper-case because @Enumerated(STRING) writes the enum
-- NAME; ItineraryStorageIT pins that so a later migration cannot reintroduce a lower-case form.
UPDATE itinerary SET visibility = 'PUBLIC';

-- Nothing is dropped. `visibility` keeps its column and its NOT NULL; `state` is untouched.
