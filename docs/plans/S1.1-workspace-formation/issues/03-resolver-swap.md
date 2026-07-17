# 03 — The resolver swap: row-backed `MembershipResolver`, owner resolver deleted

**What to build:** the guard resolves membership from rows. ADR-011's seam does its job: the signature `requireMember(traveler, itineraryId) → Membership` and the `Membership` value type do not change, every existing call site compiles untouched, and S0.3's guard tests pass **unmodified** — that unchanged-test evidence is this ticket's headline.

1. **Row-backed resolver in the workspace module:** one query — membership JOIN workspace on `itinerary_id` + `traveler_id` — returning the role from the row; empty result → reject, guard 404-masks exactly as today. Deliberately cannot distinguish "itinerary doesn't exist" / "not a member" / "workspace missing": distinguishing the last would need the itinerary module (forbidden direction) and leaks existence anyway. Fail closed, uniformly (spec §The resolver swap).
2. **`OwnerMembershipResolver` deleted outright — no fallback.** A "no row? check `owner_id`" path would silently paper over a failed backfill; after ticket 02 the membership row is the truth, and a missing one should lock the owner out loudly. Full-rigor zone: one code path. The accepted trade (a backfill bug presents as owner-404 with no distinct signal) is mitigated by ticket 04's dev verification, not by runtime branching.
3. **New contract test:** seed a `member`-role row directly in the test DB (no service creates members until the invite story) and prove the guard yields `Membership{MEMBER}` (AC 4) — the contract the invite story stands on.
4. **Regression evidence:** S0.3's guard ACs green with zero test edits — creator create/list/view · other authenticated traveler → 404 · no token → 401 (AC 3) — now flowing through rows.

**Blocked by:** 01, 02 (rows must exist and be complete before the resolver trusts them exclusively).

**Status:** ready-for-agent

- [ ] Row-backed resolver — one query, uniform 404-mask semantics
- [ ] `OwnerMembershipResolver` and its wiring gone (grep confirms)
- [ ] Guard signature + `Membership` type untouched; S0.3 tests pass unmodified
- [ ] Seeded `member` row resolves to `Membership{MEMBER}` through the guard
