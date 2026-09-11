-- V5 — every pre-E1 itinerary gets the Workspace it was always supposed to have (S1.1, ADR-011).
--
-- S0.3 shipped itineraries before Workspaces existed: the guard answered from `itinerary.owner_id`
-- behind the resolver seam. S1.1 replaces that resolver with one that reads membership rows — so on
-- the day it lands, an itinerary with no workspace becomes INVISIBLE TO ITS OWN CREATOR, with no
-- error naming why. (S0.3's OwnerMembershipResolver javadoc wrote this obligation down; this file is
-- discharging it.) There is deliberately no runtime fallback to owner_id: a fallback would silently
-- paper over a failed backfill, and one code path is the Full-rigor choice here (S1.1 spec §The
-- resolver swap). This migration is therefore the whole safety net, and Flyway's ordering guarantee
-- is what makes it sufficient — it completes before the new resolver serves a single request.
--
-- IDEMPOTENT BY CONSTRUCTION (`WHERE NOT EXISTS`), which matters twice over:
--   * on `dev` it must skip the workspaces V4's formation code has already created for any itinerary
--     created between deploys;
--   * on a fresh database — the local stack, every Testcontainers run, CI — there are no itineraries
--     at all, so it is a clean no-op.
-- That second case is why this migration cannot be trusted to the ordinary test suite: on every
-- surface we own, it runs against zero rows and passes trivially. `WorkspaceBackfillIT` is the test
-- that manufactures the legacy shape and actually exercises it; the post-merge check on `dev` is
-- what proves it where it ships (S1.1 spec §The backfill's testing trap).

-- Timestamps are INHERITED from the itinerary, never now(). Atomic formation says the workspace
-- exists from the itinerary's first instant (Artifact 03), and history should read as if that had
-- always been true. A now() stamp would fabricate an "every trip's workspace opened on migration
-- day" artifact — invisible today, and a lie to whoever asks the history a question later.
INSERT INTO workspace (id, itinerary_id, created_at)
SELECT
    -- UUIDv7 shape, assembled in SQL: 48 bits of millisecond timestamp, version 7, variant 10.
    -- Ids elsewhere come from the app (UuidV7.generate()); a migration has no access to it, and
    -- gen_random_uuid() would mint v4s — leaving a permanent, silent inconsistency in the one
    -- column whose sortability the list query depends on (V3's note: v7 ids sort by creation time).
    -- The timestamp used is the ITINERARY's, so a backfilled workspace's id sorts where the trip
    -- actually happened, not where the migration ran.
    (
        lpad(to_hex((extract(epoch FROM i.created_at) * 1000)::bigint), 12, '0')
        || '7' || lpad(to_hex((random() * 4095)::int), 3, '0')
        || to_hex(8 + (random() * 3)::int) || lpad(to_hex((random() * 4095)::int), 3, '0')
        || lpad(to_hex((random() * 4294967295)::bigint), 8, '0')
        || lpad(to_hex((random() * 65535)::int), 4, '0')
    )::uuid,
    i.id,
    i.created_at
FROM itinerary i
WHERE NOT EXISTS (SELECT 1 FROM workspace w WHERE w.itinerary_id = i.id);

-- The owner membership, from the itinerary's owner_id — the same fact the S0.3 resolver synthesized
-- on every request, now written down once. INV-4 holds for these rows exactly as it does for freshly
-- formed ones: one owner, joined at the trip's first instant.
--
-- Joined through workspace rather than re-deriving: this picks up precisely the workspaces above
-- (and any earlier partial run), and `NOT EXISTS` keeps it from duplicating a membership that
-- already exists — which V4's PRIMARY KEY would reject anyway, taking the whole migration with it.
INSERT INTO membership (workspace_id, traveler_id, role, joined_at)
SELECT w.id, i.owner_id, 'OWNER', i.created_at
FROM workspace w
JOIN itinerary i ON i.id = w.itinerary_id
WHERE NOT EXISTS (
    SELECT 1 FROM membership m WHERE m.workspace_id = w.id AND m.traveler_id = i.owner_id
);
