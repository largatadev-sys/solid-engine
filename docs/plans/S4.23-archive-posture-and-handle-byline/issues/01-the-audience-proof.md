# 01 — The audience proof

**What to build:** Spec decision 4, behavior-neutral by design. The audience fence's `requireInAudience` returns a proof value that only the fence can construct (package-scoped constructor), carrying the Membership it cleared. The three service reads whose fence lives in their single controller caller — the dump pool's list, the diary's per-trip entry list and single-entry read — change signature to require the proof instead of a bare Membership, and the controllers pass what the fence returned. Nothing else moves: the diary-trips read stays identity-scoped on purpose (its fence is ticket 03's query), writes keep taking Membership (their fence is the write fence, ticket 02's subject), and the coverage scan is untouched — controllers still call `requireInAudience`, which is all it greps for.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The proof is unconstructible outside the fence's package — a caller that skips the fence does not compile (spec AC 8's structural half).
- [ ] The three reads require the proof; their controllers thread it through from the fence call.
- [ ] Behavior on live and archived trips is unchanged: the dump and diary contract ITs, the audience-ladder ITs, and the fence coverage scan all pass **without modification** (spec AC 8).
- [ ] No new runtime check anywhere — one fence per request stands (the owner's recorded choice the proof exists to honor).
