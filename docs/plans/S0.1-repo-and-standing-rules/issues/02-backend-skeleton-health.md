# 02 — Backend skeleton: three-layer `/v1/health` against Postgres

**What to build:** A caller can hit `GET /v1/health` on a running backend and get `200 {"status":"ok"}`, with the request genuinely traversing controller → service → repository → Postgres (`SELECT 1`). The endpoint is public (no bearer token) and the body stays minimal — no version, commit, uptime, or component detail. Flyway runs on boot with the no-op comment-only `V1__init.sql`, proving the migration pipeline. Scaffold: Spring Boot 4.0.x · Java 25 · Maven · base package `com.largata`, under `backend/` as a root-level peer (Artifact 04 layout).

Version rules from the spec: verify at scaffold time the current Boot 4.0.x patch, that the Boot BOM manages Testcontainers 2.x and the JUnit line — take BOM-managed versions, never override. If the BOM still manages Testcontainers 1.x: explicit override to latest 2.x, verify `@ServiceConnection`, and add a CLAUDE.md Gotcha. Record what was found in this ticket's Comments.

**Blocked by:** 01 — Pipeline bootstrap.

**Status:** done

- [x] `mvn verify` is green from a clean checkout (Docker present for Testcontainers)
- [x] Integration test (Testcontainers Postgres): `GET /v1/health` → 200, camelCase minimal body, no auth required
- [x] The health path demonstrably crosses all three layers and executes a DB round-trip
- [x] Flyway history shows version 1 applied on boot
- [x] UUIDv7 stance respected: nothing DB-version-specific in any SQL
- [x] Scaffold-time version verifications recorded in Comments

## Comments

**2026-07-15 — implemented. Scaffold-time version findings (the ticket's own AC):**

| What | Spec said | Found | Action |
|---|---|---|---|
| Spring Boot | 4.0.x | 4.0.7 latest patch; **4.1.0 shipped 25/06/2026** | **Deviation, owner-approved:** scaffolded on **4.1.0**. Same reasoning that rejected Boot 3.5 at grilling — on a greenfield with a multi-year runway, start on the newest line so the first forced migration is as far away as possible. |
| Testcontainers | 2.x floor, BOM-first | **2.0.5, BOM-managed** in both 4.0.x and 4.1.0 | No override needed — the preferred path. |
| JUnit | per BOM | **Jupiter 6.0.3**, BOM-managed | Vindicates the 06b §7 wording amendment. |
| Flyway | wired | 12.4.0 via Boot 4.1's BOM | See the trap below. |
| Java | 25 | 25.0.2 LTS locally; Boot 4.1's *baseline* is 17 | Targeting 25, above the floor. |

**Two traps hit, both recorded in CLAUDE.md gotchas:**

1. **Testcontainers 2.x renamed everything.** Artifacts (`postgresql` → `testcontainers-postgresql`, `junit-jupiter` → `testcontainers-junit-jupiter`) *and* packages (`org.testcontainers.containers` → `org.testcontainers.postgresql`; the old package is a deprecated shim and the container class is no longer generic). The 1.x coordinates 404 at 2.0.5, which reads like "2.x is broken" — it isn't. This is very likely the source of the version pain that motivated the 2.x floor in the first place.
2. **Boot 4 moved Flyway's auto-configuration out of the JPA starter.** With only `flyway-core` on the classpath, **Flyway silently never ran** — no log line, no history table, app boots green. `spring-boot-starter-flyway` is the paved road.

**The Flyway trap is the strongest evidence for the no-op `V1__init.sql` decision.** Every health test passed while Flyway was silently dead — they only need a DB *connection*. Only the AC that asserts `flyway_schema_history` contains version 1 caught it. Had S0.1 shipped without that assertion, S0.2's first real migration would have silently not applied, and the debugging would have started from "why is the Traveler table missing" rather than "Flyway was never wired".

**Boot 4 API note:** `TestRestTemplate` is removed. Framework 7's servlet-side successor is `RestTestClient` (`org.springframework.test.web.servlet.client`), which is *not* auto-configured as a bean — build it with `RestTestClient.bindToServer().baseUrl(...)` against `@LocalServerPort`.

**Verified:** `mvn verify` green, 19/19 integration tests on real Postgres 17.
