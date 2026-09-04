# 07 — Story gate

**What to build:** the story closes the way every story closes — the whole backend suite with its counts read, the one manual look decision 14 owes, the tracker row in the last commit on the branch, and the PR opened as the proposal and never merged unasked.

**Blocked by:** 06.

**Status:** ready-for-agent

- [ ] **The full backend suite once:** `mvn -o test-compile failsafe:integration-test failsafe:verify`, the `Tests run:` counts read from the summary, never the exit code alone. One Maven run at a time. Interrupted runs cleaned up by the labelled-container filter before diagnosing anything.
- [ ] **CI green on the branch**, read with `gh run watch` and the `Tests run:` counts from the log; a red check on a path this story never touched is proven not ours before anything else, per the quarantine rule.
- [ ] **The interval look (spec decision 14):** flip a pool traveler private with curl against the local stack, open the shipped preview as another pool traveler, tap Follow, and record in this ticket's comments what the pill shows — the expected answer is "Following" on a `requested` result, the bounded lie the spec names. One look, recorded, not automated and not fixed here; S4.40 owns the pill.
- [ ] **The seeders run green against the new contract** (ticket 05's audience change), on the local stack.
- [ ] **BUILD_STATUS:** the S4.39 row goes ✅ with its spec link, **in the last commit on the feature branch**; the S4.40 row stays ⬜. Anything raised during the build that outlives the story goes to the epic map's backlog, not the tracker.
- [ ] **The spec's `## Comments`** gains the gate note: what was verified where, and any intent that changed during the build, never a rewrite of the body.
- [ ] **REGRESSION_CHECKLIST** gets a line only if a defect escaped to a human during the build.
- [ ] **The PR** `feature/S4.39-private-profiles → dev`, story id in the title, opened as the proposal; not merged unasked. Explicit-path staging throughout; the staged diff scanned for secrets before every commit.
