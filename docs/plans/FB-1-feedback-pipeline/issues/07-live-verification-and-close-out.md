# 07 — Close-out: the sanctioned live relay and the bookkeeping

**What to build:** the end-to-end proof and the story's paperwork. A preview-rung walk of the
plumbing against the local stack (logging relay — worklog untouched), then the **one
sanctioned live check**: with the dev intake values placed by the founder in the gitignored
local env, a single report with a screenshot relays from the local stack into **worklog's
dev environment** and appears in its inbox. Never against worklog prod — its reports are
permanent and have no delete. Both stack executions are gated on the founder's explicit yes
(the standing execution-approval rule).

**Blocked by:** 04, 05, 06.

**Status:** ready-for-agent

- [ ] Preview walk: a signed-out and a signed-in submission from the browser rung both accept — thank-you state reachable, outbox rows correct, logging relay marks them delivered
- [ ] Rate-limit behavior spot-checked on the walk: hammering the endpoint yields the 429 copy, and the app renders it honestly
- [ ] The live check: one report → local backend → worklog dev answers `201`; a deliberate replay answers `200`; the report and its screenshot are visible in worklog's dev inbox; the secret leaves the env afterwards
- [ ] BUILD_STATUS row finalized (status + spec link) in the last commit on the feature branch; the epic-map section reflects the outcome
- [ ] Closing suites: backend ITs with the `Tests run:` counts read (never the exit code alone), full Jest, and the Playwright `--list` sanity line
