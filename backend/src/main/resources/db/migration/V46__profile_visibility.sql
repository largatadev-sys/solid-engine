-- V46 — Profile Visibility on the traveler (S4.39 ticket 01, ADR-034).
--
-- Additive and complete in one statement: a column with a NOT NULL default, so every existing row
-- is `PUBLIC` the moment the migration lands and every new row is `PUBLIC` without the writer
-- saying so. This is not a backfill and needs no stepping IT — the V15/V40/V41 reasoning applies
-- unchanged (the V5 lesson binds where rows must be REWRITTEN, and here none are). The default IS
-- the decision: spec decision 11 says nobody becomes private by our act, only by their own.
--
-- TEXT rather than a Postgres enum, matching `itinerary.state` and every other enum column in this
-- schema: Hibernate's @Enumerated(STRING) writes the enum's NAME, so the storage spelling is
-- 'PUBLIC' / 'PRIVATE' upper case, and a Postgres enum would buy a second place to keep that
-- spelling in step for no gain. The spelling is a contract between Hibernate and any SQL that names
-- it, so ProfileVisibilityStorageIT pins it (the @Enumerated gotcha: a WHERE on the wrong casing
-- matches zero rows, creates cleanly, and enforces nothing).
--
-- A CHECK rather than trusting the application: the read rule that fences every private surface
-- branches on this value, so a third spelling arriving from a future migration or a hand-run UPDATE
-- would fail open — the traveler would read as public. The constraint makes that unreachable.
--
-- No index YET, and the reason is a measurement nobody has taken rather than a claim that none is
-- needed. Two shapes read this column. The per-pair check rides the profile read's own primary-key
-- fetch and costs nothing extra. The set shape — the hidden-author set the Home feed subtracts —
-- DOES scan the private population: it asks for every private traveler except the viewer, then
-- removes the ones the viewer follows, and hands the remainder to the feed query as a NOT IN list.
-- That is deliberate and it is the only shape that keeps cursor pagination exact, because the
-- filter has to be IN the query (a page must be `limit` VISIBLE rows, and you cannot know a page's
-- authors before you have run it). It is also the shape that will need an index first: a partial
-- index on the private rows is the obvious move, and the seq scan is cheap only while the private
-- population is small. The epic map owns the trigger; do not add the index speculatively, and do
-- not "optimise" this into a post-filter in Java, which would silently shorten pages.
ALTER TABLE traveler
    ADD COLUMN profile_visibility TEXT NOT NULL DEFAULT 'PUBLIC';

ALTER TABLE traveler
    ADD CONSTRAINT traveler_profile_visibility_is_known
        CHECK (profile_visibility IN ('PUBLIC', 'PRIVATE'));
