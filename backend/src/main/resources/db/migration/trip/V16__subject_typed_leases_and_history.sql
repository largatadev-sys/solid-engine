-- V16 — the ADR-014 amendment (2026-07-31, founder-ruled): the Edit Lease becomes SUBJECT-TYPED,
-- and every plan write starts leaving an Activity History Entry behind it (S4.9, Artifact 02).
--
-- WHY THIS DROPS RATHER THAN CONVERTS. V8's lease is one row per itinerary; the amendment's is one
-- row per (subject_type, subject_id). A conversion would have to invent a subject for every live
-- row — and there is nothing to invent from: a V8 row means "somebody is editing this trip", which
-- is precisely the granularity the amendment abolishes. Leases are ephemeral minutes-scale state
-- (~3-min TTL, expiry self-heals): the worst case of dropping them is that an editor who happens to
-- be mid-edit during the deploy re-acquires on their next write. Nothing durable lives here, so
-- DROP + CREATE is the honest statement of what is happening. This is also why there is no
-- stepping-IT for this half (the S1.1 WorkspaceBackfillIT pattern): no rows are migrated, so there
-- is no backfill whose correctness a test could distinguish from a no-op.

DROP TABLE edit_lease;

CREATE TABLE edit_lease (
    -- Surrogate key. The NATURAL key is (subject_type, subject_id) and the unique index below is what
    -- enforces "one lease per subject"; the surrogate exists so the row stays a plain single-column
    -- JpaRepository entity. Deliberately NOT subject_id alone: that would silently depend on UUIDs
    -- never colliding across the itinerary, day and activity tables — true today, and a contract
    -- nothing states or tests.
    id           UUID        PRIMARY KEY,

    -- The trip the leased subject belongs to. Present on EVERY row, header ones included (where it
    -- equals subject_id), because three operations scope by trip and by nothing else: releasing a
    -- departing member's holds (S1.5), releasing every hold on archive (S1.9), and assembling the
    -- per-subject holder fields the plan read payload now carries. It also carries the cascade:
    -- deleting an itinerary takes its leases with it.
    itinerary_id UUID        NOT NULL REFERENCES itinerary (id) ON DELETE CASCADE,

    -- HEADER | DAY | ACTIVITY — Hibernate's @Enumerated(STRING) writes the enum's NAME, so these are
    -- UPPER CASE on disk. Any future index, constraint or WHERE naming a value must use that
    -- spelling; the V4 trap (a partial index on 'owner' that would have matched zero rows) is why
    -- EditLeaseStorageIT pins it rather than trusting this comment.
    subject_type TEXT        NOT NULL,

    -- What is leased: the itinerary id for HEADER, the day id for DAY, the activity id for ACTIVITY.
    -- No FK — it points into one of three tables depending on subject_type, which no single foreign
    -- key can express. Referential integrity is upheld above it instead: acquisition resolves the
    -- subject through the day/activity repositories scoped to the itinerary, so a lease can never be
    -- taken on a subject of somebody else's trip, and the itinerary cascade collects the rest.
    subject_id   UUID        NOT NULL,

    -- Who holds it. Cross-module (identity owns Traveler) so no FK, per the V3/V4/V7 convention.
    -- Always a member: acquisition runs behind the guard.
    holder_id    UUID        NOT NULL,

    -- Unchanged from V8, and still the real guarantee (ADR-014): a row whose expires_at has passed
    -- counts as NO lock at all. No cleanup job — every read is expiry-aware.
    expires_at   TIMESTAMPTZ NOT NULL,

    acquired_at  TIMESTAMPTZ NOT NULL
);

-- "One lease per subject" — the invariant the whole model rests on. A UNIQUE index rather than
-- application-level checking because two members racing to acquire the same activity is exactly the
-- case this table exists for: the loser must fail at the database, not at a read-then-write.
CREATE UNIQUE INDEX edit_lease_subject_uk ON edit_lease (subject_type, subject_id);

-- Scoping index for the three trip-wide operations named above.
CREATE INDEX edit_lease_itinerary_idx ON edit_lease (itinerary_id);


-- ACTIVITY HISTORY ENTRY (Artifact 02) — append-only: actor, act, subject, at.
--
-- Capture ships at S4.9 while its reading surface waits for S4.10, because capture cannot be
-- backfilled: a write that happened without leaving a row is gone, and S4.9 has every plan-write
-- path open anyway. The table is therefore written by everything and read by nothing until S4.10 —
-- deliberately, not by omission.
CREATE TABLE activity_history (
    id           UUID        PRIMARY KEY,

    -- The trip whose history this belongs to; the cascade and the future reader's scope.
    itinerary_id UUID        NOT NULL REFERENCES itinerary (id) ON DELETE CASCADE,

    -- The traveler who did it. Cross-module, so no FK. Never null: a system-authored entry has no
    -- meaning in this table — history is attribution (the S1.3 rule), and an unattributed row would
    -- be a hole in it.
    actor_id     UUID        NOT NULL,

    -- What they did — @Enumerated(STRING), so UPPER CASE on disk (see subject_type above).
    act          TEXT        NOT NULL,

    -- What they did it to, in the same vocabulary the leases use. The subject may be gone by the
    -- time anyone reads (a deleted activity is exactly the thing history is for), so no FK and no
    -- cascade beyond the itinerary's: an entry outliving its subject is the normal case, not a leak.
    subject_type TEXT        NOT NULL,
    subject_id   UUID        NOT NULL,

    -- When. Named "at" rather than "created_at" because an entry has no lifecycle to have been
    -- created within — the act's instant IS the row (INV-8's append-only shape, as for the ledger).
    at           TIMESTAMPTZ NOT NULL
);

-- The reading surface S4.10 will build is "this trip's history, newest first". id is UUIDv7, so it
-- is time-ordered and the index serves both the scope and the sort.
CREATE INDEX activity_history_itinerary_idx ON activity_history (itinerary_id, id DESC);
