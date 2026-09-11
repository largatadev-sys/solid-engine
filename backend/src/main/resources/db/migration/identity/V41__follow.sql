-- V41 — the follow edge (S4.37 ticket 01).
--
-- Additive: one new table, no existing column touched and no existing row rewritten, so there is
-- nothing for a stepping-IT to catch (the V15/V40 reasoning applies unchanged — the V5 lesson binds
-- where rows must be REWRITTEN, and here none are). Every traveler starts following nobody, which
-- is the correct initial state and not a backfill.
--
-- What a follow IS, and therefore what the table must hold (spec decisions 1, 2 and 13): an
-- asymmetric, open social edge from one traveler to another, effective immediately. It grants
-- nothing and narrows nothing — ADR-019's `public` still means every onboarded traveler, and the
-- amendment on the record says the graph is a pure signal. So this table carries no role, no state,
-- no approval column: a row exists or it does not. Mutuality is not a state either — it is two
-- independent rows, which is why there is no "mutual" flag to keep consistent.
--
-- The primary key is the PAIR, and that is the idempotency mechanism, not a convenience. Follow is
-- specified idempotent in both directions (spec decision 14), which the service expresses as
-- ON CONFLICT DO NOTHING — and that clause needs a unique constraint to conflict against. Without
-- the composite PK the second follow would insert a duplicate row and every count would drift by
-- one per double-tap, silently and permanently. There is deliberately no surrogate id: the pair IS
-- the identity of the edge.
--
-- CHECK (follower_id <> followee_id) makes self-follow structurally impossible rather than merely
-- refused. The endpoint refuses it too (spec decision 14) and the ITs prove BOTH layers
-- independently, because an endpoint check alone is one refactor away from being the only guard,
-- and a constraint alone gives the traveler a 500 instead of an answer.
--
-- ON DELETE CASCADE on both foreign keys: a traveler's rows are the graph's only record of them, so
-- when the traveler goes the edges must go with them. Story C (permanent deletion) owns the wider
-- question; this shape is anonymization-safe by construction because the table holds ids and a
-- timestamp and nothing a person could be recognised by.
--
-- Two indexes, one per direction, both ordered to serve their list read directly. The follower list
-- ("who follows this traveler") reads by followee_id newest-first; the following list reads by
-- follower_id newest-first. The composite PK already indexes (follower_id, followee_id), which
-- serves the following-list membership test and the feed's scope=following subquery, so only the
-- reverse direction strictly needs its own index — but the PK's index cannot serve the ORDER BY
-- created_at DESC that C3's cursor pages require, so both directions get an explicit
-- (id, created_at DESC, ...) index. The trailing id column makes each index cover the keyset
-- comparison the cursor pages use as their tiebreak.
CREATE TABLE follow (
    follower_id UUID        NOT NULL REFERENCES traveler (id) ON DELETE CASCADE,
    followee_id UUID        NOT NULL REFERENCES traveler (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followee_id),
    CONSTRAINT follow_is_not_self CHECK (follower_id <> followee_id)
);

CREATE INDEX follow_followers_idx ON follow (followee_id, created_at DESC, follower_id DESC);

CREATE INDEX follow_following_idx ON follow (follower_id, created_at DESC, followee_id DESC);
