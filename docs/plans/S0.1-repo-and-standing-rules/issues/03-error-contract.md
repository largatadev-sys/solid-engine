# 03 — Error contract: taxonomy + envelope + traceId, proven

**What to build:** Any `DomainException` thrown anywhere in the backend reaches the client as the Artifact 05 error envelope (`{code, message, traceId, timestamp}`) with the correct HTTP status for its taxonomy category (06b §3: NotFound→404, Validation→400, Conflict→409, Forbidden→403), and its traceId appears in exactly one error-severity log line. Ships the rest of `common`: the four category parents under `DomainException`, the single `@RestControllerAdvice`, and the logging filter injecting `traceId`/`endpoint` (and later `userId`) via MDC — structured JSON logs, P3 never-log list respected. Nothing raw (stack traces, SQL, exception class names) ever reaches a response. A DB-down health call returns 503 through the same envelope.

Proof is test-side only: a test-scoped throwing controller living in test sources — nothing debug-flavored ships in the production jar.

**Blocked by:** 02 — Backend skeleton.

**Status:** ready-for-agent

- [ ] One integration test per taxonomy parent: correct status + envelope shape
- [ ] traceId in the response matches the log line, and that log line occurs exactly once per failed request
- [ ] Health with DB down → 503 in the envelope, no JDBC/internal detail in body or message
- [ ] Production jar contains no test/debug endpoint
- [ ] Success-path logging per 06b §4: one info line from the service layer

## Comments
