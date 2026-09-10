-- V38 — the Join Link and the Join Request: the invite link's two tables (S4.28, ADR-032).
--
-- These are the second consent direction. An Invitation (V6/V17) is the trip asking a traveler; a
-- Join Request is the traveler asking the trip. The Join Link is what makes the asking possible
-- without anyone knowing anyone's handle: one shareable token per workspace, forwarded through
-- WhatsApp and Messenger, granting a teaser and the right to ask — never entry. Approval is the
-- owner's consent and creates the membership immediately, the request having been the requester's.
--
-- PURELY ADDITIVE: two tables, both born empty. No backfill, so no stepping-IT is owed (contrast V5,
-- whose rows already existed). A data migration is invisible to every test surface this repo owns; a
-- table born empty is born correct.

CREATE TABLE join_link (
    -- UUIDv7, app-side (S0.1), as everywhere.
    id            UUID         PRIMARY KEY,

    -- The workspace this link admits people to ask about. A genuine intra-schema reference — the link
    -- belongs to the Workspace aggregate — so the FK is real, unlike the cross-module traveler ids
    -- elsewhere in this schema (V3/V4/V6 deliberately leave those unconstrained).
    --
    -- UNIQUE, not merely indexed: one live link per trip is the decision itself (ADR-032 §3), not an
    -- optimisation. No expiry, no regeneration — a reset is parked behind a spam-report trigger — so
    -- every share of this trip's link forever resolves to this one row, and an old forward never goes
    -- stale. The constraint is what makes "fetch or mint" idempotent under a concurrent double-read:
    -- the loser of the race violates it, re-reads, and gets the winner's token.
    workspace_id  UUID         NOT NULL UNIQUE REFERENCES workspace (id),

    -- The token itself: URL-safe base64 of 32 random bytes (256 bits, comfortably past the >=128
    -- ADR-032 requires). Opaque and unguessable — guessing is the only attack, since holding the token
    -- is what authorizes the teaser read and the request. UNIQUE because it is the lookup key for every
    -- anonymous read, and a collision would silently point two trips at one link.
    token         TEXT         NOT NULL UNIQUE,

    created_at    TIMESTAMPTZ  NOT NULL
);


CREATE TABLE join_request (
    id            UUID         PRIMARY KEY,

    -- The workspace being asked. Intra-schema, so a real FK (see join_link above).
    workspace_id  UUID         NOT NULL REFERENCES workspace (id),

    -- Who is asking. A traveler id — cross-module, so no FK, per V3/V4/V6.
    traveler_id   UUID         NOT NULL,

    -- PENDING | APPROVED | DECLINED | SUPERSEDED — the three non-pending states all terminal, so a
    -- re-request after a decline is a NEW row rather than a resurrection. TEXT holding
    -- @Enumerated(STRING)'s name, upper-case, for V4's recorded reason: the partial index below tests
    -- this literal, and a predicate that never matches would create successfully and enforce nothing
    -- — the S1.1 `WHERE role = 'owner'` near-miss. JoinRequestStorageIT pins the spelling.
    --
    -- SUPERSEDED is distinct from DECLINED on purpose, the same three-way split V9 made for offers:
    -- DECLINED is the owner's refusal, SUPERSEDED the system's note that membership arrived by the
    -- other consent direction (the traveler accepted a handle invitation while their request sat
    -- open). Collapsing them would make the analytics lie about who acted, and would tell a traveler
    -- they were refused when in fact they were let in.
    status        TEXT         NOT NULL,

    created_at    TIMESTAMPTZ  NOT NULL,

    -- When it left PENDING, and which owner decided it. Both NULL while pending. decided_by is NULL
    -- for SUPERSEDED too: nobody decided that, the system observed it.
    decided_at    TIMESTAMPTZ,
    decided_by    UUID
);

-- At most one PENDING request per (workspace, traveler) — asking twice is not two asks. A second
-- request while one is open is answered from the existing row rather than creating a duplicate, so an
-- impatient tap cannot flood the owner's queue.
--
-- Partial, so terminal rows do not collide: the whole point of DECLINED being terminal-but-retryable
-- is that the same traveler can ask the same trip again later, which needs a second row to exist.
-- Scoped per (workspace, traveler), unlike V9's per-workspace offer index — many people may be asking
-- one trip at once, and they are not competing for a single thing the way offers compete for one crown.
CREATE UNIQUE INDEX join_request_one_pending_idx
    ON join_request (workspace_id, traveler_id) WHERE status = 'PENDING';

-- The owner's queue: "what is waiting on me for this trip?" — read on every Travelers-tab composition
-- for an owner. workspace_id leads because that is what it filters on; status sits in the predicate so
-- the index carries only rows that can still be acted on.
CREATE INDEX join_request_queue_idx ON join_request (workspace_id) WHERE status = 'PENDING';

-- The requester's own state: "have I already asked?" — read by the landing on every open of the link,
-- which is the hottest path here since it answers anonymously-shaped traffic from forwarded links.
CREATE INDEX join_request_asker_idx ON join_request (traveler_id) WHERE status = 'PENDING';
