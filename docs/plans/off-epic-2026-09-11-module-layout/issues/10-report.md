# 10: report takes three slices: `outbox`, `intake`, `delivery`

**What to build:** the feedback pipeline's module reads in `trip`'s shape and reporting behaves exactly as it does today: a report submitted signed-in or signed-out lands in the outbox, the poller drains it to the relay, a failed delivery is retried. Counted by layer its `service/` would pass the fold, and the dependency map found the shape: four types both the intake side and the delivery side use directly (the outbox entry, the screenshot, their repositories) plus the value types the entry carries. That shared set is the `outbox` slice; `intake` writes it and `delivery` drains it, and neither names the other. Every slice stays under ten, so none folds into sub-folders. `ReportPaths` stays in `api/` until ticket 13 retires it.

**The move.** Root — `api/`: `ReportPaths`. `controller/`: `ReportController`, `CallerAddress`, `OptionalReporter`. `dto/`: `SubmitReportRequest`, `SubmitReportResponse`. `exception/`: `ReportExceptions`. `outbox/`: `ReportOutboxEntry`, `ReportOutboxRepository`, `ReportScreenshot`, `ReportScreenshotRepository`, `ReportStatus`, `ReportType`, `Reporter`, `DeviceContext`. `intake/`: `ReportService`, `ReportInserter`, `ReportRateLimiter`, `ReportSubmission`, `AcceptedReport`, `ReportId`, `ReportPlatform`. `delivery/`: `ReportDeliveryService`, `ReportDeliveryPoller`, `ReportDeliveryAttempt`, `ReportRelay`, `LoggingReportRelay`, `WorklogReportRelay`, `ReportRelayConfig`, `RelayEnvelope`, `RelayOutcome`.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Every main-tree class of the module sits in a slice or a root folder and the module root holds none
- [x] Direction holds: nothing in `intake` names a `delivery` type and nothing in `delivery` names an `intake` type — checked by a search, and worth one ArchUnit slice rule inside the module's boundary test in the mould of `trip`'s slice list
- [x] The boundary test passes with its front door still `api..` and `exception..`, and both predicates still selecting something
- [x] The four test files importing `ReportPaths` keep working unchanged; `ReportPaths` itself does not move
- [x] The relay's explicitly stated HTTP transport and the poller's schedule survive the move, proven by the module's ITs and not by reading — a moved `@Configuration` is still scanned
- [ ] No test changes but its package line and imports; the report ITs pass unedited
- [x] The spec's verification loop, in full, and the structural guards green
- [x] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments

**2026-09-11 — one deviation from this ticket's ACs, raised at the series' code review (spec axis) and recorded rather than reverted.**

The AC reads *"No test changes but its package line and imports; the report ITs pass unedited."* **`ReportPayloads` was widened** — `final class` → `public final class`, both `reportJson` overloads with it. That is a visibility change, not a package line or an import, so the AC is **unmet as written**.

**Why it was not reverted.** The review's implied fix was to move `ReportDeliveryIT` back out of `delivery/`. Measured, that is worse: the IT names `ReportDeliveryService`, `ReportRelay`, `RelayEnvelope` and `RelayOutcome` — all in `delivery/` — so moving it to the module root would force **four** types public to avoid widening **one** shared fixture. `ReportPayloads` is genuinely cross-package: `ReportAcceptIT`, `ReportRateLimitIT` and `ReportScreenshotIT` sit at the root and `ReportDeliveryIT` in `delivery/`, so a shared test fixture spanning two packages has to be reachable from both.

**The narrowest form was chosen and is what shipped:** one test fixture public, no production type widened for a test. `ReportRelayBindingTest` and `WorklogReportRelayIT` stay in `delivery/` precisely so `ReportRelayConfig` can remain package-private — which it is.

