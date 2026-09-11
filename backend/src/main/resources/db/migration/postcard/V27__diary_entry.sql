-- V27 — the diary entry table (S3.1, ADR-024).
--
-- NO DIARY TABLE. A Diary is one traveler's collection for one trip, and it is a PROJECTION over
-- the rows below — "the entries where traveler_id = me and itinerary_id = this trip" — not a row of
-- its own (spec decision 1, the Gallery/Highlight precedent). A diary table today would carry a
-- primary key and nothing else: no state, no timestamps anyone reads, no lifecycle. Diary-level
-- state arrives additively at the first story that actually reads it (S4.2's publish), which is
-- also the story that decides what such state means; inventing the row now would be guessing at its
-- columns and then living with the guess.
--
-- THE SNAPSHOT IS THE POINT, AND IT IS WHY THESE COLUMNS DUPLICATE THE PLAN. `activity_title`,
-- `day_label` and `time_of_day` are copied from the activity at post time and never rewritten
-- (spec decision 3). This is deliberate denormalization: a postcard records what happened, and what
-- happened does not change when someone edits the plan afterward. Joining to `activity` at read
-- time would produce the opposite behaviour — renaming an activity in the plan would silently
-- rewrite a memory already posted, and deleting it would erase one. Same reasoning as the ledger's
-- append-only history, applied to memories.
--
-- PROVENANCE, NOT A PARENT. `activity_id` answers "which activity was this posted from", and it is
-- ON DELETE SET NULL rather than CASCADE precisely because the entry must OUTLIVE the activity —
-- the snapshot above is what the traveler reads, and the plan row is only the trail back to it.
-- Doing this structurally rather than in service choreography means no code path can forget: a
-- plan edit that deletes an activity cannot leave a dangling reference behind, and cannot take a
-- diary entry with it.
--
-- ONE ENTRY PER TRAVELER PER ACTIVITY (spec decision 2), as a partial unique index rather than a
-- service check, so a double-submit race cannot mint two postcards for one activity. The predicate
-- excludes NULL provenance because entries whose activity has since been deleted are no longer
-- claimed by any activity — several may coexist for one traveler, and none of them blocks a fresh
-- post if that activity id were somehow reused. NOTE the S1.1 enum-spelling lesson does not bite
-- here: this predicate tests NULLity, not an enum value, so there is no Hibernate-vs-SQL spelling
-- contract to get wrong. Any future predicate naming an enum value needs a test that fails if the
-- spelling moves.
--
-- ITINERARY_ID IS CARRIED, NOT DERIVED. It could be reached through activity → day → itinerary, but
-- that path is exactly what NULLs at activity deletion — so the trip an entry belongs to would
-- become unknowable at the moment it matters most (the profile's per-trip grouping still has to
-- show it). CASCADE here is correct and is the only cascade that should reach this table: deleting
-- an itinerary is not something the app does today (S1.9 archives instead), but if it ever does,
-- entries of a trip that no longer exists are meaningless.

CREATE TABLE diary_entry (
    id             UUID        PRIMARY KEY,
    traveler_id    UUID        NOT NULL REFERENCES traveler (id),
    itinerary_id   UUID        NOT NULL REFERENCES itinerary (id) ON DELETE CASCADE,
    activity_id    UUID        REFERENCES activity (id) ON DELETE SET NULL,
    activity_title TEXT        NOT NULL,
    day_label      TEXT        NOT NULL,
    time_of_day    TIME,
    caption        TEXT,
    created_at     TIMESTAMPTZ NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL
);

-- The two reads this story ships. The first serves both the viewer's Add to Diary / Added ✓ state
-- and the per-trip postcard stream ("my entries for this trip"); the second serves the profile's
-- My Diary grouping ("my trips that hold entries"), which pages in the standard cursor shape over
-- UUIDv7 ids. Traveler leads both because every diary read is author-scoped by construction — there
-- is no cross-traveler read path at all (spec decision 4).
CREATE INDEX diary_entry_mine_idx ON diary_entry (traveler_id, itinerary_id, id);

CREATE UNIQUE INDEX diary_entry_one_per_activity_idx
    ON diary_entry (traveler_id, activity_id)
    WHERE activity_id IS NOT NULL;
