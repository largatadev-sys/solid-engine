# 06 — Playwright moves to CI

**What to build:** The merge gate becomes complete. A `pull_request`-to-`dev` job brings up the stack, builds the preview container, and runs both Playwright projects as a required check. **This ticket is last and independently abandonable** — if the job turns painful to debug remotely, everything before it has landed and is worth having alone.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- [x] Secrets set via `gh secret set` from the gitignored `mobile/.env`, never printed: `LARGATA_TEST_POOL_PASSWORD`, `LARGATA_TEST_POOL_EMAIL_BASE`, and the five `EXPO_PUBLIC_*` build args. **Consequence to carry into CLAUDE.md: a workflow file can now read them, so workflow edits become sensitive**
- [x] Trigger is `pull_request` targeting `dev` **plus `workflow_dispatch`** — not every push (minutes for no extra signal) and not nightly (an unattended 3am red nobody triages is the lying-suite problem restated)
- [x] The job composes its own stack and **builds `Dockerfile.web-preview` in-job** — the true build path, never a dev server. `expo export` + a static server hid a real `Cache-Control` bug at S0.5 (decision 3)
- [x] **`LARGATA_WORKERS=2` measured, and the guess held.** First CI run, 2026-08-22: `Running 627 tests using 2 workers` → **625 passed, 2 skipped, 5.3 minutes**; the whole job including the compose stack and the preview container build was **8m13s**. Green on the first attempt.

  **CI runs the full Playwright suite faster than this workstation does** — 5.3 min against the 9m30s WS-1 recorded locally (H1: 8m12s) — while *also* running the backend ITs, Jest and the typecheck in the same 8-minute window. The two-worker ceiling H1 measured at 4 cores was not the binding constraint here; these specs are I/O-bound, which is why 2 workers holds on a smaller runner. No reason to tune it further until a run says otherwise.
- [x] **t1–t5 only.** No data contention — the job's specs seed into its own database — and `assertVerified()` still guards against an unverified tag spending Resend quota on an OTP. **This holds only while the job points at its own stack**; pointing it at deployed dev inverts every line of it (decision 1)
- [x] Added to the `ci` aggregator (`needs: [changes, backend, mobile, stack, playwright]`), which is `dev`'s single required check — so it gates the merge without any protection change
- [x] **Proven by a deliberate red, 2026-08-22.** One assertion sabotaged in `e2e/web/tab-bar.spec.ts` → run 32498621913: **`playwright` failed → `ci` failed → PR #5 went `BLOCKED`.** The whole chain proven in the red direction rather than inferred from a green one: a gated job propagates its red to the single required check, and protection then refuses the merge. Sabotage reverted byte-for-byte in the next commit
- [x] Tier 3 collapses: `npm run smoke` stays available as a **tool**, never a nightly obligation
