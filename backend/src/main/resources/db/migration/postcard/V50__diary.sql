-- V50 — the diary (CM-1 ticket 03, ADR-035).
--
-- The diary becomes an ENTITY, superseding V27's "a diary is a projection" ruling for the new
-- world (the old entries table is untouched; ADR-024's projection keeps serving the shipped app
-- until the rewire). What changed since V27 wrote that rationale: the founder ruled a diary is an
-- album of postcards a traveler can create with nothing but a title — no trip, no itinerary — and
-- a projection over trip-scoped entries cannot represent a collection that has no trip.
--
-- trip_id carries the trip a diary was auto-minted for, and NULL means standalone. No foreign key,
-- deliberately: a member's diary must survive the owner destroying the trip (CM-1's structural-
-- survival rule), so nothing may cascade here and a dangling trip_id afterwards is the design.
--
-- One trip diary per traveler per trip, as a partial unique index rather than a service check, so
-- a double-post race cannot mint two trip diaries (the V27 one-per-activity move, one level up).
-- The predicate excludes NULL because standalone diaries are unlimited by design.
--
-- author_id references traveler (a keeper table): authorship is the only authority over content,
-- and the author outlives every trip they tell.
CREATE TABLE diary (
    id         UUID        PRIMARY KEY,
    author_id  UUID        NOT NULL REFERENCES traveler (id),
    trip_id    UUID,
    title      TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX diary_one_per_trip_idx
    ON diary (author_id, trip_id)
    WHERE trip_id IS NOT NULL;

-- The author's listing pages in the standard cursor shape over UUIDv7 ids.
CREATE INDEX diary_mine_idx ON diary (author_id, id);
