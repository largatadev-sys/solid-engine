-- V51 — the postcard (CM-1 ticket 04, ADR-035).
--
-- The atom of the new content world: photos + caption + optional place, authored by one traveler,
-- living in AT MOST ONE diary or loose. The old diary_entry table is untouched and keeps serving
-- the shipped app; the cutover backfill (rewire story, not CM-1) will translate its rows here.
--
-- diary_id is the containment: a single nullable column IS the at-most-one-diary rule, and the
-- foreign key to diary makes ticket 05's semantics structural — a diary cannot be deleted out from
-- under its postcards by any code path, because the delete must destroy the postcards first (the
-- FK is NO ACTION, deliberately not CASCADE: a cascade would silently skip the photo cleanup that
-- the postcard's destruction owes the object store).
--
-- trip_id and activity_id are PROVENANCE, deliberately without foreign keys: a postcard must
-- survive its trip's destruction and its activity's deletion (the V27 rationale, now with no FK at
-- all — CM-1 drops even SET NULL, because "what this was posted from" is a historical fact and the
-- snapshot below is what the traveler reads; a dangling id is tolerated by every read).
--
-- activity_title / day_label / time_of_day / place snapshot the activity at post time and are never
-- rewritten — the V27 deliberate denormalization, unchanged. For a standalone postcard they are
-- NULL except place, which the traveler gives directly.
--
-- One postcard per activity per author, as a partial unique index so a double-submit race cannot
-- mint two (V27's move). Standalone postcards (activity_id NULL) are unlimited by design.
CREATE TABLE postcard (
    id             UUID        PRIMARY KEY,
    author_id      UUID        NOT NULL REFERENCES traveler (id),
    diary_id       UUID        REFERENCES diary (id),
    trip_id        UUID,
    activity_id    UUID,
    activity_title TEXT,
    day_label      TEXT,
    time_of_day    TIME,
    place          TEXT,
    latitude       NUMERIC(9,6),
    longitude      NUMERIC(9,6),
    zoom           SMALLINT,
    caption        TEXT,
    created_at     TIMESTAMPTZ NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL
);

ALTER TABLE postcard
    ADD CONSTRAINT postcard_pin_is_whole CHECK (
        (latitude IS NULL AND longitude IS NULL AND zoom IS NULL)
        OR (latitude IS NOT NULL AND longitude IS NOT NULL AND zoom IS NOT NULL)),
    ADD CONSTRAINT postcard_pin_is_on_earth CHECK (
        latitude IS NULL
        OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND zoom BETWEEN 2 AND 19));
CREATE UNIQUE INDEX postcard_one_per_activity_idx
    ON postcard (author_id, activity_id)
    WHERE activity_id IS NOT NULL;

-- Ticket 05's delete-the-contents read, and the author's own listing.
CREATE INDEX postcard_diary_idx ON postcard (diary_id) WHERE diary_id IS NOT NULL;
CREATE INDEX postcard_mine_idx ON postcard (author_id, id);
