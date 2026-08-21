# 01 — The workflows split, path-filtered, behind an always-runs aggregator

**What to build:** `ci.yml` becomes three path-filtered workflows plus one aggregator job. This is the prerequisite for required checks: a required check that never runs because its paths did not change reads as **pending forever** and blocks the PR.

**Blocked by:** nothing.

**Status:** ready-for-agent

**⚠ The trap is already armed.** Protection went live on `dev` on 2026-08-22 (ahead of this ticket, at the founder's request) requiring the **three current job names** — `backend — mvn verify`, `mobile — typecheck + jest`, `stack — compose up + health smoke`. That works only while nothing is path-filtered. **The moment this ticket lands filters, a mobile-only PR leaves the backend job skipped and blocks forever.** Swapping the required contexts to the aggregator is therefore not a follow-up — it is part of this ticket and must land in the same change.

- [x] ~~Three path-filtered workflow files~~ — **the design was wrong and was corrected in flight.** `needs:` is workflow-scoped, so an aggregator cannot depend on jobs in other files; and workflow-level `paths:` **is** the pending-forever trap, because a skipped *workflow* never creates its check run. Shipped instead as **one file**: a `changes` job diffs the trees, each heavy job carries `if: needs.changes.outputs.<tree> == 'true'`, and a job skipped by `if:` *does* create a check that reports `skipped` and counts as passing. Job bodies unchanged — this altered *when* they run, never *what*
- [x] Detection **fails open**: no usable diff base runs everything, and any change under `.github/workflows/` re-proves all three. A detection bug costs minutes, never coverage
- [x] One `ci` aggregator that **always runs**, `needs:` the others, and passes only if none **failed or was cancelled** — a `skipped` job counts as pass. That is the whole point; get the condition wrong and every mobile-only PR blocks
- [ ] **Proven against a skip — OPEN, and it cannot be closed until this workflow is on `dev`.** A docs-only branch cut from `dev` must leave all three heavy jobs skipped while `ci` reports green and the branch stays mergeable. Proven the other way too: a red backend job turns `ci` red

**⚠ Sequencing, learned by getting it wrong on 2026-08-22.** `ci` was made the required check while the aggregator existed **only on this feature branch**. Every branch cut from `dev` still ran `dev`'s old workflow, produced no `ci` job, and was therefore blocked on a check that could not exist there — the pending-forever trap, re-created by the very step meant to remove it, and from the other direction. Reverted within minutes to the three old job names. **The correct order is: (1) land this workflow on `dev`; (2) then swap the required context to `ci`; (3) then prove the skip from a branch cut off the new `dev`.** A required check must exist on the *base* branch before it can be required — `pull_request` runs resolve the workflow from the merge commit, so a head-only workflow proves nothing about what other branches will produce.
- [x] `stack` keeps firing on backend changes as well as compose ones — 90 seconds per push buys the bisect you would otherwise do by hand (decision 8)
- [x] `concurrency: cancel-in-progress` and the maven/npm caches survive the split; confirm from a run, not from the YAML
- [ ] Billed minutes before and after recorded on this ticket — the split's whole justification is cost, and ~6 min/push is the baseline
- [ ] **Swap s required status check to the single  aggregator** — but only AFTER this workflow is on  (see the sequencing warning above). Attempted on 2026-08-22 and reverted the same minute; the contexts are back to the three job names, which is correct while  carries the old workflow
