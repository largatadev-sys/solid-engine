# 06 — Story gate

**What to close:** the story's exit checklist — suites, tracker, and the record — before the PR to `dev` is proposed.

**Blocked by:** 05.

**Status:** done

- [x] Backend: `mvn -o test-compile failsafe:integration-test failsafe:verify` — read the `Tests run:` counts, never the exit code alone.
- [x] Mobile: full `npx jest` + `tsc --noEmit` green; `npx playwright test` against a freshly built preview container (rebuild the image first — it bakes its JS).
- [x] CI green on the branch (`gh run watch --exit-status`; read the counts from the log).
- [x] **BUILD_STATUS row reaches its final state in the last commit on the branch** (status + spec link, nothing else), spec `Status:` line updated to built, regression-checklist line 31's guard column updated by ticket 05.
- [x] The device rung's disposition recorded per the spec's Testing Decisions: web-proven; device scope joins the standing queue behind S4.35's AC 12 (the `google-services.json` blocker) — founder's call at this gate.
- [x] Open the PR to `dev` (that is the proposal — never merge it unasked), story id in every commit message, no agent signature.
