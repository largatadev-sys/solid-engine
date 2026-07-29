# 04 — Story gate

**What to build:** nothing new — the proof that S1.4 holds where it ships, and the bookkeeping that lets the merge land truthfully. (The S1.1/S1.2/S1.3 gate pattern, including S1.3's standing rule: a smoke test is not done until it has run on **all three rungs** — API, emulator, web preview.)

1. **Local full-stack verification (standing rule):** `docker compose up` (fresh DB) · the two-account lock loop — A (emulator) enters an edit form; B (second session) taps edit and gets the modal with A's name; B's direct API write is rejected; A saves; B edits successfully. Then the expiry path: A's client killed mid-edit, B locked out until the TTL lapses, then B acquires. Dev build only (nothing release-signed differs — the "which build proves what" table).
2. **Preview container parity:** the same loop driven in the web-preview container (built per the CLAUDE.md recipe, never `expo export` + static server) — `drive-preview.js` with the modal interception as evidence, per ticket 03.
3. **Full suites green** — backend `mvn verify` (guard suites S0.3/S1.1/S1.2 **unmodified**; the AC-7 replacement visible as ticket 02 specified), mobile Jest, typecheck.
4. **`/code-review` both axes — per-ticket and whole-branch.** The whole-branch pass is non-negotiable (S1.3's found three blocking cross-ticket bugs the per-ticket passes could not see). Grep-check the branch's own stated rules at the gate: every plan-write family has the lease check (ticket 02's list vs. the code), every edit surface acquires (ticket 03's list vs. the screens), no surviving `Alert.alert` on any new path.
5. **Bookkeeping in the last feature-branch commit:** BUILD_STATUS S1.4 row → ✅ (status + spec link, nothing else).
6. **Propose the squash-merge** `feature/S1.4-itinerary-edit-lock → dev` — propose-first, owner approves.
7. **Post-merge, closes the gate (spec AC 10):** the lock loop on deployed `dev`, founder-visible. **The discriminating probe, failure mode stated first (the three-times-burned rule):** acquire the lease as A, then attempt B's plan write — the old build answers 200, only the new build answers the conflict envelope; a 200 here means the deploy has not landed, not that the lock is broken. Any SQL names the environment *and* the database (`railway` — the S1.1 lesson). Known limitation to inherit honestly: the two-member half needs a second *member* on deployed dev — reuse S1.3's posture (real second founder if available; otherwise the loop closes locally against the direct-membership fixture and the deployed check covers acquire/deny/expiry + the probe, with the gap recorded here).

**Blocked by:** 01, 02, 03.

**Status:** done (2026-07-24) — three-rung local smoke + deployed-`dev` probe verified; squash-merged to `dev` (`ca25662`).

- [x] Local two-account lock loop incl. the expiry/abandonment path — API rung drove the full lifecycle (A acquires → B denied with A's name → B write 409 → A writes 200/201 → release → handoff → renew → stranger 404-masked), one `edit_lease` row throughout, analytics fired, P3 clean
- [x] Preview-container parity — preview built the true way (npm ci + export in-image), renders with zero console/page errors; B acquired the lock in-browser (happy path); the shipped web bundle carries the `.web` modal fork (`window.alert` × 4 call sites, the lock strings) and `/edit-lock` endpoints — proving the correct fork bundled, not the `Alert.alert` no-op (spec AC 7)
- [x] Device: denied → native modal "…is editing this itinerary right now" + routed back to My Trips; held → editable Daily Schedules with live controls; navigate-away released the lease (DB-confirmed). Screenshots captured
- [x] All suites green; guard suites unmodified; AC-7 replacement in place — backend `mvn verify` 181, mobile Jest 461 + typecheck (spec ACs 6, 9)
- [x] `/code-review` both axes (Standards + Spec); findings fixed (200-vs-201 P9 justification, FQN import, `toApiError` extraction, uniform `days.tsx` gating)
- [x] BUILD_STATUS → ✅ in the last branch commit (`fa16083`)
- [x] Squash-merge proposed and owner-approved → `dev` `ca25662`, pushed; post-squash typecheck green (footgun checked)
- [x] Deployed-`dev`: discriminating probe verified working post-redeploy (owner-confirmed, 2026-07-24) — acquire → second-member write → 409 `EDIT_LOCKED`, the fact the old build cannot serve; V8 applied on the deployed database

## Comments

**2026-07-24 — the gate closed.** Local three-rung smoke (API / web-preview / device) all green with screenshots, `/code-review` both axes with findings fixed, squash-merged to `dev` (`ca25662`), pushed. The deployed-`dev` check narrowed to the one fact the local smoke cannot cover — did Railway apply V8 and serve the new lock behavior — verified working by the owner after the dev redeploy (the discriminating probe: a second member's write against a held lock returns `409 EDIT_LOCKED`, which the pre-S1.4 build cannot produce). **S1.4 is done.**
