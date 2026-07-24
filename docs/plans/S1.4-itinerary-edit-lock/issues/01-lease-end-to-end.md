# 01 — The lease end-to-end: acquire, renew, release, expire

**What to build:** the Edit Lease exists and behaves — one row per itinerary, claimed and held through new /v1 endpoints, self-healing by expiry — proven at the contract and the clock, before anything enforces it.

1. **Additive migration (one for the story):** `edit_lease` (itinerary_id PK/FK — the 1:1 is the table shape, holder traveler_id FK, expires_at, timestamps). No other schema change; no backfill, no stepping IT (purely additive — the S1.3 §migration posture).
2. **Domain:** lease service in the itinerary module (the lock guards *plan* editing; ADR-002 — no new module for one row). **An expired row is the unlocked state** — reads treat `expires_at <= now` as absent; acquisition overwrites an expired row atomically (the insert-on-conflict discipline; mind the S0.2 self-invocation/REQUIRES_NEW gotcha if recovery needs a separate transaction). **Inject `Clock`** — the expiry/renewal ITs are clock-controlled, not sleep-based.
3. **TTL + cadence (this ticket's call, per spec):** TTL **3 minutes**, client renew cadence **60s**. Values live in one config property each, not scattered literals.
4. **Endpoints (additive, member-gated, itinerary-addressed):** acquire / renew / release under `/v1/itineraries/{id}/…` (exact paths per 05's conventions). All through `requireMember` — **a non-member is 404-masked before learning any lock state** (spec AC 9's ordering). A denied acquire returns a conflict-class response carrying the **holder's display name** (exact status + error envelope per 05 — settle it here; ticket 02 reuses it verbatim on the write endpoints). Renew/release by a non-holder: same conflict shape (idempotent release by the actual holder is fine).
5. **Rules pinned:** no force-take — the owner's acquire against a member's live lease is denied identically (spec AC 2) · release frees immediately (AC 3) · expiry frees without any cleanup job (AC 4) · renewal extends a live editor past one TTL (AC 5).
6. **Tests:** contract ITs (acquire/deny-with-holder-name/release/guard posture on every new endpoint) · clock-controlled ITs for expiry and renewal · storage IT pinning overwrite-of-expired-row atomicity · existing suites untouched.

**Blocked by:** None — can start immediately.

**Status:** open

- [ ] A acquires; B's acquire is denied with A's display name in the response (spec AC 1 lease-half)
- [ ] Owner A's acquire against member B's live lease is denied identically — no role bypass (spec AC 2)
- [ ] A releases → B's next acquire succeeds immediately (spec AC 3)
- [ ] Clock advanced past TTL with no renewal → B's acquire succeeds over the dead lease (spec AC 4)
- [ ] Renewals across two TTL windows keep A's lease live and B denied throughout (spec AC 5)
- [ ] Every new endpoint: non-member 404-mask (never a lock answer), visitor 401; existing guard suites pass unmodified (spec AC 9 slice)

## Comments

*(empty — accretes during implementation)*
