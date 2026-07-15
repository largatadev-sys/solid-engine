# 02 — Backend skeleton: three-layer `/v1/health` against Postgres

**What to build:** A caller can hit `GET /v1/health` on a running backend and get `200 {"status":"ok"}`, with the request genuinely traversing controller → service → repository → Postgres (`SELECT 1`). The endpoint is public (no bearer token) and the body stays minimal — no version, commit, uptime, or component detail. Flyway runs on boot with the no-op comment-only `V1__init.sql`, proving the migration pipeline. Scaffold: Spring Boot 4.0.x · Java 25 · Maven · base package `com.largata`, under `backend/` as a root-level peer (Artifact 04 layout).

Version rules from the spec: verify at scaffold time the current Boot 4.0.x patch, that the Boot BOM manages Testcontainers 2.x and the JUnit line — take BOM-managed versions, never override. If the BOM still manages Testcontainers 1.x: explicit override to latest 2.x, verify `@ServiceConnection`, and add a CLAUDE.md Gotcha. Record what was found in this ticket's Comments.

**Blocked by:** 01 — Pipeline bootstrap.

**Status:** ready-for-agent

- [ ] `mvn verify` is green from a clean checkout (Docker present for Testcontainers)
- [ ] Integration test (Testcontainers Postgres): `GET /v1/health` → 200, camelCase minimal body, no auth required
- [ ] The health path demonstrably crosses all three layers and executes a DB round-trip
- [ ] Flyway history shows version 1 applied on boot
- [ ] UUIDv7 stance respected: nothing DB-version-specific in any SQL
- [ ] Scaffold-time version verifications recorded in Comments

## Comments
