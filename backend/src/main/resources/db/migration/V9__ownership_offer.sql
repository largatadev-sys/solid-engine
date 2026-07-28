-- V9 — the Ownership Offer: consent-gated ownership transfer (S1.6, Artifact 02).
--
-- The owner offers their workspace's ownership to a member; the member accepts, declines, or the
-- owner revokes. Accepting executes the transfer (V10). Ownership moves by consent, never imposition
-- — the S1.6 grilling reversed an earlier unilateral design on the record: an unnoticed *imposed*
-- ownership puts INV-4's load-bearing role in the hands of someone who does not know they hold it,
-- while an unnoticed *offer* is only a delay. Acceptance is what guarantees the new owner knows.
--
-- PURELY ADDITIVE: a new table, born empty. Like V6 there is no backfill — nothing pre-exists to
-- migrate, so no stepping-IT (contrast V5, whose rows already existed). A data migration is invisible
-- to every test surface this repo owns; a table born empty is born *correct*.

CREATE TABLE ownership_offer (
    -- UUIDv7, app-side (S0.1), same as every other id here.
    id            UUID         PRIMARY KEY,

    -- The workspace whose ownership is offered. FK to workspace(id) for V6's reason: the offer belongs
    -- to the Workspace aggregate (Artifact 02) and an offer into a workspace that does not exist is
    -- meaningless — a genuine intra-schema reference, so the FK is real (unlike the cross-module
    -- traveler ids below, which V3/V4/V6 deliberately leave un-constrained).
    workspace_id  UUID         NOT NULL REFERENCES workspace (id),

    -- Who the crown is offered to. A traveler id (cross-module → no FK, per V3/V4/V6). Always a member
    -- of this workspace at offer time; departure voids the offer rather than leaving it pointing at a
    -- non-member, which keeps the latent invariant "an offer's target is always a member" (S1.6 §5,
    -- sibling of S1.5's "a lease holder is always a member").
    target_traveler_id UUID    NOT NULL,

    -- PENDING | ACCEPTED | DECLINED | REVOKED | VOIDED (S1.6 §4) — all four non-pending states
    -- terminal; re-offering is a new row. TEXT holding @Enumerated(STRING)'s name, upper-case, for
    -- V4's recorded reason: the partial index below tests this value, and a predicate that never
    -- matches would create successfully and enforce nothing. OwnershipOfferStorageIT pins the spelling.
    --
    -- VOIDED is distinct from REVOKED on purpose: REVOKED is the owner's explicit retraction, DECLINED
    -- the target's refusal, VOIDED the system's consequence of the target departing. Collapsing them
    -- would make the analytics lie about who acted.
    status        TEXT         NOT NULL,

    -- The owner who offered it (a traveler id; no FK, as above).
    offered_by    UUID         NOT NULL,

    offered_at    TIMESTAMPTZ  NOT NULL,

    -- When it left PENDING (accepted/declined/revoked/voided), for the record. NULL while pending.
    resolved_at   TIMESTAMPTZ
);

-- At most one PENDING offer per workspace (S1.6 §4) — one crown, one outstretched hand. Note the
-- scope: per WORKSPACE, not per (workspace, target) as V6's invitation index is. Offering to C while
-- B's offer is pending requires an explicit revoke first, so the owner always knows they are
-- retracting, and no accept can ever race another accept for the same crown.
--
-- Partial, so terminal rows (a declined-then-reoffered member, offers across different trips) do not
-- collide. The predicate tests 'PENDING' — @Enumerated(STRING)'s name — and if that spelling ever
-- moved the index would match nothing and enforce nothing, exactly the S1.1 `WHERE role = 'owner'`
-- near-miss; OwnershipOfferStorageIT pins it against that class of silent failure.
CREATE UNIQUE INDEX ownership_offer_one_pending_idx ON ownership_offer (workspace_id) WHERE status = 'PENDING';

-- The offeree's access path: "is there a pending offer for me?" — read on every roster composition and
-- by the departure void. The target leads because that is what those filter on; status is in the
-- predicate so the index only carries rows that can still be acted on.
CREATE INDEX ownership_offer_target_idx ON ownership_offer (target_traveler_id) WHERE status = 'PENDING';
