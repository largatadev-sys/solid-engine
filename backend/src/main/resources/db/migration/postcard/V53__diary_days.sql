-- V53 — the diary re-cut to the day grain (CM-2 ticket 01, ADR-036).
--
-- CM-1 built a diary as a title and a bag of postcards. The founder's model for CM-2 is one level
-- deeper and mirrors the plan side exactly: Trip → Day → Activity becomes Diary → Diary Day →
-- Postcard. A diary is a trip that was taken rather than planned, so it carries what a trip
-- carries — a destination and the dates it spanned — and its postcards hang off days.
--
-- destination is nullable and start_date/end_date are NOT: the memory setup asks for the dates
-- before it will create anything (they are what mints the candidate days), while the destination is
-- optional on the form. The two dates therefore need a backfill value for CM-1's existing rows,
-- and created_at::date is the only honest one available — a CM-1 diary never recorded when its
-- trip happened, so the day it was written is the closest true fact. The check that end is not
-- before start is added AFTER the backfill so it cannot refuse rows the backfill itself wrote.
--
-- diary_day mirrors the plan's day table and diverges in one deliberate way: the ordinal is DERIVED
-- FROM THE DATE, never sequential. Filling Mar 15, 16 and 19 of a Mar 15–19 diary reads Day 1,
-- Day 2, Day 5 — a skipped day leaves a gap rather than renumbering its neighbours, because the
-- traveler is numbering the days of their trip and not the cards they happened to write. The
-- ordinal is stored rather than computed on read so a day keeps its number if the diary's start
-- ever moves; the service, not the database, is what derives it at birth.
--
-- date is unique per diary — one day per date, a second is refused by name — and that is the
-- constraint the ordinal rule leans on: distinct dates in one range cannot collide on an ordinal.
--
-- trip_day_id and trip_day_title snapshot the plan day a derived diary day was minted from, in the
-- V51 spirit: provenance without a foreign key, because a member's diary outlives the owner
-- destroying the trip, and the snapshot is what the traveler reads afterwards.
--
-- The diary FK is NO ACTION for V51's reason, one level up: a diary's destruction must destroy its
-- days through the service, which is the only path that also cleans the object store.
ALTER TABLE diary
    ADD COLUMN destination TEXT,
    ADD COLUMN start_date  DATE,
    ADD COLUMN end_date    DATE;

UPDATE diary SET start_date = created_at::date, end_date = created_at::date
    WHERE start_date IS NULL;

ALTER TABLE diary
    ALTER COLUMN start_date SET NOT NULL,
    ALTER COLUMN end_date SET NOT NULL,
    ADD CONSTRAINT diary_ends_no_earlier_than_it_starts CHECK (end_date >= start_date);

CREATE TABLE diary_day (
    id             UUID        PRIMARY KEY,
    diary_id       UUID        NOT NULL REFERENCES diary (id),
    ordinal        INTEGER     NOT NULL,
    date           DATE        NOT NULL,
    place          TEXT,
    trip_day_id    UUID,
    trip_day_title TEXT,
    created_at     TIMESTAMPTZ NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL,
    CONSTRAINT diary_day_is_numbered_from_one CHECK (ordinal >= 1)
);

CREATE UNIQUE INDEX diary_day_one_per_date_idx ON diary_day (diary_id, date);
CREATE INDEX diary_day_in_order_idx ON diary_day (diary_id, ordinal);

-- The postcard's day: NULL is loose, and a single nullable column IS the at-most-one-day rule, the
-- same shape V51 gave containment in a diary. NO ACTION for the same reason as the diary FK.
ALTER TABLE postcard
    ADD COLUMN diary_day_id UUID REFERENCES diary_day (id);

CREATE INDEX postcard_day_idx ON postcard (diary_day_id) WHERE diary_day_id IS NOT NULL;
