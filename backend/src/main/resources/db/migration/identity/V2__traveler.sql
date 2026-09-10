-- V2 — the Traveler: the domain's account, keyed to a Firebase identity (S0.2, ADR-006).
--
-- "The provider owns credentials; we own identity." Firebase holds passwords, sessions and social
-- links; this table holds the domain's account and is what every future foreign key points at. The
-- indirection is deliberate — it is the designed exit if Firebase ever has to be replaced.

CREATE TABLE traveler (
    -- UUIDv7, generated app-side, never DB-side (S0.1 spec): keeps the DB version unconstraining
    -- and makes the id available before persistence, which module boundaries rely on.
    id            UUID         PRIMARY KEY,

    -- The join to Firebase, and the reason provisioning is idempotent. UNIQUE is not decoration:
    -- it is the whole mechanism (S0.2 spec, decision 6b). Two concurrent first calls from the same
    -- traveler both try to insert; the constraint elects a winner and the loser reads the winner's
    -- row. Application-level check-then-insert cannot do this — two threads both see "missing".
    firebase_uid  TEXT         NOT NULL UNIQUE,

    -- Snapshotted from the token's claims at creation, never re-synced (decision 6d). Staleness is
    -- cosmetic until S1.2, where invites match by email and it becomes a real decision.
    email         TEXT         NOT NULL,

    -- A human label, NOT an identifier: deliberately not unique, and nothing looks a Traveler up by
    -- it (02-domain-model). Derived from the `name` claim, else the email local-part — which
    -- collides by construction (ana@gmail.com and ana@yahoo.com both yield "ana"). A UNIQUE here
    -- would turn that collision into a failed sign-in for a cosmetic field.
    display_name  TEXT         NOT NULL,

    created_at    TIMESTAMPTZ  NOT NULL
);

-- Every authenticated request resolves the principal by firebase_uid; it is the hot lookup.
-- The UNIQUE constraint already provides the index — no second one.
