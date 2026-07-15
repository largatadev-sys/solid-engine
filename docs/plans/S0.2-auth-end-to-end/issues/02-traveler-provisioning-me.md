# 02 — Backend: Traveler provisioning + GET /v1/me

**What to build:** The identity module. An authenticated caller's first contact provisions their domain `Traveler` (keyed by Firebase UID) exactly once, and `GET /v1/me` returns `{ id, displayName, email }` — no `firebaseUid`, no `createdAt` (ADR-008: omission is free, shipping is permanent).

Decisions locked at grilling: provisioning happens at **principal resolution** — one `getOrProvision(firebaseUid, claims)` chokepoint invoked by the argument resolver that hands controllers a `Traveler` parameter, so any authenticated endpoint provisions on first contact (no "call `/me` first" client contract; S0.3's endpoints cannot 500 on a missing row by construction). Idempotency is the **database's job**: unique constraint on the Firebase UID + insert-on-conflict; application-level check-then-insert is rejected as TOCTOU. Claim mapping: display name = `name` claim if present, else the email local-part — **non-unique, informational only, never an identifier** (glossary, 02-domain-model). Claims snapshot once at creation; no re-sync (revisit at S1.2). Additive Flyway migration: traveler table with app-side UUIDv7 id, unique firebase_uid, email, display_name, created_at.

**Blocked by:** 01 — resource server (needs the validated principal and the test-keypair scaffolding).

**Status:** ready-for-agent

- [ ] First authenticated `GET /v1/me` creates the Traveler; response is exactly `{id, displayName, email}`
- [ ] Second call: no new row, same `id` returned
- [ ] Two-thread race, same fresh UID → exactly one row; both callers receive the same Traveler
- [ ] Token with `name` claim → displayName from claim; token without → email local-part
- [ ] Migration is additive and runs via Flyway (schema-history row asserted)
- [ ] No workspace/domain table other than traveler; module boundaries per ADR-002
