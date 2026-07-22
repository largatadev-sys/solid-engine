# 04 — Accept + decline: the verified-email gate and the joining transaction

**Status:** done (2026-07-22)

**What to build:** the invitee-side service methods — the story's Full-rigor heart (they create authorization state).

1. **Authority = the token's claims, not the Traveler snapshot:** `email` (casefolded) must equal the invitation's stored email AND `email_verified` must be true. Extend `TravelerClaims` (or a sibling accessor) to carry `email_verified` from the JWT. Unverified → 403 `EMAIL_NOT_VERIFIED` (its own code — the client routes on it). Verified-but-mismatched, or someone else's invitation id → **404-mask** (Artifact 03 semantics: don't reveal the invitation exists).
2. **Lazy expiry:** `expires_at < now` behaves expired at every read/transition — filtered from the inbox, accept/decline → 409. Flipping the stored status to `EXPIRED` on touch is allowed but cosmetic; the *behavior* is the contract.
3. **The joining transaction:** membership insert (`member`, `joined_at = now`) + invitation `PENDING → ACCEPTED` + `accepted_by` + `resolved_at`, **one transaction opened by this service method** — the non-itinerary caller S1.1's `MANDATORY` comment predicted. Failure-injection IT: membership insert failure rolls back the status flip (only the failure case proves atomicity — S1.1 AC 2's reasoning). Stub one layer down (the repository), not the service — the S1.1 spy-vs-proxy trap is recorded in its spec Comments.
4. **Decline:** same authority as accept; `PENDING → DECLINED`; no membership.
5. **Inbox query:** pending, unexpired, `email = my verified email` — if the token's email is unverified the inbox is empty by definition (an unverified claim identifies nobody).

**Blocked by:** 01, 03

- [ ] Claims: `email_verified` surfaced from the JWT
- [ ] Accept with the full gate ladder + joining transaction + rollback IT
- [ ] Decline · lazy-expiry behavior at inbox/accept/decline
- [ ] ITs: token-flavor fixtures (verified-match / verified-mismatch / unverified / expired / non-pending) — the S0.2 four-flavors lesson applied here
