# 01 — The workflows split, path-filtered, behind an always-runs aggregator

**What to build:** `ci.yml` becomes three path-filtered workflows plus one aggregator job. This is the prerequisite for required checks: a required check that never runs because its paths did not change reads as **pending forever** and blocks the PR.

**Blocked by:** nothing.

**Status:** needs-triage

**⚠ The trap is already armed.** Protection went live on `dev` on 2026-08-22 (ahead of this ticket, at the founder's request) requiring the **three current job names** — `backend — mvn verify`, `mobile — typecheck + jest`, `stack — compose up + health smoke`. That works only while nothing is path-filtered. **The moment this ticket lands filters, a mobile-only PR leaves the backend job skipped and blocks forever.** Swapping the required contexts to the aggregator is therefore not a follow-up — it is part of this ticket and must land in the same change.

- [ ] `ci-backend.yml` (`paths: backend/**`), `ci-mobile.yml` (`paths: mobile/**`), `ci-stack.yml` (`paths:` the compose surface — `docker-compose.yml`, both Dockerfiles, `backend/**`) — each keeping its current job body verbatim; this ticket changes *when* they run, never *what* they run
- [ ] One `ci` aggregator that **always runs**, `needs:` the others, and passes only if none **failed or was cancelled** — a `skipped` job counts as pass. That is the whole point; get the condition wrong and every mobile-only PR blocks
- [ ] **Proven against a skip before anything is marked required:** a mobile-only branch leaves the backend job skipped and the aggregator green. Proven the other way too: a red backend job turns the aggregator red
- [ ] `stack` keeps firing on backend changes as well as compose ones — 90 seconds per push buys the bisect you would otherwise do by hand (decision 8)
- [ ] `concurrency: cancel-in-progress` and the maven/npm caches survive the split; confirm from a run, not from the YAML
- [ ] Billed minutes before and after recorded on this ticket — the split's whole justification is cost, and ~6 min/push is the baseline
- [ ] **In the same change, swap `dev`'s required status checks from the three job names to the single `ci` aggregator** (`gh api --method PUT repos/largatadev-sys/solid-engine/branches/dev/protection`). Then verify with a **mobile-only PR that merges cleanly while the backend job shows skipped** — if that PR hangs on a pending check, the swap did not land and every subsequent PR is blocked
