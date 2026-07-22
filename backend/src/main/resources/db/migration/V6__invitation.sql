-- V6 — the Invitation: the co-traveler onboarding path (S1.2, Artifact 02).
--
-- An owner invites an email into a Trip Workspace; the invitee authenticates, and if their VERIFIED
-- email matches, a membership row is created and the walls open (Artifact 03 §76, rewritten at S1.2).
-- There is no bearer token in this table (S1.2 grilling Q6): the email is a pure notification and the
-- in-app inbox is the accept surface, so authority is the verified-email match, not a secret string.
--
-- PURELY ADDITIVE: a new table, born empty. Unlike V5 there is no data backfill — nothing pre-exists
-- to migrate — so this migration has no stepping-IT (S1.2 spec §Deliberate omissions). It is exercised
-- by InvitationStorageIT and the contract ITs against a fresh schema.

CREATE TABLE invitation (
    -- UUIDv7, app-side (S0.1), same as every other id here.
    id            UUID         PRIMARY KEY,

    -- The workspace this invites into. FK to workspace(id): this table lives in the invitation module
    -- but the workspace is the aggregate it belongs to (Artifact 02), and an invitation into a
    -- workspace that does not exist is meaningless — the reference is a genuine intra-schema one, so
    -- the FK is real (unlike the cross-module id references V3/V4 deliberately leave un-constrained).
    workspace_id  UUID         NOT NULL REFERENCES workspace (id),

    -- The invited address, stored lowercased. Normalisation (trim + casefold) happens once, in the
    -- application, BEFORE storage, so the partial index below and the accept-time match both operate
    -- on one canonical form and the comparison is plain equality. The CHECK is defence in depth: any
    -- write that skips normalisation fails loudly rather than planting a mixed-case row the index and
    -- the match would silently disagree about.
    email         TEXT         NOT NULL CHECK (email = lower(email)),

    -- PENDING | ACCEPTED | DECLINED | REVOKED | EXPIRED (S1.2 grilling Q3) — all four non-pending
    -- states terminal; re-inviting is a new row. TEXT holding @Enumerated(STRING)'s name, upper-case,
    -- for V4's recorded reason: the partial index below tests this value, and a predicate that never
    -- matches would create successfully and enforce nothing. InvitationStorageIT pins the spelling.
    status        TEXT         NOT NULL,

    -- The owner who issued it (a traveler id, cross-module → no FK, per V3/V4).
    invited_by    UUID         NOT NULL,

    -- The traveler who accepted, once one has (S1.2 grilling Q5's rider: bearer-less accept still
    -- records who used the invitation, so the audit trail is honest). NULL until ACCEPTED.
    accepted_by   UUID,

    created_at    TIMESTAMPTZ  NOT NULL,

    -- 14 days from creation (S1.2 grilling Q4). Checked lazily at read/transition time — no scheduler.
    -- A row past this instant behaves expired whether or not its status has been flipped.
    expires_at    TIMESTAMPTZ  NOT NULL,

    -- When it left PENDING (accepted/declined/revoked), for the record. NULL while pending.
    resolved_at   TIMESTAMPTZ
);

-- At most one PENDING invitation per (workspace, email) (S1.2 grilling Q3) — two live tokens for one
-- inbox can never exist, so "which invite did she click" is structurally impossible. Partial, so that
-- terminal rows (a declined-then-reinvited address, an address invited to two different trips) do not
-- collide. The predicate tests 'PENDING' — @Enumerated(STRING)'s name — and if that spelling ever
-- moved the index would match nothing and enforce nothing, exactly the S1.1 `WHERE role = 'owner'`
-- near-miss; InvitationStorageIT pins it against that class of silent failure.
CREATE UNIQUE INDEX invitation_one_pending_idx ON invitation (workspace_id, email) WHERE status = 'PENDING';

-- The inbox's access path: "pending invitations addressed to this email" (GET /v1/invitations). The
-- email leads because that is what the inbox filters on; status is in the predicate so the index only
-- carries the rows the inbox can return.
CREATE INDEX invitation_inbox_idx ON invitation (email) WHERE status = 'PENDING';
