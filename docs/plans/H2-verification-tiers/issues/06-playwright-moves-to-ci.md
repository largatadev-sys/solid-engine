# 06 — Playwright moves to CI

**What to build:** The merge gate becomes complete. A `pull_request`-to-`dev` job brings up the stack, builds the preview container, and runs both Playwright projects as a required check. **This ticket is last and independently abandonable** — if the job turns painful to debug remotely, everything before it has landed and is worth having alone.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- [ ] Secrets set via `gh secret set` from the gitignored `mobile/.env`, never printed: `LARGATA_TEST_POOL_PASSWORD`, `LARGATA_TEST_POOL_EMAIL_BASE`, and the five `EXPO_PUBLIC_*` build args. **Consequence to carry into CLAUDE.md: a workflow file can now read them, so workflow edits become sensitive**
- [ ] Trigger is `pull_request` targeting `dev` **plus `workflow_dispatch`** — not every push (minutes for no extra signal) and not nightly (an unattended 3am red nobody triages is the lying-suite problem restated)
- [ ] The job composes its own stack and **builds `Dockerfile.web-preview` in-job** — the true build path, never a dev server. `expo export` + a static server hid a real `Cache-Control` bug at S0.5 (decision 3)
- [ ] `LARGATA_WORKERS=2`, `LARGATA_RETRIES=1` via the existing env knobs — no config change. **This is a guess; the first run is the measurement.** Record the wall-clock and the worker count the way H1 did, rather than asserting them
- [ ] **t1–t5 only.** No data contention — the job's specs seed into its own database — and `assertVerified()` still guards against an unverified tag spending Resend quota on an OTP. **This holds only while the job points at its own stack**; pointing it at deployed dev inverts every line of it (decision 1)
- [ ] Added to the aggregator and marked **required** (decision 6). **Proven by a deliberate red:** one sabotaged assertion must block a PR
- [ ] Once green, Tier 3 collapses: `npm run smoke` stays available as a **tool**, never a nightly obligation
