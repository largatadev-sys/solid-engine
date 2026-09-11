-- V49 — the itinerary object (CM-1 ticket 02, ADR-035).
--
-- The first of the new world's three content tables. Publishing MINTS a real object from the frozen
-- plan instead of projecting the trip's rows at read time — which is what lets a published page
-- outlive its trip (CM-1's structural-survival rule). The old world's publish flow neither reads
-- nor writes this table; until the rewire's cutover backfill, only the dark /v1/trips/{id}/publish
-- grammar fills it.
--
-- trip_id is the creator-trip REFERENCE, deliberately without a foreign key: the trip's destruction
-- must leave this row standing, and a dangling trip_id afterwards is the recorded design ("the trip
-- is gone; the page is not"). UNIQUE because identity survives publish cycles — unpublish retires
-- the row and republish refreshes the SAME row, so one trip can never mint two objects and every
-- link ever shared keeps resolving to one id.
--
-- owner_id is the RECORDED owner, snapshotted at mint, because the authority to hard-delete the
-- object must survive the trip (and its membership rows) being destroyed. It references traveler
-- like photo.uploaded_by does: travelers are a keeper table, not workspace world.
--
-- plan is the frozen document itself, TEXT holding JSON. ADR-019's publish freeze is what makes the
-- snapshot equal to the live projection at mint time; storing the document rather than joining the
-- plan tables is what makes it equal FOREVER, including after those tables' rows are destroyed.
--
CREATE TABLE itinerary_object (
    id           UUID        PRIMARY KEY,
    trip_id      UUID        NOT NULL UNIQUE,
    owner_id     UUID        NOT NULL REFERENCES traveler (id),
    plan         TEXT        NOT NULL,
    retired      BOOLEAN     NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ NOT NULL,
    retired_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL
);
