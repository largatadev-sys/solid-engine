-- V42 — the feedback report outbox (FB-1 ticket 02).
--
-- Additive: two new tables, no existing column touched and no existing row rewritten, so there is
-- nothing for a stepping-IT to catch (the V41 reasoning applies unchanged — the V5 lesson binds
-- where rows must be REWRITTEN, and here none are).
--
-- What a report IS, and therefore what the table must hold: a store-and-forward envelope. Largata
-- accepts a traveler's feedback synchronously so the thank-you never waits on a third party, then
-- relays it server-to-server into worklog's Reports intake. Between those two moments the report
-- lives here, and this table is the only thing standing between an accepted report and a lost one.
--
-- The primary key is the CLIENT-MINTED reportId, and that is the idempotency mechanism, not a
-- convenience. The client mints it when the report flow opens (spec decision 2), so a double-tapped
-- send, a retry after a dropped connection and a resubmit from a restored form all carry the same
-- id — the insert conflicts and the second accept answers 200 having written nothing. The same UUID
-- is the key worklog honors on its own hop, which is what makes both hops replay-safe. A surrogate
-- id would defeat the whole design: two rows, two relays, two permanent reports in an inbox that
-- has no delete.
--
-- submitted_at is stamped by US at first accept and never restamped (spec decision 3) — the column
-- is the reason that promise can be kept across an arbitrary number of delivery retries. It is not
-- created_at by another name: it is the traveler's moment, carried unchanged into worklog.
--
-- reporter_traveler_id and reporter_name are nullable together and are derived ONLY from a verified
-- bearer token (spec decision 1). A signed-out report stores neither, and no client payload can put
-- anything here — impersonation in a permanent external inbox is made structurally impossible by
-- there being no path from request body to these columns. The FK is ON DELETE SET NULL rather than
-- CASCADE: the report is feedback about the product and outlives the account that sent it, so a
-- departed traveler's report survives, de-identified.
--
-- status is TEXT holding an enum NAME (PENDING/DELIVERED/DEAD_LETTER) because @Enumerated(STRING)
-- writes the name — the V3 'draft' trap. Any SQL below that tests this column uses upper case for
-- that reason, and ReportStorageIT pins the spelling so a rename cannot silently un-match it.
--
-- attempts/next_attempt_at/last_error carry the poller's per-row backoff (spec decision 9).
-- next_attempt_at is NOT NULL and defaults to now() so a freshly accepted row is immediately due;
-- the poller's claim query orders by it, which is why it is indexed together with status.
--
-- last_error holds worklog's response STATUS and validation envelope keys only — never the
-- description, never screenshot bytes, never the secret (P3). A dead-letter row is an operational
-- record, not a second copy of the traveler's words.
CREATE TABLE report_outbox (
    id                   UUID        PRIMARY KEY,
    type                 TEXT        NOT NULL,
    description          TEXT        NOT NULL,
    screen               TEXT,
    app_version          TEXT,
    platform             TEXT,
    reporter_traveler_id UUID        REFERENCES traveler (id) ON DELETE SET NULL,
    reporter_name        TEXT,
    submitted_at         TIMESTAMPTZ NOT NULL,
    status               TEXT        NOT NULL DEFAULT 'PENDING',
    attempts             INTEGER     NOT NULL DEFAULT 0,
    next_attempt_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at         TIMESTAMPTZ,
    last_error           TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The poller's one query: the due pending rows, oldest deadline first. Partial on the status the
-- poller actually claims, so delivered rows — which accumulate forever as the delivery audit
-- (spec decision 10) — never enter the index and never slow the drain.
CREATE INDEX report_outbox_due_idx
    ON report_outbox (next_attempt_at, id)
    WHERE status = 'PENDING';

-- Screenshots are TRANSPORT PAYLOAD, not media: they are sanitized bytes waiting for a relay, so
-- they get no Photo entity, no object-store key and no lifecycle of their own. They are bytea in
-- the row's own table because their lifetime is exactly the outbox row's un-delivered lifetime —
-- after a 2xx the bytes are purged and worklog owns them (spec decision 10). Storing them in the
-- object store would mean a second thing to clean up and a second way to leak.
--
-- ordinal preserves the order the traveler attached them, which is the order they are relayed;
-- UNIQUE (report_id, ordinal) makes a duplicated relay attempt unable to double-insert.
-- ON DELETE CASCADE ties them to the report: there is no such thing as an orphan screenshot here.
CREATE TABLE report_screenshot (
    id           UUID    PRIMARY KEY,
    report_id    UUID    NOT NULL REFERENCES report_outbox (id) ON DELETE CASCADE,
    ordinal      INTEGER NOT NULL,
    content_type TEXT    NOT NULL,
    bytes        BYTEA   NOT NULL,
    UNIQUE (report_id, ordinal)
);

CREATE INDEX report_screenshot_report_idx ON report_screenshot (report_id, ordinal);
