# 05 — The seven endpoints + cross-module composition

**Status:** done (2026-07-22)

**What to build:** the /v1 surface from spec §API (all additive; itinerary-addressed; workspace IDs never on the wire).

1. Routes per the spec table: `POST/GET /v1/itineraries/{id}/invitations` · `GET /v1/invitations` · `POST /v1/invitations/{id}/accept|decline|revoke` · `GET /v1/itineraries/{id}/members`. Transitions are POST verbs (rows survive terminal — one grammatical family), not DELETE.
2. **Every list wears `{items, nextCursor}`** — 05-api-conventions: one shape, no exceptions, even at four rows.
3. **Composition (ADR-002's first real exercise):** inbox items carry trip title + inviter display name; member list carries display names — assembled in the service layer via itinerary/identity **service interfaces by ID**, never another module's tables. If an interface method doesn't exist yet (e.g. batch titles-by-ids), add it to the owning module's interface.
4. Error envelope: `NOT_PERMITTED`, `INVITATION_ALREADY_PENDING`, `ALREADY_A_MEMBER`, `EMAIL_NOT_VERIFIED`, `ILLEGAL_TRANSITION` + the standing 401/404-mask semantics. Codes are the mobile contract — name them once, here.
5. Register-#2 analytics: structured log events `invite_sent / accepted / declined / revoked` at the service layer (IDs only, P3).

**Blocked by:** 03, 04

- [ ] Controllers + request/response records (camelCase, cursor envelope)
- [ ] Contract ITs per endpoint: authority matrix, every named code, 404-mask, envelope shape
- [ ] AC 8 regression: S0.3 + S1.1 guard suites green with zero edits
