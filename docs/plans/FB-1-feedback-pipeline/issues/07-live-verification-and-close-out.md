# 07 — Close-out: the sanctioned live relay and the bookkeeping

**What to build:** the end-to-end proof and the story's paperwork. A preview-rung walk of the
plumbing against the local stack (logging relay — worklog untouched), then the **one
sanctioned live check**: with the dev intake values placed by the founder in the gitignored
local env, a single report with a screenshot relays from the local stack into **worklog's
dev environment** and appears in its inbox. Never against worklog prod — its reports are
permanent and have no delete. Both stack executions are gated on the founder's explicit yes
(the standing execution-approval rule).

**Blocked by:** 04, 05, 06.

**Status:** done

- [x] Preview walk: a signed-out and a signed-in submission both accept — outbox rows correct, logging relay marks them delivered *(driven at the API layer against the local stack; the signed-in half used a real verified pool token. The **thank-you state itself is not covered** — it lives in the founder's UI, which this story deliberately does not build.)*
- [x] Rate-limit behavior spot-checked on the walk: the sixth report from one address yields `429 TOO_MANY_REPORTS` in the standard envelope with a traceId
- [x] The live check: one report → local backend → worklog answers 2xx; a deliberate replay of the same `reportId` also answers 2xx and creates **no second report** (founder confirmed a single entry in the inbox); the intake config was removed afterwards and the sink verified active again
- [x] BUILD_STATUS row finalized (status + spec link) in the last commit on the feature branch; the epic-map section reflects the outcome
- [x] Closing suites: report ITs read by their `Tests run:` counts (69 green), the full mobile suite (158 suites / 5425 tests) and `tsc` clean, all re-proven by CI on every push

**Founder ruling, 2026-08-28 — the live check ran against worklog PROD, not dev.** The
ticket says dev; the founder redirected it, twice and knowingly, because the dev inbox needs
a login they did not want to recover and the verification's whole value is *seeing* the
report land. The cost was accepted explicitly ("it's only me that sees it") and the reports
are triageable to `done` rather than deletable. Recorded because the ticket's own wording says
otherwise and a later reader would take it at face value. The safety ordering still held: the
walk and the rate-limit hammering ran on the **logging sink**, and the real relay was wired
for the minutes it took to send the deliberate reports, then unwired.

**What the live check bought — three defects no test would have found.** This is the
justification for the rung existing:

1. **`docker-compose.yml` never forwarded the intake config**, so the documented local path
   bound the sink no matter what `.env` held — and a blank URL is not an error, it *selects*
   the sink. The stack looked healthy while nothing left the building.
2. **We accepted reports worklog will always refuse.** `context.platform` and
   `context.appVersion` are required there (read from its validator, not inferred); we stored
   both as nullable, so such a report was answered `201`, shown a thank-you, and then
   dead-lettered permanently. Now refused at our own edge while the report is still in the
   traveler's hands.
3. **The relay had no timeout, and every 4xx was permanent.** Railway wakes a sleeping service
   on the first request, so the relay's own call wakes worklog; with no read timeout a cold
   start could park one of the four scheduler threads — shared with the WebSocket heartbeats
   — indefinitely. `408`/`425`/`429` now retry rather than discarding a real report over a
   transient condition (spec decision 9 carries the dated amendment).

**Left unmeasured, deliberately:** what Railway's edge returns for a *fully asleep* service.
Held connection, `502` or `503` are all handled and retried; only a `4xx` outside the
transient set would dead-letter. Reasoned about, not observed — the measurement needs worklog
idle long enough to sleep. Backlog line rather than a blocker, because retries are unbounded
and the failure would be visible as rows piling up `PENDING`.
