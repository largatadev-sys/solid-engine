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

**Status:** open

- [ ] Local two-account lock loop incl. the expiry/abandonment path (spec ACs 1–5 exercised through the UI, not just ITs)
- [ ] Preview-container parity with modal interception evidence (spec AC 7)
- [ ] Offline check on the device: airplane mode → edit entry answers with the connectivity message (spec AC 8)
- [ ] All suites green; guard suites unmodified; AC-7 replacement in place (spec ACs 6, 9)
- [ ] `/code-review` per-ticket + whole-branch, both axes; rule-grep done; findings fixed or recorded
- [ ] BUILD_STATUS → ✅ in the last branch commit
- [ ] Squash-merge proposed and owner-approved
- [ ] Post-merge on deployed `dev`: discriminating probe flipped, lock loop verified live, limitation (if any) recorded (spec AC 10)

## Comments

*(empty — accretes during implementation)*
