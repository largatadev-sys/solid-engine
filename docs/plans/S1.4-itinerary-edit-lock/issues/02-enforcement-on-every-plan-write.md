# 02 — Enforcement on every plan write: the lock becomes the rule

**What to build:** every plan-write endpoint S1.3 shipped rejects a caller who does not hold a live lease — server-enforced, so no client (including old installs) can bypass the lock — and the S1.3 test that pinned "no conflict surface exists" is replaced by tests pinning this one.

1. **Wiring (the complete list, none skipped):** itinerary field PATCH · day POST/PATCH/DELETE · activity POST/PATCH/DELETE · activity reorder · cross-day move. In each service method: guard resolves `Membership` first (ADR-011 — untouched), **then** the lease check; a caller without a live lease gets ticket 01's conflict response (same envelope, holder's display name). The holder's own writes pass and do not disturb the lease (saving one field mid-session must not release it — release is the client's explicit act, ticket 03).
2. **The AC-7 reversal, executed (spec §reversal):** delete S1.3's LWW-absence IT; add its replacement pinning the 409-class surface on a representative write of each family. The deletion and its replacement land **in the same commit**, named in the PR — the reversal stays visible in the diff (spec AC 6).
3. **/v1 waiver discipline:** this is the recorded ADR-008 waiver in action — semantics change on shipped endpoints, nothing else non-additive rides along. No wire-shape changes to any existing request/response beyond the new rejection case.
4. **Analytics log events (register #2):** `edit_lock_acquired` / `edit_lock_denied` / `edit_lock_expired_takeover` (acquire-over-expired). Structured log lines, IDs only — never the itinerary title or any user text (P3).
5. **Tests:** per-family enforcement ITs (write without lease → conflict; write with lease → normal behavior unchanged) · the AC-7 replacement · **existing S0.3/S1.1/S1.2 guard suites and S1.3's non-AC-7 suites pass unmodified** — enforcement ITs acquire the lease in setup rather than editing old tests (spec AC 9).

**Blocked by:** 01.

**Status:** open

- [ ] B's direct API write without the lease is rejected on **every** plan-write family (itinerary fields, day CRUD, activity CRUD, reorder, move) with the holder-naming envelope (spec AC 1 server-half)
- [ ] The lease holder's writes succeed and behave exactly as S1.3 shipped them — attribution stamping included (no behavior change for the holder)
- [ ] S1.3's AC-7 IT deleted + replacement ITs added in one commit, named in the PR (spec AC 6)
- [ ] Non-member on a write endpoint: still the guard's 404-mask, never a lock answer — lease check provably runs after `requireMember` (spec AC 9)
- [ ] The three analytics events fire with IDs only (P3 clean)
- [ ] Guard suites S0.3/S1.1/S1.2 + surviving S1.3 suites green, unmodified (`git diff --diff-filter=M` shows none)

## Comments

*(empty — accretes during implementation)*
