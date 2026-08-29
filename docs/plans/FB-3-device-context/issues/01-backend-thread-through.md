# 01 — The backend carries device context: accept → outbox → relay

**What to build:** a report POSTed to our accept endpoint with `os`, `browser` and
`deviceModel` in its report part lands in the outbox carrying all three, and the relay's
outbound payload presents them to worklog inside `context` under the contract's keys —
provable end to end against the local stack with curl and the logging sink before any client
sends them. The migration is the additive one signed off at the grilling (spec decision 10):
three nullable columns on the report outbox table, next version in the sequence.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The report JSON part accepts three new optional fields; a payload carrying none of
      them (the pre-FB-3 client) is accepted exactly as today, and a replay of either shape
      stays idempotent
- [ ] Accepted values persist to the outbox row; absent values store null; blank values
      store null like `screen`
- [ ] An over-length value is **clamped to 200 and accepted** — never a 400 — and the IT
      pins this by name as deliberate divergence from `screen`'s posture (spec decision 9)
- [ ] The relay payload includes each field under `context` exactly when present; a row with
      all three carries all three, a partial row carries exactly what it has, and a
      pre-FB-3 row (all null) produces a payload identical to today's — asserted at the
      stub-server seam
- [ ] Pre-existing outbox rows relay unchanged after the migration (nullable additive
      columns; no data migration, no stepping IT owed)
- [ ] Report ITs green, read by their `Tests run:` counts
