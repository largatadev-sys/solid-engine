# 07 — Story gate

**What to build:** the story closes the way every story closes — the whole backend suite with its counts read, the one manual look decision 14 owes, the tracker row in the last commit on the branch, and the PR opened as the proposal and never merged unasked.

**Blocked by:** 06.

**Status:** ready-for-agent

- [x] **The full backend suite once:** `mvn -o test-compile failsafe:integration-test failsafe:verify`, the `Tests run:` counts read from the summary, never the exit code alone. One Maven run at a time. Interrupted runs cleaned up by the labelled-container filter before diagnosing anything.
- [x] **CI green on the branch**, read with `gh run watch` and the `Tests run:` counts from the log; a red check on a path this story never touched is proven not ours before anything else, per the quarantine rule.
- [ ] **The interval look (spec decision 14):** flip a pool traveler private with curl against the local stack, open the shipped preview as another pool traveler, tap Follow, and record in this ticket's comments what the pill shows — the expected answer is "Following" on a `requested` result, the bounded lie the spec names. One look, recorded, not automated and not fixed here; S4.40 owns the pill.
- [ ] **The seeders run green against the new contract** (ticket 05's audience change), on the local stack.
- [x] **BUILD_STATUS:** the S4.39 row goes ✅ with its spec link, **in the last commit on the feature branch**; the S4.40 row stays ⬜. Anything raised during the build that outlives the story goes to the epic map's backlog, not the tracker.
- [x] **The spec's `## Comments`** gains the gate note: what was verified where, and any intent that changed during the build, never a rewrite of the body.
- [x] **REGRESSION_CHECKLIST** gets a line only if a defect escaped to a human during the build.
- [x] **The PR** `feature/S4.39-private-profiles → dev`, story id in the title, opened as the proposal; not merged unasked. Explicit-path staging throughout; the staged diff scanned for secrets before every commit.


## Comments

**The two boxes left open, and why — stated rather than ticked.** Both need the local full stack
running, which is an execution the founder gates (never on a maybe).

- **The interval look (decision 14).** Flip a pool traveler private with curl, open the shipped
  preview as another, tap Follow, read the pill. The expected answer is unchanged — **"Following"**
  on a `requested` result, the bounded lie the spec already names and accepts, which S4.40 fixes.
  Worth knowing before spending the run: **the shipped client never posts an audience and has no
  visibility toggle**, so the only way to reach a private profile at all is curl.
- **The seeders against the new contract.** `seed-demo.js` published one trip `private`, which would
  now 400; it publishes `public`, and the two `publish: null` entries keep the demo's unpublished
  variety. The change is one word and CI never runs the seeders, so it is unproven until somebody
  seeds — cheap to prove, and it is the first thing to run when the stack is next up.

**REGRESSION_CHECKLIST gets no line:** no defect escaped to a human during this build. The three CI
failures and the two Discovery ones were caught by the suites, which is the checklist's own bar.