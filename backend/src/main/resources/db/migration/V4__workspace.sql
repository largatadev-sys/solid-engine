-- V4 — the Trip Workspace and its Memberships: the collaboration shell, and the access-control
-- boundary the whole product is walled by (S1.1, Artifact 02, Artifact 03).
--
-- These two tables are what the authorization guard has been asking about since S0.3. Until now the
-- answer was synthesized from `itinerary.owner_id` behind ADR-011's resolver seam; from S1.1 it is
-- read from `membership`. The guard's signature does not change — only what it reads.

CREATE TABLE workspace (
    -- UUIDv7, app-side (S0.1), same as every other id here.
    id            UUID         PRIMARY KEY,

    -- 1:1 with the Itinerary (Artifact 02), and UNIQUE is how that becomes structural rather than
    -- disciplinary: a second workspace for the same itinerary is impossible, not merely unwritten.
    -- ADR-011's assumption rests on this cardinality holding, so the schema states it.
    --
    -- No FOREIGN KEY to itinerary, deliberately — the same reasoning V3 records for `owner_id`: an
    -- FK is a hard schema-level coupling between two modules and it is exactly what would have to be
    -- dropped the day either becomes its own service (ADR-002). The 1:1 is enforced by this UNIQUE
    -- plus the transactional formation in WorkspaceService; the reference itself is by id, as
    -- everything across a module boundary is.
    itinerary_id  UUID         NOT NULL UNIQUE,

    -- Inherited from the itinerary at formation, never `now()` — the workspace exists from the
    -- itinerary's first instant (Artifact 03: no ownerless window ever exists), and the backfill in
    -- V5 depends on being able to write that same truth for itineraries that predate this table.
    created_at    TIMESTAMPTZ  NOT NULL
);

-- No `state` column, and it is a decision rather than an omission (S1.1 spec §Schema). Artifact 02
-- gives the Workspace a `forming → active → completed → archived` machine, but register #12 (does
-- `forming` exist at all, or is a workspace active from creation?) is assigned to the invite story,
-- and nothing in S1.1 reads state: INV-1 gates on *membership*, not on workspace state. Shipping the
-- column now would mean either resolving #12 early or backfilling every row with a provisionally-
-- wrong value — a data fix waiting to happen. The invite story adds it additively, with #12 decided.

CREATE TABLE membership (
    -- A Traveler's role in one Workspace (Artifact 02). No surrogate id: the pair below IS the
    -- identity of the row, and a synthetic key would only add a second way to say the same thing.
    workspace_id  UUID         NOT NULL REFERENCES workspace (id),

    -- No FK to traveler — cross-module, same reasoning as workspace.itinerary_id above.
    traveler_id   UUID         NOT NULL,

    -- OWNER | MEMBER. TEXT, not a PG enum, for V3's recorded reason: adding a value to a PG enum is
    -- a migration with a lock. The domain owns the vocabulary; the column stores what it is told.
    --
    -- Upper-case because that is what @Enumerated(STRING) writes — the enum's name. It is NOT the
    -- API's spelling (Itinerary's `wireName()` lower-cases at the boundary; the column underneath it
    -- holds 'DRAFT'). The distinction matters here in a way it never did for V3: the partial index
    -- below tests this value, and a predicate that never matches would create successfully, cost
    -- nothing, and enforce nothing — INV-4 unguarded with no error, ever. `MembershipStorageIT` pins
    -- the spelling so a future @Enumerated change cannot silently unhook the index.
    role          TEXT         NOT NULL,

    -- Inherited from the itinerary at formation (see created_at above): the owner joined the instant
    -- the trip existed. Later members get their real join time when invites land (S1.2).
    joined_at     TIMESTAMPTZ  NOT NULL,

    -- One membership per traveler per workspace — a traveler cannot hold two roles in one trip.
    -- Also the guard's lookup key (see the index note below).
    PRIMARY KEY (workspace_id, traveler_id)
);

-- INV-4 — "exactly one owner per workspace at all times" — enforced in the schema rather than left
-- to service discipline, because it is the invariant that ownership transfer (S1.6) and owner
-- deletion (INV-4's claim flow) will both try to break under concurrency. A partial unique index is
-- the whole enforcement: at most one OWNER row per workspace. (The "at least one" half is held by
-- atomic formation — the owner row is written in the same transaction as the workspace — and by
-- transfer being an update, never a delete-then-insert.)
CREATE UNIQUE INDEX membership_one_owner_idx ON membership (workspace_id) WHERE role = 'OWNER';

-- The guard's hot path, and the reason this index exists (S1.1 spec §The resolver swap):
--     SELECT m.role FROM membership m JOIN workspace w ON m.workspace_id = w.id
--     WHERE w.itinerary_id = ? AND m.traveler_id = ?
-- Every read of a private itinerary runs it first. `workspace.itinerary_id` is served by its UNIQUE
-- constraint's index; this one serves the membership side of the join, seeking straight to the pair.
-- The PK index (workspace_id, traveler_id) already covers that seek — this index is its mirror, for
-- the "which workspaces does this traveler belong to?" direction E1's list needs (S1.2 onward).
CREATE INDEX membership_traveler_idx ON membership (traveler_id, workspace_id);
