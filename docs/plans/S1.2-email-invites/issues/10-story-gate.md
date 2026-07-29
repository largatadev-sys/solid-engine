# 10 — Story gate: the loop proven where it ships

**Status:** partial (2026-07-22) — automated verification GREEN (118 backend tests incl. 23 invitation ITs + the S0.3/S1.1 guard regression unchanged; 268 mobile tests). **Remaining, owner-gated:** the manual `docker compose` + device/emulator run (point 1), the deployed-`dev` real-inbox proof (point 2, needs the Resend ops prerequisite + a propose-first promotion), and the preview-container parity run (point 3). These close AC 10/11; the promotion is propose-first, so they land after owner approval — the S1.1 pattern (row ✅ at branch completion, gate closed post-merge in a follow-up).

**What to close:** ACs 10–11 — the founder-visible loop on the layer that ships (standing rule), plus the bookkeeping that must land *before* the merge.

1. **Local full stack first:** the whole loop on `docker compose` + emulator/dev-build (fresh DB — that is the point): A creates trip → invites B's real email (logging mailer: assert the dispatch line) → B signs in (second test account) → inbox → accept → trip opens. Mismatch + unverified paths exercised.
2. **Post-merge on deployed `dev`:** the real thing — a real mail from `invites@largata.com` lands in a founder-controlled inbox (the discriminating signal is the mail *arriving* and the trip on B's screen; a Resend 200 is not the proof — the indistinguishable-outcomes rule). Name the database/environment in any SQL check (the S1.1 lesson).
3. **Preview container run** for web parity (drive-preview.js; iframe/console evidence, not vibes).
4. **Bookkeeping in the last feature-branch commit:** BUILD_STATUS S1.2 row → ✅ (status + spec link, nothing else) · spec `## Comments` gains any intent changes made en route · anything raised → epic-map backlog.
5. Promotions propose-first: squash-merge `feature/S1.2-email-invites → dev` only on owner approval.

**Blocked by:** 05, 06, 07, 08 *(09 cuttable — the gate does not wait on it if cut)*

- [ ] Local full-stack loop, all three invitee paths
- [ ] Post-merge dev proof (real inbox, real accept, walls open)
- [ ] Preview parity evidence
- [ ] BUILD_STATUS flip + ledger hygiene in the final branch commit
