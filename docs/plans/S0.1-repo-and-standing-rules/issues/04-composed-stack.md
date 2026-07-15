# 04 — The composed stack: `docker compose up` from clean checkout

**What to build:** Someone with only Docker installed clones the repo, runs `docker compose up --build`, and gets the full local stack: the backend (built inside a multi-stage Dockerfile — Maven build stage, slim JRE runtime stage; no host JDK needed), Postgres 17 with **no volume** (so `down` + `up` yields a fresh DB and Flyway re-migrates from zero), and MinIO with a healthcheck and `.env.example` placeholders. MinIO gets **zero backend wiring** — no storage client, no bucket code; the healthcheck alone keeps its config validated (deferral to S3.3 per the spec).

**Blocked by:** 02 — Backend skeleton.

**Status:** ready-for-agent

- [ ] Clean checkout + `docker compose up --build` → `GET /v1/health` returns 200 from the containerized app
- [ ] `docker compose down` then `up` → empty DB, Flyway reapplies from zero (fresh-DB semantics proven)
- [ ] MinIO container reports healthy; compose fails visibly if it doesn't
- [ ] No object-storage code or dependency in the backend
- [ ] `.env.example` carries placeholders only; real env files remain gitignored

## Comments
