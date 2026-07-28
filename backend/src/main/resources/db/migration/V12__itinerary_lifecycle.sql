-- V12 — the itinerary lifecycle stamps, and the death of V3's lying default (S1.7).
--
-- Register #10 resolved at the S1.7 grilling (2026-07-28): both transitions are the owner's explicit
-- act — `draft → active` when they start the trip, `active → completed` when they end it. Dates only
-- *nudge*, pull-based and client-side; nothing here is driven by a clock, so this migration adds no
-- scheduler state and no computed column.
--
-- WHAT THE STAMPS RECORD, precisely: the moment the owner performed the act — NOT when travel
-- physically happened. The plan's start_date/end_date carry the traveled-when claim. An owner who
-- marks a trip complete a week late produces completed_at > end_date, and that is the truthful
-- record of what the system was told and when. Naming them started_at/completed_at rather than
-- began_travel_at keeps that reading: they are transition timestamps on a state machine.
--
-- NULLABLE, and write-once by construction: NULL means "this transition has not happened", which is
-- the honest state for every draft. Transitions are forward-only (02's state machine; no un-complete),
-- so once written neither value can legitimately change — the domain enforces that, the column simply
-- never receives a second write.
--
-- WHY THEY SHIP NOW when nothing reads them yet: the completion moment is register #4's anchor
-- (review eligibility may need facts captured *at* completion) and cannot be reconstructed later.
-- S1.3's ruling stands — deferring attribution is the one deferral that destroys data retroactively.
-- They are deliberately NOT on the wire; ItineraryResponse gains them additively when a reader exists.

ALTER TABLE itinerary ADD COLUMN started_at   TIMESTAMPTZ;
ALTER TABLE itinerary ADD COLUMN completed_at TIMESTAMPTZ;

-- V3's `state TEXT NOT NULL DEFAULT 'draft'` — dead weight since the day it was written, and a trap
-- for the next migration that copies its spelling.
--
-- Hibernate maps ItineraryState with @Enumerated(STRING), so it writes the enum NAME: 'DRAFT', not
-- 'draft'. Every row in every environment therefore holds upper-case, and this default has never once
-- been applied — the entity always supplies the value, and there is no other INSERT path (no raw-SQL
-- writer, no import, no COPY). It sits in the schema asserting a spelling the application does not use.
--
-- CLAUDE.md's gotcha names this exact column as the hazard: S1.1's first draft of V4 copied the
-- lower-case spelling into `CREATE UNIQUE INDEX ... WHERE role = 'owner'`, which would have matched
-- ZERO rows — an index that creates successfully, costs nothing, and enforces nothing, forever. S1.7
-- is the next migration to touch `state`, so it is the one that removes the bait rather than leaving
-- it for the story after.
--
-- NON-DESTRUCTIVE: dropping a default alters no existing row, and the NOT NULL constraint is
-- untouched — an INSERT that omits `state` failed before this migration and still fails after, which
-- is the correct behaviour for a column the domain is required to populate. Founder sign-off at the
-- 2026-07-28 grilling (schema-adjacent work is stop-rule territory).
ALTER TABLE itinerary ALTER COLUMN state DROP DEFAULT;
