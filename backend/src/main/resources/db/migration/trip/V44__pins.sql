-- V44 — Pins: a location a traveler chose, beside the free text that names it (PL-2 ticket 03).
--
-- Until now every place in Largata was a string typed freehand, and PL-1 made those strings
-- tappable by handing them to Google Maps as a SEARCH — which computes a point at tap time from
-- text alone and lands on the wrong lagoon whenever the text is ambiguous. A Pin is the answer to
-- "where is it", stored once by the traveler who knows, rather than guessed on every tap.
--
-- PURELY ADDITIVE, NO BACKFILL (spec §Data). Every existing activity and itinerary carries NULL on
-- all three columns and keeps PL-1's behaviour permanently: a text-only place is a first-class
-- state, not a migration backlog. Geocoding hundreds of existing strings to guess coordinates
-- nobody verified is how confidently-wrong pins reach real trips, and a data migration is invisible
-- to every local rung this repo owns (the S1.1 finding). PinColumnsIT steps V43 -> V44 over legacy
-- rows and asserts exactly that: the rows survive, and they arrive pinless.
--
-- PLAIN NUMERICS, NO POSTGIS. We store points and never query spatially — no proximity search, no
-- routing, no bounding-box reads anywhere in this story or the epic map. The extension would be an
-- ops burden bought for nothing. Revisit only if proximity search ever becomes real; adding PostGIS
-- later can read these columns, so nothing here forecloses it.
--
-- NUMERIC(9,6) is the width the data actually needs: six decimal places is ~11cm at the equator,
-- far finer than a finger on a phone map can express, and three integer digits covers ±180. FLOAT
-- would be smaller and is what most systems use, but a coordinate compared for equality (the
-- stale-ref rule's sibling, and every "did this change" check the plan-version machinery runs) is
-- exactly the value you do not want in binary floating point — the same reasoning V7 applied to
-- money.
--
-- ZOOM RIDES WITH THE POINT and is not decoration: a pin on a beach and a pin on a doorway carry
-- different intent, and the viewer reopens as the traveler framed it. SMALLINT with a CHECK naming
-- the provider's range, so a bad write fails here rather than rendering a grey screen of missing
-- tiles.
--
-- THE THREE COLUMNS TRAVEL TOGETHER OR NOT AT ALL. On the wire a Pin is nested and nullable, so
-- half a pin is not expressible; the CHECK below says the same thing in the schema, because the
-- wire shape is a promise the API makes and this is the one the DATABASE makes. Without it, a
-- future writer that sets latitude alone plants a row every reader must defend against.

ALTER TABLE activity
    ADD COLUMN latitude  NUMERIC(9,6),
    ADD COLUMN longitude NUMERIC(9,6),
    ADD COLUMN zoom      SMALLINT,
    ADD CONSTRAINT activity_pin_is_whole CHECK (
        (latitude IS NULL AND longitude IS NULL AND zoom IS NULL)
        OR (latitude IS NOT NULL AND longitude IS NOT NULL AND zoom IS NOT NULL)),
    ADD CONSTRAINT activity_pin_is_on_earth CHECK (
        latitude IS NULL
        OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND zoom BETWEEN 2 AND 19));

-- The destination pin is not a nicety: it is what lets every activity picker in a trip open in the
-- right region with no geocoding call at all (spec §Surfaces, user story 7). Same three columns,
-- same two constraints, for the same reasons.
ALTER TABLE itinerary
    ADD COLUMN latitude  NUMERIC(9,6),
    ADD COLUMN longitude NUMERIC(9,6),
    ADD COLUMN zoom      SMALLINT,
    ADD CONSTRAINT itinerary_pin_is_whole CHECK (
        (latitude IS NULL AND longitude IS NULL AND zoom IS NULL)
        OR (latitude IS NOT NULL AND longitude IS NOT NULL AND zoom IS NOT NULL)),
    ADD CONSTRAINT itinerary_pin_is_on_earth CHECK (
        latitude IS NULL
        OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND zoom BETWEEN 2 AND 19));
