-- V56 — the four columns Discover filters on (CM-5 ticket 02).
--
-- The object's plan is one TEXT blob holding JSON, which nothing can filter or sort. Discover needs
-- to answer "trips to Palawan, four days or fewer" over Itineraries rather than over the trip's
-- rows, so the facts it filters on are DENORMALIZED onto the object at mint and refreshed at every
-- republish. The grilling ruled the exact set (round 1 Q5, confirmed at slicing): title,
-- destination, duration in days, cover image url — and nothing else, because every other Discover
-- input is either the author (identity's) or the publication instant (already a column).
--
-- All four are NULLABLE, and that is the cutover rather than an oversight. The Itineraries already
-- on dev predate this migration; they keep null columns and render without them until their owner
-- republishes, which is the same no-backfill ruling the flag columns took. A null title simply
-- never matches a filter.
--
-- The index carries published_at DESC beside the filtered column because every Discover read is
-- ordered by recency inside a filter — the two-column shape answers the WHERE and the ORDER BY from
-- one scan. Partial on retired = FALSE: a retired object is off every surface by definition, so
-- indexing it would pay for rows no query can return.
--
ALTER TABLE itinerary_object
    ADD COLUMN title            TEXT,
    ADD COLUMN destination      TEXT,
    ADD COLUMN duration_days    INTEGER,
    ADD COLUMN cover_image_url  TEXT;

CREATE INDEX itinerary_object_destination_idx
    ON itinerary_object (destination, published_at DESC)
    WHERE retired = FALSE;

CREATE INDEX itinerary_object_duration_idx
    ON itinerary_object (duration_days, published_at DESC)
    WHERE retired = FALSE;

CREATE INDEX itinerary_object_live_recency_idx
    ON itinerary_object (published_at DESC)
    WHERE retired = FALSE;
