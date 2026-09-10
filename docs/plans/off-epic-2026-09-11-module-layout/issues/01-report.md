# 01: report takes slices

**What to build:** `report` moves from one flat package of 25 classes plus `api/` and `web/` onto ADR-038's layout. Counted by layer its `service/` would hold about eighteen files, which is past the fold, so it takes slices — the flat form, as `trip/dump/` does — with `api/`, `controller/`, `dto/` and `exception/` at the root. `ReportPaths` stays in `api/` until issue 13 retires it.

**Proposed cut — the implementer confirms each assignment by reading the type's dependencies, not its name.** The rule: an entity, its repository, its status enum and its views live in one slice; a service lives with the table it writes; a relay adapter lives with the port it satisfies.

| Folder | Files |
|---|---|
| `api/` | `ReportPaths` (until issue 13) |
| `controller/` | `ReportController`, `CallerAddress`, `OptionalReporter` |
| `dto/` | `SubmitReportRequest`, `SubmitReportResponse` |
| `exception/` | `ReportExceptions` |
| `intake/` | `ReportService`, `ReportInserter`, `ReportRateLimiter`, `ReportSubmission`, `Reporter`, `DeviceContext`, `AcceptedReport`, `ReportId`, `ReportPlatform`, `ReportType`, `ReportScreenshot`, `ReportScreenshotRepository` |
| `delivery/` | `ReportOutboxEntry`, `ReportOutboxRepository`, `ReportStatus`, `ReportDeliveryAttempt`, `ReportDeliveryService`, `ReportDeliveryPoller`, `ReportRelay`, `LoggingReportRelay`, `WorklogReportRelay`, `ReportRelayConfig`, `RelayEnvelope`, `RelayOutcome` |

If either slice passes ten files after the read, it takes the layer sub-folders (`trip/plan/` is the shape). Two slices of twelve is the boundary case; prefer the sub-folders over a third slice invented to stay under the number.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] The spec's done-checklist, in full
- [ ] The four test files importing `ReportPaths` keep working unchanged; `ReportPaths` itself does not move until issue 13
- [ ] `ReportModuleBoundaryTest` passes with its front door still `api..` and `exception..`, and both predicates still select something
- [ ] The outbox poller's schedule and the relay's transport (the `RestClient` factory FB-1 stated explicitly) are untouched — a moved `@Configuration` is still scanned, proven by the module's ITs and not by reading

## Comments
