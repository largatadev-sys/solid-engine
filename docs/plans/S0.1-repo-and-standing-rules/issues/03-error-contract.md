# 03 — Error contract: taxonomy + envelope + traceId, proven

**What to build:** Any `DomainException` thrown anywhere in the backend reaches the client as the Artifact 05 error envelope (`{code, message, traceId, timestamp}`) with the correct HTTP status for its taxonomy category (06b §3: NotFound→404, Validation→400, Conflict→409, Forbidden→403), and its traceId appears in exactly one error-severity log line. Ships the rest of `common`: the four category parents under `DomainException`, the single `@RestControllerAdvice`, and the logging filter injecting `traceId`/`endpoint` (and later `userId`) via MDC — structured JSON logs, P3 never-log list respected. Nothing raw (stack traces, SQL, exception class names) ever reaches a response. A DB-down health call returns 503 through the same envelope.

Proof is test-side only: a test-scoped throwing controller living in test sources — nothing debug-flavored ships in the production jar.

**Blocked by:** 02 — Backend skeleton.

**Status:** done

- [x] One integration test per taxonomy parent: correct status + envelope shape
- [x] traceId in the response matches the log line, and that log line occurs exactly once per failed request
- [x] Health with DB down → 503 in the envelope, no JDBC/internal detail in body or message
- [x] Production jar contains no test/debug endpoint
- [x] Success-path logging per 06b §4: one info line from the service layer

## Comments

**2026-07-15 — implemented. 9 tests in `ErrorContractIT` + 4 in `HealthUnavailableIT`.**

**Taxonomy amended: a fifth category, `UnavailableException` → 503.** 06b §3 defined four (404/400/409/403), and none fits "a required dependency did not answer" — it is neither the caller's fault nor a domain-rule rejection. Without it the only options were an untyped 500 (a Spring error page, violating P2) or misusing a category. **The amendment is recorded in 06b §3 and in 05's status list**, not only in code.

**Code review caught two real defects here — both fixed in `5ccc351`:**

1. **Double-logging (hard P2 violation).** `HealthService` did catch-log-and-rethrow while the global handler logged the same `DomainException` again — two lines per outage. P2 line 42 forbids the pattern by name, and line 48 makes "never log the same error twice" a **floor that holds at every dial**, so the MVP setting was no excuse. Fixed: the service translates without logging and passes the cause on the exception; the handler logs once *with* the cause, so the operator loses no detail. `theOutageIsLoggedExactlyOnce` is the regression guard.
2. **A comment that lied.** `UnavailableException`'s docstring claimed the category was "recorded as an amendment to 06b §3" — it was not. The justification had been written into a code comment and mistaken for doing the work. Root cause worth remembering: *documentation lives in the documentation; a docstring asserting a standard does not create one.*

**Also from review:** the success-path info line (06b §4) was logged but unasserted — `successLogsExactlyOneInfoLineFromTheServiceLayer` now pins it. And `verifyDependencies()` → `checkDatastore()`, returning the `HealthResponse` rather than the controller inventing it (06b §2: the controller does no business branching).

**`userId` is deliberately absent** from `LogContextFilter`. The spec's line named `traceId`/`userId`/`endpoint`, but `userId` needs auth, which is S0.2 — where its AC ("userId appears in request-scoped logs via the filter, never set by leaf code") depends on this filter remaining the only writer.
