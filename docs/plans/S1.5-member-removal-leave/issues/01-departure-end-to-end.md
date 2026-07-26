# 01 — Departure end-to-end: remove, leave, evict, free the lease

**What to build:** the departure operation exists and behaves — one domain act with two doors, proven at the contract: the owner removes a member (or a member removes themselves), the membership row is destroyed, the walls close on the very next request, any edit lease the departing traveler held is freed in the same transaction, and the way back in is an ordinary re-invite.

1. **No migration.** Departure destroys rows; nothing new to shape. First story in the module with zero schema delta — say so in the PR rather than leaving reviewers hunting for the missing V-file.
2. **Domain:** the workspace module gains the departure operation — caller's resolved `Membership` + target traveler id; role logic on the capability object, never inline against the database (Artifact 03). One operation, two doors: initiator identity (caller = target or not) decides authority and the analytics event, never two code paths.
3. **Lease release (spec §3):** `EditLeaseService.releaseHeldBy(itineraryId, travelerId)` — system-level, no `Membership` parameter (the owner doesn't hold the departing member's capability); called inside the same transaction as the membership delete. Keeps the invariant *a lease holder is always a member*. Not a force-take; ADR-014's member-vs-member rule is untouched.
4. **Endpoint (additive):** `DELETE /v1/itineraries/{itineraryId}/members/{travelerId}` on the trip-membership surface (itinerary-addressed, workspace ids off the wire). Response matrix per spec §4 — and **authority before idempotency**: a non-owner member targeting anyone else is 403 regardless of whether the target still exists. Owner self-target: `409 OWNER_CANNOT_LEAVE` (envelope per 05; the client branches on the code, never the message).
5. **Analytics:** `member_removed` / `member_left` by initiator, **after commit** — a rolled-back departure never happened (contrast: S1.4's `edit_lock_denied` fires immediately *because* its transaction rolls back; these commit, so they wait).
6. **Tests:** one IT per matrix row (spec ACs 1–6) · the before/after eviction probe in a single test (AC 7 — the probe must demonstrably discriminate: 200 before, 404 after) · the lease IT (AC 8: target holds a live lease, removal, another member's acquire succeeds immediately with the clock untouched — fails if the release is forgotten) · the re-invite round-trip (AC 9: fresh `joined_at`) · analytics capture (AC 10) · existing guard and lease suites pass unmodified.

**Blocked by:** None — can start immediately.

**Status:** open

- [ ] Owner removes a member → 204, row gone, roster no longer lists them (spec AC 1)
- [ ] Member leaves → 204, same destruction (spec AC 2)
- [ ] Non-owner member targeting anyone else → 403, even if the target is already gone (spec AC 3)
- [ ] Owner self-target → 409 `OWNER_CANNOT_LEAVE`; the owner row survives every test in the suite — INV-4 (spec AC 4)
- [ ] Repeat DELETE / never-member target → 204, idempotent (spec AC 5)
- [ ] Non-member caller 404-masked; unauthenticated 401 (spec AC 6)
- [ ] Eviction probe discriminates: target's GET is 200 before and 404 after, in one test (spec AC 7)
- [ ] Live lease freed by departure: next member's acquire succeeds immediately, no TTL wait (spec AC 8)
- [ ] Remove → re-invite (no `ALREADY_A_MEMBER`) → accept → member again with fresh `joined_at` (spec AC 9)
- [ ] `member_removed` vs `member_left` by initiator, after commit (spec AC 10)

## Comments

*(empty — accretes during implementation)*
