# 01 — The poll module: entities, migration, five additive endpoints

**What to build:** a new backend `poll` module (the invitation-module shape — own tables, workspace referenced by ID, every entry through the guard's resolved Membership) carrying the whole wire surface of spec decisions 1–10.

**Blocked by:** — *(first ticket; owner review gates the story)*

**Status:** ready-for-agent

- [ ] Migration (additive): `poll` (UUIDv7 id, workspace id, created-by membership id, question, closes-at, closed-at nullable, closed-by nullable, created-at) + option storage + `poll_vote` with **unique (poll id, membership id)** — INV-10 as schema — and **ON DELETE CASCADE from membership**, so S1.5's hard delete removes a departed member's votes with no service code.
- [ ] `Poll` closed-ness is derived, never stored as state: `closed_at != null OR clock.now() >= closes_at` — all reads through the injected clock (`MutableClock` steerable, the S1.1 rule).
- [ ] `POST /v1/itineraries/{id}/polls` — caps enforced server-side with named 4xx codes: question ≤ 120, options 2–10 each ≤ 80, closes-at strictly future, ≤ 25 open polls per trip (PlanLimitExceeded-style).
- [ ] `GET /v1/itineraries/{id}/polls` — the board in one read: active (newest-first) + completed (most-recently-closed-first), each poll with options, per-option voter lists via the S4.20 roster projection, counts, the viewer's own vote, computed `status`, winner id(s) on closed polls, denominator = live member count.
- [ ] `PUT .../polls/{pollId}/vote` — body = option id; upsert (re-vote replaces); named refusal on a closed poll and on an unknown option.
- [ ] `POST .../polls/{pollId}/close` — creator or owner; stamps closed-at/-by; named refusal for a plain member and on already-closed.
- [ ] `DELETE .../polls/{pollId}` — creator or owner; hard delete, votes cascade; named refusal for a plain member.
- [ ] Poll acts are workspace acts: no Editing Session, no lease, no `planVersion` bump, no activity history (the S3.4 decision-5 shape). Archive posture per S4.23: owner writes 409, non-owner member 404, owner reads pass.
- [ ] ITs on `PostgresTestBase` + `RestTestClient`: guard-masking family per endpoint (non-member 404 on all five) · INV-10 race (two concurrent PUTs → one row — the index proves it, not service courtesy) · lazy close via `MutableClock` (create near-deadline, advance, read: CLOSED with winner, **no write happened**) · tie and zero-vote winner computation · cascade-on-membership-delete asserted through the board read (counts and denominator both drop) · every cap's named refusal · archive fence family (409 owner / 404 member) · closed-poll vote refusal.
- [ ] `AudienceFenceCoverageTest` / guard-coverage sweeps see the new handlers (the S4.23 lesson — confirm the scanner actually scans them).
