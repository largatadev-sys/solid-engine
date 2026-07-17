# 03 — The resolver swap: row-backed `MembershipResolver`, owner resolver deleted

**What to build:** the guard resolves membership from rows. ADR-011's seam does its job: the signature `requireMember(traveler, itineraryId) → Membership` and the `Membership` value type do not change, every existing call site compiles untouched, and S0.3's guard tests pass **unmodified** — that unchanged-test evidence is this ticket's headline.

1. **Row-backed resolver in the workspace module:** one query — membership JOIN workspace on `itinerary_id` + `traveler_id` — returning the role from the row; empty result → reject, guard 404-masks exactly as today. Deliberately cannot distinguish "itinerary doesn't exist" / "not a member" / "workspace missing": distinguishing the last would need the itinerary module (forbidden direction) and leaks existence anyway. Fail closed, uniformly (spec §The resolver swap).
2. **`OwnerMembershipResolver` deleted outright — no fallback.** A "no row? check `owner_id`" path would silently paper over a failed backfill; after ticket 02 the membership row is the truth, and a missing one should lock the owner out loudly. Full-rigor zone: one code path. The accepted trade (a backfill bug presents as owner-404 with no distinct signal) is mitigated by ticket 04's dev verification, not by runtime branching.
3. **New contract test:** seed a `member`-role row directly in the test DB (no service creates members until the invite story) and prove the guard yields `Membership{MEMBER}` (AC 4) — the contract the invite story stands on.
4. **Regression evidence:** S0.3's guard ACs green with zero test edits — creator create/list/view · other authenticated traveler → 404 · no token → 401 (AC 3) — now flowing through rows.

**Blocked by:** 01, 02 (rows must exist and be complete before the resolver trusts them exclusively).

**Status:** done (2026-07-17) — S0.3's guard tests pass unmodified, which is the whole evidence

- [x] `RowBackedMembershipResolver` — one projection query, uniform 404-mask semantics, no fallback
- [x] `OwnerMembershipResolver` deleted; grep confirms only prose references remain. Its now-dead sibling `ItineraryRepository.existsByIdAndOwnerId` went with it (found at review — its javadoc still claimed to be "the guard's hot path", which had become false)
- [x] Guard signature + `Membership` type untouched — **`AuthorizationGuard.java`, `MembershipResolver.java`, `Membership.java`, every controller and every service signature are not in this diff at all**
- [x] **AC 3: `ItineraryContractIT` (14) and `AuthorizationGuardTest` (5) pass with zero edits**, now resolving through membership rows. ADR-011's seam paying out exactly as designed
- [x] `RowBackedMembershipResolverIT` (5) — owner resolves from their row · **a seeded `member` row resolves to `Membership{MEMBER}`** (AC 4, the contract S1.2 stands on) · stranger rejected · nonexistent and someone-else's reject *identically* (Artifact 03's masking rule) · an itinerary with no workspace is invisible even to its owner — the no-fallback decision, pinned as behaviour rather than left as prose
