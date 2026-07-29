-- V8 — Edit Lease: the single-writer lock on plan editing (S1.4, ADR-014, Artifact 02).
--
-- S1.3 shipped last-write-wins: two members editing the same plan content raced, and the second
-- write silently won. The founder's 2026-07-24 ruling replaces that for the MVP — while one member
-- edits, the plan is closed to everyone else (owner included), with live editing the declared
-- post-gate replacement. This table is that lock.
--
-- ONE ROW PER ITINERARY (the 1:1 is the table shape — itinerary_id is the primary key, not a
-- surrogate): a lease exists or it does not. An EXPIRED row counts as no lock — reads treat
-- expires_at <= now() as absent, and acquisition overwrites an expired row in place. So the table
-- holds at most one row per itinerary whether locked, free-by-expiry, or never-locked (no row).
--
-- PURELY ADDITIVE (spec §migration, ADR-008): no existing table changes, no backfill. Every
-- itinerary starts with no lease row, which is exactly "unlocked". Because nothing is migrated,
-- there is no stepping-IT (the S1.3/V7 precedent) — a fresh schema is the only shape, and the
-- contract + clock-controlled ITs exercise it.

CREATE TABLE edit_lease (
    -- The itinerary this lease locks. PRIMARY KEY, not a FK to a surrogate id: the 1:1 with itinerary
    -- IS the identity of a lease — "the lock on trip X" — so the itinerary id is the natural key. FK
    -- with ON DELETE CASCADE: deleting an itinerary (S1.9) takes its lease with it; a lease on a
    -- deleted trip is meaningless. Intra-module (the itinerary module owns both tables), so a real FK.
    itinerary_id UUID        PRIMARY KEY REFERENCES itinerary (id) ON DELETE CASCADE,

    -- Who holds the lease. A traveler id — cross-module (identity owns Traveler), so no FK, per the
    -- V3/V4/V7 convention for cross-module references. Always a member of this itinerary's workspace:
    -- acquisition runs behind the guard, so a non-member can never become a holder.
    holder_id    UUID        NOT NULL,

    -- When the lease lapses. Acquisition sets now() + TTL; renewal pushes it forward; a row whose
    -- expires_at has passed is treated as no lock at all (no cleanup job — the read is expiry-aware).
    -- This is the real guarantee (ADR-014): a client that dies mid-edit never releases, but its lease
    -- frees itself here.
    expires_at   TIMESTAMPTZ NOT NULL,

    -- When the current holder acquired (the row is overwritten on a fresh acquire, so this is the
    -- start of the *current* holding, not the first ever). Operational, not load-bearing.
    acquired_at  TIMESTAMPTZ NOT NULL
);
