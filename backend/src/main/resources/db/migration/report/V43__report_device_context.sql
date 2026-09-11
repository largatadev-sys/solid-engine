-- V43 — device context on the report outbox (FB-3 ticket 01).
--
-- Additive: three nullable columns on an existing table, no existing column touched and no existing
-- row rewritten. Pre-existing outbox rows carry NULL on all three and relay exactly as they did
-- before — the relay omits a null key entirely — so there is no data migration and nothing for a
-- stepping-IT to catch (the V42 reasoning applies unchanged).
--
-- What device context IS: the reporter's own answer to "what were you running?", captured on their
-- device at report time and carried opaquely to worklog's Reports intake (contract v1.2). Nothing
-- back-fills it: every report filed before FB-3 shipped stays blank on all three forever, which is
-- why all three land in one migration rather than trickling out.
--
-- All three are nullable FOREVER and that is contractual, not provisional (worklog's v1.2 rule 1).
-- A browser that answers nothing, a platform API that throws, an old installed build that never
-- captured any of it — each is a normal report, not a degraded one. NOT NULL here would turn a
-- missing string into a lost report.
--
-- os holds NAME AND VERSION in one string ("Windows 11", "Android 14", "iOS 17.5") because that is
-- the shape worklog renders; browser is expected only from web reporters; device_model is whatever
-- the platform API gives, verbatim. None of the three is ever parsed — not here, not at worklog —
-- so no CHECK constraint and no allowed-value list: a vocabulary would be a promise about wild
-- environment input we do not control.
--
-- 200 is the contract's per-field ceiling, and our edge CLAMPS to it rather than refusing, unlike
-- `screen`, which 400s (spec decision 9). VARCHAR(200) states in the schema the ceiling the clamp
-- already guarantees, so an over-length value can never reach worklog — where a 400 on the relay
-- hop is a permanently lost report. Note what the width does NOT do: a writer that skipped the
-- clamp would raise an integrity violation, which accept() reads as a lost insert race and answers
-- 200 to, storing nothing. The clamp is the guarantee; this width is its backstop, not a second
-- one. ReportAcceptIT pins the clamp, and that is the test that fails if it is ever removed.
ALTER TABLE report_outbox
    ADD COLUMN os           VARCHAR(200),
    ADD COLUMN browser      VARCHAR(200),
    ADD COLUMN device_model VARCHAR(200);
