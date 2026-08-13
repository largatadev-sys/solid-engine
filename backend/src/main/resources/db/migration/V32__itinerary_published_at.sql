-- V32 — an itinerary records when it became visible (S4.3, spec decision 3).
--
-- Numbered 32, not 31, because dev's founder-vanity grant took V31 while this branch was in
-- flight. Worth stating rather than silently renumbering: two files claiming one version is a
-- collision git does NOT report — `merge-tree` returns clean, both files land side by side, and
-- Flyway then refuses to start on the duplicate. A merge that compiles and cannot boot.
--
-- WHY A NEW COLUMN RATHER THAN REUSING ONE WE HAVE. Discovery orders the browse feed, the
-- Recommended rail and the trending window by "what is newly visible to strangers", and no existing
-- stamp answers that question. `created_at` is when the trip was made, which for a trip planned in
-- March and published in August is five months wrong. `completed_at` is when the traveler finished
-- travelling, which is closer and is exactly why it seeds the backfill below — but it is still a
-- different fact, and it stops moving the moment the trip is complete. Publication is its own event
-- and it needs its own clock.
--
-- REPUBLISH BUMPS IT, DELIBERATELY. Unpublishing and publishing again is how a traveler fixes a typo
-- on a public page (ADR-018 froze the plan, so the edit door is the unpublish door), and the founder
-- ruled at the grilling that returning content should surface as newly visible. The cost is that a
-- trip can re-enter the top of Discovery repeatedly; that is the intended affordance, not an abuse
-- vector, while the installed base is the founders' own.
--
-- UNPUBLISH LEAVES IT IN PLACE, UNREAD. Clearing it would destroy the only record of when the trip
-- was last public, and nothing reads the column for an unpublished row — every discovery query
-- filters on `published = true` first. Retained-but-unread beats nulled-and-forgotten.
--
-- THE BACKFILL, AND WHY IT IS NOT `now()` FOR EVERYONE. Publishing requires the `completed` state
-- (ADR-017, reinstated by ADR-019), so every already-published row has a `completed_at` and that
-- stamp is the closest true answer to "when could a stranger first have seen this". Stamping them
-- all with the migration's clock would file every legacy trip at the top of Discovery, tied, on the
-- day of deploy — the same lie V30's header refused for the feed. The `now()` fallback covers only
-- the row that is published with no completion stamp, which the state machine says cannot exist;
-- it is there so the column is NOT NULL-able in practice rather than because we expect to use it.
--
-- NULL FOR NEVER-PUBLISHED ROWS, and the column stays nullable forever. NULL means "has never been
-- public", which is a real and permanent category, not missing data. A NOT NULL with a sentinel
-- would force every reader to know the sentinel.
--
-- THIS IS A DATA MIGRATION, so it carries the S1.1 obligation: a migration-stepping IT
-- (ItineraryPublishedAtBackfillIT) proves the backfill against legacy rows seeded via raw SQL,
-- because every other test surface this repo owns runs against an empty schema where a backfill is
-- a no-op that passes whether the SQL is right or a typo.

ALTER TABLE itinerary ADD COLUMN published_at TIMESTAMPTZ;

UPDATE itinerary
SET published_at = COALESCE(completed_at, now())
WHERE published = true;

CREATE INDEX idx_itinerary_discovery
    ON itinerary (published_at DESC, id DESC)
    WHERE published = true;
