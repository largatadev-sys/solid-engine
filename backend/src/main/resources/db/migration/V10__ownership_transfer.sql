-- V10 — the Ownership Transfer record: ownership moving, durably (S1.6, Artifact 02).
--
-- Written when an Ownership Offer (V9) is accepted, in the same transaction as the role swap. This is
-- the table three canon documents name as surviving account-deletion anonymization: 01 §Compliance
-- ("ledger entries and ownership-transfer records survive anonymized"), 02's Traveler entry, and 03
-- §77. It survives structurally, not by policy — it holds traveler *ids* and nothing else, so there is
-- no PII in it to erase.
--
-- WHY IT SHIPS BEFORE IT HAS A READER, which is normally this repo's cue to defer (S1.2's state
-- column, S1.5's rejected membership_event log): this is ownership ATTRIBUTION, the S1.3 category —
-- "deferring attribution is the one deferral that destroys data retroactively". A transfer not
-- recorded today is unrecoverable forever; there is no backfill for who owned what when. The rejected
-- membership_event log recorded comings and goings nobody asked to keep; this one is named in canon
-- three times as a thing that must exist.
--
-- WHAT IT BUYS, concretely: the creator of any itinerary is derivable forever — the earliest transfer's
-- from_traveler_id, else the current owner. That answers the E4 "(Creator)" badge (register #5) and the
-- backlog's influencer program with no retrofit and no second column.
--
-- PURELY ADDITIVE and born empty, like V9: no transfer has ever happened, so an empty table is the
-- correct initial state and no stepping-IT applies.

CREATE TABLE ownership_transfer (
    -- UUIDv7, app-side (S0.1).
    id                 UUID        PRIMARY KEY,

    -- The workspace whose ownership moved. Real FK, for V6/V9's reason.
    workspace_id       UUID        NOT NULL REFERENCES workspace (id),

    -- Who held it, and who holds it now. Traveler ids, cross-module → no FK (V3/V4/V6/V9), which is
    -- also what lets these rows outlive an anonymized traveler: nothing here dereferences a person.
    from_traveler_id   UUID        NOT NULL,
    to_traveler_id     UUID        NOT NULL,

    transferred_at     TIMESTAMPTZ NOT NULL

    -- NO `kind` COLUMN, deliberately (S1.6 spec §1, §6). E5/S5.5 adds the owner-deletion claim, which
    -- is the second way ownership can move and therefore the first thing that needs to tell two kinds
    -- apart. Until a second value exists, a discriminator column has exactly one value and no reader —
    -- the S1.2 state-column discipline applied to a column rather than a table. Adding it later is
    -- additive (nullable, or NOT NULL DEFAULT 'TRANSFER' backfilling these rows to what they truly are).
);

-- The workspace's ownership chain, oldest first — the access path for "who created this trip" and for
-- any future audit of one trip's history. Ordered by the timestamp because that is the question's
-- shape; the id would sort identically (UUIDv7 is time-ordered) but the intent should be readable.
CREATE INDEX ownership_transfer_workspace_idx ON ownership_transfer (workspace_id, transferred_at);
