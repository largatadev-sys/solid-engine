-- V7 — Days and Activities: the plan gains structure (S1.3, ADR-013, Artifact 02).
--
-- Until now an Itinerary was a title, destinations and two optional dates — nothing to collaborate
-- ON. This migration adds the plan itself: a Day-indexed skeleton (Day 1..N, ADR-013), and the
-- Activities that hang off each Day. It also grows the itinerary row with the `description` field and
-- the last-edited attribution pair the whole story stamps.
--
-- PURELY ADDITIVE, NO BACKFILL (spec §migration). Every pre-S1.3 itinerary simply has zero days —
-- that is a valid plan, not a broken one, and the create flow produces it too whenever `durationDays`
-- is omitted. Because nothing is migrated, this file has no stepping-IT (the S1.2/V6 precedent): a
-- fresh schema is the only shape to test, and the contract + storage ITs exercise it.
--
-- The noun is Activity, permanently within /v1 (ADR-013, founder call): the tables, columns and the
-- API all say `activity`, and ADR-008 makes that spelling forever — even for E6's future unfurled
-- hotels and flights, which will read slightly oddly as "an Activity of type stay". Accepted knowingly.

-- The itinerary grows three columns, all additive (ADR-008): a description, and the attribution pair
-- every field-bearing write stamps. `description` is nullable — an itinerary without one is normal.
ALTER TABLE itinerary
    ADD COLUMN description    TEXT,
    -- Who last edited the itinerary's own fields, and when (S1.3, the 2026-07-17 last-write-wins
    -- ruling's attribution half). A traveler id — cross-module, so no FK, per V3/V4. NULL until the
    -- first edit after this migration; a row created before S1.3 has never been edited under the new
    -- rules, and NULL says exactly that rather than inventing an editor.
    ADD COLUMN last_edited_by UUID,
    ADD COLUMN last_edited_at TIMESTAMPTZ;

CREATE TABLE day (
    -- UUIDv7, app-side (S0.1), same as every other id here.
    id            UUID         PRIMARY KEY,

    -- The itinerary this day belongs to. A child of the Itinerary aggregate (Artifact 02, ADR-013) —
    -- so unlike the cross-module references in V3/V4, this FK is real and intra-module: a day without
    -- its itinerary is meaningless, and ON DELETE CASCADE means deleting an itinerary (S1.9) takes its
    -- days with it rather than orphaning them. The itinerary module owns both tables.
    itinerary_id  UUID         NOT NULL REFERENCES itinerary (id) ON DELETE CASCADE,

    -- The day's position in the plan, 1..N, contiguous (ADR-013). Deleting a day renumbers the rest,
    -- so this is never sparse — Day 3 always sits between Day 2 and Day 4. The application maintains
    -- contiguity transactionally (the aggregate's strong-consistency job, Artifact 02); the UNIQUE
    -- below makes a duplicate ordinal impossible, which is what a renumber bug would produce.
    ordinal       INTEGER      NOT NULL CHECK (ordinal >= 1),

    -- Optional day title ("Arrival & Sunsets") — the field that forced Day to be an entity at all
    -- (ADR-013): a title needs a row to live on, and date-grouping had nowhere to put it.
    title         TEXT,

    created_at    TIMESTAMPTZ  NOT NULL,

    -- One day per (itinerary, ordinal): the contiguity invariant's structural half. A renumber that
    -- collided two days onto ordinal 3 would fail here, synchronously, rather than planting a plan
    -- with two "Day 3"s that every later query would have to disambiguate. DayStorageIT pins it.
    UNIQUE (itinerary_id, ordinal)
);

-- The plan's day list: "the days of this itinerary, in order" — every read of a plan walks it.
-- Ordinal leads nothing on its own; the composite serves both the itinerary filter and the ORDER BY.
CREATE INDEX day_itinerary_ordinal_idx ON day (itinerary_id, ordinal);

CREATE TABLE activity (
    -- UUIDv7, app-side (S0.1).
    id            UUID         PRIMARY KEY,

    -- The day this activity belongs to. Intra-aggregate FK with CASCADE, per `day` above: deleting a
    -- day takes its activities (spec AC 2, the cascade), and a cross-day move (ticket 03) is an UPDATE
    -- of this column. NOT the itinerary directly — an activity lives on a day, and the day carries the
    -- itinerary; a denormalised itinerary_id here would be a second source of truth to keep in step.
    day_id        UUID         NOT NULL REFERENCES day (id) ON DELETE CASCADE,

    -- Manual sort order within the day, and it is AUTHORITATIVE (ADR-013): the drag handle sets it, and
    -- a typed time-of-day never overrides it. Not UNIQUE per day — reorder assigns fresh values and a
    -- transient tie during a drag must not abort the write; the ORDER BY breaks ties by id (creation
    -- order) so the list is always deterministic even mid-reorder. Ticket 03 owns the reorder mechanics;
    -- ticket 01 assigns "end of day" on create.
    sort_order    INTEGER      NOT NULL,

    title         TEXT         NOT NULL,

    -- Optional local time-of-day (ADR-013): "2 PM at the destination", timezone-free by decision — a
    -- day-indexed plan has no calendar anchor to hang a zone on. TIME, not TIMESTAMPTZ: no date, no
    -- zone, just a clock face. Display metadata, never a sort key (see sort_order).
    time_of_day   TIME,

    -- Optional estimated cost — PLANNING money, never ledger money (spec §boundary, Artifact 02): it
    -- feeds no balance and no INV-7/8 path. Split into amount + currency so it is real money, not a
    -- rendered string. NULL amount = unstated; a zero amount = "Free" (a real, different fact). NUMERIC,
    -- not float — money is never binary floating point. Currency is an ISO-4217 code (PHP, etc.); the
    -- product is PH-first but the column does not assume it.
    cost_amount   NUMERIC(12,2),
    cost_currency TEXT,

    -- Free-text place (ADR-013, founder call): "describe a specific place or landmark". NOT a geotag —
    -- structured place needs map/Place-Search infrastructure the MVP deliberately lacks (epic-map
    -- backlog). Free text is what planning needs and what the mock asks for.
    place         TEXT,

    description   TEXT,

    -- Private planning notes (spec §fields): "for your group", not "for strangers who fork you". The
    -- publish-time disposition — scrub, publish, or split a public `tips` field — is S4.1's to decide
    -- (register #11); keeping it one private field now leaves that door open additively.
    notes         TEXT,

    -- One external URL (spec §links): the E1 baseline ("bare links + manual fields") and E6's designed
    -- unfurl target, singular. The mock's multi-provider booking panel parks whole to E6.
    external_url  TEXT,

    -- Who last edited this activity, and when (S1.3 attribution). A traveler id — cross-module, no FK.
    -- Set on every write including create, so an activity is never un-attributed. This is the one
    -- column whose deferral would destroy data retroactively (spec Q7), which is why it ships now.
    last_edited_by UUID        NOT NULL,
    last_edited_at TIMESTAMPTZ NOT NULL,

    created_at    TIMESTAMPTZ  NOT NULL
);

-- The day's activity list: "the activities of this day, in manual order". Ordinal-of-the-day is the
-- day_id; sort_order orders within it. Ties break by id at query time (see sort_order), so no id in
-- the index — the two columns here serve the filter and the primary sort.
CREATE INDEX activity_day_order_idx ON activity (day_id, sort_order);
