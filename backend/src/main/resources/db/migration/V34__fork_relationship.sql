-- V34 — the Fork Relationship: permanent provenance for a plan-only copy (S4.7, INV-6).
--
-- The entity has been in the domain model since Artifact 02 with no table under it. It arrives
-- exactly as specified there and no wider: id, source itinerary id, forked itinerary id, forked-at.
--
-- ONE HOP, NOT A CHAIN. The row names the itinerary the traveler tapped Fork on — never the root of
-- a chain, and never both. Attribution is one hop by ruling (S4.7 decision 5), so a `root_id` column
-- would be a second source of truth for a question nobody asks; a chain stays computable from these
-- rows the day a reader appears, which is the cheaper direction to travel.
--
-- APPEND-ONLY BY ABSENCE. No update and no delete path exists in the application, and none is
-- expected: a fork happened, and unpublishing or archiving the source does not un-happen it
-- (ADR-017 — forks survive; the count never decrements). There is no ON DELETE anywhere below for
-- the same reason it is absent from every other table here: cross-module references are by id.
--
-- NO FOREIGN KEYS, deliberately, and the same reasoning V3 and V4 record — an FK is a schema-level
-- coupling between modules and the first thing that would have to be dropped if either became its
-- own service (ADR-002). Both columns are ids into the itinerary module, which owns their meaning.

CREATE TABLE fork_relationship (
    -- UUIDv7, app-side, as every id in this tree is (S0.1).
    id                  UUID         PRIMARY KEY,

    -- The itinerary the traveler was reading when they tapped Fork. This is the one attribution
    -- names, and the one `forkCount` counts.
    source_itinerary_id UUID         NOT NULL,

    -- The copy that was born. UNIQUE because a forked itinerary has exactly one origin: it is minted
    -- inside the fork transaction and nothing else ever writes a row naming it. Structural rather
    -- than disciplinary, for V4's reason — a second origin for one copy should be impossible, not
    -- merely unwritten, and it is what makes the read-side `forkedFrom` a lookup rather than a pick.
    forked_itinerary_id UUID         NOT NULL UNIQUE,

    -- When the copy was taken. Not derivable from the forked itinerary's own created_at, even though
    -- they are written in the same transaction: this is the relationship's fact, and the itinerary's
    -- is the itinerary's.
    forked_at           TIMESTAMPTZ  NOT NULL
);

-- The count query's access path: `SELECT count(*) ... WHERE source_itinerary_id = ?`, run once per
-- published-page view. The PRIMARY KEY does not serve it and the UNIQUE above serves the other
-- direction (`forkedFrom`, keyed by the copy). This is the only index this table earns today — the
-- spec's decision 7 keeps the count a read-time COUNT with no denormalised counter until it ever
-- costs something measurable, and an index on the grouping column is what makes that affordable.
CREATE INDEX fork_relationship_source_idx ON fork_relationship (source_itinerary_id);
