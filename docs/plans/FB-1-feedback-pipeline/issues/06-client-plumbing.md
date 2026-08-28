# 06 — The client plumbing: draft, capture, labels, submit

**What to build:** everything the founder's UI calls (spec decision 14) — no visible UI in
this ticket. `newReportDraft()`: invoked at flow-open, captures the screen string
(`<label> · <segments>`, spec decision 4) into module-scoped state that survives the form's
own navigation, and mints the `reportId`. `submitReport(draft, fields)`: the typed
repository call — multipart via the established photo-append forks, bearer attached when
signed in, tokenless submission allowed (the API client's anonymous allowance extends to the
reports path), `appVersion`/`platform` filled from the Expo constant and the platform API.
The label registry with its completeness guard. Error mapping: network failure → retryable
(same draft, same id); 400/413/429 → distinct, honest copy for the form to render.

**Blocked by:** 03 (the walk needs the endpoint accepting screenshots).

**Status:** ready-for-agent

- [ ] A draft created on one screen keeps that screen's string after navigating into and around the report flow — capture happens at open, provably never at submit
- [ ] Every route file has a label registry entry or the Jest completeness test fails; an unmapped route (test-only) falls back to bare segments; over-length pairs truncate the segments, never the label
- [ ] The join screen's captured string contains the route placeholder, never a live invite token
- [ ] `submitReport` re-called with the same draft sends the same `reportId` — proven by test
- [ ] A signed-out submission carries no Authorization header and succeeds against the local stack; a signed-in one carries the bearer and the backend attributes the reporter
- [ ] Full Jest suite green before push — the anonymous-allowance change touches shared API-client code (the standing shared-code rule)
