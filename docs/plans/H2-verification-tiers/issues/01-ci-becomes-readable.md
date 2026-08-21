# 01 — CI becomes readable, or Tier 2 is faith

**What to build:** A way to learn that a CI run went red **without going looking for it**. Every other ticket in this story rests on trusting `.github/workflows/ci.yml`, and that trust is currently unearnable from this workstation: `gh` is not on the PATH, so the full 882-test backend suite has been running on every push with nobody reading the answer. A gate you cannot read is the indistinguishable-outcomes trap wearing a green tick — the trap this repo has been burned by five times, most recently in the session that raised this story.

**Blocked by:** nothing. This is first on purpose.

**Status:** needs-triage — likely `ready-for-human` for the install step; an agent shell cannot answer a UAC prompt (the S3.3 lesson).

- [ ] The mechanism is chosen and the choice is recorded with its rationale. Preferred: `gh` on the PATH, so `gh run list --branch <b>`, `gh run view --log-failed` and `gh run watch` work from the terminal the work happens in. Acceptable alternative: GitHub's own workflow-failure email or repo notification, **if** it lands somewhere the founder actually reads
- [ ] **The signal is proven in the red direction.** Push a knowingly-failing commit to a throwaway branch and confirm the signal arrives unprompted. A notification path nobody has watched fire is not a notification path — state what the failure looked like, not that it "should" work
- [ ] The green direction is proven too: a passing push produces a readable green, so "red" and "never ran" stay distinguishable from "green"
- [ ] Confirm what CI actually covers today, from a run rather than from the YAML: `mvn -B verify` runs Surefire **and** Failsafe (the count should land near the local 882), `npm run typecheck` and `npm test` run whole, and the `stack` job composes from a clean checkout. Record the CI wall-clock per job — it is the number that justifies not running these locally
- [ ] Confirm CI is enabled for **feature branches**, not only `dev`/`main` — the workflow's `on: push:` has no branch filter, but "configured" and "running" are different claims and only a run settles it
- [ ] The throwaway branch is deleted afterwards; nothing red is left on the remote
- [ ] The recipe lands in CLAUDE.md beside the other verification commands — how to read a run, how to read a failure, and the one-line statement that **the backend ITs, Jest and the typecheck are CI's job**

## Comments

*(none yet)*
