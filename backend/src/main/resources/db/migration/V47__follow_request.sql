-- V47 — the follow request (S4.39 ticket 03, ADR-034).
--
-- Additive: one new table, no existing column touched and no existing row rewritten, so there is
-- nothing for a stepping IT to catch (the V41 reasoning, unchanged). Every traveler starts with no
-- requests, which is the correct initial state and not a backfill.
--
-- What a follow request IS, and therefore what this table must hold (spec decision 4): a durable
-- ASK, in the Invitation / Join Request / Ownership Offer grammar — pending until the target
-- decides, then terminal forever. That is why it carries a surrogate id and a status where `follow`
-- carries neither: the follow edge is a fact whose whole content is "it exists", while a request is
-- an event with a history the owner curates. A decline must stay on the record as a decline rather
-- than vanishing, or "they never asked" and "I said no" become the same row.
--
-- STATUS is TEXT holding the enum's NAME (PENDING / APPROVED / DECLINED / CANCELLED), matching
-- itinerary.state and traveler.profile_visibility. FollowRequestStorageIT pins the spelling,
-- because the partial index below is a WHERE on that literal: get the casing wrong and the index
-- creates cleanly, matches zero rows, and enforces nothing — the S1.1 lesson, exactly.
--
-- THE PARTIAL UNIQUE INDEX IS THE WHOLE CONCURRENCY STORY. "At most one pending per pair" is the
-- invariant; making it structural is what lets the service insert-or-find without a lock and lets
-- a double-tap be idempotent by construction rather than by timing. It must be PARTIAL: a plain
-- unique index on (requester, target) would forbid re-requesting after a decline, which spec
-- decision 4 explicitly permits — decline is silent and re-requestable, so a second row with a
-- terminal status must be legal while a second PENDING row must not.
--
-- CHECK (requester_id <> target_id) makes self-request structurally impossible; the endpoint
-- refuses it too and both layers are proven independently (the V41 reasoning).
--
-- ON DELETE CASCADE on both foreign keys, as `follow`: the rows are id-only and hold nothing a
-- person could be recognised by, so the table is anonymization-safe by construction (S5.5).
--
-- The inbox index serves the one list read this table has: a target's pending requests, newest
-- first, keyset-paginated. The trailing id makes it cover the cursor's tiebreak, as V41's do.
CREATE TABLE follow_request (
    id            UUID        PRIMARY KEY,
    requester_id  UUID        NOT NULL REFERENCES traveler (id) ON DELETE CASCADE,
    target_id     UUID        NOT NULL REFERENCES traveler (id) ON DELETE CASCADE,
    status        TEXT        NOT NULL,
    requested_at  TIMESTAMPTZ NOT NULL,
    decided_at    TIMESTAMPTZ,
    CONSTRAINT follow_request_is_not_self CHECK (requester_id <> target_id),
    CONSTRAINT follow_request_status_is_known
        CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED'))
);

CREATE UNIQUE INDEX follow_request_one_pending_per_pair_idx
    ON follow_request (requester_id, target_id)
    WHERE status = 'PENDING';

CREATE INDEX follow_request_inbox_idx
    ON follow_request (target_id, requested_at DESC, id DESC)
    WHERE status = 'PENDING';
