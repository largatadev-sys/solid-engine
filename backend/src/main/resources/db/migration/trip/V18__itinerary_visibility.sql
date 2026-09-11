-- V18 — the visibility fact becomes real, and V3's second lying default dies (S4.1, ADR-017).
--
-- THE COLUMN ALREADY EXISTS. V3 created `visibility TEXT NOT NULL DEFAULT 'private'` on the day the
-- itinerary was born, three epics before anything could write it — so S4.1's "additive visibility
-- column" is additive in the only sense that matters (no shipped field changes shape, every existing
-- row reads private) without adding a column. Recorded as a deviation in the spec's Comments rather
-- than manufacturing a redundant ALTER to make the ticket's wording literally true.
--
-- WHAT DOES CHANGE: the vocabulary. ADR-017 deletes `unlisted` from canon and names the second value
-- `published`; `friends_only` stays reserved for the friend graph, additively, with its reader. The
-- Java enum narrows from PRIVATE/UNLISTED/PUBLIC to PRIVATE/PUBLISHED.
--
-- NO DATA MIGRATION, and this is checkable rather than hoped for. `Itinerary.draft(...)` is the only
-- INSERT path in the application (no raw-SQL writer, no import, no COPY) and it always sets
-- Visibility.PRIVATE; `@Enumerated(STRING)` writes the enum NAME, so every row in every environment
-- holds 'PRIVATE'. Nothing has ever written 'UNLISTED' or 'PUBLIC' because no code path existed to.
-- The assertion below turns that reasoning into a guard: if the premise is false anywhere, this
-- migration fails loudly instead of leaving rows holding a value the domain can no longer read
-- (Hibernate would throw on the first read of such a row — at query time, in production, far from
-- here). It touches nothing when the premise holds, which is the point.
DO $$
DECLARE stray CONSTANT BIGINT := (SELECT count(*) FROM itinerary WHERE visibility <> 'PRIVATE');
BEGIN
    IF stray > 0 THEN
        RAISE EXCEPTION
            'V18 expected every itinerary to read PRIVATE before publish existed, found % that do not', stray;
    END IF;
END $$;

-- V3's `DEFAULT 'private'` — the same dead weight V12 removed from `state`, for the same reason and
-- with the same hazard. Hibernate always supplies the value, so this default has never once applied;
-- what it does do is sit in the schema asserting a LOWER-CASE spelling the application does not use,
-- as bait for the next migration that copies it. S1.1 nearly shipped `WHERE role = 'owner'` off
-- exactly this pattern — an index that creates successfully and enforces nothing, forever. S4.1 is
-- the next migration to touch `visibility`, so it is the one that removes the bait.
--
-- NON-DESTRUCTIVE: dropping a default alters no existing row, and NOT NULL is untouched — an INSERT
-- omitting `visibility` failed before and still fails after, which is correct for a column the
-- domain is required to populate.
ALTER TABLE itinerary ALTER COLUMN visibility DROP DEFAULT;
