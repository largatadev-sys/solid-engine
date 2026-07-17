-- V3 — the Itinerary: the plan, and the first domain object with an owner (S0.3, Artifact 02).
--
-- The forkable/publishable unit of the product. This story creates it in `draft`/`private` only;
-- items, publishing, forking and lifecycle transitions all arrive later, each additively.

CREATE TABLE itinerary (
    -- UUIDv7, app-side (S0.1). Doing double duty here: it is the primary key AND the list's sort
    -- key, because v7 ids sort by creation time. That is what makes keyset pagination possible on
    -- a single column with no created_at index and no composite cursor (S0.3 spec, the list).
    id            UUID         PRIMARY KEY,

    -- The traveler who created it — and, until Workspaces arrive at E1, the sole basis of
    -- authority: the guard's S0.3 resolver answers "is this you?" from this column (ADR-011).
    --
    -- No FOREIGN KEY to traveler, deliberately (S0.3 spec, Persistence). ADR-002's boundary is not
    -- only about Java imports: an FK is a hard schema-level coupling between two modules, and it is
    -- what would have to be dropped the day identity becomes its own service. It also buys nothing
    -- here — account deletion is anonymization (the row survives, scrubbed), so the referent never
    -- disappears and there is no orphan to protect against.
    owner_id      UUID         NOT NULL,

    title         TEXT         NOT NULL,

    -- text[], not jsonb: a homogeneous list of scalars with no nesting. Arrays keep the element
    -- type honest and leave `unnest`/GIN available if E4's discovery ever searches by destination;
    -- jsonb would buy schema flexibility this field explicitly does not want (free text, full stop).
    -- Plural because Artifact 02 says "destination(s)" and a singular column is the wart that
    -- additive-only evolution (ADR-008) could never remove — only add a second field beside.
    destinations  TEXT[]       NOT NULL,

    -- Nullable and independent, by decision (S0.3 grilling): undated trips are a product truth —
    -- the dreamer's "Japan, someday" draft, and E4's fork, where copying the source's dates would
    -- be plainly wrong. start-only is a legitimate plan ("departing June 3, open-ended").
    -- DATE, not TIMESTAMPTZ: a trip starts on a calendar day, wherever on earth you are. Item-level
    -- times (a flight's departure) are a different field on a different entity, at S1.3.
    start_date    DATE,
    end_date      DATE,

    -- The Artifact 02 state machine's entry point. Stored as text, not a PG enum: adding a value to
    -- a PG enum is a migration with a lock, and this column gains `active`/`completed`/`published`
    -- over the next two epics. The domain owns the vocabulary; the column stores what it is told.
    state         TEXT         NOT NULL DEFAULT 'draft',

    -- private | unlisted | public (friends_only reserved, deferred). Every itinerary starts private:
    -- publishing is an explicit act by the owner at S4.1, never a default.
    visibility    TEXT         NOT NULL DEFAULT 'private',

    created_at    TIMESTAMPTZ  NOT NULL
);

-- The entire access path of GET /v1/itineraries: WHERE owner_id = ? ORDER BY id DESC (+ id < cursor).
-- Composite and descending on purpose — this index alone satisfies the filter, the sort and the
-- keyset seek, so the list never sorts a row it does not return. The PK index cannot help: it has no
-- owner_id, so a PK-only plan would scan every itinerary in the system to find one traveler's.
CREATE INDEX itinerary_owner_recent_idx ON itinerary (owner_id, id DESC);
