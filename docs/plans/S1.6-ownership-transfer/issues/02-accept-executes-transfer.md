# 02 — Accept executes the transfer

**What to build:** the story's heart. The offeree accepts and, in one transaction, four things become true together: the roles swap, `itinerary.owner_id` tells the new truth, the durable transfer record exists, and the offer is `accepted`. The ex-owner is now an ordinary member whose Leave works; INV-4 held at every instant, including under races.

1. **Migration (additive):** `ownership_transfer` — id, workspace id, from traveler id, to traveler id, transferred-at. No `kind` column (E5's claim adds it, additively). References travelers by ID so the record survives anonymization structurally (01 Compliance). The creator of any itinerary is derivable forever: earliest transfer's `from`, else the current owner — say so in the entity's javadoc, because it is the answer to "why does this table exist with no reader."
2. **Role swap primitive (workspace module):** demote the owner's row to `member` **first**, then promote the target's — that order because V4's partial unique index allows at most one `OWNER` per statement. The demote is **conditional on `role = 'OWNER'` with its update-count checked**: a second concurrent transfer's demote touches zero rows and aborts, which is what resolves two racing accepts to exactly one owner instead of a lost update. This extends the INV-4 defence S1.5's review installed below the service layer — the primitive itself refuses to produce a zero-owner or two-owner workspace, whatever its caller does.
3. **`owner_id` sync (itinerary module):** one UPDATE in the same transaction, behind a service-interface method, `MANDATORY` propagation. Membership stays the sole authority — the guard never reads the column — but no column in the schema lies (spec decision 6).
4. **Accept operation (membership module):** caller's resolved `Membership`; the pending offer must exist (else the endpoint's 404) and the caller must be its target (else 403); then the four effects. The ex-owner's membership row survives as `member` — exit remains S1.5's separate act.
5. **Endpoint (additive):** `POST /v1/itineraries/{id}/ownership-offer/accept` → 204. Ladder per spec decision 7: 401 · guard-mask 404 · absent singleton 404 · pending-but-not-mine 403 — the stale-accept race safe by construction.
6. **Analytics:** `ownership_transferred` at accept, **after commit** — and no `offer_accepted` event: accept *is* the transfer, and one act must not count twice (S1.5's discipline).
7. **Tests:** the four effects asserted **in one IT** so they stand or fall together (AC 4) · the stale-accept race: offer B → revoke → offer C → B's accept 403, C's accept 204, INV-4 intact (AC 5) · the concurrency guard: a test that fails if the demote's `WHERE role` clause vanishes, plus exactly-one-`OWNER` asserted across the whole suite (AC 7) · event at accept, after commit, exactly one (AC 10's transfer half) · accept's guard-mask/401 (AC 11) · S1.5's departure suite still green — a leaver who used to own the trip is just a member leaving.

**Blocked by:** 01 — Offer lifecycle.

**Status:** ready-for-agent

- [ ] Accept: 204, and all four effects asserted in one transaction-scoped IT — roles swapped, `owner_id` synced, `ownership_transfer` row written, offer `accepted` (spec AC 4)
- [ ] Stale-accept race: offer B → revoke → offer C → B's accept 403, C's accept 204; INV-4 intact (spec AC 5)
- [ ] INV-4 under everything: exactly one `OWNER` row after every test; the conditional demote has a test that fails if its `WHERE role` clause is removed (spec AC 7)
- [ ] `ownership_transferred` at accept, after commit, no `offer_accepted` (spec AC 10, transfer half)
- [ ] Accept guard-masked for non-members, 401 unauthenticated (spec AC 11, this ticket's surface)
- [ ] Post-transfer: the ex-owner can leave through S1.5's door; the new owner self-targeting departure gets `OWNER_CANNOT_LEAVE`
