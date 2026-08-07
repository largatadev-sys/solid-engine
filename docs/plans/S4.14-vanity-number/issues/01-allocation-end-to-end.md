# 01 — Allocation end-to-end for new travelers

**What to build:** a freshly signed-up traveler automatically holds a vanity number, and `GET /v1/me` returns it as one formatted string — the scheme's whole core, demoable with nothing else built: provision, read `/v1/me`, see `01` + four digits.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] An additive migration adds the two integer vanity columns to the traveler table, the per-month pool table, and a partial unique constraint over (cohort, number) where cohort > 0.
- [ ] A freshly provisioned traveler receives cohort `01` and a pool number **in the same transaction as the traveler insert**; `GET /v1/me` returns the vanity number as a server-formatted string (cohort zero-padded to two digits, pool number to four).
- [ ] A month's pool is generated as a single shuffled 0000–9999 batch the first time it is needed — no scheduler; claims pop transactionally with skip-locked semantics.
- [ ] Concurrent provisioning of distinct travelers yields distinct numbers (integration test with parallel sign-ups).
- [ ] A rolled-back provisioning consumes no number — the pool count is unchanged (transaction atomicity, asserted).
- [ ] Cohort arithmetic: with the launch-date config unset (every environment today), allocation is `01`; with it set (test-only), allocation is `02` + full calendar months elapsed. Both asserted.
- [ ] Formatting handles growth: a pool value past 9999 and a cohort past 99 render wider without error (formatter unit test).
- [ ] Storage contract, in the storage-spelling test family: raw-SQL insertion of a duplicate (cohort, number) with cohort > 0 must refuse; a duplicate `(0, 0)` must be allowed. Sabotage-checked — the test fails if the index predicate stops matching.
- [ ] `/v1/me` changes additively only; the UUID stays the identifier everywhere; the vanity number appears in no log line.
