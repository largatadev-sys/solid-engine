# 02 — Backend: Traveler provisioning + GET /v1/me

**What to build:** The identity module. An authenticated caller's first contact provisions their domain `Traveler` (keyed by Firebase UID) exactly once, and `GET /v1/me` returns `{ id, displayName, email }` — no `firebaseUid`, no `createdAt` (ADR-008: omission is free, shipping is permanent).

Decisions locked at grilling: provisioning happens at **principal resolution** — one `getOrProvision(firebaseUid, claims)` chokepoint invoked by the argument resolver that hands controllers a `Traveler` parameter, so any authenticated endpoint provisions on first contact (no "call `/me` first" client contract; S0.3's endpoints cannot 500 on a missing row by construction). Idempotency is the **database's job**: unique constraint on the Firebase UID + insert-on-conflict; application-level check-then-insert is rejected as TOCTOU. Claim mapping: display name = `name` claim if present, else the email local-part — **non-unique, informational only, never an identifier** (glossary, 02-domain-model). Claims snapshot once at creation; no re-sync (revisit at S1.2). Additive Flyway migration: traveler table with app-side UUIDv7 id, unique firebase_uid, email, display_name, created_at.

**Blocked by:** 01 — resource server (needs the validated principal and the test-keypair scaffolding).

**Status:** done

- [x] First authenticated `GET /v1/me` creates the Traveler; response is exactly `{id, displayName, email}`
- [x] Second call: no new row, same `id` returned
- [x] Two-thread race, same fresh UID → exactly one row; both callers receive the same Traveler — **16 threads, not 2** (see Comments)
- [x] Token with `name` claim → displayName from claim; token without → email local-part
- [x] Migration is additive and runs via Flyway (schema-history row asserted)
- [x] No workspace/domain table other than traveler; module boundaries per ADR-002

## Comments

**2026-07-15 — implemented. The race is real; the test proves it by failing.**

**The race test was verified by breaking the code.** Deleting the `DataIntegrityViolationException` catch and re-running `concurrentFirstContactsYieldExactlyOneTraveler` fails with `duplicate key value violates unique constraint "traveler_firebase_uid_key"` — so the constraint fires, the losers really do collide, and the recovery read is what turns a race into correct behavior. A green concurrency test that has never been seen red proves nothing; this one has.

Sixteen concurrent callers, not the two the AC asked for: the interleaving is narrow enough that two threads can miss it and let a broken implementation pass.

**Two Spring traps, both silent, both structural — and they are why `TravelerProvisioner` is a separate bean.**
1. **Self-invocation bypasses the proxy.** `@Transactional(REQUIRES_NEW)` on a private/protected method called as `this.insert(...)` does *nothing* — Spring implements it with a proxy around the bean, and a self-call never crosses it. The annotation would read as protection while providing none.
2. **A constraint violation poisons its transaction.** Once Postgres rejects the insert, that transaction is rollback-only, so a recovery read *inside* it fails too — the handled race would still surface as a 500, only under concurrency, only in production. Isolating the insert in its own bean (hence its own real transaction) is what makes the catch-and-re-read work.

`saveAndFlush`, not `save`, for the same family of reason: a deferred flush throws at commit time, outside the caller's try/catch.

**Hibernate 7.4 ships `UuidVersion7Strategy`** — no hand-rolled bit twiddling, no new dependency. `UuidV7` wraps it as the one id source (`common/id`). Deliberately not `@UuidGenerator` on the field: entities are handed their id at construction, before they meet a session, which is what "app-side ids" means.

**Two ACs beyond the ticket, both from standing rules rather than this story:** the provisioning log line names the traveler by id only (P3 — asserted that the email and display name do *not* appear), and `userId` reaches the MDC on a real authenticated request through the real chain.

**`displayNamesCollideAndThatIsAllowed`** exists to refute the instinct the grilling session killed: the email local-part fallback makes collisions certain (`ana@gmail` and `ana@yahoo` both yield `ana`), so a UNIQUE on display name would turn a cosmetic field into a failed first request.
