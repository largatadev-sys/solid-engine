-- V55 — Pins reach the memory objects: a diary's destination and a diary day's place (CM-2, founder
-- ruling 2026-09-07).
--
-- PL-2 gave Activity and Itinerary a Pin and deliberately withheld one from postcards and diary
-- entries, on the argument that coordinates should stay off the ongoing-trip feed. CM-2 re-cut what
-- those objects ARE: a Diary is a trip that was taken, its Days hold Postcards, and none of them
-- inherits a destination from a trip row because no trip row exists. A standalone diary's
-- destination and a day's "where were you?" are now the only answer to "where", so the reason for
-- withholding the pin went with the trip it assumed. The founder reversed it at the LAN walk.
--
-- Postcard already carries the three columns and two of the three CHECKs from V51 — filled only
-- when a postcard is born from an activity, which snapshots that activity's pin — so it needs only
-- the third here; what else changes for Postcard is the WIRE, which now accepts a pin on the acts
-- that create one.
--
-- PURELY ADDITIVE, NO BACKFILL, exactly as V44 argued: every existing diary and day arrives pinless
-- and stays that way until a traveler pins it. Geocoding stored strings to guess coordinates nobody
-- verified is how confidently-wrong pins reach real trips, and a data migration is invisible to
-- every local rung this repo owns (the S1.1 finding). PinsOnMemoriesIT steps V54 -> V55 over legacy
-- rows and asserts they survive unpinned.
--
-- SAME WIDTHS, SAME CONSTRAINTS, SAME REASONS as V44 and V45 — NUMERIC(9,6) because a coordinate
-- compared for equality is the one value you do not want in binary floating point; SMALLINT zoom
-- because the framing is part of the intent; the three columns whole-or-absent because half a pin
-- is not expressible on the wire and the database should make the promise the API makes; and a pin
-- only where something names it, because a point with no label is a map nobody can caption.

ALTER TABLE diary
    ADD COLUMN latitude  NUMERIC(9,6),
    ADD COLUMN longitude NUMERIC(9,6),
    ADD COLUMN zoom      SMALLINT,
    ADD CONSTRAINT diary_pin_is_whole CHECK (
        (latitude IS NULL AND longitude IS NULL AND zoom IS NULL)
        OR (latitude IS NOT NULL AND longitude IS NOT NULL AND zoom IS NOT NULL)),
    ADD CONSTRAINT diary_pin_is_on_earth CHECK (
        latitude IS NULL
        OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND zoom BETWEEN 2 AND 19)),
    ADD CONSTRAINT diary_pin_needs_a_destination CHECK (
        latitude IS NULL OR btrim(coalesce(destination, '')) <> '');

-- A day's place is nullable by design — most days of a remembered trip are never named, and the
-- days screen exists to let a traveler skip them. So the pin rides on the place being present,
-- which is the same predicate the other three tables carry.
ALTER TABLE diary_day
    ADD COLUMN latitude  NUMERIC(9,6),
    ADD COLUMN longitude NUMERIC(9,6),
    ADD COLUMN zoom      SMALLINT,
    ADD CONSTRAINT diary_day_pin_is_whole CHECK (
        (latitude IS NULL AND longitude IS NULL AND zoom IS NULL)
        OR (latitude IS NOT NULL AND longitude IS NOT NULL AND zoom IS NOT NULL)),
    ADD CONSTRAINT diary_day_pin_is_on_earth CHECK (
        latitude IS NULL
        OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND zoom BETWEEN 2 AND 19)),
    ADD CONSTRAINT diary_day_pin_needs_a_place CHECK (
        latitude IS NULL OR btrim(coalesce(place, '')) <> '');

-- Postcard has carried the three columns and both of V44's CHECKs since V51, when only
-- postFromActivity could write them — from an Activity whose own constraints had already vetted the
-- values, and whose place travelled with them. The wire now accepts a pin on the loose and
-- day-bound acts, where a traveler could name nothing at all, so the third promise is owed here:
-- V45's, that a point on the earth has something to call it.
ALTER TABLE postcard
    ADD CONSTRAINT postcard_pin_needs_a_place CHECK (
        latitude IS NULL OR btrim(coalesce(place, '')) <> '');
