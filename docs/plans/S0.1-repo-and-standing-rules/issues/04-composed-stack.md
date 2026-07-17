# 04 — The composed stack: `docker compose up` from clean checkout

**What to build:** Someone with only Docker installed clones the repo, runs `docker compose up --build`, and gets the full local stack: the backend (built inside a multi-stage Dockerfile — Maven build stage, slim JRE runtime stage; no host JDK needed), Postgres 17 with **no volume** (so `down` + `up` yields a fresh DB and Flyway re-migrates from zero), and MinIO with a healthcheck and `.env.example` placeholders. MinIO gets **zero backend wiring** — no storage client, no bucket code; the healthcheck alone keeps its config validated (deferral to S3.3 per the spec).

**Blocked by:** 02 — Backend skeleton.

**Status:** done

- [x] Clean checkout + `docker compose up --build` → `GET /v1/health` returns 200 from the containerized app
- [x] `docker compose down` then `up` → empty DB, Flyway reapplies from zero (fresh-DB semantics proven)
- [x] MinIO container reports healthy; compose fails visibly if it doesn't
- [x] No object-storage code or dependency in the backend
- [x] `.env.example` carries placeholders only; real env files remain gitignored

## Comments

**2026-07-15 — implemented and verified against a running stack.**

**Fresh-DB semantics, proven rather than assumed.** The volumeless design's whole claim is that a *plain* `docker compose down` — no `-v`, no cleanup step to remember — wipes the database. Tested it:
1. `compose up --build` → all three services healthy, `/v1/health` returned `{"status":"ok"}` 1s after the backend came up.
2. Planted a marker: `CREATE TABLE ephemeral_marker; INSERT ... VALUES (42)`. Confirmed present, Flyway history showed 1 migration.
3. `docker compose down` (**no `-v`**), then `up`.
4. Marker query → `relation "ephemeral_marker" does not exist`. **Gone.** Flyway re-applied from zero on the fresh database; health green again.

**MinIO is container-only, as specified.** Healthchecked (`mc ready local`) and `depends_on: service_healthy` from the backend, so a broken emulator fails the stack loudly instead of rotting unnoticed — but **zero backend wiring**: no storage client, no bucket code, no dependency in the pom. That stays S3.3's work. (Noted for then: Testcontainers 2.x publishes `testcontainers-minio`.)

**Build-stage note.** The Dockerfile skips tests (`-DskipTests`) — Testcontainers needs a Docker daemon, which is not available inside a build container. The test gate is `mvn verify` on the host plus CI's backend job; the image build's job is to produce the jar. Dependencies resolve in their own layer so ordinary code edits stay cached.

**CI runs this same path on every push** (the `stack` job), so "compose up works from a clean checkout" is verified on a machine that has never seen this repo — not just on the machine where it already worked.
