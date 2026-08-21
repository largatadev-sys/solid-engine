# 05 — Tier 3: one end-of-day command, and a verdict on the Metro lane

**What to build:** The sweep that covers exactly what CI cannot reach, and an answer to the question the iterate loop keeps paying for. Tier 3 is both Playwright projects against a live stack with pool credentials, the preview container, and the device walk when a story owes one — **~10 minutes, not 30**, because the backend suite is CI's job. Founder call, 2026-08-21: the Playwright suite stays local and runs end of day; moving it to CI would put the pool password in GitHub secrets and put CI runs in contention with local runs for the same `t1`–`t5` accounts.

**Blocked by:** 01 — Tier 3 is defined as *the complement of what CI proves*, so it cannot be drawn before CI's coverage is confirmed from a run.

**Status:** needs-triage

- [ ] One command runs the sweep: rebuild the preview container, then `npm run smoke` (both projects), with the summary readable at a glance and one authoritative exit code
- [ ] It **does not** run the backend ITs, Jest or the typecheck. Duplicating CI here would rebuild the exact problem this story closes — say so in the script's own header, because the next author's instinct will be to add them back
- [ ] The environment prerequisites are handled or refused honestly: `mobile/.env` sourced, backend reachable, preview container current. A sweep that runs against a stale container proves the last build, and `requireStack` only makes a spec **skip** — it cannot tell you the container is old
- [ ] **The Metro lane gets a verdict.** One clean run of `LARGATA_LANE=metro` on an idle machine, since the only attempt so far failed 7/7 on navigation timeouts while the backend suite held the CPU — which is not a verdict. Three possible outcomes, all acceptable, none of them silence:
  - it works → written into the Tier 1 loop, and the 4–6 minute preview rebuild leaves the iterate loop
  - it needs a bundle warm-up or a longer `navigationTimeout` → that lands here
  - it does not work → the finding is recorded and the lane is **removed** rather than left documented. A documented option nobody can use is worse than none; this repo has three standing examples
- [ ] **One suite at a time per stack** is stated as a rule in CLAUDE.md, discharging the cheapest-interim half of the concurrent-test-run line parked at the S4.10 review. Same shape as the existing *"one Maven run at a time, per module"* — a rule, deliberately, because the real isolation answers (per-run traveler namespace, per-run database, a lock file) are that line's work and not this story's
- [ ] The sweep's own wall-clock is measured and recorded against the 9 m 30 s `npm run smoke` baseline, with the preview rebuild counted separately so the two costs stay legible

## Comments

*(none yet)*
