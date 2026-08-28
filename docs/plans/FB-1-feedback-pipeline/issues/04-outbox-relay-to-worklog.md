# 04 — Stored reports leave for worklog (the relay and the poller)

**What to build:** the outbox drains. A scheduled poller (every minute; per-row exponential
backoff capped at 15 minutes) hands pending reports to a relay seam with two implementations:
the **logging sink** — selected when no intake config exists, so accepts keep working and
local walks never touch worklog — and the **real worklog transport**: worklog's exact
multipart (the `report` JSON as a **file** part with a filename in its Content-Disposition —
a bare field is rejected by worklog — plus the sanitized screenshot parts), the
`X-Intake-Secret` header, on an explicitly stated JDK transport so no classpath-detected
client adds silent retries under our own loop. Worklog 2xx → delivered, screenshot bytes
purged; 4xx → dead-letter, loudly; 5xx/network → retry forever.

**Blocked by:** 03 (the relay sends screenshots).

**Status:** done

- [x] With no intake config, an accepted report is "delivered" by the logging sink and its row marked delivered — the log line names the reportId and never the description, screenshots, or any secret
- [x] With config present, the relay's request against a local stub server is worklog's contract exactly: file-part `report` JSON, 0–3 `screenshot` parts, the secret header
- [x] Stubbed-relay ITs: 201 and 200 both mean delivered — row kept, screenshot bytes purged; 400 means dead-letter — no further attempts, an error log naming the reportId and worklog's envelope keys only; 503/network means the row backs off and is retried
- [x] The `submittedAt` relayed is the accept-time stamp — a delivery retry never restamps it
- [x] Config rides two env-backed properties (`LARGATA_REPORTS_INTAKE_URL`, `LARGATA_REPORTS_INTAKE_SECRET`); `.env.example` gains placeholder keys only
