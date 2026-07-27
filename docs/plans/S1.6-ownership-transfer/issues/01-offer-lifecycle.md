# 01 — Offer lifecycle end-to-end: create, revoke, decline, void

**What to build:** everything that moves no ownership. The owner offers the crown to a member and the whole trip can see it; the owner retracts it, the target refuses it, or the target's departure dissolves it — every path terminal, every path evented, and at most one outstretched hand per trip at any moment. Demoable at the API: offer, watch the roster flag appear; decline/revoke/depart, watch it clear.

1. **Migration (additive):** `ownership_offer` — workspace id, target traveler id, offered-at, status (`pending | accepted | declined | revoked | voided`) — plus the **at-most-one-pending partial unique index** on workspace id `WHERE status = 'PENDING'`. The `'PENDING'` spelling in that predicate is a silent contract with Hibernate's `@Enumerated(STRING)` — pin it with a storage IT that fails if the spelling moves (the V4 lesson: a partial index on a never-matching predicate enforces nothing, silently, forever).
2. **Domain:** the membership module gains its first table and the three no-transfer operations — offer, revoke, decline — caller's resolved `Membership` in, role logic on the capability object, never inline (Artifact 03). Offer validates in ladder order: authority (owner only), then conflicts — target not a member (`TARGET_NOT_A_MEMBER` — the remedy is an invite), target is the caller (`CANNOT_OFFER_TO_SELF`), an offer already pending (`OFFER_ALREADY_PENDING` — explicit revoke first, no silent supersede). Re-offering after any terminal status is a new row.
3. **Void-on-departure (spec §5):** `depart` gains "void any pending offer targeting the departing traveler," inside the same transaction as the row delete and lease release — `MANDATORY`-shaped like the lease release, so a departure and its offer-void cannot commit separately. Removal never blocks on a pending offer; it voids it in passing. New latent invariant, sibling of S1.5's lease rule: **an offer's target is always a member.**
4. **Endpoints (additive), on the trip-membership surface:** `POST /v1/itineraries/{id}/ownership-offer` body `{travelerId}` → 201 + offer · `DELETE /v1/itineraries/{id}/ownership-offer` → 204, idempotent (revoking the absent offer is 204, Artifact 05) · `POST /v1/itineraries/{id}/ownership-offer/decline` → 204. Ladders per spec decision 7, S1.5-ordered: authority before state; decline on an absent singleton is 404, decline by a member who isn't the target is 403. Remember the S1.5 gotcha: guard assertions against the create endpoint must send a body the validator accepts, or the test passes through a path that never consulted authorization.
5. **Roster:** the member list response gains one additive field — `ownershipOffered: true` on the target's row, absent otherwise. Visible to all members deliberately (workspace-walled governance state, INV-1, and a discovery aid).
6. **Wording only:** `OWNER_CANNOT_LEAVE`'s message now names the remedy — offer ownership to a member first. Envelope code unchanged; clients branch on the code, never the message.
7. **Analytics:** `ownership_offer_created` / `_revoked` / `_declined` / `_voided`, each naming the true initiator (the void's initiator is whoever triggered the departure), all **after commit**.
8. **Tests:** one IT per ladder row (spec ACs 1–3) · void-on-departure through both doors, and after each a fresh offer succeeds — the pending slot demonstrably freed (AC 6) · the storage IT (AC 9) · guard-mask 404 / 401 across the three endpoints (AC 11) · the four offer events by initiator, after commit (AC 10's offer half) · existing departure and guard suites pass unmodified.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Offer create: 201, roster shows `ownershipOffered` on the target's row; 403 non-owner; 409 × `TARGET_NOT_A_MEMBER` / `CANNOT_OFFER_TO_SELF` / `OFFER_ALREADY_PENDING` (spec AC 1)
- [ ] Revoke: 204, offer `revoked`, flag gone; revoking the absent offer is 204 (spec AC 2)
- [ ] Decline: 204, terminal; a fresh offer to the same or another member succeeds after (spec AC 3)
- [ ] Voided on departure, both doors; removal not blocked; pending slot freed after each (spec AC 6)
- [ ] `'PENDING'` spelling in the partial index pinned by a storage IT (spec AC 9)
- [ ] Offer events one-per-act, true initiator, after commit only (spec AC 10, offer half)
- [ ] Guard-mask 404 for non-members and 401 unauthenticated on all three endpoints (spec AC 11, this ticket's surface)
