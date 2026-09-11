-- V45 — a pin cannot exist without the name it pins (PL-2, code review).
--
-- V44 made the three coordinate columns travel together or not at all, and stopped there. That
-- leaves a fourth half-state it did not name: a row carrying latitude, longitude and zoom while
-- `place` is NULL — a point on the earth with nothing to call it. Every reader downstream must then
-- render a map for a place with no label, and every writer must decide what to show; the service
-- layer already refuses it (InvalidPinException, 400), so this is the DATABASE making the same
-- promise the API makes, which is exactly the argument V44 gave for its own CHECK.
--
-- BLANK IS THE SAME AS ABSENT here, so the predicate trims. `place` is free text a traveler types,
-- and '   ' reaches the column as readily as NULL does; a constraint that admits one and refuses
-- the other enforces a distinction nothing above it makes.
--
-- No backfill and no NOT VALID: V44 shipped on this same branch and the service has refused the
-- state since the day the columns existed, so no row anywhere can violate this. Validating is
-- therefore free, and a NOT VALID constraint would leave the question permanently open.

ALTER TABLE activity
    ADD CONSTRAINT activity_pin_needs_a_place CHECK (
        latitude IS NULL OR btrim(coalesce(place, '')) <> '');

-- The itinerary's name for its point is `destination` — NOT NULL since V33, but NOT NULL admits the
-- empty string, so the same trim applies for the same reason.
ALTER TABLE itinerary
    ADD CONSTRAINT itinerary_pin_needs_a_destination CHECK (
        latitude IS NULL OR btrim(coalesce(destination, '')) <> '');
