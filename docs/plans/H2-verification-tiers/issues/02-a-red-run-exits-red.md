# 02 — A red integration run exits red

**What to build:** `failsafe:verify` joins the integration-test command everywhere this repo writes it, so a failed, hung or never-executed run stops reporting `BUILD SUCCESS`. Failsafe's `integration-test` goal never fails a build by design — that is what `verify` is for, and it has never been in the command. Measured on 2026-08-21: one run reported **`Tests run: 867, Failures: 0, Errors: 794`** under `BUILD SUCCESS` after the singleton Postgres timed out at startup, and the clean re-run reported a genuine error under `BUILD SUCCESS` as well.

**Blocked by:** nothing — independent of 01, and worth landing first if 01 stalls on a machine-setup step.

**Status:** needs-triage

- [ ] The command is `mvn -o test-compile failsafe:integration-test failsafe:verify` everywhere it is written — CLAUDE.md, `README.md`, the scripts README, and any story-gate template that carries it
- [ ] **Demonstrated red.** Sabotage one assertion in one IT, run the scoped command, record a **non-zero exit** and the failing count. Restore, re-run, record zero. `test-compile` stays in the goal list or the sabotage runs against the previous build — the S4.13 trap, and it has already made one sabotage in this repo silently pass
- [ ] **Demonstrated red for the failure mode that actually bit us**, not only for an assertion: a run where the container never starts must also exit non-zero. Simulate it (point Testcontainers at a dead daemon, or make `PostgresTestBase` throw) and record the exit code — this is the case `BUILD SUCCESS` covered up twice today
- [ ] CLAUDE.md's *"read the `Tests run:` counts, never the exit code"* gotcha is **rewritten, not deleted.** It keeps the history — the S4.19 double-tick, the S4.3 `./mvnw` exit-127-through-a-pipe swallow — because the trap is still real for anyone running the bare goal, and gains the fix at the top: the exit code is now trustworthy *when `failsafe:verify` is in the command*, and only then
- [ ] Check whether `mvn -B verify` in CI already carries this (it does — `verify` is the lifecycle phase); state it, so nobody "fixes" the workflow to match the local command
- [ ] Confirm the change costs no wall-clock: `failsafe:verify` reads a summary file and does not re-run anything

## Comments

*(none yet)*
