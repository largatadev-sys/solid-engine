# 02 — A report is accepted and durably stored (the thin tracer)

**What to build:** the pipeline's spine, screenshots excluded. Anyone — signed in or out —
can POST a report to the public accept endpoint and it lands durably in the new report
module's outbox, replay-safe. Additive migration (outbox + screenshot tables), the
`permitAll` accept route (the stop-rule sign-off is in the spec), optional-bearer reporter
derivation, validation, idempotency on the client-minted `reportId`, `submittedAt` stamped
at first accept. Screenshot parts answer a 400 in this ticket; ticket 03 replaces that with
the real path.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] An anonymous multipart POST with a valid `report` part → `201 {reportId}`; an outbox row exists in the pending state with no reporter fields
- [x] The same `reportId` posted again → `200`, still exactly one row, `submittedAt` unchanged
- [x] A signed-in POST stores reporter = traveler UUID + display name at submit, derived from the token; a traveler with no display name stores uid only
- [x] Reporter-shaped fields inside the client payload are ignored in both auth states — impersonation is structurally impossible
- [x] Validation refusals persist nothing: bad type, description outside 1–2000, screen over 200 chars → `400` in the standard envelope
- [x] Security ITs: the route is reachable without a token; a screenshot part answers `400` (until ticket 03); the dev CORS posture covers the route and the prod-absence invariant is untouched
