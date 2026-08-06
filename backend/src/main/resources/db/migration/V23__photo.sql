-- V23 — the photo table (S3.3, ADR-021).
--
-- ONE TABLE FOR THREE ATTACHMENTS, discriminated rather than split. A traveler's avatar, an
-- itinerary's cover and an activity's photos are the same fact — bytes in the object store,
-- metadata here — differing only in what they hang off. Three tables would triple the ingest
-- plumbing, the media-read path and the delete path to express one difference that a pair of
-- columns states exactly.
--
-- WHY NOT THREE FOREIGN KEYS: `subject_kind` + `subject_id` is a polymorphic reference, and it is
-- chosen knowingly over three nullable FK columns because the alternative encodes the same
-- constraint less honestly — three columns of which exactly one may be non-null is a CHECK
-- constraint pretending to be a schema. The cost is that the database cannot cascade a delete, so
-- PhotoService does it explicitly at every deletion point; that is a real cost, paid because media
-- deletion must remove BYTES too (INV-6's no-fork rule makes one blob one row), and no cascade can
-- reach the object store. A dangling row would be invisible; a dangling blob would be a leak.
--
-- STORAGE KEY, NEVER A URL. The column holds the object key inside our bucket — never a provider
-- hostname, never a presigned URL (ADR-021). A hostname here would weld the exit hatch shut and an
-- expiring URL in a durable column would simply be a lie. The wire's `coverImageUrl`/`avatarUrl`
-- are BACKEND urls assembled at read time from the id, which is why swapping providers is a config
-- change and a data copy.
--
-- TWO VARIANTS, ONE ROW. Display and thumbnail share every fact except their key suffix, so the
-- row carries the base key and the store holds `<key>` and `<key>-thumb`. A variants table would
-- add a join to answer a question the naming already answers, and the original is discarded at
-- ingest (spec decision 9) so there is never a third.
--
-- `uploaded_by` IS ATTRIBUTION, NOT AUTHORITY. Any lease-holding member may manage an activity's
-- photos (spec decision 11); this column records who put it there, the same fact `last_edited_by`
-- carries on the itinerary, and nothing reads it for permission.

CREATE TABLE photo (
    id            UUID        PRIMARY KEY,
    subject_kind  TEXT        NOT NULL,
    subject_id    UUID        NOT NULL,
    storage_key   TEXT        NOT NULL UNIQUE,
    content_type  TEXT        NOT NULL,
    width         INTEGER     NOT NULL,
    height        INTEGER     NOT NULL,
    byte_size     BIGINT      NOT NULL,
    uploaded_by   UUID        NOT NULL REFERENCES traveler(id),
    created_at    TIMESTAMPTZ NOT NULL
);

-- The one query every read path runs: "the photos of this subject, in upload order". UUIDv7 ids are
-- time-ordered, so ordering by id IS upload order and needs no separate sort column — the same
-- property S0.3's keyset pagination already relies on.
CREATE INDEX photo_subject_idx ON photo (subject_kind, subject_id, id);

-- An avatar and a cover are single-valued: the partial unique index makes that a schema fact rather
-- than a service-layer promise, so a concurrent double-upload cannot leave a traveler with two
-- avatars and no way to say which is theirs. Activity photos are deliberately excluded — they are
-- many, capped at 5 in the service where the limit can name itself in a refusal a traveler reads.
CREATE UNIQUE INDEX photo_single_valued_subject_idx
    ON photo (subject_kind, subject_id)
    WHERE subject_kind IN ('TRAVELER_AVATAR', 'ITINERARY_COVER');
